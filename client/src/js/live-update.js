import { state } from './state.js';
import { PLATFORMS, PLATFORM_ICONS } from './platforms.js';
import { buildString, buildStringForPlatform } from './query-builder.js';
import { updateStrength, updateSmartTips } from './insights.js';
import { updateSkillCount } from './bubbles.js';
import { saveHist } from './history.js';
import { txrTrackTool } from './analytics.js';
import { renderHL } from './util.js';

function updateLinkedInUI(){
  // reserved for future LinkedIn-specific toggles
}
function renderMultiPlatformOutput(str,url){
  const single=document.getElementById('singlePlatformOutput');const multi=document.getElementById('multiPlatformOutput');const links=document.getElementById('platformLinks');const note=document.getElementById('multiNote');const isMulti=state.selPlatforms.size>1;
  if(!isMulti){single.style.display='';multi.style.display='none';return;}
  single.style.display='none';multi.style.display='';links.innerHTML='';
  [...state.selPlatforms].forEach(key=>{
    const{str:ps,url:pu}=buildStringForPlatform(key);const icon=PLATFORM_ICONS[key]||'🔍';const label=PLATFORMS[key].label;
    const row=document.createElement('div');row.className='platform-link-row';
    const nameEl=document.createElement('span');nameEl.className='pl-name';nameEl.textContent=icon+' '+label;
    const strEl=document.createElement('span');strEl.className='pl-str';strEl.title=ps;strEl.textContent=ps;
    const aEl=document.createElement('a');aEl.className='pl-open';aEl.href=pu;aEl.target='_blank';aEl.rel='noopener noreferrer';aEl.textContent='Open ↗';
    aEl.addEventListener('click',(function(k,s,u){return function(){savePlatformHist(k,s,u);};})(key,ps,pu));
    row.appendChild(nameEl);row.appendChild(strEl);row.appendChild(aEl);links.appendChild(row);
  });
  if(state.seniorityBubbles.length&&state.selPlatforms.has('behance')){
    note.textContent='Seniority is applied to LinkedIn/GitHub only and skipped for Behance.';
    note.style.display='';
  }else{
    note.style.display='none';
  }
}
function savePlatformHist(key,str,url){const savedPlatforms=new Set(state.selPlatforms);state.selPlatforms=new Set([key]);saveHist(str,url);state.selPlatforms=savedPlatforms;const platformLabel=PLATFORMS[key]?.label||key;txrTrackTool('platform_search_open',{platform:platformLabel,query_length:str.length},{query:str,resultUrl:url,platforms:platformLabel});}
function liveUpdate(){
  updateLinkedInUI();updateSkillCount();
  const{str,url}=buildString();state.curStr=str;state.curUrl=url;
  const el=document.getElementById('outputStr');const dot=document.getElementById('outputDot');const panel=document.getElementById('resultsCard');const chars=document.getElementById('outputChars');const ta=document.getElementById('outputTa');const lnk=document.getElementById('openGoogleLink');const isMulti=state.selPlatforms.size>1;
  if(str){
    el.innerHTML=renderHL(str);el.classList.add('has-content');dot.classList.add('live');panel.classList.add('active');chars.textContent=`${str.length} chars`;
    if(!isMulti){if(ta){ta.value=str;ta.style.display='block';}if(lnk){lnk.href=url;lnk.title=url;lnk.style.opacity='1';lnk.style.pointerEvents='auto';}}
    else{if(ta)ta.style.display='none';if(lnk){lnk.style.opacity='0.4';lnk.style.pointerEvents='none';lnk.href='#';}}
    renderMultiPlatformOutput(str,url);
  }else{
    el.innerHTML='<span class="rc-str-empty">Fill in the fields above — your search string appears here in real time</span>';el.classList.remove('has-content');dot.classList.remove('live');panel.classList.remove('active');chars.textContent='';
    if(ta){ta.value='';ta.style.display='none';}if(lnk){lnk.href='#';lnk.style.opacity='0.4';lnk.style.pointerEvents='none';}
    const multi=document.getElementById('multiPlatformOutput');const single=document.getElementById('singlePlatformOutput');if(multi)multi.style.display='none';if(single)single.style.display='';
  }
  updateStrength(str);updateSmartTips(str);
}
export { updateLinkedInUI, renderMultiPlatformOutput, savePlatformHist, liveUpdate };
