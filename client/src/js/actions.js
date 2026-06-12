import { state } from './state.js';
import { PLATFORMS } from './platforms.js';
import { buildString } from './query-builder.js';
import { liveUpdate, updateLinkedInUI } from './live-update.js';
import { renderBubbles, renderTitleBubbles, renderLocBubbles, renderAllBubbles, setTitleLogicMode, flushPendingInputs } from './bubbles.js';
import { saveHist } from './history.js';
import { toast } from './ui.js';
import { fallbackCopy } from './util.js';
import { txrTrackEvent, txrLogSearchEvent, txrTrackTool } from './analytics.js';
import { LOC_REGION } from '../data/locations.js';
import { gateAllows } from './gate.js';
import { switchView } from './ui.js';
import { openUrl } from './util.js';
import { generateVars } from './variations.js';

function togglePlatform(btn){
  const k=btn.dataset.platform;
  const wasSelected=state.selPlatforms.has(k);
  if(state.selPlatforms.has(k)){if(state.selPlatforms.size===1){toast('Need at least one platform','err');return;}state.selPlatforms.delete(k);btn.classList.remove('active');}
  else{state.selPlatforms.add(k);btn.classList.add('active');}
  document.getElementById('liRow').classList.toggle('hidden',!state.selPlatforms.has('linkedin'));
  const hint=document.getElementById('platformHint');const n=state.selPlatforms.size;
  hint.innerHTML=n===1?'Select one or more — multiple platforms OR-combined in one Google search':`<strong>${n} platforms</strong>: ${[...state.selPlatforms].map(k=>PLATFORMS[k].label).join(', ')} — searched together`;
  txrTrackTool('platform_changed',{
    platform:PLATFORMS[k]?.label||k,
    change:wasSelected?'removed':'added',
    platform_count:n
  });
  updateLinkedInUI();liveUpdate();
}
function focusBubble(id){document.getElementById(id).focus();}
function relaxMustSkills(){const andOnes=state.mustBubbles.filter(b=>b.mode==='and');if(andOnes.length){const last=andOnes[andOnes.length-1];state.mustBubbles=state.mustBubbles.filter(b=>b!==last);state.orBubbles.push({text:last.text,mode:'or'});renderBubbles();liveUpdate();txrTrackTool('smart_tip_applied',{tip:'relax_must_skills'});toast('Moved "'+last.text+'" to Nice-to-have','ok');}}
function removeLastTitle(){if(state.titleBubbles.length>1){state.titleBubbles.pop();renderTitleBubbles();liveUpdate();txrTrackTool('smart_tip_applied',{tip:'remove_last_title'});toast('Removed last title','ok');}}
function clearLoc(){state.locBubbles.length=0;renderLocBubbles();liveUpdate();txrTrackTool('smart_tip_applied',{tip:'clear_location'});toast('Location cleared','ok');}
// Smart-tip action: switches the LinkedIn region to match the first mismatched location chip.
function fixRegionMismatch(){const sel=document.getElementById('liCountry');if(!sel)return;const current=sel.value.split('linkedin')[0];const target=state.locBubbles.map(l=>LOC_REGION[l]).find(p=>p&&p!==current);if(!target)return;const opt=[...sel.options].find(o=>o.value.startsWith(target+'linkedin'));sel.value=opt?opt.value:'linkedin.com/in/';liveUpdate();txrTrackTool('smart_tip_applied',{tip:'fix_region_mismatch'});toast('LinkedIn region updated','ok');}
function handleOpenClick(e){flushPendingInputs();const lnk=document.getElementById('openGoogleLink');if(!lnk||lnk.href===window.location.href||lnk.getAttribute('href')==='#'){toast('Add a job title or skill first','err');e.preventDefault();return false;}const{str,url}=buildString();if(!gateAllows(str)){e.preventDefault();return false;}if(str){saveHist(str,url);const platformLabel=[...state.selPlatforms].map(k=>PLATFORMS[k]?.label||k).join(',');txrTrackEvent('search_open',{platforms:platformLabel,query_length:str.length});txrLogSearchEvent('open_google',{query:str,resultUrl:url,platforms:platformLabel});}return true;}
// Results-view header action: same as the builder's Open link but without an anchor element.
function openCurrentInGoogle(){flushPendingInputs();const{str,url}=buildString();if(!str){toast('Add a job title or skill first','err');return;}if(!gateAllows(str))return;saveHist(str,url);const platformLabel=[...state.selPlatforms].map(k=>PLATFORMS[k]?.label||k).join(',');txrTrackEvent('search_open',{platforms:platformLabel,query_length:str.length,source:'results_view'});txrLogSearchEvent('open_google',{query:str,resultUrl:url,platforms:platformLabel});openUrl(url);}
// Builder's Variations button: variations live on the results view now.
function showVariations(){switchView('results');generateVars();}
function copyStr(){flushPendingInputs();const{str}=buildString();if(!str){toast('Add a job title or skill first','err');return;}const lbl=document.getElementById('copyLbl');const showCopied=()=>{lbl.textContent='✓ Copied!';setTimeout(()=>lbl.textContent='Copy',2000);txrTrackTool('query_copied',{query_length:str.length},{query:str});};if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(str).then(()=>{showCopied();toast('Copied ✓','ok');}).catch(()=>fallbackCopy(str,showCopied));return;}fallbackCopy(str,showCopied);}
function resetAll(){state.mustBubbles=[];state.orBubbles=[];state.titleBubbles.length=0;state.seniorityBubbles.length=0;state.locBubbles.length=0;state.compBubbles=[];state.excBubbles=[];setTitleLogicMode('OR');renderAllBubbles();state.selPlatforms=new Set(['linkedin']);document.querySelectorAll('.platform-btn').forEach(b=>b.classList.toggle('active',b.dataset.platform==='linkedin'));document.getElementById('liRow').classList.remove('hidden');document.getElementById('platformHint').innerHTML='';document.getElementById('varPanel').classList.remove('show');state.curStr='';state.curUrl='';txrTrackTool('form_reset');liveUpdate();toast('Form cleared','');}
export { togglePlatform, focusBubble, relaxMustSkills, removeLastTitle, clearLoc, fixRegionMismatch, handleOpenClick, openCurrentInGoogle, showVariations, copyStr, resetAll };
