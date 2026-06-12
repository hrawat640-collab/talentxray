import { state } from './state.js';
import { PLATFORMS } from './platforms.js';

// Embedded double quotes would break the boolean query syntax; strip them from user terms.
const clean=(s)=>String(s).replace(/"/g,'').trim();

function buildStringForPlatform(platformKey,baseOv){const ov={...(baseOv||{})};if(platformKey==='behance')ov.seniorities=[];const savedPlatforms=new Set(state.selPlatforms);state.selPlatforms=new Set([platformKey]);const result=buildString(ov);state.selPlatforms=savedPlatforms;return result;}
function buildString(ov={}){
  const platforms=[...state.selPlatforms];const hasLI=state.selPlatforms.has('linkedin');const isLIOnly=hasLI&&platforms.length===1;const liCountry=document.getElementById('liCountry').value;
  const titles=ov.titles??[...state.titleBubbles];
  let seniorities=ov.seniorities??[...state.seniorityBubbles];
  if(platforms.length===1&&platforms[0]==='behance')seniorities=[];
  const roleLogic=(ov.titleLogicMode||document.getElementById('titleLogicMode')?.value||'OR').toUpperCase()==='AND'?'AND':'OR';
  const locations=(ov.locations??[...state.locBubbles]).map(clean).filter(Boolean);const companies=(ov.companies??state.compBubbles.map(c=>c)).map(clean).filter(Boolean);const excludeKw=(ov.excludeKw??state.excBubbles.map(k=>k)).map(clean).filter(Boolean);
  let allMust=ov.mustBubbles??state.mustBubbles;let allOr=ov.orBubbles??state.orBubbles;
  if(hasLI){const andB=allMust.filter(b=>b.mode==='and');const overflow=andB.slice(3);allMust=[...allMust.filter(b=>b.mode==='or'),...andB.slice(0,3)];allOr=[...allOr,...overflow];}
  if(!titles.length&&!allMust.length&&!allOr.length)return{str:'',url:''};
  let parts=[];
  if(platforms.length===1){parts.push(hasLI?`site:${liCountry}`:PLATFORMS[platforms[0]].site);}
  else{parts.push('('+platforms.map(k=>k==='linkedin'?`site:${liCountry}`:PLATFORMS[k].site).join(' OR ')+')');}
  platforms.forEach(k=>{const noise=(k==='linkedin'?PLATFORMS.linkedin.noise:PLATFORMS[k]?.noise)||'';if(noise)parts.push(noise);});
  if(parts.length>1){const noisePart=parts.filter(p=>p.startsWith('-inurl:'));const uniqueNoise=[...new Set(noisePart.join(' ').split(' '))].join(' ');parts=parts.filter(p=>!p.startsWith('-inurl:'));if(uniqueNoise)parts.splice(1,0,uniqueNoise);}
  if(titles.length){
    const roleOr=titles
      .flatMap((entry)=>(entry||'').split(/\s+or\s+/i))
      .map(clean)
      .filter(Boolean);
    if(roleOr.length===1){
      parts.push(isLIOnly?`intitle:"${roleOr[0]}"`:`"${roleOr[0]}"`);
    }else if(roleOr.length>1){
      const roleExpr=`(${roleOr.map(t=>`"${t}"`).join(` ${roleLogic} `)})`;
      parts.push(isLIOnly?`intitle:${roleExpr}`:roleExpr);
    }
  }
  if(seniorities.length){
    // Seniority matches the page body, never intitle: a second intitle condition
    // over-constrains LinkedIn queries and Google starts returning loose matches.
    const sens=seniorities.map(clean).filter(Boolean);
    if(sens.length){
      const seniorityExpr=sens.length===1?`"${sens[0]}"`:`(${sens.map(s=>`"${s}"`).join(' OR ')})`;
      parts.push(seniorityExpr);
    }
  }
  if(locations.length===1)parts.push(`"${locations[0]}"`);else if(locations.length>1)parts.push('('+locations.map(l=>`"${l}"`).join(' OR ')+')');
  companies.forEach(c=>parts.push(`"${c}"`));
  allMust.filter(b=>b.mode==='and').forEach(b=>{const t=clean(b.text);if(t)parts.push(`"${t}"`);});
  const mustOrArr=allMust.filter(b=>b.mode==='or').map(b=>clean(b.text)).filter(Boolean);if(mustOrArr.length===1)parts.push(`"${mustOrArr[0]}"`);else if(mustOrArr.length>1)parts.push(`(${mustOrArr.map(s=>`"${s}"`).join(' OR ')})`);
  const orArr=allOr.map(b=>clean(typeof b==='string'?b:b.text)).filter(Boolean);if(orArr.length===1)parts.push(`"${orArr[0]}"`);else if(orArr.length>1)parts.push(`(${orArr.map(s=>`"${s}"`).join(' OR ')})`);
  excludeKw.forEach(k=>parts.push(`-"${k}"`));
  // Note: Google discontinued the num= results-per-page parameter; don't send it.
  const str=parts.join(' ');return{str,url:`https://www.google.com/search?q=${encodeURIComponent(str)}`};
}
export { buildString, buildStringForPlatform };
