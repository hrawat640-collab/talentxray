import { state } from './state.js';
import { PLATFORMS } from './platforms.js';

function txrTrackEvent(eventName,params){
  try{
    if(typeof window.gtag!=='function'){
      if(/localhost|127\.0\.0\.1|\[::1\]/.test(window.location.hostname))
        console.warn('[TXR][GA] gtag not loaded — event skipped:',eventName);
      return;
    }
    window.gtag('event',eventName,params||{});
    if(/localhost|127\.0\.0\.1|\[::1\]/.test(window.location.hostname))
      console.info('[TXR][GA]',eventName,params||{});
  }catch(_err){}
}
async function txrPostJson(url,payload){
  try{
    const resp=await fetch(url,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload||{})
    });
    return resp.ok;
  }catch(_err){
    return false;
  }
}
function txrLogSearchEvent(action,details){
  const payload=details||{};
  const email=(localStorage.getItem('txr_user_email')||'').trim().toLowerCase();
  const query=(payload.query||'').toString();
  const queryPreview=query.slice(0,500);
  const platforms=(payload.platforms||'').toString();
  const feedback=payload.feedback===0||payload.feedback===1?String(payload.feedback):'';
  txrPostJson('/api/search-event',{
    email,
    action:action||'',
    platforms,
    query:queryPreview,
    feedback,
    result_url:(payload.resultUrl||'').toString().slice(0,1000)
  }).then(ok=>{
    if(ok)return;
    try{
      fetch('/',{
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:
          'form-name=txr-search-events'+
          '&email='+encodeURIComponent(email)+
          '&action='+encodeURIComponent(action||'')+
          '&platforms='+encodeURIComponent(platforms)+
          '&query='+encodeURIComponent(queryPreview)+
          '&feedback='+encodeURIComponent(feedback)+
          '&result_url='+encodeURIComponent((payload.resultUrl||'').toString().slice(0,1000))
      });
    }catch(_err){}
  });
}
function txrPlatformLabel(){return [...state.selPlatforms].map(k=>PLATFORMS[k]?.label||k).join(',');}
function txrTrackTool(action,gaParams,serverDetails){
  txrTrackEvent(action,gaParams||{});
  const d=serverDetails||{};
  txrLogSearchEvent(action,{
    platforms:d.platforms||txrPlatformLabel(),
    query:d.query||'',
    resultUrl:d.resultUrl||'',
    feedback:d.feedback,
    ...d
  });
}
export { txrTrackEvent, txrPostJson, txrLogSearchEvent, txrPlatformLabel, txrTrackTool };
