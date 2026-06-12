import { FREE_SEARCHES_BEFORE_LOGIN } from './config.js';
import { txrTrackEvent } from './analytics.js';

// Soft login gate: anonymous visitors get FREE_SEARCHES_BEFORE_LOGIN distinct
// queries' worth of result-consuming actions (open in Google, open profile,
// load more). After that the sign-in modal appears. Client-side only for now —
// server-side enforcement arrives with the paywall phase.

function txrHasIdentity() {
  return !!(localStorage.getItem('txr_user_email') || '').trim();
}

function gateAllows(queryStr) {
  if (txrHasIdentity()) return true;
  const key = String(queryStr || '').slice(0, 300);
  if (!key) return true;
  let used = [];
  try { used = JSON.parse(localStorage.getItem('txr_free_queries') || '[]'); } catch (_e) {}
  if (used.includes(key)) return true; // same free search, keep working it
  if (used.length < FREE_SEARCHES_BEFORE_LOGIN) {
    used.push(key);
    localStorage.setItem('txr_free_queries', JSON.stringify(used));
    return true;
  }
  const modal = document.getElementById('loginModal');
  if (modal) modal.style.display = 'flex';
  txrTrackEvent('login_gate_shown', { source: 'free_limit' });
  return false;
}

export { gateAllows, txrHasIdentity };
