// ─── Screen-12 win-back paywall trigger rules ────────────────────────────────
// Deliberately data-in / boolean-out: this hook does NOT fetch chore/payout
// history or talk to Supabase itself — the caller (App.tsx) already has that
// state loaded for the rest of the app, so it's passed in as `engagement`.
// That keeps this hook pure and easy to reason about/tune independently of
// how engagement data happens to be sourced.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_COUNT_KEY = 'monstir:sessionCount';

/** Tunable thresholds for the deferred win-back paywall (screen 12). Kept as
 *  one config object so product can adjust the bar for "activated user"
 *  without hunting through the trigger logic. */
export const paywallTriggers = {
  /** Household has approved at least this many chores. */
  minApprovedChores: 5,
  /** OR: parent has marked at least one payout. */
  minPayouts: 1,
  /** OR: app has been opened at least this many separate sessions. */
  minSessions: 3,
  /** AND: at least this many days must have passed since the onboarding
   *  paywall (or the last win-back) was last shown. */
  minDaysSincePaywallSeen: 3,
  /** Don't re-show for this many days after the user dismisses it. */
  dismissCooldownDays: 7,
  /** Never show more than this many times, ever, for one household. */
  lifetimeCap: 3,
} as const;

export type PaywallTriggersConfig = typeof paywallTriggers;

export interface EngagementSignals {
  approvedChoreCount: number;
  payoutCount: number;
}

export interface UsePaywallTriggersParams {
  /** True once the household has ever completed a real purchase — always
   *  suppresses the win-back modal regardless of everything else. */
  converted: boolean;
  /** profiles.paywall_seen_at */
  paywallSeenAt: string | null;
  /** profiles.last_paywall_dismissed_at */
  lastDismissedAt: string | null;
  /** profiles.winback_shown_count */
  winbackShownCount: number;
  engagement: EngagementSignals;
  config?: Partial<PaywallTriggersConfig>;
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

/** Increments and returns the local app-open session counter. Fires once per
 *  hook lifetime (this hook is mounted once, at the app root, for the app's
 *  whole lifetime — so "once per mount" is "once per cold start"). */
function useSessionCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_COUNT_KEY);
        const next = (raw ? parseInt(raw, 10) || 0 : 0) + 1;
        await AsyncStorage.setItem(SESSION_COUNT_KEY, String(next));
        if (!cancelled) setCount(next);
      } catch {
        // Local counter only — a failed read/write just under-counts sessions,
        // never blocks the rest of the trigger evaluation.
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return count;
}

export interface UsePaywallTriggersResult {
  /** Whether the win-back paywall modal should be shown right now. */
  shouldShow: boolean;
  /** Local app-open session count (for debugging / analytics). */
  sessionCount: number;
}

export function usePaywallTriggers({
  converted,
  paywallSeenAt,
  lastDismissedAt,
  winbackShownCount,
  engagement,
  config,
}: UsePaywallTriggersParams): UsePaywallTriggersResult {
  const cfg = { ...paywallTriggers, ...config };
  const sessionCount = useSessionCount();

  if (converted) return { shouldShow: false, sessionCount };
  if (winbackShownCount >= cfg.lifetimeCap) return { shouldShow: false, sessionCount };

  const sinceDismiss = daysSince(lastDismissedAt);
  if (sinceDismiss !== null && sinceDismiss < cfg.dismissCooldownDays) {
    return { shouldShow: false, sessionCount };
  }

  const sinceSeen = daysSince(paywallSeenAt);
  // Never seen the paywall at all yet (e.g. onboarding hasn't reached it) —
  // nothing to win back from.
  if (sinceSeen === null || sinceSeen < cfg.minDaysSincePaywallSeen) {
    return { shouldShow: false, sessionCount };
  }

  const isActivated =
    engagement.approvedChoreCount >= cfg.minApprovedChores ||
    engagement.payoutCount >= cfg.minPayouts ||
    sessionCount >= cfg.minSessions;

  return { shouldShow: isActivated, sessionCount };
}
