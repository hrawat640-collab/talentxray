// E2E smoke test for the two-view app. Assumes `npm run build` was run and the
// Express server is up. Run: PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers node scripts/smoke-test.mjs
// Note: live-count sections need SERPER_API_KEY in .env and cost a few credits per run.
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
let failures = 0;
const check = (name, cond) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) failures++;
};

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push(String(e)));

// 1. Soft gate: NO blocking modal on load for anonymous visitors
await page.goto(BASE);
await page.waitForTimeout(600);
check('no login modal on first load (soft gate)', !(await page.locator('#loginModal').isVisible()));

// 1b. Anonymous: first query's open is free, a second distinct query is gated
await page.evaluate(() => localStorage.setItem('txr_onboarded', '1'));
await page.fill('#titleInput', 'Product Manager');
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
const [freePopup] = await Promise.all([
  page.waitForEvent('popup').catch(() => null),
  page.click('#openGoogleLink'),
]);
if (freePopup) await freePopup.close();
check('first free search opens google', !!freePopup);
check('no modal after free search', !(await page.locator('#loginModal').isVisible()));
await page.fill('#mustInput', 'Python');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await page.click('#openGoogleLink');
await page.waitForTimeout(400);
check('second distinct query triggers login gate', await page.locator('#loginModal').isVisible());

// 2. Stored identity dismisses the gate, user chip renders
await page.evaluate(() => {
  localStorage.setItem('txr_user_email', 'smoke@test.dev');
  localStorage.setItem('txr_user_name', 'Smoke Test');
  localStorage.removeItem('txr_free_queries');
});
await page.reload();
await page.waitForTimeout(600);
check('login modal hidden with identity', !(await page.locator('#loginModal').isVisible()));
check('user chip shows initials', (await page.locator('#txrInitials').textContent()) === 'ST');

// 3. Build a query: title chip + must-have skill chip
await page.fill('#titleInput', 'Product Manager');
await page.keyboard.press('Enter');
await page.fill('#mustInput', 'Python');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
const outputStr = await page.locator('#outputStr').textContent();
check('query contains LinkedIn site filter', outputStr.includes('site:in.linkedin.com/in/'));
check('query contains intitle role', outputStr.includes('intitle:"Product Manager"'));
check('query contains skill', outputStr.includes('"Python"'));
check('query health panel visible', await page.locator('#strengthWrap').isVisible());

// 3b. Live result count replaces the heuristic verdict
await page.waitForTimeout(2600);
const liveStatus = await page.locator('#strengthStatus').textContent();
check('live result count shown', liveStatus.includes('Live check'));

// 3c. Results view: button activates, view shows cards + active filters
const vrText = await page.locator('#viewResultsBtn').textContent();
check('view-results button activated', vrText.includes('matching profiles') && !(await page.locator('#viewResultsBtn').isDisabled()));
await page.click('#viewResultsBtn');
await page.waitForTimeout(400);
check('results view visible', await page.locator('#view-results').isVisible());
check('candidate cards rendered', (await page.locator('.cand-card').count()) >= 1);
const firstName = await page.locator('.cand-card .cand-name').first().textContent();
check('candidate card has a parsed name', firstName.trim().length > 1 && !firstName.includes('LinkedIn'));
const firstHref = await page.locator('.cand-card .cand-open').first().getAttribute('href');
check('candidate card links to a profile', /^https?:\/\//.test(firstHref));
check('active filters show role chip', (await page.locator('#activeFilters').textContent()).includes('Product Manager'));
check('boolean echo filled', (await page.locator('#booleanEcho').textContent()).includes('site:'));

// 3d. Removing a filter chip from the sidebar updates the query
await page.locator('#activeFilters .af-chip.af-teal .af-x').first().click();
await page.waitForTimeout(300);
check('sidebar chip removal updates filters', !(await page.locator('#activeFilters').textContent()).includes('Python'));
await page.click('.results-side .btn-secondary'); // ← Refine search
await page.waitForTimeout(300);
check('back to builder view', await page.locator('#view-builder').isVisible());
await page.fill('#mustInput', 'Python');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);

// 4. Open-in-Google link points at Google with the query
const href = await page.locator('#openGoogleLink').getAttribute('href');
check('open link is a google search URL', href.startsWith('https://www.google.com/search?q='));
check('url has no num param', !href.includes('num='));

// 5. Variations (builder button switches to results view)
await page.click('.rc-var-btn');
await page.waitForTimeout(400);
check('variations open in results view', await page.locator('#view-results').isVisible());
check('variations panel opens', await page.locator('#varPanel').isVisible());
check('at least 1 variation rendered', (await page.locator('.var-item').count()) >= 1);
await page.evaluate(() => window.switchView('builder'));
await page.waitForTimeout(200);

// 5b. Seniority is a plain body term, never a second intitle condition
await page.selectOption('#senioritySelect', 'Junior');
await page.waitForTimeout(300);
const outSen = await page.locator('#outputStr').textContent();
check('seniority added as plain term', outSen.includes('"Junior"'));
check('seniority not forced into intitle', !outSen.includes('intitle:"Junior"'));

// 5c. Region mismatch tip + without-location variation
await page.fill('#locInput', 'London');
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
check('region mismatch tip shows', (await page.locator('#smartTipsList').textContent()).includes('Region / location mismatch'));
await page.evaluate(() => window.generateVars());
await page.waitForTimeout(300);
const noLocVar = await page.evaluate(() => (window._vars.find(v => v.label.includes('Without location')) || {}).str || '');
check('without-location variation drops location', noLocVar !== '' && !noLocVar.includes('London'));
await page.evaluate(() => window.fixRegionMismatch());
await page.waitForTimeout(300);
check('fixRegionMismatch switches region', (await page.locator('#liCountry').inputValue()) === 'uk.linkedin.com/in/');
await page.evaluate(() => { window.switchView('builder'); window.clearLoc(); });
await page.selectOption('#liCountry', 'in.linkedin.com/in/');
await page.evaluate(() => window.liveUpdate());
await page.waitForTimeout(200);

// 6. Multi-platform output
await page.click('button[data-platform="github"]');
await page.waitForTimeout(300);
check('multi-platform rows render', (await page.locator('.platform-link-row').count()) === 2);
await page.click('button[data-platform="github"]');

// 7. Open click saves history; compInput text WITHOUT Enter must flush (task #18)
await page.fill('#compInput', 'Google');
const [popup] = await Promise.all([
  page.waitForEvent('popup').catch(() => null),
  page.click('#openGoogleLink'),
]);
if (popup) await popup.close();
await page.waitForTimeout(500);
check('pending company text flushed into query', (await page.locator('#outputStr').textContent()).includes('"Google"'));
check('history panel visible after search', await page.locator('#histPanel').isVisible());
check('history item rendered', (await page.locator('.hist-item').count()) >= 1);

// 8. History persists across reload
await page.reload();
await page.waitForTimeout(600);
check('history persists after reload', (await page.locator('.hist-item').count()) >= 1);

// 9. Reset clears the form
await page.click('.rc-reset');
await page.waitForTimeout(200);
const cleared = await page.locator('#outputStr').textContent();
check('reset clears output', cleared.includes('search string appears here') || cleared.includes('builds in real time'));

// 10. Tab switch works
await page.click('.tab-btn:nth-child(2)');
check('how-to page activates', await page.locator('#page-howto').isVisible());

// 11. Backend health + search proxy validation
const health = await page.evaluate(async () => (await fetch('/api/health')).json());
check('api health ok', health.ok === true);
const badSearch = await page.evaluate(async () => (await fetch('/api/search-results', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: '' })
})).status);
check('search proxy rejects empty query', badSearch === 400);

// 12. URL prefill
await page.goto(BASE + '/?role=Data%20Engineer&must=Spark,Kafka&nice=Airflow');
await page.waitForTimeout(600);
const prefilled = await page.locator('#outputStr').textContent();
check('url prefill builds query', prefilled.includes('"Data Engineer"') && prefilled.includes('"Spark"') && prefilled.includes('"Airflow"'));

// 13. XSS safety: malicious chip text renders inert
await page.goto(BASE);
await page.waitForTimeout(600);
await page.fill('#titleInput', 'PM');
await page.keyboard.press('Enter');
await page.fill('#mustInput', '<img src=x onerror=window.__xss=1>');
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
check('xss: no <img> injected in chips', (await page.locator('#mustWrap img').count()) === 0);
check('xss: no <img> injected in output', (await page.locator('#outputStr img').count()) === 0);
check('xss: payload not executed', !(await page.evaluate(() => window.__xss)));
const outTxt = await page.locator('#outputStr').textContent();
check('xss: payload text preserved in query', outTxt.includes('<img src=x onerror=window.__xss=1>'));

check('no page JS errors', consoleErrors.length === 0);
if (consoleErrors.length) console.log('JS errors:', consoleErrors);

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
