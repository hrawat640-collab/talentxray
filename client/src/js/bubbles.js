import { state } from './state.js';
import { ALL_SKILLS } from '../data/skills-db.js';
import { JOB_TITLES } from '../data/job-titles.js';
import { LOCATIONS } from '../data/locations.js';
import { highlight } from './util.js';
import { txrTrackTool } from './analytics.js';
import { liveUpdate } from './live-update.js';

let sugFocused={must:-1,or:-1};
let jobTitleFocused=-1;
function renderTitleBubbles(){const wrap=document.getElementById('titleWrap');const input=document.getElementById('titleInput');if(!wrap||!input)return;const mode=(document.getElementById('titleLogicMode')?.value||'OR').toUpperCase();const bubbleClass=mode==='AND'?'and-b':'or-b';[...wrap.querySelectorAll('.bubble')].forEach(b=>b.remove());state.titleBubbles.forEach((t,i)=>{const el=document.createElement('span');el.className=`bubble ${bubbleClass}`;el.innerHTML=`${t}<button class="bubble-x" onclick="removeTitleBubble(${i})">×</button>`;wrap.insertBefore(el,input);});}
function removeTitleBubble(i){state.titleBubbles.splice(i,1);renderTitleBubbles();liveUpdate();}
function onTitleInput(e){const val=e.target.value.trim();renderJobTitleSug(val,'titleSug');}
function onTitleKeydown(e){
  const drop=document.getElementById('titleSug');const items=drop?[...drop.querySelectorAll('.sug-item')]:[];
  if(e.key==='ArrowDown'&&items.length){e.preventDefault();jobTitleFocused=Math.min(jobTitleFocused+1,items.length-1);items.forEach((el,i)=>el.classList.toggle('focused',i===jobTitleFocused));return;}
  if(e.key==='ArrowUp'&&items.length){e.preventDefault();jobTitleFocused=Math.max(jobTitleFocused-1,0);items.forEach((el,i)=>el.classList.toggle('focused',i===jobTitleFocused));return;}
  if(e.key==='Escape'&&drop){drop.style.display='none';return;}
  if(e.key==='Enter'||e.key===','){e.preventDefault();if(jobTitleFocused>=0&&items[jobTitleFocused]){items[jobTitleFocused].click();return;}const val=e.target.value.trim().replace(/,$/,'').trim();if(val){state.titleBubbles.push(val);e.target.value='';if(drop)drop.style.display='none';renderTitleBubbles();liveUpdate();}return;}
  if(e.key==='Backspace'&&!e.target.value&&state.titleBubbles.length){state.titleBubbles.pop();renderTitleBubbles();liveUpdate();}
}
function onTitleBlur(){setTimeout(()=>{const d=document.getElementById('titleSug');if(d)d.style.display='none';jobTitleFocused=-1;},150);}
function pickTitleFromSug(title){state.titleBubbles.push(title);document.getElementById('titleInput').value='';document.getElementById('titleSug').style.display='none';jobTitleFocused=-1;renderTitleBubbles();liveUpdate();}
function renderJobTitleSug(query,dropId){const drop=document.getElementById(dropId);if(!drop)return;if(!query){drop.style.display='none';return;}const q=query.toLowerCase();const matches=JOB_TITLES.filter(t=>t.toLowerCase().includes(q)&&!state.titleBubbles.includes(t)).slice(0,8);if(!matches.length){drop.style.display='none';return;}drop.innerHTML=matches.map(t=>`<div class="sug-item" onmousedown="pickTitleFromSug('${t.replace(/'/g,"\\'")}')"><div>${highlight(t,q)}</div></div>`).join('');drop.style.display='block';jobTitleFocused=-1;}
function setTitleLogicMode(mode,source){
  const val=(mode||'OR').toUpperCase()==='AND'?'AND':'OR';
  const inp=document.getElementById('titleLogicMode');
  if(inp)inp.value=val;
  const orBtn=document.getElementById('titleLogicOr');
  const andBtn=document.getElementById('titleLogicAnd');
  if(orBtn)orBtn.classList.toggle('active',val==='OR');
  if(andBtn)andBtn.classList.toggle('active',val==='AND');
  if(source==='user')txrTrackTool('title_logic_changed',{mode:val});
  renderTitleBubbles();
  liveUpdate();
}
function renderSeniorityBubbles(){const wrap=document.getElementById('seniorityWrap');const input=document.getElementById('seniorityInput');if(!wrap||!input)return;[...wrap.querySelectorAll('.bubble')].forEach(b=>b.remove());state.seniorityBubbles.forEach((t,i)=>{const el=document.createElement('span');el.className='bubble and-b';el.innerHTML=`${t}<button class="bubble-x" onclick="removeSeniorityBubble(${i})">×</button>`;wrap.insertBefore(el,input);});}
function removeSeniorityBubble(i){state.seniorityBubbles.splice(i,1);renderSeniorityBubbles();liveUpdate();}
function addSeniorityFromSelect(){const sel=document.getElementById('senioritySelect');if(!sel)return;const val=(sel.value||'').trim();if(!val)return;if(!state.seniorityBubbles.includes(val))state.seniorityBubbles.push(val);sel.value='';renderSeniorityBubbles();liveUpdate();}
let locFocused=-1;
function renderLocBubbles(){const wrap=document.getElementById('locWrap');const input=document.getElementById('locInput');if(!wrap||!input)return;[...wrap.querySelectorAll('.bubble')].forEach(b=>b.remove());state.locBubbles.forEach((t,i)=>{const el=document.createElement('span');el.className='bubble or-b';el.innerHTML=`${t}<button class="bubble-x" onclick="removeLocBubble(${i})">×</button>`;wrap.insertBefore(el,input);});}
function removeLocBubble(i){state.locBubbles.splice(i,1);renderLocBubbles();liveUpdate();}
function onLocInput(e){const val=e.target.value.trim();const drop=document.getElementById('locSug');if(!val){drop.style.display='none';return;}const q=val.toLowerCase();const matches=LOCATIONS.filter(l=>l.toLowerCase().includes(q)&&!state.locBubbles.includes(l)).slice(0,8);if(!matches.length){drop.style.display='none';return;}drop.innerHTML=matches.map(l=>`<div class="sug-item" onmousedown="pickLoc('${l.replace(/'/g,"\\'")}')"><div>${highlight(l,q)}</div></div>`).join('');drop.style.display='block';locFocused=-1;}
function onLocKeydown(e){const drop=document.getElementById('locSug');const items=drop?[...drop.querySelectorAll('.sug-item')]:[];if(e.key==='ArrowDown'&&items.length){e.preventDefault();locFocused=Math.min(locFocused+1,items.length-1);items.forEach((el,i)=>el.classList.toggle('focused',i===locFocused));return;}if(e.key==='ArrowUp'&&items.length){e.preventDefault();locFocused=Math.max(locFocused-1,0);items.forEach((el,i)=>el.classList.toggle('focused',i===locFocused));return;}if(e.key==='Escape'&&drop){drop.style.display='none';return;}if(e.key==='Enter'||e.key===','){e.preventDefault();if(locFocused>=0&&items[locFocused]){items[locFocused].click();return;}const val=e.target.value.trim().replace(/,$/,'').trim();if(val){state.locBubbles.push(val);e.target.value='';if(drop)drop.style.display='none';renderLocBubbles();liveUpdate();}return;}if(e.key==='Backspace'&&!e.target.value&&state.locBubbles.length){state.locBubbles.pop();renderLocBubbles();liveUpdate();}}
function onLocBlur(){setTimeout(()=>{const d=document.getElementById('locSug');if(d)d.style.display='none';locFocused=-1;},150);}
function pickLoc(loc){state.locBubbles.push(loc);document.getElementById('locInput').value='';document.getElementById('locSug').style.display='none';locFocused=-1;renderLocBubbles();liveUpdate();}
function onSkillInput(e,type){liveUpdate();renderSuggestions(type,e.target.value.trim());}
function onSkillFocus(type){renderSuggestions(type,document.getElementById(type==='must'?'mustInput':'orInput').value.trim());}
function onSkillBlur(type){setTimeout(()=>hideSuggestions(type),150);}
function renderSuggestions(type,query){
  const dropId=type==='must'?'mustSug':'orSug';const drop=document.getElementById(dropId);
  const already=type==='must'?state.mustBubbles.map(b=>b.text.toLowerCase()):state.orBubbles.map(b=>b.text.toLowerCase());
  sugFocused[type]=-1;let items;
  if(!query){const popular=['Python','JavaScript','React','AWS','SQL','Figma','Java','Node.js','TypeScript','Docker','Kubernetes','Machine Learning'];items=popular.filter(s=>!already.includes(s.toLowerCase())).slice(0,10).map(s=>{const g=ALL_SKILLS.find(x=>x.s===s)?.group||'';return{s,group:g,match:s};});}
  else{const q=query.toLowerCase();items=ALL_SKILLS.filter(({s})=>s.toLowerCase().includes(q)&&!already.includes(s.toLowerCase())).slice(0,12).map(({s,group})=>({s,group,match:s}));}
  if(!items.length&&query){drop.innerHTML=`<div class="sug-empty">No suggestions — press Enter to add "${query}"</div>`;drop.classList.add('open');return;}
  if(!items.length){drop.classList.remove('open');return;}
  const grouped={};items.forEach(({s,group,match})=>{if(!grouped[group])grouped[group]=[];grouped[group].push({s,match});});
  let html='';if(!query)html+=`<div class="sug-group-label">Popular skills</div>`;
  Object.entries(grouped).forEach(([group,skills])=>{if(query&&Object.keys(grouped).length>1)html+=`<div class="sug-group-label">${group}</div>`;skills.forEach(({s,match})=>{const q=query.toLowerCase();const hi=q?s.replace(new RegExp(`(${q})`,'gi'),'<em>$1</em>'):s;html+=`<div class="sug-item" onclick="pickSuggestion('${type}','${s.replace(/'/g,"\\'")}')"><div>${hi}</div><span>${group}</span></div>`;});});
  drop.innerHTML=html;drop.classList.add('open');
}
function hideSuggestions(type){document.getElementById(type==='must'?'mustSug':'orSug').classList.remove('open');sugFocused[type]=-1;}

const GEN_BUBBLE_CFG={comp:{arr:()=>state.compBubbles,setArr:(a)=>state.compBubbles=a,wrapId:'compWrap',inputId:'compInput',cls:'and-b'},exc:{arr:()=>state.excBubbles,setArr:(a)=>state.excBubbles=a,wrapId:'excWrap',inputId:'excInput',cls:'not-b'}};
function handleGenBubble(e,type){const cfg=GEN_BUBBLE_CFG[type];const input=e.target;if(e.key==='Escape')return;const val=input.value.trim().replace(/,$/,'').trim();if((e.key==='Enter'||e.key===',')&&val){e.preventDefault();cfg.arr().push(val);input.value='';renderAllBubbles();liveUpdate();}if(e.key==='Backspace'&&!input.value&&cfg.arr().length){cfg.arr().pop();renderAllBubbles();liveUpdate();}}
function removeGenBubble(type,idx){GEN_BUBBLE_CFG[type].arr().splice(idx,1);renderAllBubbles();liveUpdate();}
function renderGenBubbleList(type){const cfg=GEN_BUBBLE_CFG[type];const wrap=document.getElementById(cfg.wrapId);const input=document.getElementById(cfg.inputId);if(!wrap||!input)return;[...wrap.querySelectorAll('.bubble')].forEach(b=>b.remove());cfg.arr().forEach((text,i)=>{const el=document.createElement('span');el.className=`bubble ${cfg.cls}`;el.innerHTML=`${text}<button class="bubble-x" onclick="removeGenBubble('${type}',${i})">×</button>`;wrap.insertBefore(el,input);});}

function pickSuggestion(type,skill){if(type==='must')state.mustBubbles.push({text:skill,mode:'and'});else state.orBubbles.push({text:skill,mode:'or'});const inputId=type==='must'?'mustInput':'orInput';document.getElementById(inputId).value='';renderBubbles();liveUpdate();hideSuggestions(type);document.getElementById(inputId).focus();}
function handleBubble(e,type){
  const input=e.target;const dropId=type==='must'?'mustSug':'orSug';const drop=document.getElementById(dropId);const items=[...drop.querySelectorAll('.sug-item')];
  if(e.key==='ArrowDown'&&items.length){e.preventDefault();sugFocused[type]=Math.min(sugFocused[type]+1,items.length-1);items.forEach((el,i)=>el.classList.toggle('focused',i===sugFocused[type]));return;}
  if(e.key==='ArrowUp'&&items.length){e.preventDefault();sugFocused[type]=Math.max(sugFocused[type]-1,0);items.forEach((el,i)=>el.classList.toggle('focused',i===sugFocused[type]));return;}
  if(e.key==='Escape'){hideSuggestions(type);return;}
  if(e.key==='Enter'){e.preventDefault();if(sugFocused[type]>=0&&items[sugFocused[type]]){items[sugFocused[type]].click();return;}}
  const val=input.value.trim().replace(/,$/,'').trim();
  if((e.key==='Enter'||e.key===',')&&val){e.preventDefault();if(type==='must')state.mustBubbles.push({text:val,mode:'and'});else state.orBubbles.push({text:val,mode:'or'});input.value='';renderBubbles();liveUpdate();hideSuggestions(type);}
  if(e.key==='Backspace'&&!input.value){if(type==='must'&&state.mustBubbles.length){state.mustBubbles.pop();renderBubbles();liveUpdate();}if(type==='or'&&state.orBubbles.length){state.orBubbles.pop();renderBubbles();liveUpdate();}}
}
function removeBubble(type,idx){if(type==='must')state.mustBubbles.splice(idx,1);else state.orBubbles.splice(idx,1);renderBubbles();liveUpdate();}
function renderBubbles(){renderBubbleList('mustWrap','mustInput',state.mustBubbles,'must');renderBubbleList('orWrap','orInput',state.orBubbles,'or');updateSkillCount();}
function renderAllBubbles(){renderBubbles();renderTitleBubbles();renderSeniorityBubbles();renderLocBubbles();renderGenBubbleList('comp');renderGenBubbleList('exc');}
function renderBubbleList(wrapId,inputId,bubbles,type){const wrap=document.getElementById(wrapId);const input=document.getElementById(inputId);[...wrap.querySelectorAll('.bubble')].forEach(b=>b.remove());bubbles.forEach((b,i)=>{const el=document.createElement('span');el.className=`bubble ${b.mode==='and'?'and-b':'or-b'}`;el.innerHTML=`${b.text}<button class="bubble-x" onclick="removeBubble('${type}',${i})">×</button>`;wrap.insertBefore(el,input);});}
function updateSkillCount(){const isLI=state.selPlatforms.has('linkedin');const andCount=state.mustBubbles.filter(b=>b.mode==='and').length;const cnt=document.getElementById('skillCount');const warn=document.getElementById('skillWarn');if(!state.mustBubbles.length){cnt.style.display='none';warn.classList.remove('show');return;}cnt.style.display='inline';if(isLI&&andCount>3){cnt.textContent=`${andCount} skills — 3 AND max`;cnt.className='skill-count warn';warn.classList.add('show');}else{cnt.textContent=`${state.mustBubbles.length}`;cnt.className='skill-count';warn.classList.remove('show');}}
export {
  renderTitleBubbles, removeTitleBubble, onTitleInput, onTitleKeydown, onTitleBlur, pickTitleFromSug, setTitleLogicMode,
  renderSeniorityBubbles, removeSeniorityBubble, addSeniorityFromSelect,
  renderLocBubbles, removeLocBubble, onLocInput, onLocKeydown, onLocBlur, pickLoc,
  onSkillInput, onSkillFocus, onSkillBlur, renderSuggestions, hideSuggestions,
  handleGenBubble, removeGenBubble, renderGenBubbleList,
  pickSuggestion, handleBubble, removeBubble, renderBubbles, renderAllBubbles, updateSkillCount,
};
