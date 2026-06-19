---
name: deploy-monstir
description: >-
  Build and ship a new PRODUCTION build of the Monstir app (Expo/EAS) to iOS
  TestFlight and/or Android production. Use this whenever the user wants to
  release, ship, deploy, publish, or push a new build of Monstir — e.g. "ship a
  new build", "push to TestFlight", "release the Android app", "deploy a new
  version", "cut a production build", or "update TestFlight". Trigger it even if
  they only name one platform or say it casually ("get this on my phone via
  TestFlight"), and prefer it over ad-hoc `eas` commands because it encodes the
  exact profiles, the App Store Connect app id, and the Apple/Google gotchas
  that otherwise cause failed submits.
---

# Deploy Monstir to production (iOS TestFlight + Android)

Monstir is an Expo / EAS React Native app. Releases go through **EAS Build**
(cloud build) and **EAS Submit** (upload to App Store Connect / Google Play).
This skill is the runbook for cutting a production build and getting it to
testers/stores. Follow it top to bottom; the "Gotchas" section explains the
failures that actually happen so you can pre-empt them instead of rediscovering
them mid-deploy.

## Project facts (don't re-derive these)

- EAS project: `@dweeres/monstir` · bundle id / package: `com.dweeres.monstir`
- App Store Connect `ascAppId`: **6781093359** (already in `eas.json` under
  `submit.production.ios.ascAppId`)
- EAS profiles: `development`, `preview`, `production`
- `production` profile has `autoIncrement: true` and `appVersionSource: "remote"`
  — EAS bumps the build number for you each production build. **That increment is
  what makes a build show up as a new build in TestFlight / Play.**
- Repo: `github.com/dustinweeres82/monstir`, default branch `main`
- `eas` is a global install and tends to be **outdated**. If a command fails on
  `eas.json` schema validation, retry the same command with `npx eas-cli@latest`.

## Before you build

1. **Make sure the code you want to ship is committed and on `main`** (EAS builds
   from the committed git state, not the working tree). Check `git status` /
   `git log`. If the user just merged a feature, you're good.
2. **Run a typecheck** so you don't ship a broken build: `npx tsc --noEmit`.
3. **Confirm who/what.** Ask the user which platform(s) they want if they didn't
   say: **iOS only**, **Android only**, or **both**. Don't assume.

## Decide the path

| Goal | Profile | Why |
|------|---------|-----|
| TestFlight / App Store | `production` (iOS) | Store-signed distribution build — the only kind TestFlight accepts |
| Google Play (internal/prod) | `production` (Android) | Store-signed AAB for Play |
| Quick on-device test, no store | `preview` | Internal/ad-hoc distribution — installs directly, **never reaches TestFlight/Play** |

If the user wants TestFlight or the store, it's always `production`. `preview`
builds are a dead end for store distribution — see Gotchas.

## iOS → TestFlight

One command builds **and** submits (auto-increments the build number, then
uploads to App Store Connect):

```bash
eas build --platform ios --profile production --auto-submit
```

Add `--non-interactive --no-wait` to queue it and get the build URL back
immediately (the cloud build runs ~15–20 min). With `--no-wait`, the submit is
queued server-side to run after the build finishes.

If a build already finished and you only need to submit it:

```bash
eas submit --platform ios --latest --non-interactive
```

After a successful submit, Apple **processes** the binary (~5–10 min) and then it
appears in TestFlight:
`https://appstoreconnect.apple.com/apps/6781093359/testflight/ios`

- **Internal testers** get it automatically, no review.
- **External testers** need Beta App Review on the first build of a version;
  later builds with no major changes are usually auto-approved.

Auth (Distribution Certificate, Provisioning Profile, App Store Connect API key)
is stored on EAS servers and resolves automatically — you should not need to set
up credentials.

## Android → Google Play (production)

```bash
eas build --platform android --profile production --auto-submit
```

or build then submit:

```bash
eas submit --platform android --latest --non-interactive
```

**Prerequisite that may NOT be set up yet:** Android submit needs a **Google Play
service-account JSON key** with API access, referenced from
`submit.production.android.serviceAccountKeyPath` (or stored on EAS). As of the
last deploy this was not configured. If `eas submit --platform android` fails
asking for a service account:

1. Tell the user it's a one-time setup, not a code problem.
2. They create a service account in Google Cloud / Play Console
   (Play Console → Setup → API access), grant it release permissions, download
   the JSON key.
3. Add to `eas.json`:
   ```json
   "submit": { "production": { "android": { "serviceAccountKeyPath": "./play-service-account.json" } } }
   ```
   (keep the key out of git) and optionally set `"track": "internal"` to land in
   the internal testing track first instead of production.

You can still **build** the Android AAB without this; only the submit step needs
it. Offer to build now and submit once the key is in place.

## Both platforms at once

```bash
eas build --platform all --profile production --auto-submit
```

(Same gotchas apply per platform; the Android submit still needs the service
account.)

## Gotchas (the things that actually break a deploy)

**Apple 403 — "PLA Update available".** Apple periodically ships a new Program
License Agreement; until the **Account Holder** accepts it, every membership API
call (registering the bundle id, submitting) returns 403 and the submit fails.
This is a legal acceptance only the user can do: sign in at
`developer.apple.com/account` → accept the "Review Agreement" banner, and check
App Store Connect → Business → Agreements, Tax, and Banking for anything
*Pending*. You cannot do this for them — surface it and wait. The build itself is
unaffected, so you can build in parallel while they accept.

**`ascAppId` must be nested under `ios`.** In `eas.json` it lives at
`submit.production.ios.ascAppId`, **not** flat at `submit.production.ascAppId`.
The flat form fails validation with `"submit.production.ascAppId" is not allowed`
on every eas-cli version — misleading, because EAS's own error text suggests the
field by its short name. It's already set correctly in this repo; don't "fix" it
flat.

**`preview` ≠ TestFlight.** The `preview` profile is `distribution: internal`
(ad-hoc) — it installs straight onto UDID-registered devices via the Expo link
and never touches Apple's beta channel. For TestFlight you must use `production`.

**Outdated global eas-cli.** If you hit an `eas.json is not valid` error that
looks wrong (a field you know is valid), the local `eas` is stale — rerun the
exact command with `npx eas-cli@latest …`. It reads the same credentials and
config.

**Non-interactive needs the app id.** `eas submit --non-interactive` can't prompt
for which App Store Connect app to use, so it relies on `ascAppId` in `eas.json`
(set). Interactive `eas submit` resolves the app by bundle id, but you can't drive
interactive prompts from a non-TTY shell — prefer the non-interactive form here.

## Verifying / reporting back

- Build status: `eas build:list --platform ios --limit 1` (or `--json` and parse
  `status`: `IN_QUEUE` → `IN_PROGRESS` → `FINISHED` / `ERRORED`).
- To wait without blocking a turn, poll `eas build:list … --json` in a background
  loop until status leaves `IN_PROGRESS`, then run the submit.
- Submit success prints a `submissions/<id>` URL and "uploaded to App Store
  Connect". Tell the user the build number, that Apple is processing, and the
  TestFlight URL above.
- If you changed `eas.json`, commit it to `main` so future submits are
  reproducible.

## Notes

- TestFlight/store submission is **not** a public release — it's the beta/staging
  channel. Going live on the App Store is a separate, explicit step.
- "Production build" here means *store-signed*, not "published to users."
