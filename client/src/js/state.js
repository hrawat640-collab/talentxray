// Shared mutable app state. All modules read and write through this object.
export const state = {
  selPlatforms: new Set(['linkedin']),
  mustBubbles: [], orBubbles: [],
  titleBubbles: [], seniorityBubbles: [],
  locBubbles: [], compBubbles: [], excBubbles: [],
  curStr: '', curUrl: '',
  searchHistory: JSON.parse(localStorage.getItem('txr_history') || '[]'),
  templates: JSON.parse(localStorage.getItem('txr_templates') || '[]'),
};
