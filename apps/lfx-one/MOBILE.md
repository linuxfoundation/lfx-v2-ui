<!-- Copyright The Linux Foundation and each contributor to LFX. -->
<!-- SPDX-License-Identifier: MIT -->

# Native iOS Sideload (Capacitor)

Personal-research instructions for installing LFX as a native iPhone app via
Capacitor + Xcode. The app is a thin native shell around the existing
Angular SSR build — no separate codebase, no UI rewrite. The shell loads the
SSR app from a remote URL (your local machine via cloudflared, or any hosted
deployment).

## Prerequisites

- A **Mac** (Linux / Windows can't sign iOS apps)
- **Xcode** 15+ from the App Store
- **CocoaPods**: `brew install cocoapods` or `sudo gem install cocoapods`
- An **Apple ID** — free tier works for sideload but provisioning profiles
  expire after **7 days**, so you'll need to rebuild + reinstall weekly.
  A paid Apple Developer Account ($99/yr) extends profiles to 1 year.
- The repo cloned and dependencies installed (`yarn install`)
- A working `.env` and `.env.local` (the Phase 1–3 env vars)

## One-time setup

On your Mac, from the repo root:

```bash
cd apps/lfx-one
# Scaffold the Xcode project. This creates apps/lfx-one/ios/ which is
# gitignored — it's a generated artefact, not source.
yarn cap:ios:init

# Generate the iOS app icon set + splash screens from
# resources/icon.png + resources/splash.png (LFX brand mark).
yarn cap:assets
```

This produces an `ios/App/App.xcworkspace` with the Capacitor runtime,
LFX-branded icon and splash, and Info.plist already wired to
`org.linuxfoundation.lfx`.

## Per-build cycle

Whenever the web app changes, or whenever your tunnel URL changes:

```bash
# 1. Build the SSR + browser bundle
yarn build

# 2. Tunnel the local server so the iPhone can reach it (HTTPS required)
cloudflared tunnel --url http://localhost:4000
# copy the trycloudflare URL it prints

# 3. Sync the URL into the Xcode project. Pass the tunnel URL via env:
LFX_MOBILE_BACKEND_URL=https://your-name.trycloudflare.com yarn cap:sync

# 4. Open in Xcode
yarn cap:open
```

Inside Xcode:

- Select your iPhone in the device picker (top bar — must be plugged in via
  USB and trusted)
- Project → App → Signing & Capabilities → Team → choose your Apple ID
- Hit ▶ (Run)

First install: on the iPhone, open Settings → General → VPN & Device
Management → trust the developer certificate.

## Backend connection

The Capacitor app loads the SSR app from `LFX_MOBILE_BACKEND_URL` (set in
`capacitor.config.ts`). Every API call, SSR navigation, Auth0 callback, and
push-subscription request goes to that URL. Practical implications:

- **Auth0 callback URLs** must include the tunnel domain. Add
  `https://your-name.trycloudflare.com/callback` to the Auth0 app's allowed
  callbacks (1Password vault).
- **Tunnel URLs change** every time you restart cloudflared (unless you set
  up a named tunnel). Re-run `yarn cap:sync` and reinstall when they
  change. For a stable URL, use Cloudflare's [named
  tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/),
  Tailscale Funnel, or a real hosted dev server.
- **Push notifications** keep working through the WebView via the existing
  web-push code shipped in Phase 3. iOS 16.4+ supports web push inside
  installable PWAs and Capacitor WebViews. If you later want native APNs
  push (richer payloads, better reliability), add `@capacitor/push-notifications`
  and set up an APNs cert — separate piece of work.

## What works inside the WebView

Everything from the PWA work — Phase 1 manifest, Phase 2 offline cache,
Phase 3 push notifications, vote-creation push, meeting reminder cron,
background sync. The PWA install banner is suppressed inside Capacitor
(detected via `Capacitor.isNativePlatform()`) so it doesn't nag you to
install the app you're already running.

## Free-tier provisioning workaround

If you don't want to pay $99/yr and the 7-day expiry is annoying:

- Plug in your iPhone every week and re-run ▶ in Xcode
- Or use [AltStore](https://altstore.io/) — installs from your Mac and
  auto-refreshes the cert as long as your Mac is on the same Wi-Fi
- Or pay the $99 (most pragmatic for daily use)

## Common issues

| Symptom                                     | Fix                                                                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Xcode: "No matching profiles found"         | Sign in with an Apple ID under Project → Signing → Team. Free Apple ID works.                                           |
| App opens but blank screen                  | The tunnel URL is wrong, expired, or unreachable. Test it in Safari first. Re-run `yarn cap:sync` with the correct URL. |
| "Untrusted Developer" error on first launch | iPhone Settings → General → VPN & Device Management → trust the cert                                                    |
| Auth0 redirects back to a 400               | The callback URL isn't whitelisted. Add the tunnel URL to the Auth0 app config.                                         |
| Push notifications never arrive             | Web-push inside Capacitor needs iOS 16.4+. Check Settings → LFX → Notifications is enabled.                             |
| Profile expired after 7 days                | Re-run ▶ in Xcode. Or pay for an Apple Developer Account.                                                               |

## Tearing down

The whole Capacitor project lives at `apps/lfx-one/ios/`. Delete it to
remove the native scaffold; rerun `yarn cap:ios:init` to recreate.

```bash
rm -rf apps/lfx-one/ios
```
