// ─── Native social sign-in (MON-54) ────────────────────────────────────────────
//
// Primary auth path: Sign in with Apple + Google via native OS sheets →
// supabase.auth.signInWithIdToken({ provider, token }). No web view, no redirect.
//
// SCAFFOLD STATE (Jun 2026): the whole social row stays dormant until the
// console setup is done and the client IDs land in env. `socialAuthEnabled` is
// derived from EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID — until that's present the
// LandingScreen keeps rendering the disabled "coming soon" placeholders and
// NONE of the native modules below are ever required. That keeps the app
// runnable in Expo Go (the Google module is not part of the Expo Go runtime).
//
// Activation checklist lives in docs/mon-54-social-auth-setup.md.

import { Platform, TurboModuleRegistry } from 'react-native';
import { supabase } from './supabase';

/** Whether the native Google module is actually present in this binary. Expo Go
 *  (and dev builds made before the google-signin pod was added) don't include it,
 *  and `require()`-ing the JS wrapper triggers a throwing `getEnforcing` call.
 *  `TurboModuleRegistry.get` (non-enforcing) returns null without throwing, so we
 *  can detect the missing module and degrade gracefully instead of redboxing. */
function googleNativeAvailable(): boolean {
  try { return TurboModuleRegistry.get('RNGoogleSignin') != null; } catch { return false; }
}

// ── Env-gated rollout ──────────────────────────────────────────────────────────
// Supabase verifies the Google id token against the *web* client id, so that one
// is the source of truth for "Google is configured". The iOS/Android client ids
// are handed to the native SDK; web client id is the rollout flag for the row.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

/** Google sign-in is ready once Supabase has a web client id to verify against. */
export const googleEnabled = GOOGLE_WEB_CLIENT_ID.length > 0;

/**
 * Apple is iOS-only and rolls out alongside Google: App Store Guideline 4.8
 * requires Apple Sign In to be offered whenever Google is. So the moment the
 * Google web client id lands, the Apple button activates on iOS too. Runtime
 * availability is still re-checked via isAppleSignInAvailable() before use.
 */
export const appleEnabled = Platform.OS === 'ios' && googleEnabled;

/** Master flag the UI reads to decide real buttons vs. "coming soon" placeholders. */
export const socialAuthEnabled = googleEnabled || appleEnabled;

// ── Result shape ────────────────────────────────────────────────────────────────
export interface SocialUser { name: string; email: string }
export type SocialResult =
  | { ok: true; user: SocialUser }
  // Cancelled = user dismissed the native sheet → return to auth screen silently,
  // no error toast (per ticket edge cases).
  | { ok: false; cancelled: boolean; message?: string };

function sessionUserFrom(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined): SocialUser {
  const meta = user?.user_metadata ?? {};
  const name = (meta.name as string) || (meta.full_name as string) || '';
  return { name, email: user?.email ?? '' };
}

// ── Google ───────────────────────────────────────────────────────────────────────
let googleConfigured = false;
function ensureGoogleConfigured() {
  if (googleConfigured) return;
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
  });
  googleConfigured = true;
}

export async function signInWithGoogle(): Promise<SocialResult> {
  if (!googleEnabled) return { ok: false, cancelled: false, message: 'Google sign-in is not configured yet.' };
  // Env says Google is on, but the running binary may not contain the native
  // module (Expo Go / a stale dev build). Bail with a friendly message rather
  // than letting require() throw a redbox.
  if (!googleNativeAvailable()) {
    return { ok: false, cancelled: false, message: 'Google sign-in needs the native dev build. It isn’t available in Expo Go.' };
  }
  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    ensureGoogleConfigured();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // google-signin v13+: signIn() resolves with a discriminated response rather
    // than throwing on cancel.
    const response = await GoogleSignin.signIn();
    if (response?.type === 'cancelled') return { ok: false, cancelled: true };
    const idToken = response?.data?.idToken ?? response?.idToken;
    if (!idToken) return { ok: false, cancelled: false, message: 'No identity token returned from Google.' };

    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error) return { ok: false, cancelled: false, message: error.message };
    return { ok: true, user: sessionUserFrom(data.user) };
  } catch (e: any) {
    // Older SDKs / edge paths still throw a SIGN_IN_CANCELLED status code.
    try {
      const { statusCodes } = require('@react-native-google-signin/google-signin');
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) return { ok: false, cancelled: true };
    } catch {}
    return { ok: false, cancelled: false, message: e?.message ?? 'Google sign-in failed.' };
  }
}

// ── Apple ─────────────────────────────────────────────────────────────────────────
/** True only when the Apple button should actually be shown + tappable. */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (!appleEnabled) return false;
  try {
    const AppleAuthentication = require('expo-apple-authentication');
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function signInWithApple(): Promise<SocialResult> {
  if (Platform.OS !== 'ios') return { ok: false, cancelled: false, message: 'Apple sign-in is iOS only.' };
  try {
    const AppleAuthentication = require('expo-apple-authentication');
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    const token = credential.identityToken;
    if (!token) return { ok: false, cancelled: false, message: 'No identity token returned from Apple.' };

    // Apple returns the full name ONLY on the first authorization, never again.
    // Capture it here so we can persist it before any navigation.
    const appleName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();

    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token });
    if (error) return { ok: false, cancelled: false, message: error.message };

    // Persist the first-auth name immediately if Supabase doesn't already hold one.
    const existingName = (data.user?.user_metadata?.name as string) ?? '';
    if (appleName && !existingName) {
      await supabase.auth.updateUser({ data: { name: appleName } });
    }

    return { ok: true, user: { name: existingName || appleName, email: data.user?.email ?? '' } };
  } catch (e: any) {
    // User dismissed the Apple sheet.
    if (e?.code === 'ERR_REQUEST_CANCELED') return { ok: false, cancelled: true };
    return { ok: false, cancelled: false, message: e?.message ?? 'Apple sign-in failed.' };
  }
}
