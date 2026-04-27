const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT || 3000);
const dataDir = path.join(__dirname, 'data');

app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

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
