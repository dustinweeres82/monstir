// ─── StoreKit product identifiers + shared IAP helpers ───────────────────────
// One subscription group ("Monstir Premium") with a yearly (hero/recommended)
// and a monthly (demoted) auto-renewable plan, each carrying a 14-day free trial
// as its introductory offer (MON-86). Apple only allows fixed intro durations, so
// 14 days is configured as "2 weeks" / P2W — there is no literal "14 days" option.
// These IDs must exist in App Store Connect (Subscriptions → Monstir Premium)
// before StoreKit will resolve real prices — until then, fetchProducts() returns
// an empty array and the paywall shows its loading/empty state rather than
// fabricated prices. For local testing without App Store Connect, the same two
// products and the P2W offer are mirrored in storekit/Monstir.storekit.
export const PREMIUM_YEARLY_SKU  = 'com.dweeres.monstir.premium.yearly';
export const PREMIUM_MONTHLY_SKU = 'com.dweeres.monstir.premium.monthly';
export const PREMIUM_SKUS = [PREMIUM_YEARLY_SKU, PREMIUM_MONTHLY_SKU] as const;

import type { ProductSubscription, SubscriptionOffer } from 'expo-iap';

// Both stores use the SAME product ids. On Android each of these is a Play
// subscription with a single base plan carrying the free-trial offer, which keeps
// one id list for both platforms. If Play ever needs multiple base plans per
// subscription, the base plan id arrives as offer.basePlanIdAndroid and this list
// stays unchanged.

export interface PlanDisplay {
  sku: string;
  /** Formatted total price for the billing period, e.g. "$79.99" */
  price: string;
  /** Formatted "per month" breakdown, e.g. "$3.33 / month" */
  perMonth: string | null;
  /** e.g. "Yearly · billed $79.99 / year" */
  subline: string;
  hasFreeTrial: boolean;
  /** e.g. "14 days free" — blank if this plan has no introductory offer */
  trialLabel: string | null;
  /** Trial length normalised to days, so callers never re-parse trialLabel. */
  trialDays: number | null;
  /**
   * Google Play requires the offer token to purchase a subscription — without it
   * requestPurchase is rejected. Null on iOS, where StoreKit needs no token.
   */
  offerTokenAndroid: string | null;
}

/** Numeric total for a product, preferring the parsed display string so the
 *  currency symbol/locale formatting Apple or Google returned is respected. */
function priceNumber(product: ProductSubscription): number {
  const fromString = parseFloat((product.displayPrice ?? '').replace(/[^0-9.]/g, ''));
  if (!isNaN(fromString)) return fromString;
  return product.price ?? 0;
}

function periodToDays(unit: string | null | undefined, value: number | null | undefined): number | null {
  if (!value) return null;
  switch (unit) {
    case 'day':   return value;
    case 'week':  return value * 7;
    case 'month': return value * 30;
    case 'year':  return value * 365;
    default:      return null;
  }
}

/**
 * The introductory free-trial offer, from the cross-platform `subscriptionOffers`
 * array that expo-iap normalises for both stores. Falls back to the iOS-only
 * introductoryPrice* fields when a build predates that array.
 */
function freeTrialOffer(product: ProductSubscription): { days: number | null; token: string | null } | null {
  const offers: SubscriptionOffer[] = product.subscriptionOffers ?? [];
  const trial = offers.find(o => o.paymentMode === 'free-trial');
  if (trial) {
    return {
      days: periodToDays(trial.period?.unit, (trial.period?.value ?? 1) * (trial.periodCount ?? 1)),
      token: trial.offerTokenAndroid ?? null,
    };
  }
  // iOS fallback — introductoryPriceSubscriptionPeriodIOS is a bare unit string
  // and the count arrives as a string, hence the parse.
  const p = product as unknown as {
    introductoryPricePaymentModeIOS?: string | null;
    introductoryPriceSubscriptionPeriodIOS?: string | null;
    introductoryPriceNumberOfPeriodsIOS?: string | null;
  };
  if (p.introductoryPricePaymentModeIOS !== 'free-trial') return null;
  const count = parseInt(p.introductoryPriceNumberOfPeriodsIOS ?? '1', 10);
  return { days: periodToDays(p.introductoryPriceSubscriptionPeriodIOS, isNaN(count) ? 1 : count), token: null };
}

/** Whether this product carries a free-trial introductory offer, on either store. */
export function hasFreeTrialOffer(product: ProductSubscription): boolean {
  return freeTrialOffer(product) != null;
}

/** The token Play needs to purchase this subscription's base plan. Prefers the
 *  free-trial offer, falling back to the first offer the store returned. */
export function androidOfferToken(product: ProductSubscription): string | null {
  const offers: SubscriptionOffer[] = product.subscriptionOffers ?? [];
  const trial = offers.find(o => o.paymentMode === 'free-trial');
  return (trial ?? offers[0])?.offerTokenAndroid ?? null;
}

function trialLabelFor(days: number | null): string | null {
  if (!days) return null;
  if (days % 7 === 0 && days >= 7) {
    const weeks = days / 7;
    return `${weeks} week${weeks === 1 ? '' : 's'} free`;
  }
  return `${days} day${days === 1 ? '' : 's'} free`;
}

/** Builds the display strings a paywall card needs from a live store product —
 *  never hardcode a price string, always derive it from here. Platform-agnostic:
 *  it used to bail out (return null) for anything non-iOS, which is why the
 *  Android paywall rendered empty. */
export function describePlan(product: ProductSubscription, kind: 'yearly' | 'monthly'): PlanDisplay | null {
  if (!product?.displayPrice) return null;
  const total = priceNumber(product);
  const trial = freeTrialOffer(product);
  const trialDays = trial?.days ?? null;

  const shared = {
    sku: product.id,
    price: product.displayPrice,
    hasFreeTrial: trial != null,
    trialLabel: trialLabelFor(trialDays),
    trialDays,
    offerTokenAndroid: androidOfferToken(product),
  };

  if (kind === 'yearly') {
    const perMonth = total > 0 ? `$${(total / 12).toFixed(2)}` : product.displayPrice;
    return { ...shared, perMonth: `${perMonth} / month`, subline: `Yearly · billed ${product.displayPrice} / year` };
  }
  return { ...shared, perMonth: null, subline: `${product.displayPrice}/mo, billed monthly` };
}

/** "SAVE 33%" style badge comparing the yearly per-month rate to the monthly
 *  plan's price — computed live so it never drifts from the real prices. */
export function computeSavingsPct(yearly: ProductSubscription | null, monthly: ProductSubscription | null): number | null {
  if (!yearly || !monthly) return null;
  const yearlyPerMonth = priceNumber(yearly) / 12;
  const monthlyPrice = priceNumber(monthly);
  if (!monthlyPrice) return null;
  const pct = Math.round((1 - yearlyPerMonth / monthlyPrice) * 100);
  return pct > 0 ? pct : null;
}
