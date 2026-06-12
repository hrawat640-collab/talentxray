import { state } from './state.js';
import { esc } from './util.js';
import { txrTrackTool } from './analytics.js';

// Renders live candidate cards from /api/search-results responses.
// Page 1 data arrives for free with the live-count check (same endpoint, cached);
// "Load more" fetches further pages on demand.

let currentQuery = '';
let currentPage = 1;
let renderedPages = new Set();
let loadingMore = false;

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

function hideLiveResults() {
  const panel = document.getElementById('liveResultsPanel');
  if (panel) panel.style.display = 'none';
  currentQuery = '';
  renderedPages = new Set();
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
  list.insertAdjacentHTML('beforeend', data.results.map(candidateCard).join(''));
  panel.style.display = '';
  const shown = list.querySelectorAll('.cand-card').length;
  if (count) count.textContent = `${shown}${data.hasMore ? '+' : ''} found`;
  if (more) more.style.display = data.hasMore && currentPage < 5 ? '' : 'none';
}

async function loadMoreResults() {
  if (loadingMore || !currentQuery) return;
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
  if (a) txrTrackTool('candidate_open', { platform: platformTag(a.href)[0] }, { resultUrl: a.href, query: currentQuery });
});

export { renderLiveResults, hideLiveResults, loadMoreResults };
