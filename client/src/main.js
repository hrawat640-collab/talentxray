import './styles/main.css';
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
  fixRegionMismatch: actions.fixRegionMismatch,
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
  .catch(() => auth.txrEnforceLoginGate());
