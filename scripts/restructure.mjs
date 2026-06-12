// One-off migration: slices the legacy monolithic index.html into client/ ES modules.
// Run from repo root: node scripts/restructure.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8').split('\n');

// 1-indexed inclusive slice
const L = (a, b = a) => src.slice(a - 1, b).join('\n');

const STATE_VARS = ['mustBubbles', 'orBubbles', 'titleBubbles', 'locBubbles', 'compBubbles', 'excBubbles', 'seniorityBubbles', 'selPlatforms', 'curStr', 'curUrl', 'searchHistory', 'templates'];
// Rewrites bare references to shared state vars as state.<name>.
// Skips: property access (.foo), object keys (foo:), identifiers inside longer words.
// Allows: spread ([...foo]).
const stateRe = new RegExp(`(?<![.\\w$])(\\.\\.\\.)?\\b(${STATE_VARS.join('|')})\\b(?!\\s*:)`, 'g');
const toState = (code) => code.replace(stateRe, (m, spread, name) => `${spread || ''}state.${name}`);

const write = (rel, content) => {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content.endsWith('\n') ? content : content + '\n');
  console.log('wrote', rel, `(${content.split('\n').length} lines)`);
};

const mustReplace = (code, from, to, label) => {
  if (!code.includes(from)) throw new Error(`pattern not found (${label}): ${from}`);
  return code.split(from).join(to);
};

/* ---------------- styles ---------------- */
write('client/src/styles/main.css', L(28, 316));

/* ---------------- data ---------------- */
write('client/src/data/skills-db.js',
  'export ' + L(1366) + '\nexport ' + L(1367));
write('client/src/data/job-titles.js', 'export ' + L(1370));
write('client/src/data/locations.js', 'export ' + L(1405));

/* ---------------- config ---------------- */
write('client/src/js/config.js', `/**
 * Supabase settings. The project URL and anon/publishable key are not confidential
 * in client-side apps; they appear in every request. Access control is enforced in
 * Supabase with Row Level Security (RLS) and table policies — not by hiding this file.
 * Never put the service_role key here (or anywhere in front-end code).
 */
export const SUPABASE_URL = 'https://oqknepaevzhcmmmatame.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_ZwdxLA2twuvjkBug6JPxxA_zlWzaVN2';
/** Return URL for email auth links opened from inbox (not OAuth).
 *  Add these in Supabase → Auth → URL Configuration → Redirect URLs:
 *  http://localhost:3000/**  http://127.0.0.1:3000/**  http://localhost:5173/**
 *  https://talentxray.talentsradar.com/**
 */
export const AUTH_EMAIL_BASE = 'https://talentxray.talentsradar.com';`);

/* ---------------- state ---------------- */
write('client/src/js/state.js', `// Shared mutable app state. All modules read and write through this object.
export const state = {
  selPlatforms: new Set(['linkedin']),
  mustBubbles: [], orBubbles: [],
  titleBubbles: [], seniorityBubbles: [],
  locBubbles: [], compBubbles: [], excBubbles: [],
  curStr: '', curUrl: '',
  searchHistory: JSON.parse(localStorage.getItem('txr_history') || '[]'),
  templates: JSON.parse(localStorage.getItem('txr_templates') || '[]'),
};`);

/* ---------------- platforms ---------------- */
write('client/src/js/platforms.js',
  L(1325, 1330) + '\nexport { PLATFORMS, PLATFORM_ICONS };');

/* ---------------- analytics ---------------- */
write('client/src/js/analytics.js',
  `import { state } from './state.js';\nimport { PLATFORMS } from './platforms.js';\n\n` +
  toState([L(394, 405), L(417, 460), L(1331, 1342)].join('\n')) +
  '\nexport { txrTrackEvent, txrPostJson, txrLogSearchEvent, txrPlatformLabel, txrTrackTool };');

/* ---------------- ui ---------------- */
write('client/src/js/ui.js',
  `import { txrTrackEvent } from './analytics.js';\n\n` +
  [L(1317, 1318), L(1478), L(1568)].join('\n') +
  '\nexport { switchTab, toggleFaq, closeOnboard, toast };');

/* ---------------- util ---------------- */
write('client/src/js/util.js',
  `import { toast } from './ui.js';\n\n` +
  [L(1373), L(1545), L(1548), L(1550, 1551)].join('\n') +
  '\nexport { highlight, renderHL, openUrl, fallbackCopy, copyToClipboard };');

/* ---------------- query builder ---------------- */
write('client/src/js/query-builder.js',
  `import { state } from './state.js';\nimport { PLATFORMS } from './platforms.js';\n\n` +
  toState([L(1454), L(1480, 1518)].join('\n')) +
  '\nexport { buildString, buildStringForPlatform };');

/* ---------------- insights (strength meter + smart tips) ---------------- */
write('client/src/js/insights.js',
  `import { state } from './state.js';\n\n` +
  toState(L(1520, 1523)) +
  '\nexport { updateStrength, updateSmartTips };');

/* ---------------- bubbles (chips, autocomplete, inputs) ---------------- */
write('client/src/js/bubbles.js',
  `import { state } from './state.js';
import { ALL_SKILLS } from '../data/skills-db.js';
import { JOB_TITLES } from '../data/job-titles.js';
import { LOCATIONS } from '../data/locations.js';
import { highlight } from './util.js';
import { txrTrackTool } from './analytics.js';
import { liveUpdate } from './live-update.js';\n\n` +
  toState([L(1368), L(1372), L(1375, 1403), L(1406, 1412), L(1414, 1452)].join('\n')) +
  `\nexport {
  renderTitleBubbles, removeTitleBubble, onTitleInput, onTitleKeydown, onTitleBlur, pickTitleFromSug, setTitleLogicMode,
  renderSeniorityBubbles, removeSeniorityBubble, addSeniorityFromSelect,
  renderLocBubbles, removeLocBubble, onLocInput, onLocKeydown, onLocBlur, pickLoc,
  onSkillInput, onSkillFocus, onSkillBlur, renderSuggestions, hideSuggestions,
  handleGenBubble, removeGenBubble, renderGenBubbleList,
  pickSuggestion, handleBubble, removeBubble, renderBubbles, renderAllBubbles, updateSkillCount,
};`);

/* ---------------- live update (output panel) ---------------- */
write('client/src/js/live-update.js',
  `import { state } from './state.js';
import { PLATFORMS, PLATFORM_ICONS } from './platforms.js';
import { buildString, buildStringForPlatform } from './query-builder.js';
import { updateStrength, updateSmartTips } from './insights.js';
import { updateSkillCount } from './bubbles.js';
import { saveHist } from './history.js';
import { txrTrackTool } from './analytics.js';
import { renderHL } from './util.js';\n\n` +
  toState([L(1360, 1362), L(1456, 1476), L(1528, 1543)].join('\n')) +
  '\nexport { updateLinkedInUI, renderMultiPlatformOutput, savePlatformHist, liveUpdate };');

/* ---------------- history ---------------- */
write('client/src/js/history.js',
  `import { state } from './state.js';
import { PLATFORMS } from './platforms.js';
import { toast } from './ui.js';
import { txrTrackEvent, txrLogSearchEvent, txrTrackTool } from './analytics.js';
import { updateStrength } from './insights.js';
import { renderHL } from './util.js';\n\n` +
  toState(L(1559, 1566)) +
  '\nexport { saveHist, reuseSearch, giveFeedback, deleteHist, clearHist, renderHistory, exportCSV };');

/* ---------------- templates ---------------- */
write('client/src/js/templates.js',
  `import { state } from './state.js';
import { renderAllBubbles, setTitleLogicMode } from './bubbles.js';
import { liveUpdate } from './live-update.js';
import { toast } from './ui.js';
import { txrTrackTool } from './analytics.js';\n\n` +
  toState(L(1572, 1574)) +
  '\nexport { renderTemplates, loadTpl, deleteTpl };');

/* ---------------- variations ---------------- */
write('client/src/js/variations.js',
  `import { state } from './state.js';
import { buildString } from './query-builder.js';
import { toast } from './ui.js';
import { renderHL, openUrl, copyToClipboard } from './util.js';
import { txrTrackTool } from './analytics.js';\n\n` +
  toState(L(1555, 1557)) +
  '\nexport { txrCopyVariation, txrOpenVariation, generateVars };');

/* ---------------- actions (top-level orchestrators) ---------------- */
write('client/src/js/actions.js',
  `import { state } from './state.js';
import { PLATFORMS } from './platforms.js';
import { buildString } from './query-builder.js';
import { liveUpdate, updateLinkedInUI } from './live-update.js';
import { renderBubbles, renderTitleBubbles, renderLocBubbles, renderAllBubbles, setTitleLogicMode } from './bubbles.js';
import { saveHist } from './history.js';
import { toast } from './ui.js';
import { fallbackCopy } from './util.js';
import { txrTrackEvent, txrLogSearchEvent, txrTrackTool } from './analytics.js';\n\n` +
  toState([L(1344, 1358), L(1364), L(1524, 1526), L(1547), L(1549), L(1553)].join('\n')) +
  '\nexport { togglePlatform, focusBubble, relaxMustSkills, removeLastTitle, clearLoc, handleOpenClick, copyStr, resetAll };');

/* ---------------- prefill (URL params) ---------------- */
write('client/src/js/prefill.js',
  `import { state } from './state.js';
import { renderAllBubbles, setTitleLogicMode } from './bubbles.js';
import { liveUpdate } from './live-update.js';
import { txrTrackTool } from './analytics.js';

// Seeds the builder from query params (?role=&must=&nice=...) — SkillMapper deep links.
function prefillFromParams(){\n` +
  toState(L(1577, 1610)) +
  '\n}\nexport { prefillFromParams };');

/* ---------------- auth ---------------- */
let auth = [L(392, 393), L(406, 416), L(461, 965)].join('\n');
auth = mustReplace(auth, "if(!window.supabase||!window.supabase.createClient)return;\n", '', 'init guard');
auth = mustReplace(auth, "if(!window.supabase||!window.supabase.createClient)return null;\n", '', 'ensure guard');
auth = mustReplace(auth, "if(!window.supabase||!window.supabase.createClient)return 'Supabase SDK not loaded.';\n", '', 'cfg-error guard');
auth = mustReplace(auth, 'if(!window.TXR_SUPABASE_URL||!window.TXR_SUPABASE_ANON_KEY)return;', 'if(!SUPABASE_URL||!SUPABASE_ANON_KEY)return;', 'init cfg check');
auth = mustReplace(auth, 'if(!window.TXR_SUPABASE_URL||!window.TXR_SUPABASE_ANON_KEY)return null;', 'if(!SUPABASE_URL||!SUPABASE_ANON_KEY)return null;', 'ensure cfg check');
auth = mustReplace(auth, "if(!window.TXR_SUPABASE_URL)return 'Supabase URL missing.';", "if(!SUPABASE_URL)return 'Supabase URL missing.';", 'cfg-error url');
auth = mustReplace(auth, "if(!window.TXR_SUPABASE_ANON_KEY)return 'Supabase anon key missing.';", "if(!SUPABASE_ANON_KEY)return 'Supabase anon key missing.';", 'cfg-error key');
while (auth.includes('window.supabase.createClient(window.TXR_SUPABASE_URL,window.TXR_SUPABASE_ANON_KEY,{')) {
  auth = auth.replace('window.supabase.createClient(window.TXR_SUPABASE_URL,window.TXR_SUPABASE_ANON_KEY,{', 'createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{');
}
auth = mustReplace(auth, "return(window.TXR_AUTH_EMAIL_BASE||'https://talentxray.talentsradar.com')", "return(AUTH_EMAIL_BASE||'https://talentxray.talentsradar.com')", 'email base');
auth = mustReplace(auth, '(function(){\n  function txrReadSharedIdentity(){', '// Seeds identity from SkillMapper handoff (?au=) and shared localStorage keys.\nfunction txrBootstrapIdentity(){\n  function txrReadSharedIdentity(){', 'identity iife open');
auth = mustReplace(auth, '  txrRenderUserChip();\n})();', '  txrRenderUserChip();\n}', 'identity iife close');
write('client/src/js/auth.js',
  `import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, AUTH_EMAIL_BASE } from './config.js';
import { txrTrackEvent, txrPostJson } from './analytics.js';\n\n` +
  auth +
  `\nexport {
  txrBootstrapIdentity, txrInitSupabaseAuth, txrEnforceLoginGate, txrCompleteLogin,
  txrSignInWithGoogle, txrSwitchAuthTab, txrSignUpWithPassword, txrSignInWithPassword,
  txrSendMagicLink, txrForgotPassword, txrUpdatePassword,
  txrToggleUserMenu, txrPrimaryAction, txrSignOut, txrUpdateNavLinks, txrRenderUserChip,
};`);

/* ---------------- main ---------------- */
write('client/src/main.js', `import './styles/main.css';
import * as auth from './js/auth.js';
import * as ui from './js/ui.js';
import * as bubbles from './js/bubbles.js';
import * as actions from './js/actions.js';
import * as hist from './js/history.js';
import * as templates from './js/templates.js';
import { liveUpdate, updateLinkedInUI } from './js/live-update.js';
import { generateVars, txrCopyVariation, txrOpenVariation } from './js/variations.js';
import { prefillFromParams } from './js/prefill.js';

// index.html (and markup generated at runtime) uses inline on* attributes,
// so every handler they reference must exist on window.
Object.assign(window, {
  // auth & account
  txrSignInWithGoogle: auth.txrSignInWithGoogle,
  txrSwitchAuthTab: auth.txrSwitchAuthTab,
  txrSignUpWithPassword: auth.txrSignUpWithPassword,
  txrSignInWithPassword: auth.txrSignInWithPassword,
  txrSendMagicLink: auth.txrSendMagicLink,
  txrForgotPassword: auth.txrForgotPassword,
  txrUpdatePassword: auth.txrUpdatePassword,
  txrToggleUserMenu: auth.txrToggleUserMenu,
  txrPrimaryAction: auth.txrPrimaryAction,
  txrSignOut: auth.txrSignOut,
  // chrome
  switchTab: ui.switchTab,
  toggleFaq: ui.toggleFaq,
  closeOnboard: ui.closeOnboard,
  // builder actions
  togglePlatform: actions.togglePlatform,
  focusBubble: actions.focusBubble,
  relaxMustSkills: actions.relaxMustSkills,
  removeLastTitle: actions.removeLastTitle,
  clearLoc: actions.clearLoc,
  handleOpenClick: actions.handleOpenClick,
  copyStr: actions.copyStr,
  resetAll: actions.resetAll,
  liveUpdate,
  // chips & autocomplete
  setTitleLogicMode: bubbles.setTitleLogicMode,
  onTitleInput: bubbles.onTitleInput,
  onTitleKeydown: bubbles.onTitleKeydown,
  onTitleBlur: bubbles.onTitleBlur,
  pickTitleFromSug: bubbles.pickTitleFromSug,
  removeTitleBubble: bubbles.removeTitleBubble,
  addSeniorityFromSelect: bubbles.addSeniorityFromSelect,
  removeSeniorityBubble: bubbles.removeSeniorityBubble,
  onLocInput: bubbles.onLocInput,
  onLocKeydown: bubbles.onLocKeydown,
  onLocBlur: bubbles.onLocBlur,
  pickLoc: bubbles.pickLoc,
  removeLocBubble: bubbles.removeLocBubble,
  onSkillInput: bubbles.onSkillInput,
  onSkillFocus: bubbles.onSkillFocus,
  onSkillBlur: bubbles.onSkillBlur,
  handleBubble: bubbles.handleBubble,
  pickSuggestion: bubbles.pickSuggestion,
  removeBubble: bubbles.removeBubble,
  handleGenBubble: bubbles.handleGenBubble,
  removeGenBubble: bubbles.removeGenBubble,
  // variations
  generateVars,
  txrCopyVariation,
  txrOpenVariation,
  // history & templates
  reuseSearch: hist.reuseSearch,
  giveFeedback: hist.giveFeedback,
  deleteHist: hist.deleteHist,
  clearHist: hist.clearHist,
  exportCSV: hist.exportCSV,
  loadTpl: templates.loadTpl,
  deleteTpl: templates.deleteTpl,
});

// Boot sequence. Module scripts run after the document is parsed, so the DOM is ready.
auth.txrBootstrapIdentity();
hist.renderHistory();
templates.renderTemplates();
updateLinkedInUI();
bubbles.renderAllBubbles();
prefillFromParams(); // also runs the initial liveUpdate()
auth.txrEnforceLoginGate({ trackGate: true, source: 'page_load' });
auth.txrInitSupabaseAuth()
  .then(() => auth.txrEnforceLoginGate())
  .catch(() => auth.txrEnforceLoginGate());`);

/* ---------------- index.html ---------------- */
write('client/index.html', [
  L(1, 23),
  L(26),
  '<link rel="stylesheet" href="/src/styles/main.css">'.replace(/^.*$/, ''), // CSS imported via main.js
  '</head>',
  '<body>',
  '',
  L(321, 383),
  '',
  L(974, 1314),
  '',
  '<script type="module" src="/src/main.js"></script>',
  '</body>',
  '</html>',
].filter(s => s !== '').join('\n'));

/* ---------------- vite config ---------------- */
write('client/vite.config.js', `import { defineConfig } from 'vite';

export default defineConfig({
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    port: 5173,
    // API requests go to the Express server during development.
    proxy: { '/api': 'http://localhost:3000' },
  },
});`);

console.log('done');
