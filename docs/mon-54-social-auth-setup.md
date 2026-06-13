# MON-54 — Activating native social sign-in

The Apple + Google sign-in code is **fully built but dormant**. It activates the
moment `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is present in `.env`. Until then the
landing screen shows the disabled "coming soon" placeholders and no native module
is ever touched (so the app still runs in Expo Go).

Native modules require an **EAS development build** — social sign-in will not run
in Expo Go.

## What's already in the repo

- `src/lib/socialAuth.ts` — `signInWithGoogle()` / `signInWithApple()` →
  `supabase.auth.signInWithIdToken()`. Handles cancellation (silent), Apple
  first-auth name capture, and env-gated activation.
- `App.tsx` `LandingScreen` / `SocialAuthButton` — real pressable buttons when
  configured, placeholders otherwise. Apple shown first on iOS (Guideline 4.8
  parity), runtime availability re-checked.
- `app.json` — `expo-apple-authentication` plugin + `ios.usesAppleSignIn: true`;
  `@react-native-google-signin/google-signin` plugin (needs `iosUrlScheme`, below).
- Packages installed: `expo-apple-authentication`, `@react-native-google-signin/google-signin`.

## Manual checklist (Dustin)

### 1. Google Cloud Console
- [ ] OAuth consent screen configured.
- [ ] Create **three** OAuth client IDs: **Web** (Supabase uses this), **iOS**,
      **Android** (Android needs the SHA-1 from `eas credentials`).
- [ ] Bundle id `com.dweeres.monstir` on the iOS client; package
      `com.dweeres.monstir` on the Android client.

### 2. Apple Developer
- [ ] Enable the **Sign in with Apple** capability on the app id.
- [ ] Create a **Services ID** + key for Supabase.

### 3. Supabase → Authentication → Providers
- [ ] Enable **Google**, paste the **Web** client id + secret.
- [ ] Enable **Apple**, paste the Services ID / key.
- [ ] (Separate ticket item) URL Configuration: Site URL →
      `https://monstirapp.com/confirmed`; add `https://monstirapp.com/**` to the
      redirect allow list; keep `http://localhost:3000/**` for dev.

### 4. This repo
- [ ] `.env` — uncomment + fill:
      ```
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web client id>
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios client id>
      ```
- [ ] `app.json` — replace `iosUrlScheme`'s
      `com.googleusercontent.apps.REPLACE_WITH_REVERSED_IOS_CLIENT_ID` with the
      **reversed iOS client id** (the iOS client id with its dotted segments
      reversed, i.e. the `com.googleusercontent.apps.<id>` value from the iOS
      client's plist).

### 5. Build & verify (EAS dev build)
- [ ] `eas build --profile development --platform ios` (and android), install on a
      physical device.
- [ ] Apple, Google, and email sign-in all work on a physical iOS device.
- [ ] Social sign-in presents the native OS sheet — no web view.
- [ ] Apple first-auth name persists to the parent profile.
- [ ] Same-email cross-provider login resolves to one Supabase user.
- [ ] Cancelling the native sheet returns to the landing screen with no error.

## Still out of this repo (rest of MON-54)
- Marketing site `/confirmed` (static) + `/reset-password` (supabase-js) pages.
- Supabase URL config change (item 3 above) before any alpha invite.
