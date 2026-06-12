#!/usr/bin/env node
/** Writes client/public/_redirects so Netlify can proxy /api/* to Render at build time. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiBase = (process.env.RENDER_API_URL || 'https://talentxray-api.onrender.com').replace(/\/$/, '');
const out = path.join(root, 'client', 'public', '_redirects');

const lines = [
  `# Proxy API to Render (${apiBase})`,
  `/api/*  ${apiBase}/api/:splat  200`,
  '',
];

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, lines.join('\n'), 'utf8');
console.log(`Wrote ${out} → ${apiBase}/api/*`);
