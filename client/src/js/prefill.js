import { state } from './state.js';
import { renderAllBubbles, setTitleLogicMode } from './bubbles.js';
import { liveUpdate } from './live-update.js';
import { txrTrackTool } from './analytics.js';

// Seeds the builder from query params (?role=&must=&nice=...) — SkillMapper deep links.
function prefillFromParams(){
  const p=new URLSearchParams(window.location.search);
  const readFirst=(keys)=>{for(const k of keys){const v=p.get(k);if(v&&v.trim())return decodeURIComponent(v).trim();}return '';};
  const splitList=(raw)=>raw.split(/[,\n|]+/).map(s=>s.trim()).filter(Boolean);
  const roleRaw=readFirst(['role','title','job_title','jobTitle']);
  const altRaw=readFirst(['alt','alt_titles','altTitles']);
  const mustRaw=readFirst(['must','must_have','musthave','must_skills','mustSkills']);
  const goodRaw=readFirst(['good_to_have','goodtohave','nice','nice_to_have','niceSkills']);
  const skillsRaw=readFirst(['skills']);
  const roleLogicRaw=readFirst(['role_logic','roleLogic']);

  if(roleRaw)splitList(roleRaw).forEach(r=>state.titleBubbles.push(r));
  if(altRaw)splitList(altRaw).forEach(r=>state.titleBubbles.push(r));

  if(mustRaw){
    state.mustBubbles=splitList(mustRaw).map(s=>({text:s,mode:'and'}));
  }
  if(goodRaw){
    state.orBubbles=splitList(goodRaw).map(s=>({text:s,mode:'or'}));
  }else if(skillsRaw&&!mustRaw){
    const allSkills=splitList(skillsRaw);
    state.mustBubbles=allSkills.slice(0,2).map(s=>({text:s,mode:'and'}));
    state.orBubbles=allSkills.slice(2).map(s=>({text:s,mode:'or'}));
  }

  setTitleLogicMode((roleLogicRaw||'OR').toUpperCase()==='AND'?'AND':'OR');
  renderAllBubbles();
  liveUpdate();
  if(roleRaw||altRaw||mustRaw||goodRaw||skillsRaw||roleLogicRaw){
    txrTrackTool('url_prefilled',{
      has_role:!!roleRaw,
      has_must:!!mustRaw,
      has_nice:!!goodRaw||!!skillsRaw
    });
  }
}
export { prefillFromParams };
