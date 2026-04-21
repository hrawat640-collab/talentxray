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
  - Login modal closes.
  - User initials appear in top-right.
  - `txr_user_email`, `txr_user_name`, `tr_shared_email` exist in Local Storage.

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

## 9) Optional Supabase Row Check

- In Supabase SQL editor:
  - `select * from public.sm_users order by last_login desc limit 20;`
- Expected:
  - Logged-in test user email exists (if upsert/write path is implemented).

