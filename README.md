# TalentXray

Google X-Ray sourcing assistant — builds boolean search strings for LinkedIn/GitHub/Behance and opens them on Google.

## Project structure

```
client/                 Frontend (Vite, vanilla ES modules)
  index.html            Page markup (login modal, builder, how-to, footer)
  vite.config.js        Dev server (port 5173, proxies /api → :3000) + build config
  src/
    main.js             Entry point: exposes inline handlers on window, boot sequence
    styles/main.css     All styles
    data/               Static datasets (skills DB, job titles, locations)
    js/
      config.js         Supabase URL / anon key / auth email base
      state.js          Shared mutable app state (chips, history, templates)
      platforms.js      Platform definitions (site: filters, noise filters)
      query-builder.js  buildString — composes the X-Ray query + Google URL
      bubbles.js        Chip inputs, autocomplete, keyboard handling
      live-update.js    Live output panel, multi-platform links
      insights.js       Query strength meter + smart tips
      variations.js     Query variation generator
      history.js        Search history + CSV export
      templates.js      Saved templates (load/delete)
      auth.js           Supabase auth (Google OAuth, email/password, magic link), login gate
      analytics.js      GA4 events + server event logging
      actions.js        Top-level actions (open in Google, copy, reset, platform toggle)
      prefill.js        URL-param prefill (?role=&must=&nice=) for SkillMapper deep links
      ui.js, util.js    Toast, tabs, clipboard, highlighting helpers
server/
  server.js             Express API + serves client/dist in production
scripts/
  smoke-test.mjs        Playwright E2E smoke test
data/                   Append-only JSONL event logs (created at runtime, gitignored)
```

## Run locally

```bash
npm install
npm run dev        # Express API on :3000 + Vite dev server on :5173
```

Open [http://localhost:5173](http://localhost:5173) (hot reload; /api proxied to :3000).

## Production build

```bash
npm run build      # bundles frontend into client/dist
npm start          # Express serves client/dist + /api on :3000
```

## Smoke test

```bash
npm run build && npm start &
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers node scripts/smoke-test.mjs
```

## Backend endpoints

- `GET /api/health`
- `POST /api/lead`
- `POST /api/login-event`
- `POST /api/search-event`
- `POST /api/search-results` — live Google results via Serper.dev (needs SERPER_API_KEY in .env; cached 15 min, rate limited 20/min per IP)

Events are stored locally in `data/*.jsonl`.

## Notes

- The Supabase anon key in `client/src/js/config.js` is intentionally public; access control relies on Supabase RLS.
- OAuth/email redirect URLs must be allow-listed in Supabase → Auth → URL Configuration (`localhost:3000`, `localhost:5173`, production domain).
- Netlify deploys use `netlify.toml` (publishes `client/dist`); hidden Netlify forms in `index.html` act as the event-logging fallback when no Express API is reachable.
