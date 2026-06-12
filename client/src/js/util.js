import { toast } from './ui.js';

// HTML-escapes user-controlled text before it goes into innerHTML.
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function escapeRegExp(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function highlight(text,q){return esc(text).replace(new RegExp('('+escapeRegExp(esc(q))+')','gi'),'<span style="color:var(--accent);font-weight:700">$1</span>');}
// Syntax-highlights the query string. Tokenizes first, escapes every segment,
// so user-typed terms can never inject markup.
function renderHL(str){
  const tokens=/(site:\S+|intitle:\([^)]*\)|intitle:"[^"]*"|-"[^"]*"|-inurl:\w+|\bOR\b)/g;
  let out='',last=0,m;
  while((m=tokens.exec(str))){
    out+=esc(str.slice(last,m.index));
    const t=m[0];
    const cls=t.startsWith('site:')?'tok-site':t.startsWith('intitle:')?'tok-title':t==='OR'?'tok-op':'tok-not';
    out+=`<span class="${cls}">${esc(t)}</span>`;
    last=m.index+t.length;
  }
  return out+esc(str.slice(last));
}
function openUrl(url){try{const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';document.body.appendChild(a);a.click();document.body.removeChild(a);}catch(e){window.open(url,'_blank');}}
function fallbackCopy(text,onSuccess){const outTa=document.getElementById('outputTa');if(outTa){outTa.value=text;outTa.style.display='block';outTa.select();outTa.setSelectionRange(0,99999);try{const ok=document.execCommand('copy');if(ok){onSuccess&&onSuccess();toast('Copied ✓','ok');return;}}catch(e){}}const ta=document.createElement('textarea');ta.value=text;ta.style.cssText='position:fixed;top:0;left:0;width:2em;height:2em;opacity:0.01;border:0;padding:0;';document.body.appendChild(ta);ta.focus();ta.select();try{document.execCommand('copy');onSuccess&&onSuccess();toast('Copied ✓','ok');}catch(e){toast('Press Ctrl+A then Ctrl+C in the box below','');}document.body.removeChild(ta);}
function copyToClipboard(text){return new Promise(resolve=>{if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(text).then(resolve).catch(()=>{fallbackCopy(text);resolve();});}else{fallbackCopy(text);resolve();}});}
export { esc, escapeRegExp, highlight, renderHL, openUrl, fallbackCopy, copyToClipboard };
