const express = require('express');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT || 3000);
// Render / other reverse proxies — needed for rate-limit IP and x-forwarded-for.
app.set('trust proxy', 1);
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const clientDist = path.join(rootDir, 'client', 'dist');

app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true }));
// Serves the built frontend. In development the client runs on Vite (port 5173),
// which proxies /api/* here.
app.use(express.static(clientDist));

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function appendJsonl(fileName, payload) {
  ensureDataDir();
  const filePath = path.join(dataDir, fileName);
  const row = `${JSON.stringify(payload)}\n`;
  fs.appendFileSync(filePath, row, 'utf8');
}

function baseEvent(req) {
  return {
    ts: new Date().toISOString(),
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
    ua: req.headers['user-agent'] || ''
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'talentxray-api' });
});

/* ---- Live search results via Serper.dev (Google SERP API) ----
 * Key stays server-side; every call costs credits, so responses are cached
 * (15 min per query+page) and the endpoint is rate limited per IP. */
const SERPER_API_KEY = (process.env.SERPER_API_KEY || '').trim();
const SERPER_CACHE_TTL_MS = 15 * 60 * 1000;
const SERPER_CACHE_MAX = 500;
const serperCache = new Map(); // "page|query" -> { at, payload }

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'rate_limited' }
});

app.post('/api/search-results', searchLimiter, async (req, res) => {
  const query = String(req.body.query || '').trim();
  const page = Math.min(Math.max(parseInt(req.body.page, 10) || 1, 1), 5);
  if (!query || query.length > 800) return res.status(400).json({ ok: false, error: 'invalid_query' });
  if (!SERPER_API_KEY) return res.status(503).json({ ok: false, error: 'search_not_configured' });

  const cacheKey = `${page}|${query}`;
  const hit = serperCache.get(cacheKey);
  if (hit && Date.now() - hit.at < SERPER_CACHE_TTL_MS) {
    return res.json({ ...hit.payload, cached: true });
  }

  try {
    const resp = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 10, page })
    });
    if (!resp.ok) return res.status(502).json({ ok: false, error: `serper_${resp.status}` });
    const data = await resp.json();
    const organic = Array.isArray(data.organic) ? data.organic : [];
    const payload = {
      ok: true,
      count: organic.length,
      hasMore: organic.length >= 10,
      page,
      results: organic.map(r => ({
        title: String(r.title || ''),
        link: String(r.link || ''),
        snippet: String(r.snippet || ''),
        position: Number(r.position) || 0
      }))
    };
    serperCache.set(cacheKey, { at: Date.now(), payload });
    if (serperCache.size > SERPER_CACHE_MAX) {
      serperCache.delete(serperCache.keys().next().value); // evict oldest insert
    }
    appendJsonl('serper-usage.jsonl', {
      ...baseEvent(req),
      query: query.slice(0, 500),
      page,
      count: payload.count
    });
    res.json(payload);
  } catch (_err) {
    res.status(502).json({ ok: false, error: 'search_failed' });
  }
});

app.post('/api/lead', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const name = String(req.body.name || '').trim();
  const consent = String(req.body.consent || 'yes').trim().toLowerCase();
  if (!email || !name) return res.status(400).json({ ok: false, error: 'email_and_name_required' });

  appendJsonl('leads.jsonl', {
    ...baseEvent(req),
    email,
    name,
    consent
  });
  res.json({ ok: true });
});

app.post('/api/search-event', (req, res) => {
  appendJsonl('search-events.jsonl', {
    ...baseEvent(req),
    email: String(req.body.email || '').trim().toLowerCase(),
    action: String(req.body.action || '').trim(),
    platforms: String(req.body.platforms || '').trim(),
    query: String(req.body.query || '').slice(0, 5000),
    feedback: String(req.body.feedback || '').trim(),
    result_url: String(req.body.result_url || '').slice(0, 2000)
  });
  res.json({ ok: true });
});

app.post('/api/login-event', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ ok: false, error: 'email_required' });
  appendJsonl('login-events.jsonl', {
    ...baseEvent(req),
    email,
    name: String(req.body.name || '').trim(),
    consent: String(req.body.consent || 'yes').trim().toLowerCase(),
    method: String(req.body.method || '').trim()
  });
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Talentxray backend running on http://localhost:${port}`);
});
