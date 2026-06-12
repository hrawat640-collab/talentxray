import { state } from './state.js';
import { LOC_REGION, REGION_NAMES } from '../data/locations.js';
import { esc } from './util.js';
import { renderLiveResults, hideLiveResults } from './results.js';

function updateStrength(str){const wrap=document.getElementById('strengthWrap');if(!str){wrap.classList.remove('show');return;}wrap.classList.add('show');const andSkills=state.mustBubbles.filter(b=>b.mode==='and').length;const hasTitle=state.titleBubbles.length>0;const hasLoc=state.locBubbles.length>0;const coCount=state.compBubbles.length;const total=andSkills+(hasTitle?1:0)+(hasLoc?1:0)+Math.max(0,coCount-1);let width,color,status,tip;if(total<=2){width=82;color='#0d7a4e';status='Broad — high volume';tip='Add 1–2 must-have skills to improve precision.';}else if(total<=4){width=62;color='#0f766e';status='Balanced — good results expected';tip='Sweet spot for X-Ray searches.';}else if(total<=6){width=30;color='#b45309';status='Tight — fewer results';tip='Remove 1–2 must-have skills or convert to nice-to-have.';}else{width=8;color='#b91c1c';status='Over-constrained — likely zero results';tip='Too many AND conditions. Remove at least 3 to get results.';}
document.getElementById('strengthFill').style.cssText=`width:${width}%;background:${color};`;const statusEl=document.getElementById('strengthStatus');statusEl.textContent=status;statusEl.style.color=color;document.getElementById('strengthTip').textContent=tip;}

function updateSmartTips(str){const panel=document.getElementById('smartTips');const list=document.getElementById('smartTipsList');if(!panel||!list)return;if(!str){panel.classList.remove('show');return;}const tips=[];const andCount=state.mustBubbles.filter(b=>b.mode==='and').length;const titleCount=state.titleBubbles.length;const locCount=state.locBubbles.length;const charLen=str.length;const liSel=document.getElementById('liCountry');if(state.selPlatforms.has('linkedin')&&liSel&&locCount){const prefix=liSel.value.split('linkedin')[0];const mismatched=prefix?state.locBubbles.find(l=>LOC_REGION[l]&&LOC_REGION[l]!==prefix):null;if(mismatched)tips.push({icon:'🌐',title:'Region / location mismatch',action:`LinkedIn region is ${REGION_NAMES[prefix]||prefix} but "${esc(mismatched)}" is elsewhere — click to switch region`,fn:'fixRegionMismatch'});}if(andCount>=3)tips.push({icon:'🎯',title:'Too many must-have skills',action:'Move 1–2 skills from Must-have to Nice-to-have',fn:'relaxMustSkills'});if(titleCount>=4)tips.push({icon:'📝',title:'Many role chips in query',action:'Remove 1–2 alternatives and keep only the strongest role terms',fn:'removeLastTitle'});if(locCount>0&&andCount>=2)tips.push({icon:'📍',title:'Location + skills is very narrow',action:'Try removing the location filter to widen the search',fn:'clearLoc'});if(charLen>280)tips.push({icon:'✂️',title:'Query is very long ('+charLen+' chars)',action:'Google X-Ray works best under 250 chars — remove some filters',fn:null});if(locCount===0&&andCount<=1&&titleCount===1&&!tips.length)tips.push({icon:'🌏',title:'Add a location to narrow results',action:'E.g. Bengaluru, India — reduces irrelevant global profiles',fn:null});if(!tips.length){panel.classList.remove('show');return;}list.innerHTML=tips.map(t=>`<div class="smart-tip-card" onclick="${t.fn?t.fn+'()':''}"><span class="stc-icon">${t.icon}</span><span class="stc-text"><strong>${t.title}</strong>${t.action}</span></div>`).join('');panel.classList.add('show');}
/* ---- Live result count via /api/search-results ----
 * The heuristic meter renders instantly as a placeholder; ~1s after the user
 * stops editing we ask Google (through the server proxy) how many results the
 * query actually has and overwrite the verdict with measured data.
 * If the API is unreachable / unconfigured / rate-limited, the heuristic stays. */
let liveCountTimer=null,liveCountSeq=0,lastLiveStr='',lastLiveData=null;
function scheduleLiveCount(str){
  if(liveCountTimer){clearTimeout(liveCountTimer);liveCountTimer=null;}
  if(!str){hideLiveResults();return;}
  if(str===lastLiveStr&&lastLiveData){applyLiveCount(lastLiveData);renderLiveResults(lastLiveData,str);return;}
  const seq=++liveCountSeq;
  liveCountTimer=setTimeout(async()=>{
    try{
      const resp=await fetch('/api/search-results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:str})});
      if(!resp.ok)return;
      const data=await resp.json();
      if(seq!==liveCountSeq||!data.ok)return;
      lastLiveStr=str;lastLiveData=data;
      state.lastLiveResults=data;
      applyLiveCount(data);
      renderLiveResults(data,str);
    }catch(_err){}
  },900);
}
function applyLiveCount(data){
  const statusEl=document.getElementById('strengthStatus');const tipEl=document.getElementById('strengthTip');const fill=document.getElementById('strengthFill');
  if(!statusEl||!tipEl||!fill)return;
  const n=data.count|0;const more=!!data.hasMore;
  let color,width,status,tip;
  if(n===0){color='#b91c1c';width=8;status='Live check: 0 results';tip='Google finds nothing for this exact query — remove a must-have skill or the location.';}
  else if(n<5){color='#b45309';width=30;status=`Live check: only ${n} result${n>1?'s':''}`;tip='Very narrow — relax a filter or use Variations to widen the pool.';}
  else if(!more){color='#0f766e';width=62;status=`Live check: ${n} results`;tip='Decent pool — open in Google or add Variations for more.';}
  else{color='#0d7a4e';width=85;status='Live check: 10+ results';tip='Good volume — open in Google to browse profiles.';}
  fill.style.cssText=`width:${width}%;background:${color};`;
  statusEl.textContent=status;statusEl.style.color=color;tipEl.textContent=tip;
}
export { updateStrength, updateSmartTips, scheduleLiveCount };
