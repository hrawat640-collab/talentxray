# Talentxray Testing Checklist

Use this file to validate the latest Talentxray updates.

## 1) Setup

- Open browser DevTools (Console + Application > Local Storage).
- Ensure `supabase-config.js` exists and is loaded.
- Hard refresh page (`Cmd + Shift + R`).

## 2) Config Load Check

- In Console, run:
  - `window.__SKILLMAPPER_SUPABASE__`
  - `window.TXR_SUPABASE_URL`
  - `window.TXR_SUPABASE_ANON_KEY`
- Expected:
  - All values are present.
  - URL is your Supabase project URL.
  - Anon key is non-empty.

## 3) Role Logic (OR only)

- In Role field, add chips:
  - `Product Manager`
  - `PM`
  - `Product Lead`
- Expected in generated query:
  - Role terms appear as OR group:
  - `("Product Manager" OR "PM" OR "Product Lead")`
- Confirm no role `AND` or role `NOT` logic is added by builder.

## 4) Talentxray Login

- Click top-right user chip -> Sign in.
- Login with Google or OTP email.
- Expected:
  - After Google OAuth, browser returns to **the same TalentXray URL** you started from (e.g. `http://localhost:3000/` or `https://talentxray.talentsradar.com/`).
  - Login modal closes.
  - User initials appear in top-right.
  - `txr_user_email`, `txr_user_name`, `tr_shared_email` exist in Local Storage.

If Google login sends you to SkillMapper or another site, add redirect URLs in **Supabase → Authentication → URL Configuration → Redirect URLs**:

```
http://localhost:3000/**
http://127.0.0.1:3000/**
https://talentxray.talentsradar.com/**
```

Site URL should be `https://talentxray.talentsradar.com` (or your primary TalentXray host).

## 5) Skillmapper Auto Access from Talentxray

- After Talentxray login, inspect SkillMapper links (`suiteNavSM` and onboarding link).
- Expected:
  - Links include `?au=<encoded_email>`.
- Click SkillMapper link.
- Expected:
  - User is auto-recognized in Skillmapper (no manual re-login prompt).

## 6) Existing Session Rehydrate

- Keep `sm_user_email` and/or Supabase `sb-*-auth-token` in local storage.
- Remove only Talentxray keys:
  - `txr_user_email`, `txr_user_name`
- Reload Talentxray.
- Expected:
  - Session is restored automatically.
  - Login modal does not force open.

## 7) Sign Out Behavior

- Open user menu -> Sign out.
- Expected:
  - Talentxray user keys clear.
  - Login modal can be opened again from top-right.

## 8) Regression Smoke

- Build/open query and click:
  - `Open in Google`
  - `Copy`
  - `Variations`
- Expected:
  - All actions still function.
  - No console errors.

## 10) Analytics Event Verification

Run the backend locally so server-side events are written to `data/*.jsonl`:

```bash
npm install
npm start
```

Open `http://localhost:3000` (not `file://`).

### Browser (GA4 + network)

1. Open DevTools → **Network** tab → filter by `collect` (GA4) or `search-event` (API).
2. Perform actions and confirm requests fire:

| Action | GA4 event name | Server action (JSONL) |
|--------|----------------|-------------------------|
| Page load (logged out) | `login_gate_shown` | — |
| User chip → Sign in | `login_modal_opened` | — |
| Auth tab toggle | `auth_tab_switched` | — |
| Copy search string | `query_copied` | `query_copied` |
| Open in Google | `search_open` | `open_google` |
| Variations button | `variations_generated` | `variations_generated` |
| Variation Open | `variation_open` | `variation_open` |
| Platform toggle | `platform_changed` | `platform_changed` |
| Reset | `form_reset` | `form_reset` |
| History Reuse | `history_reused` | `history_reused` |
| Export CSV | `history_exported` | `history_exported` |
| Sign out | `logout` | — |

3. In Console, you can inspect the last GA payload:

```js
window.dataLayer.slice(-5)
```

### Server logs (JSONL)

After triggering tool actions, check append-only logs:

```bash
tail -f data/search-events.jsonl
```

Each line is JSON with `ts`, `email`, `action`, `platforms`, `query`, etc.

Health check:

```bash
curl http://localhost:3000/api/health
```

Expected: `{"ok":true,"service":"talentxray-api"}`

### GA4 realtime (production)

In Google Analytics → **Reports → Realtime**, perform actions on the deployed site and confirm custom events appear within ~30 seconds.

Custom event **parameters** (e.g. `platforms`, `query_length`) only appear in standard reports after you register them as **Custom dimensions** in GA4 → Admin → Custom definitions (can take 24–48 hours).

### GA4 DebugView (localhost — recommended)

1. In GA4 → **Admin → DebugView**, keep this tab open.
2. Open `http://localhost:3000` and use the app (Copy, Reset, etc.).
3. Console should log `[TXR][GA] query_copied {...}` for each event.
4. Events should appear in **DebugView** within seconds (not standard Reports).

If Console shows `gtag not loaded — event skipped`, an ad blocker or privacy extension is blocking Google Tag Manager.

### GA4 troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Nothing in Realtime or DebugView | Ad blocker, wrong GA property, or not logged into the GA account that owns `G-59QDBJYDPN` |
| Console shows `[TXR][GA]` but not DebugView | DebugView only works with `debug_mode` (enabled automatically on localhost) or [GA Debugger extension](https://chrome.google.com/webstore/detail/google-analytics-debugger) |
| Events in Realtime but not Events report | Standard GA4 reports lag 24–48 hours |
| Server log empty | `npm start` not running, or page opened via `file://` instead of `http://localhost:3000` |
| Only some events | Auth events fire after login; tool events need a built query |

Network check: DevTools → Network → filter `google-analytics.com` or `collect` — each action should show a request with status 204.

## 11) Optional Supabase Row Check

- In Supabase SQL editor:
  - `select * from public.sm_users order by last_login desc limit 20;`
- Expected:
  - Logged-in test user email exists (if upsert/write path is implemented).

