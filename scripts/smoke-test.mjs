// E2E smoke test for the restructured app. Assumes `npm run build` was run and
// the Express server is up on :3000. Run: PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers node scripts/smoke-test.mjs
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

// 1. Login gate shows for anonymous visitors
await page.goto(BASE);
await page.waitForTimeout(600);
check('login modal visible for anonymous user', await page.locator('#loginModal').isVisible());

// 2. Stored email bypasses the gate, user chip renders
await page.evaluate(() => {
  localStorage.setItem('txr_user_email', 'smoke@test.dev');
  localStorage.setItem('txr_user_name', 'Smoke Test');
  localStorage.setItem('txr_onboarded', '1');
});
await page.reload();
await page.waitForTimeout(600);
check('login modal hidden after identity set', !(await page.locator('#loginModal').isVisible()));
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
check('strength meter visible', await page.locator('#strengthWrap').isVisible());

// 4. Open-in-Google link points at Google with the query
const href = await page.locator('#openGoogleLink').getAttribute('href');
check('open link is a google search URL', href.startsWith('https://www.google.com/search?q='));

// 5. Variations generate
await page.click('.rc-var-btn');
await page.waitForTimeout(300);
check('variations panel opens', await page.locator('#varPanel').isVisible());
check('at least 1 variation rendered', (await page.locator('.var-item').count()) >= 1);

// 6. Multi-platform output
await page.click('button[data-platform="github"]');
await page.waitForTimeout(300);
check('multi-platform rows render', (await page.locator('.platform-link-row').count()) === 2);
await page.click('button[data-platform="github"]'); // back to LinkedIn only

// 7. Open click saves history (popup expected)
const [popup] = await Promise.all([
  page.waitForEvent('popup').catch(() => null),
  page.click('#openGoogleLink'),
]);
if (popup) await popup.close();
await page.waitForTimeout(500);
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

// 11. Backend health + event log
const health = await page.evaluate(async () => (await fetch('/api/health')).json());
check('api health ok', health.ok === true);

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
