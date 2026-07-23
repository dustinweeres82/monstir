// ─── Monstir Premium subscription state, wrapping expo-iap/StoreKit ──────────
// Thin wrapper around expo-iap's `useIAP` — this is the ONLY place the app
// talks to StoreKit directly. Every purchase/restore call here hands off to
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
import {
  useIAP,
  ErrorCode,
  getActiveSubscriptions as getActiveSubscriptionsDirect,
  type Purchase,
} from 'expo-iap';
import {
  PREMIUM_SKUS, PREMIUM_MONTHLY_SKU, PREMIUM_YEARLY_SKU,
  describePlan, computeSavingsPct, type PlanDisplay,
} from '../lib/iap';
import { saveSubscriptionPurchase } from '../lib/db';

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'pending' | 'error';

export interface UseSubscriptionResult {
  /** Connected to the store AND the first product fetch has resolved. */
  ready: boolean;
  isPremium: boolean;
  trialEndsAt: Date | null;
  subscriptionExpiresAt: Date | null;
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
        const hasFreeTrial = product && 'introductoryPricePaymentModeIOS' in product
          ? product.introductoryPricePaymentModeIOS === 'free-trial'
          : false;
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
      if (error.code === ErrorCode.UserCancelled) {
        resolvePurchaseRef.current?.('cancelled');
      } else if (error.code === ErrorCode.DeferredPayment) {
        // Ask to Buy — a family organizer still needs to approve. Not an
        // error; the purchase will complete later via onPurchaseSuccess.
        resolvePurchaseRef.current?.('pending');
      } else {
        setLastError(error.message);
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
    if (!mine) return { isPremium: false, trialEndsAt: null, expiresAt: null };
    const expiresAt = mine.expirationDateIOS ? new Date(mine.expirationDateIOS) : null;
    return { isPremium: true, trialEndsAt: expiresAt, expiresAt };
  }, [activeSubscriptions]);

  const yearlyProduct  = useMemo(() => subscriptions.find(s => s.id === PREMIUM_YEARLY_SKU) ?? null, [subscriptions]);
  const monthlyProduct = useMemo(() => subscriptions.find(s => s.id === PREMIUM_MONTHLY_SKU) ?? null, [subscriptions]);
  const yearlyPlan  = useMemo(() => yearlyProduct  ? describePlan(yearlyProduct, 'yearly')   : null, [yearlyProduct]);
  const monthlyPlan = useMemo(() => monthlyProduct ? describePlan(monthlyProduct, 'monthly') : null, [monthlyProduct]);
  const savingsPct  = useMemo(() => computeSavingsPct(yearlyProduct, monthlyProduct), [yearlyProduct, monthlyProduct]);

  const purchase = useCallback(async (sku: string): Promise<PurchaseOutcome> => {
    setLastError(null);
    setPurchasing(true);
    return new Promise<PurchaseOutcome>((resolve) => {
      resolvePurchaseRef.current = resolve;
      requestPurchase({ request: { apple: { sku } }, type: 'subs' }).catch((e) => {
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
      setLastError(e instanceof Error ? e.message : 'Restore failed');
      return false;
    }
  }, [restorePurchases]);

  return {
    ready: connected && productsFetched,
    isPremium: entitlement.isPremium,
    trialEndsAt: entitlement.trialEndsAt,
    subscriptionExpiresAt: entitlement.expiresAt,
    yearlyPlan,
    monthlyPlan,
    savingsPct,
    purchasing,
    restoring,
    lastError,
    purchase,
    restore,
  };
}
