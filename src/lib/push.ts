// MON-29 — client side of the push notification system.
//
// Registers this device's Expo push token, keyed to whoever is signed in. Every
// device authenticates as the parent; a kid (paired) device passes its kidId so
// server-side targeting can ping that one kid. Permission priming follows the
// PRD: parent primes after reaching their home, a kid primes on first chore
// submission — so callers pass `promptIfNeeded` to control whether the OS prompt
// may appear. Nothing here ever throws into callers: notifications are additive,
// never gating.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { upsertPushToken } from './db';

// Foreground presentation: show the banner + play sound, don't touch the badge.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let channelReady = false;
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android' || channelReady) return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
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
 * Safe to call on every launch — it upserts.
 */
export async function registerPushToken(opts: {
  kidId?: string | null;
  promptIfNeeded?: boolean;
}): Promise<boolean> {
  const { kidId = null, promptIfNeeded = false } = opts;
  try {
    if (Platform.OS === 'web') return false;
    if (!Constants.isDevice && Platform.OS === 'ios') {
      // iOS Simulator can't obtain a remote push token; skip quietly.
      return false;
    }

    await ensureAndroidChannel();

    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted) {
      if (!promptIfNeeded || current.canAskAgain === false) return false;
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return false;

    const projectId = getProjectId();
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
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
 * only path back is the system Settings app.
 */
export async function getPushPermission(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  try {
    if (Platform.OS === 'web') return { granted: false, canAskAgain: false };
    const p = await Notifications.getPermissionsAsync();
    return { granted: p.granted, canAskAgain: p.canAskAgain };
  } catch {
    return { granted: false, canAskAgain: true };
  }
}

export interface PushRoute {
  screen?: string;
  completion_id?: string;
  kid_id?: string;
  [key: string]: unknown;
}

function extractRoute(response: Notifications.NotificationResponse | null): PushRoute | null {
  const data = response?.notification?.request?.content?.data as PushRoute | undefined;
  return data && typeof data === 'object' ? data : null;
}

/**
 * Subscribe to notification taps while the app is running. The callback gets the
 * notification's `data` payload (e.g. `{ screen: 'parentApprovals' }`). Returns
 * an unsubscribe function.
 */
export function addNotificationResponseListener(cb: (route: PushRoute) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const route = extractRoute(response);
    if (route) cb(route);
  });
  return () => sub.remove();
}

/**
 * If the app was cold-started by tapping a notification, return its route so the
 * launch flow can deep-link once. Returns null otherwise.
 */
export async function getInitialNotificationRoute(): Promise<PushRoute | null> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    return extractRoute(response);
  } catch {
    return null;
  }
}
