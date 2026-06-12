import { state } from './state.js';
import { esc } from './util.js';
import { txrTrackTool } from './analytics.js';
import { PLATFORMS } from './platforms.js';
import { gateAllows } from './gate.js';
import { toast } from './ui.js';

// Renders live candidate cards from /api/search-results responses.
// Page 1 data arrives for free with the live-count check (same endpoint, cached);
// "Load more" fetches further pages on demand.

let currentQuery = '';
let currentPage = 1;
let renderedPages = new Set();
let loadingMore = false;
let collected = []; // all results for the current query, for CSV export

function platformTag(link) {
  if (link.includes('linkedin.')) return ['LinkedIn', 'tag-li'];
  if (link.includes('github.')) return ['GitHub', 'tag-gh'];
  if (link.includes('behance.')) return ['Behance', 'tag-be'];
  return ['Web', 'tag-dr'];
}

// SERP titles look like "Name - Headline - Company | LinkedIn",
// "Name username · GitHub", or "Name on Behance".
function parseCandidate(r) {
  const t = String(r.title || '')
    .replace(/\s*[|\-–·]\s*LinkedIn\s*$/i, '')
    .replace(/\s*[|\-–·]\s*GitHub\s*$/i, '')
    .replace(/\s+on Behance.*$/i, '');
  const parts = t.split(/\s+[-–—|]\s+/);
  return {
    name: (parts[0] || t || 'Profile').trim(),
    headline: parts.slice(1).join(' · ').trim(),
  };
}

function matchedSkills(text) {
  const terms = [
    ...state.mustBubbles.map(b => b.text),
    ...state.orBubbles.map(b => (typeof b === 'string' ? b : b.text)),
  ];
  const low = text.toLowerCase();
  return [...new Set(terms.filter(s => s && low.includes(s.toLowerCase())))].slice(0, 6);
}

function candidateCard(r) {
  if (!/^https?:\/\//i.test(r.link)) return '';
  const c = parseCandidate(r);
  const [plat, cls] = platformTag(r.link);
  const initials = c.name.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '?';
  const skills = matchedSkills(`${r.title} ${r.snippet}`);
  return `<div class="cand-card">
    <div class="cand-avatar">${esc(initials)}</div>
    <div class="cand-main">
      <div class="cand-top"><span class="cand-name">${esc(c.name)}</span><span class="hist-ptag ${cls}">${plat}</span></div>
      ${c.headline ? `<div class="cand-headline">${esc(c.headline)}</div>` : ''}
      ${r.snippet ? `<div class="cand-snippet">${esc(r.snippet)}</div>` : ''}
      ${skills.length ? `<div class="cand-skills">${skills.map(s => `<span class="cand-skill">${esc(s)}</span>`).join('')}</div>` : ''}
    </div>
    <a class="cand-open" href="${esc(r.link)}" target="_blank" rel="noopener noreferrer">Open ↗</a>
  </div>`;
}

function setViewResultsBtn(shown, hasMore) {
  const btn = document.getElementById('viewResultsBtn');
  if (!btn) return;
  if (shown > 0) {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.textContent = `View ${shown}${hasMore ? '+' : ''} matching profiles →`;
  } else {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.textContent = 'View matching profiles →';
  }
}

function setResultsEmpty(showEmpty) {
  const empty = document.getElementById('resultsEmpty');
  if (empty) empty.style.display = showEmpty ? '' : 'none';
}

function hideLiveResults() {
  const panel = document.getElementById('liveResultsPanel');
  if (panel) panel.style.display = 'none';
  currentQuery = '';
  renderedPages = new Set();
  collected = [];
  setViewResultsBtn(0, false);
  setResultsEmpty(true);
}

function renderLiveResults(data, query) {
  const panel = document.getElementById('liveResultsPanel');
  const list = document.getElementById('liveResultsList');
  const more = document.getElementById('liveResultsMore');
  const count = document.getElementById('liveResultsCount');
  if (!panel || !list || !data) return;

  if (query !== currentQuery) {
    currentQuery = query;
    currentPage = data.page || 1;
    renderedPages = new Set();
    collected = [];
    list.innerHTML = '';
  }
  const page = data.page || 1;
  if (renderedPages.has(page)) return; // cached re-apply of the same response
  renderedPages.add(page);
  currentPage = page;

  if (!Array.isArray(data.results) || !data.results.length) {
    if (renderedPages.size <= 1) hideLiveResults();
    return;
  }
  collected = collected.concat(data.results);
  list.insertAdjacentHTML('beforeend', data.results.map(candidateCard).join(''));
  panel.style.display = '';
  setResultsEmpty(false);
  const shown = list.querySelectorAll('.cand-card').length;
  if (count) count.textContent = `${shown}${data.hasMore ? '+' : ''} found`;
  if (more) more.style.display = data.hasMore && currentPage < 5 ? '' : 'none';
  setViewResultsBtn(shown, !!data.hasMore);
}

// Sidebar on the results view: current filters as removable chips.
// Removal handlers re-run liveUpdate, which re-renders this via renderActiveFilters.
function renderActiveFilters() {
  const el = document.getElementById('activeFilters');
  if (!el) return;
  const sec = (label, chips) => chips ? `<div class="af-sec"><div class="af-label">${label}</div><div class="af-chips">${chips}</div></div>` : '';
  const chip = (text, cls, onclick) => `<span class="af-chip ${cls}">${esc(text)}<button class="af-x" onclick="${onclick}" aria-label="Remove ${esc(text)}">×</button></span>`;
  let html = '';
  html += sec('Platforms', [...state.selPlatforms].map(k => `<span class="af-chip af-plain">${PLATFORMS[k]?.label || k}</span>`).join(''));
  html += sec('Role', state.titleBubbles.map((t, i) => chip(t, 'af-vio', `removeTitleBubble(${i})`)).join(''));
  html += sec('Seniority', state.seniorityBubbles.map((t, i) => chip(t, 'af-vio', `removeSeniorityBubble(${i})`)).join(''));
  html += sec('Must-have', state.mustBubbles.map((b, i) => chip(b.text, 'af-teal', `removeBubble('must',${i})`)).join(''));
  html += sec('Nice-to-have', state.orBubbles.map((b, i) => chip(typeof b === 'string' ? b : b.text, 'af-soft', `removeBubble('or',${i})`)).join(''));
  html += sec('Location', state.locBubbles.map((t, i) => chip(t, 'af-plain', `removeLocBubble(${i})`)).join(''));
  html += sec('Companies', state.compBubbles.map((t, i) => chip(t, 'af-plain', `removeGenBubble('comp',${i})`)).join(''));
  html += sec('Excluded', state.excBubbles.map((t, i) => chip(t, 'af-red', `removeGenBubble('exc',${i})`)).join(''));
  el.innerHTML = html || '<div class="af-empty">No filters yet — use Refine search.</div>';
  const be = document.getElementById('booleanEcho');
  if (be) be.textContent = state.curStr || '—';
}

function exportResultsCSV() {
  if (!collected.length) { toast('No profiles to export yet', 'err'); return; }
  const csvEsc = (v) => '"' + String(v || '').replace(/"/g, '""') + '"';
  const rows = collected.map(r => {
    const c = parseCandidate(r);
    return [c.name, c.headline, platformTag(r.link)[0], r.link, r.snippet].map(csvEsc).join(',');
  });
  const csv = ['Name,Headline,Platform,Profile URL,Snippet', ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `talentxray_profiles_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  txrTrackTool('results_exported', { row_count: collected.length });
  toast('Profiles exported', 'ok');
}

async function loadMoreResults() {
  if (loadingMore || !currentQuery) return;
  if (!gateAllows(currentQuery)) return;
  loadingMore = true;
  const btn = document.getElementById('liveResultsMore');
  if (btn) btn.textContent = 'Loading…';
  try {
    const resp = await fetch('/api/search-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: currentQuery, page: currentPage + 1 }),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.ok) {
        renderLiveResults(data, currentQuery);
        txrTrackTool('results_load_more', { page: data.page, count: data.count });
      }
    }
  } catch (_err) {
  } finally {
    loadingMore = false;
    if (btn) btn.textContent = 'Load more profiles';
  }
}

// Click tracking for profile opens (delegated; cards are re-rendered often).
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('.cand-open');
  if (!a) return;
  if (!gateAllows(currentQuery)) { e.preventDefault(); return; }
  txrTrackTool('candidate_open', { platform: platformTag(a.href)[0] }, { resultUrl: a.href, query: currentQuery });
});

export { renderLiveResults, hideLiveResults, loadMoreResults, renderActiveFilters, exportResultsCSV };
