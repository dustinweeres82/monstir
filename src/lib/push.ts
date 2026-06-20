// MON-29 — client side of the push notification system.
//
// Registers this device's Expo push token, keyed to whoever is signed in. Every
// device authenticates as the parent; a kid (paired) device passes its kidId so
// server-side targeting can ping that one kid. Permission priming follows the
// PRD: parent primes after reaching their home, a kid primes on first chore
// submission — so callers pass `promptIfNeeded` to control whether the OS prompt
// may appear. Nothing here ever throws into callers: notifications are additive,
// never gating.
//
// expo-notifications is loaded LAZILY and behind a guard. Expo Go (SDK 53+) ships
// without the push native modules (ExpoPushTokenManager), and touching them
// throws — at import time that would crash the whole app at startup. So we never
// reference the module at module-eval time: every entry point resolves it via
// notifs() and degrades to a no-op when it's absent. Real push requires a dev /
// TestFlight build.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { upsertPushToken } from './db';
import type * as ExpoNotifications from 'expo-notifications';

// Expo Go (SDK 53+) ships without the push native modules. Even `require`-ing
// expo-notifications there triggers a native-module lookup that throws straight
// to the global error handler (escaping a local try/catch in dev). Runtime
// detection via Constants is unreliable across SDKs, so probe for the actual
// native module: requireOptionalNativeModule returns null (never throws) when
// it's absent. Present only in dev / standalone (TestFlight / App Store) builds.
function pushNativeAvailable(): boolean {
  try {
    return requireOptionalNativeModule('ExpoPushTokenManager') != null;
  } catch {
    return false;
  }
}

let _notifs: typeof ExpoNotifications | null | undefined;
function notifs(): typeof ExpoNotifications | null {
  if (_notifs !== undefined) return _notifs;
  if (!pushNativeAvailable()) {
    _notifs = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _notifs = require('expo-notifications') as typeof ExpoNotifications;
    // Foreground presentation: show banner + sound, leave the badge alone.
    // Guarded separately — the first native touch is where Expo Go throws.
    try {
      _notifs.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    } catch {
      /* handler is best-effort */
    }
  } catch {
    _notifs = null; // module / native side unavailable (Expo Go, web)
  }
  return _notifs ?? null;
}

let channelReady = false;
async function ensureAndroidChannel(N: typeof ExpoNotifications): Promise<void> {
  if (Platform.OS !== 'android' || channelReady) return;
  try {
    await N.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: N.AndroidImportance.HIGH,
      lockscreenVisibility: N.AndroidNotificationVisibility.PUBLIC,
    });
    channelReady = true;
  } catch {
    /* channel setup is best-effort */
  }
}

function getProjectId(): string | undefined {
  const extra = (Constants.expoConfig?.extra ?? (Constants as { easConfig?: unknown }).easConfig) as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId;
}

/**
 * Register (or refresh) this device's Expo push token for the signed-in
 * household. Pass `kidId` for a paired kid device, null for the parent's own
 * device. `promptIfNeeded` controls whether an undetermined permission may
 * trigger the OS prompt (false = silent: only register if already granted).
 * Safe to call on every launch — it upserts. No-op (returns false) when push
 * isn't available in this runtime.
 */
export async function registerPushToken(opts: {
  kidId?: string | null;
  promptIfNeeded?: boolean;
}): Promise<boolean> {
  const { kidId = null, promptIfNeeded = false } = opts;
  try {
    if (Platform.OS === 'web') return false;
    const N = notifs();
    if (!N) return false;
    if (!Constants.isDevice && Platform.OS === 'ios') {
      // iOS Simulator can't obtain a remote push token; skip quietly.
      return false;
    }

    await ensureAndroidChannel(N);

    const current = await N.getPermissionsAsync();
    let granted = current.granted;
    if (!granted) {
      if (!promptIfNeeded || current.canAskAgain === false) return false;
      const req = await N.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return false;

    const projectId = getProjectId();
    const tokenResp = await N.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const expoToken = tokenResp.data;
    if (!expoToken) return false;

    let timezone = 'UTC';
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      /* keep UTC fallback */
    }

    await upsertPushToken({ expoToken, kidId, platform: Platform.OS, timezone });
    return true;
  } catch (e) {
    console.warn('[push] registerPushToken failed:', e);
    return false;
  }
}

/**
 * Current OS notification permission for this device. `granted` false +
 * `canAskAgain` false means the user denied it and we can no longer prompt — the
 * only path back is the system Settings app. When push isn't available in this
 * runtime (Expo Go, web) we report `granted: true` so callers don't surface a
 * "turn it on" affordance that couldn't do anything here.
 */
export async function getPushPermission(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  try {
    if (Platform.OS === 'web') return { granted: true, canAskAgain: false };
    const N = notifs();
    if (!N) return { granted: true, canAskAgain: false };
    const p = await N.getPermissionsAsync();
    return { granted: p.granted, canAskAgain: p.canAskAgain };
  } catch {
    return { granted: true, canAskAgain: false };
  }
}

export interface PushRoute {
  screen?: string;
  completion_id?: string;
  kid_id?: string;
  [key: string]: unknown;
}

function extractRoute(response: ExpoNotifications.NotificationResponse | null): PushRoute | null {
  const data = response?.notification?.request?.content?.data as PushRoute | undefined;
  return data && typeof data === 'object' ? data : null;
}

/**
 * Subscribe to notification taps while the app is running. The callback gets the
 * notification's `data` payload (e.g. `{ screen: 'parentApprovals' }`). Returns
 * an unsubscribe function (a no-op when push is unavailable).
 */
export function addNotificationResponseListener(cb: (route: PushRoute) => void): () => void {
  try {
    const N = notifs();
    if (!N) return () => {};
    const sub = N.addNotificationResponseReceivedListener((response) => {
      const route = extractRoute(response);
      if (route) cb(route);
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}

/**
 * If the app was cold-started by tapping a notification, return its route so the
 * launch flow can deep-link once. Returns null otherwise.
 */
export async function getInitialNotificationRoute(): Promise<PushRoute | null> {
  try {
    const N = notifs();
    if (!N) return null;
    const response = await N.getLastNotificationResponseAsync();
    return extractRoute(response);
  } catch {
    return null;
  }
}
