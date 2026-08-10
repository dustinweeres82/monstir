// ─── StoreKit product identifiers + shared IAP helpers ───────────────────────
// One subscription group ("Monstir Premium") with a yearly (hero/recommended)
// and a monthly (demoted) auto-renewable plan, each carrying a 7-day free
// trial as its introductory offer. These IDs must exist in App Store Connect
// (Subscriptions → Monstir Premium) before StoreKit will resolve real prices —
// until then, fetchProducts() returns an empty array and the paywall shows its
// loading/empty state rather than fabricated prices.
export const PREMIUM_YEARLY_SKU  = 'com.dweeres.monstir.premium.yearly';
export const PREMIUM_MONTHLY_SKU = 'com.dweeres.monstir.premium.monthly';
export const PREMIUM_SKUS = [PREMIUM_YEARLY_SKU, PREMIUM_MONTHLY_SKU] as const;

import type { ProductSubscription } from 'expo-iap';

export interface PlanDisplay {
  sku: string;
  /** Formatted total price for the billing period, e.g. "$79.99" */
  price: string;
  /** Formatted "per month" breakdown, e.g. "$3.33 / month" */
  perMonth: string | null;
  /** e.g. "Yearly · billed $79.99 / year" */
  subline: string;
  hasFreeTrial: boolean;
  /** e.g. "7 days free" — blank if this plan has no introductory offer */
  trialLabel: string | null;
}

function isIOSSubscription(p: ProductSubscription): p is Extract<ProductSubscription, { platform: 'ios' }> {
  return (p as { platform?: string }).platform === 'ios';
}

/** Parses a StoreKit displayPrice string ("$79.99") into a number (79.99). Falls
 *  back to the raw `price` field when the string can't be parsed (e.g. a
 *  currency with a trailing symbol). */
function parsePriceNumber(product: Extract<ProductSubscription, { platform: 'ios' }>): number {
  const fromString = parseFloat(product.displayPrice.replace(/[^0-9.]/g, ''));
  if (!isNaN(fromString)) return fromString;
  return product.price ?? 0;
}

/** Builds the display strings a paywall card needs from a live StoreKit
 *  product — never hardcode a price string, always derive it from here. */
export function describePlan(product: ProductSubscription, kind: 'yearly' | 'monthly'): PlanDisplay | null {
  if (!isIOSSubscription(product)) return null;
  const total = parsePriceNumber(product);
  const hasFreeTrial = product.introductoryPricePaymentModeIOS === 'free-trial';
  const trialPeriod = product.introductoryPriceSubscriptionPeriodIOS;
  const trialCount = product.introductoryPriceNumberOfPeriodsIOS;
  const trialLabel = hasFreeTrial
    ? `${trialCount ?? '7'} ${trialPeriod === 'week' ? 'week' : 'day'}${trialCount === '1' ? '' : 's'} free`
    : null;

  if (kind === 'yearly') {
    const perMonth = total > 0 ? `$${(total / 12).toFixed(2)}` : product.displayPrice;
    return {
      sku: product.id,
      price: product.displayPrice,
      perMonth: `${perMonth} / month`,
      subline: `Yearly · billed ${product.displayPrice} / year`,
      hasFreeTrial,
      trialLabel,
    };
  }
  return {
    sku: product.id,
    price: product.displayPrice,
    perMonth: null,
    subline: `${product.displayPrice}/mo, billed monthly`,
    hasFreeTrial,
    trialLabel,
  };
}

/** "SAVE 33%" style badge comparing the yearly per-month rate to the monthly
 *  plan's price — computed live so it never drifts from the real prices. */
export function computeSavingsPct(yearly: ProductSubscription | null, monthly: ProductSubscription | null): number | null {
  if (!yearly || !monthly || !isIOSSubscription(yearly) || !isIOSSubscription(monthly)) return null;
  const yearlyPerMonth = parsePriceNumber(yearly) / 12;
  const monthlyPrice = parsePriceNumber(monthly);
  if (!monthlyPrice) return null;
  const pct = Math.round((1 - yearlyPerMonth / monthlyPrice) * 100);
  return pct > 0 ? pct : null;
}
