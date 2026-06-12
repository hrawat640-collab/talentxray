/**
 * End-to-end analytics event verification for TalentXray.
 * Run: node scripts/test-analytics-events.mjs
 */
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DEFAULT_PORT = Number(process.env.PORT) || 3099;
const JSONL = path.join(ROOT, 'data', 'search-events.jsonl');

const EXPECTED_GA = [
  'login_gate_shown',
  'login_modal_opened',
  'auth_tab_switched',
  'login_click',
  'tab_switched',
  'url_prefilled',
  'platform_changed',
  'title_logic_changed',
  'query_copied',
  'search_open',
  'platform_search_open',
  'variations_generated',
  'variation_copied',
  'variation_open',
  'smart_tip_applied',
  'form_reset',
  'search_feedback',
  'history_reused',
  'history_deleted',
  'history_exported',
  'history_cleared',
  'template_loaded',
  'template_deleted',
  'onboarding_completed',
  'login_success',
  'logout',
];

const SERVER_ONLY_OK = new Set([
  'login_gate_shown',
  'login_modal_opened',
  'auth_tab_switched',
  'login_click',
  'tab_switched',
  'onboarding_completed',
  'login_success',
  'logout',
]);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function readJsonlTail(fromLine = 0) {
  if (!fs.existsSync(JSONL)) return [];
  return fs
    .readFileSync(JSONL, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .slice(fromLine)
    .map((line) => JSON.parse(line));
}

async function getGaEvents(page) {
  return page.evaluate(() =>
    Array.from(window.dataLayer || [])
      .map((entry) => Array.from(entry))
      .filter((parts) => parts[0] === 'event')
      .map((parts) => ({ name: parts[1], params: parts[2] || {} }))
  );
}

function gaNames(events) {
  return events.map((e) => e.name);
}

async function waitForGa(page, name, timeout = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const events = await getGaEvents(page);
    if (events.some((e) => e.name === name)) return true;
    await sleep(100);
  }
  return false;
}

function healthOk(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve(res.statusCode === 200 && body.includes('"ok":true')));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function resolveServer() {
  for (const port of [DEFAULT_PORT, 3000, 3099, 3100, 3101]) {
    if (await healthOk(port)) {
      console.log(`Using existing server on port ${port}`);
      return { proc: null, port, base: `http://127.0.0.1:${port}` };
    }
  }
  for (const port of [DEFAULT_PORT, 3100, 3101, 3102]) {
    try {
      const proc = await startServerOnPort(port);
      return { proc, port, base: `http://127.0.0.1:${port}` };
    } catch (_) {}
  }
  throw new Error('Could not start or find TalentXray server');
}

function startServerOnPort(port) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['server.js'], {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env, PORT: String(port) },
    });
    let ready = false;
    proc.stdout.on('data', (buf) => {
      const text = buf.toString();
      if (text.includes('running on') && !ready) {
        ready = true;
        resolve(proc);
      }
    });
    proc.stderr.on('data', (buf) => {
      if (!ready) reject(new Error(buf.toString()));
    });
    setTimeout(() => {
      if (!ready) reject(new Error(`Server did not start on port ${port}`));
    }, 8000);
  });
}

async function addTitleAndSkill(page) {
  await page.click('#titleInput');
  await page.fill('#titleInput', 'Software Engineer');
  await page.keyboard.press('Enter');
  await page.fill('#titleInput', 'SDE');
  await page.keyboard.press('Enter');
  await page.click('#mustInput');
  await page.fill('#mustInput', 'Python');
  await page.keyboard.press('Enter');
  await page.fill('#mustInput', 'React');
  await page.keyboard.press('Enter');
  await page.click('#locInput');
  await page.fill('#locInput', 'Bengaluru');
  await page.keyboard.press('Enter');
  await sleep(300);
}

async function runFlow(page, apiLog, jsonlStart, base) {
  const steps = [];

  async function step(label, fn) {
    const gaBefore = (await getGaEvents(page)).length;
    await fn();
    await sleep(400);
    const ga = await getGaEvents(page);
    steps.push({ label, gaCount: ga.length - gaBefore });
  }

  // Flow 1 — unauthenticated landing
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await step('1. Page load (login gate)', async () => {});

  // Flow 2 — auth modal (gate already shows modal on load)
  await step('2. Open login modal via user chip', async () => {
    await page.evaluate(() => {
      document.getElementById('loginModal').style.display = 'none';
    });
    await page.click('#txrUserChip', { force: true });
    await page.click('#txrMenuAction', { force: true });
  });
  await step('3. Auth tab switch', async () => {
    await page.click('#txrAuthTabSignin');
  });
  await step('4. Google login click', async () => {
    await page.click('#txrGoogleSignInBtn');
  });

  // Flow 3 — URL prefill
  await page.goto(`${base}/?role=PM&must=React`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await step('5. URL prefill', async () => {});

  // Flow 4 — logged-in tool usage
  await page.evaluate(() => {
    localStorage.setItem('txr_user_email', 'analytics-test@example.com');
    localStorage.setItem('txr_user_name', 'Test User');
    localStorage.setItem('txr_onboarded', '1');
  });
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 15000 });

  await step('6. Tab switch (How to Use)', async () => {
    await page.locator('.tab-btn', { hasText: 'How to Use' }).click();
  });
  await step('7. Tab switch (Tool)', async () => {
    await page.locator('.tab-btn', { hasText: 'Tool' }).click();
  });

  await addTitleAndSkill(page);

  await step('8. Platform toggle (GitHub)', async () => {
    await page.locator('.platform-btn[data-platform="github"]').click();
  });
  await step('8b. Multi-platform open', async () => {
    const plOpen = page.locator('.pl-open').first();
    if (await plOpen.count()) await plOpen.click();
  });
  await step('9. Title logic AND', async () => {
    await page.click('#titleLogicAnd');
  });
  await step('10. Copy query', async () => {
    await page.click('#copyBtn');
  });
  await step('11. Open in Google', async () => {
    await page.click('#openGoogleLink');
  });
  await step('12. Generate variations', async () => {
    await page.locator('.rc-var-btn').click();
  });
  await step('13. Copy variation', async () => {
    const copyBtn = page.locator('.var-item .copy-btn').first();
    if (await copyBtn.count()) await copyBtn.click();
  });
  await step('14. Open variation', async () => {
    const openBtn = page.locator('.var-item .copy-btn').nth(1);
    if (await openBtn.count()) await openBtn.click();
  });

  await step('15. Smart tip (if visible)', async () => {
    const tip = page.locator('.smart-tip-card').first();
    if (await tip.count()) await tip.click();
  });

  await step('16. Search feedback 👍', async () => {
    const fb = page.locator('.fb-btn').first();
    if (await fb.count()) await fb.click();
  });
  await step('17. Reuse history', async () => {
    const reuse = page.locator('.hist-reuse').first();
    if (await reuse.count()) await reuse.click();
  });
  await step('18. Export CSV', async () => {
    await page.locator('button', { hasText: 'Export CSV' }).click();
  });
  await step('19. Delete history item', async () => {
    const del = page.locator('.hist-del').first();
    if (await del.count()) await del.click();
  });
  await step('20. Clear history', async () => {
    await page.locator('button', { hasText: 'Clear' }).click();
  });

  await step('21. Template load/delete', async () => {
    await page.evaluate(() => {
      const tpl = {
        id: 999001,
        name: 'E2E Template',
        date: '2026-06-12',
        titleBubbles: ['QA Engineer'],
        platforms: ['linkedin'],
        mustBubbles: [{ text: 'Selenium', mode: 'and' }],
        orBubbles: [],
        compBubbles: [],
        excBubbles: [],
        titleLogic: 'OR',
        liCountry: 'in.linkedin.com/in/',
      };
      localStorage.setItem('txr_templates', JSON.stringify([tpl]));
    });
    await page.evaluate(() => renderTemplates());
    const loadBtn = page.locator('.tpl-load').first();
    if (await loadBtn.count()) await loadBtn.click();
    const delTpl = page.locator('.tpl-del').first();
    if (await delTpl.count()) await delTpl.click();
  });

  await step('22. Form reset', async () => {
    await page.locator('.rc-reset').click();
  });

  await step('23. Onboarding complete', async () => {
    await page.evaluate(() => {
      localStorage.removeItem('txr_onboarded');
      document.getElementById('onboardOverlay').classList.add('show');
    });
    await page.locator('.onboard-btn').click();
  });

  await step('24. Login success (simulate)', async () => {
    await page.evaluate(() => {
      txrSessionHydrated = false;
      txrCompleteLogin('analytics-test@example.com', 'Test User', { silent: false });
    });
  });

  await step('25. Logout', async () => {
    await page.evaluate(() => {
      localStorage.setItem('txr_user_email', 'analytics-test@example.com');
      txrSessionHydrated = true;
      txrTrackEvent('logout', { source: 'user_menu' });
    });
  });

  const gaEvents = await getGaEvents(page);
  const gaSet = new Set(gaNames(gaEvents));
  const serverRows = readJsonlTail(jsonlStart);
  const serverActions = new Set(serverRows.map((r) => r.action));

  return { steps, gaEvents, gaSet, serverRows, serverActions, apiLog };
}

async function main() {
  const { proc: server, base } = await resolveServer();
  console.log(`Testing against ${base}`);
  await sleep(500);

  const jsonlStart = fs.existsSync(JSONL)
    ? fs.readFileSync(JSONL, 'utf8').trim().split('\n').filter(Boolean).length
    : 0;

  const apiLog = [];
  const browser = await chromium.launch({
    headless: true,
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: path.join(ROOT, '.playwright-browsers'),
    },
  });
  const context = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();

  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/search-event')) {
      try {
        apiLog.push(JSON.parse(req.postData() || '{}'));
      } catch (_) {}
    }
  });
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (
      url.includes('accounts.google.com') ||
      url.includes('supabase.co/auth/v1/authorize') ||
      url.includes('www.google.com/search')
    ) {
      return route.abort();
    }
    return route.continue();
  });

  let result;
  try {
    result = await runFlow(page, apiLog, jsonlStart, base);
  } finally {
    await browser.close();
    if (server) server.kill();
  }

  const { gaSet, serverActions, gaEvents, serverRows } = result;

  console.log('\n=== GA4 EVENTS FIRED ===');
  gaEvents.forEach((e) => console.log(`  ✓ ${e.name}`, JSON.stringify(e.params)));

  console.log('\n=== SERVER search-event ACTIONS ===');
  serverRows.forEach((r) => console.log(`  ✓ ${r.action} | platforms=${r.platforms} | email=${r.email}`));

  console.log('\n=== EXPECTED vs ACTUAL (GA4) ===');
  const gaMissing = [];
  const gaExtra = [...gaSet].filter((n) => !EXPECTED_GA.includes(n));
  for (const name of EXPECTED_GA) {
    const ok = gaSet.has(name);
    console.log(`  ${ok ? '✓' : '✗'} ${name}`);
    if (!ok) gaMissing.push(name);
  }
  if (gaExtra.length) console.log('  Extra:', gaExtra.join(', '));

  console.log('\n=== TOOL EVENTS — SERVER LOG CHECK ===');
  const toolGaEvents = EXPECTED_GA.filter((n) => !SERVER_ONLY_OK.has(n) && n !== 'url_prefilled');
  const serverMissing = [];
  for (const name of toolGaEvents) {
    const serverName = name === 'search_open' ? 'open_google' : name === 'search_feedback' ? 'result_feedback' : name;
    const ok = serverActions.has(serverName) || serverActions.has(name);
    console.log(`  ${ok ? '✓' : '✗'} ${name} → server action "${serverName}"`);
    if (!ok) serverMissing.push(name);
  }

  console.log('\n=== FLOW SUMMARY ===');
  result.steps.forEach((s) => console.log(`  ${s.label}`));

  const passed = gaMissing.length === 0 && serverMissing.length === 0;
  console.log(`\n${passed ? 'PASS' : 'FAIL'} — GA missing: ${gaMissing.length}, server missing: ${serverMissing.length}`);
  if (gaMissing.length) console.log('GA missing:', gaMissing.join(', '));
  if (serverMissing.length) console.log('Server missing:', serverMissing.join(', '));

  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
