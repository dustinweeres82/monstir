// ─── Monstir Premium subscription state, wrapping expo-iap ───────────────────
// Thin wrapper around expo-iap's `useIAP` — this is the ONLY place the app
// talks to StoreKit or Google Play Billing directly. Every purchase/restore call here hands off to
// Apple's own system UI (the subscribe sheet, Face ID confirm, restore
// spinner); nothing here renders a custom payment screen.
//
// Entitlement (`isPremium`) is read live from StoreKit's own
// `activeSubscriptions`, never from our own `converted` flag in Supabase —
// `converted` only means "has ever completed a purchase" and exists for
// analytics / win-back gating (see usePaywallTriggers), not for gating
// premium features.
//
// Receipt/server-side validation is intentionally out of scope here — this
// wraps the client-side StoreKit entitlement only. Add server-side App Store
// Server Notifications handling (a Supabase edge function, mirroring the
// pattern in supabase/functions/) before relying on this for anything
// revenue-critical.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  useIAP,
  ErrorCode,
  getActiveSubscriptions as getActiveSubscriptionsDirect,
  type Purchase,
} from 'expo-iap';
import {
  PREMIUM_SKUS, PREMIUM_MONTHLY_SKU, PREMIUM_YEARLY_SKU,
  describePlan, computeSavingsPct, androidOfferToken, hasFreeTrialOffer, type PlanDisplay,
} from '../lib/iap';
import { saveSubscriptionPurchase } from '../lib/db';

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'pending' | 'error';

export interface UseSubscriptionResult {
  /** Connected to the store AND the first product fetch has resolved. */
  ready: boolean;
  isPremium: boolean;
  trialEndsAt: Date | null;
  subscriptionExpiresAt: Date | null;
  /** Real countdown straight from StoreKit — days until the current period ends. */
  daysUntilExpiration: number | null;
  /** false once the user cancels: access continues to expiry, then stops. */
  willAutoRenew: boolean;
  /** The subscribed product id, so UI shows the plan they actually hold. */
  activePlanId: string | null;
  yearlyPlan: PlanDisplay | null;
  monthlyPlan: PlanDisplay | null;
  /** e.g. 33 for "SAVE 33%" — null until both plans have loaded. */
  savingsPct: number | null;
  purchasing: boolean;
  restoring: boolean;
  lastError: string | null;
  /** Hands off to Apple's subscribe sheet for the given product id. Resolves
   *  once the sheet closes — 'cancelled' on dismiss, 'pending' on Ask to Buy,
   *  never throws (errors surface via the return value + lastError). */
  purchase: (sku: string) => Promise<PurchaseOutcome>;
  /** Hands off to StoreKit's restore flow. Returns whether an active Premium
   *  entitlement was found. */
  restore: () => Promise<boolean>;
  /**
   * The message for the most recent failure, readable immediately after
   * `purchase()` resolves. Ref-backed on purpose: `lastError` is state, so a
   * caller awaiting purchase() sees the value captured at render time — always
   * the stale one — and ends up showing a generic "something went wrong"
   * instead of what StoreKit actually said.
   */
  getLastError: () => string | null;
}

export function useSubscription(): UseSubscriptionResult {
  const [lastError, setLastError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [productsFetched, setProductsFetched] = useState(false);

  // Resolves the in-flight purchase() promise from the onPurchaseSuccess /
  // onPurchaseError callbacks below, which fire from expo-iap's own listeners
  // rather than as a direct return value of requestPurchase().
  const resolvePurchaseRef = useRef<((outcome: PurchaseOutcome) => void) | null>(null);
  // Mirrors lastError so it can be read synchronously right after purchase()
  // resolves — see getLastError in the interface above.
  const lastErrorRef = useRef<string | null>(null);

  const {
    connected,
    subscriptions,
    activeSubscriptions,
    fetchProducts,
    requestPurchase,
    restorePurchases,
    getActiveSubscriptions,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase: Purchase) => {
      const sku = purchase.productId;
      try {
        // Subscriptions are non-consumable from StoreKit's point of view —
        // finishing just acknowledges delivery, it doesn't cancel anything.
        await finishTransaction({ purchase, isConsumable: false });
      } catch (e) {
        console.warn('[useSubscription] finishTransaction error:', e);
      }
      try {
        const fresh = await getActiveSubscriptionsDirect(PREMIUM_SKUS as unknown as string[]);
        const mine = fresh.find(s => s.productId === sku);
        const product = subscriptions.find(s => s.id === sku);
        // Cross-platform: this used to read introductoryPricePaymentModeIOS, which is
        // undefined on Android, so a Play trial purchase was always persisted as
        // 'active' and the trial was invisible to our own records.
        const hasFreeTrial = product ? hasFreeTrialOffer(product) : false;
        // Null on Android by design — Play gives no client-side expiry. Backfill it
        // from the Play Developer API when MON-98 lands.
        const expiresAt = mine?.expirationDateIOS ? new Date(mine.expirationDateIOS).toISOString() : null;
        await saveSubscriptionPurchase({
          subscription_status: hasFreeTrial ? 'trialing' : 'active',
          subscription_product_id: sku,
          subscription_expires_at: expiresAt,
          trial_ends_at: hasFreeTrial ? expiresAt : null,
        });
      } catch (e) {
        console.warn('[useSubscription] failed to persist purchase:', e);
      }
      // Re-hydrate the hook's own reactive entitlement state for isPremium.
      getActiveSubscriptions(PREMIUM_SKUS as unknown as string[]).catch(() => {});
      setPurchasing(false);
      resolvePurchaseRef.current?.('purchased');
      resolvePurchaseRef.current = null;
    },
    onPurchaseError: (error) => {
      setPurchasing(false);
      // Substring match as well as the enum compare. Dismissing Apple's sheet was
      // surfacing "Something went wrong. Please try again." — a plain cancel being
      // reported as a failure — because the code coming back didn't equal
      // ErrorCode.UserCancelled ('user-cancelled') exactly. expo-iap has its own
      // isUserCancelledError helper but doesn't export it from the package root,
      // and reaching into build/utils/ would break on any upgrade.
      const code = String(error.code ?? '');
      if (code === ErrorCode.UserCancelled || /cancel/i.test(code)) {
        resolvePurchaseRef.current?.('cancelled');
      } else if (code === ErrorCode.DeferredPayment) {
        // Ask to Buy — a family organizer still needs to approve. Not an
        // error; the purchase will complete later via onPurchaseSuccess.
        resolvePurchaseRef.current?.('pending');
      } else {
        // Ref as well as state: a caller awaiting purchase() reads the value it
        // captured at render time, so state alone always hands it a stale null and
        // the real StoreKit message gets swallowed. Keep the code in the message so
        // an unmapped one is diagnosable instead of anonymous.
        const message = error.message ? `${error.message}${code ? ` (${code})` : ''}` : `Purchase failed${code ? ` (${code})` : ''}`;
        lastErrorRef.current = message;
        setLastError(message);
        resolvePurchaseRef.current?.('error');
      }
      resolvePurchaseRef.current = null;
    },
  });

  useEffect(() => {
    if (!connected) return;
    Promise.all([
      fetchProducts({ skus: PREMIUM_SKUS as unknown as string[], type: 'subs' }),
      getActiveSubscriptions(PREMIUM_SKUS as unknown as string[]),
    ])
      .then(() => setProductsFetched(true))
      .catch((e) => {
        setLastError(e instanceof Error ? e.message : 'Could not load plans');
        setProductsFetched(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const entitlement = useMemo(() => {
    const mine = activeSubscriptions.find(
      s => (PREMIUM_SKUS as readonly string[]).includes(s.productId) && s.isActive
    );
    if (!mine) {
      return { isPremium: false, trialEndsAt: null, expiresAt: null, daysLeft: null, willAutoRenew: false, planId: null };
    }
    // expirationDateIOS / daysUntilExpirationIOS / renewalInfoIOS are iOS-only.
    // Play does not hand the client an expiry date at all — it comes from the
    // Play Developer API server-side (MON-98) — so on Android these stay null and
    // the UI falls back to its undated wording rather than inventing a date.
    const expiresAt = mine.expirationDateIOS ? new Date(mine.expirationDateIOS) : null;
    const daysLeft = mine.daysUntilExpirationIOS ?? (
      expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000)) : null
    );
    return {
      isPremium: true,
      // NB: this is the end of the CURRENT period, which is the trial end only
      // while the intro offer is running. Neither ActiveSubscription nor
      // RenewalInfoIOS exposes "this period is a free trial", so nothing here can
      // honestly claim trial framing — that needs our own persisted
      // subscription_status, or App Store Server Notifications (MON-98).
      trialEndsAt: expiresAt,
      expiresAt,
      daysLeft,
      willAutoRenew: mine.renewalInfoIOS?.willAutoRenew ?? mine.autoRenewingAndroid ?? true,
      planId: mine.currentPlanId ?? mine.productId,
    };
  }, [activeSubscriptions]);

  const yearlyProduct  = useMemo(() => subscriptions.find(s => s.id === PREMIUM_YEARLY_SKU) ?? null, [subscriptions]);
  const monthlyProduct = useMemo(() => subscriptions.find(s => s.id === PREMIUM_MONTHLY_SKU) ?? null, [subscriptions]);
  const yearlyPlan  = useMemo(() => yearlyProduct  ? describePlan(yearlyProduct, 'yearly')   : null, [yearlyProduct]);
  const monthlyPlan = useMemo(() => monthlyProduct ? describePlan(monthlyProduct, 'monthly') : null, [monthlyProduct]);
  const savingsPct  = useMemo(() => computeSavingsPct(yearlyProduct, monthlyProduct), [yearlyProduct, monthlyProduct]);

  const purchase = useCallback(async (sku: string): Promise<PurchaseOutcome> => {
    lastErrorRef.current = null;
    setLastError(null);
    setPurchasing(true);

    // Google Play rejects a subscription purchase without the base plan's offer
    // token, so it has to be looked up from the fetched product. iOS needs only the
    // sku. This branch is why Android could never purchase before: the request was
    // hardcoded to `{ apple: { sku } }`.
    const product = subscriptions.find(s => s.id === sku);
    const offerToken = product ? androidOfferToken(product) : null;
    const request = Platform.OS === 'android'
      ? { google: { skus: [sku], ...(offerToken ? { subscriptionOffers: [{ sku, offerToken }] } : {}) } }
      : { apple: { sku } };

    if (Platform.OS === 'android' && !offerToken) {
      // Better a named failure than Play's opaque rejection.
      const message = 'This plan has no purchasable offer on Google Play yet.';
      lastErrorRef.current = message;
      setLastError(message);
      setPurchasing(false);
      return 'error';
    }

    return new Promise<PurchaseOutcome>((resolve) => {
      resolvePurchaseRef.current = resolve;
      requestPurchase({ request, type: 'subs' }).catch((e) => {
        setPurchasing(false);
        setLastError(e instanceof Error ? e.message : 'Purchase failed');
        resolvePurchaseRef.current = null;
        resolve('error');
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestPurchase]);

  const restore = useCallback(async (): Promise<boolean> => {
    setLastError(null);
    setRestoring(true);
    try {
      await restorePurchases();
      const fresh = await getActiveSubscriptionsDirect(PREMIUM_SKUS as unknown as string[]);
      const found = fresh.some(s => s.isActive);
      if (found) {
        const mine = fresh.find(s => s.isActive)!;
        await saveSubscriptionPurchase({
          subscription_status: 'active',
          subscription_product_id: mine.productId,
          subscription_expires_at: mine.expirationDateIOS ? new Date(mine.expirationDateIOS).toISOString() : null,
        }).catch(() => {});
      }
      setRestoring(false);
      return found;
    } catch (e) {
      setRestoring(false);
      const message = e instanceof Error ? e.message : 'Restore failed';
      lastErrorRef.current = message;
      setLastError(message);
      return false;
    }
  }, [restorePurchases]);

  return {
    ready: connected && productsFetched,
    isPremium: entitlement.isPremium,
    trialEndsAt: entitlement.trialEndsAt,
    subscriptionExpiresAt: entitlement.expiresAt,
    daysUntilExpiration: entitlement.daysLeft,
    willAutoRenew: entitlement.willAutoRenew,
    activePlanId: entitlement.planId,
    yearlyPlan,
    monthlyPlan,
    savingsPct,
    purchasing,
    restoring,
    lastError,
    purchase,
    restore,
    getLastError: () => lastErrorRef.current,
  };
}
