import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, AUTH_EMAIL_BASE } from './config.js';
import { txrTrackEvent, txrPostJson } from './analytics.js';

let txrSupabaseClient=null;
let txrSessionHydrated=false;
function txrShowToast(msg,type){
  if(typeof window.showToast==='function'){
    window.showToast(msg,type);
    return;
  }
  const node=document.getElementById('txrCreateOk')||document.getElementById('txrCreateErr');
  if(!node)return;
  node.style.display='block';
  node.textContent=msg||'';
  node.style.color=type==='err'?'#b91c1c':'#6E56F0';
}

async function txrUpsertSmUser(email,name){
  if(!txrSupabaseClient||!email)return;
  try{
    const payload={
      email:email.trim().toLowerCase(),
      name:(name||'').trim()||null,
      last_login:new Date().toISOString(),
      login_date:new Date().toISOString()
    };
    const {error}=await txrSupabaseClient
      .from('sm_users')
      .upsert(payload,{onConflict:'email'});
    if(error){
      console.warn('[TXR][SUPABASE] sm_users upsert failed:',error.message,error);
      return;
    }
    console.info('[TXR][SUPABASE] sm_users upsert success for:',payload.email);
  }catch(err){
    console.warn('[TXR][SUPABASE] sm_users upsert exception:',err?.message||err,err);
  }
}

async function txrInitSupabaseAuth(){
    if(!SUPABASE_URL||!SUPABASE_ANON_KEY)return;
  try{
    txrSupabaseClient=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{
      auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,storage:window.localStorage}
    });
    console.info('[TXR][SUPABASE] auth client initialized');
    function txrApplySessionLogin(user,label){
      if(!user?.email)return;
      const name=user.user_metadata?.full_name||user.user_metadata?.name||'';
      setTimeout(function(){
        if(txrSessionHydrated)return;
        console.info('[TXR][SUPABASE] '+label+':',user.email);
        txrCleanAuthCallbackUrl();
        txrCompleteLogin(user.email,name,{silent:true});
      },0);
    }
    txrSupabaseClient.auth.onAuthStateChange((event,sessionData)=>{
      const u=sessionData?.user;
      console.info('[TXR][SUPABASE] auth state change:',event,u?.email||'no-user');
      if(event==='PASSWORD_RECOVERY'||event==='SIGNED_IN'||event==='INITIAL_SESSION'){
        if(u?.email)txrApplySessionLogin(u,'session event '+event);
        return;
      }
    });
    const {data:{session}}=await txrSupabaseClient.auth.getSession();
    if(session?.user?.email){
      txrApplySessionLogin(session.user,'getSession');
    }else{
      console.info('[TXR][SUPABASE] no session on load');
    }
  }catch(err){
    console.warn('[TXR][SUPABASE] auth init failed:',err?.message||err,err);
  }
}
async function txrRecordToolLogin(){
  if(!txrSupabaseClient)return;
  try{
    await txrSupabaseClient.rpc('record_tool_login',{
      p_tool_name:'talentxray',
      p_user_agent:navigator.userAgent,
      p_referrer:document.referrer||null
    });
  }catch(err){
    console.warn('[TXR][SUPABASE] record_tool_login failed:',err?.message||err);
  }
}
function txrEnsureSupabaseClient(){
  if(txrSupabaseClient)return txrSupabaseClient;
    if(!SUPABASE_URL||!SUPABASE_ANON_KEY)return null;
  try{
    txrSupabaseClient=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{
      auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,storage:window.localStorage}
    });
    return txrSupabaseClient;
  }catch(_err){
    return null;
  }
}
function txrSupabaseConfigError(){
    if(!SUPABASE_URL)return 'Supabase URL missing.';
  if(!SUPABASE_ANON_KEY)return 'Supabase anon key missing.';
  return 'Supabase client unavailable.';
}
function txrResolveSigninEmail(actionLabel){
  const fromField=(document.getElementById('txrSigninEmail')?.value||'').trim().toLowerCase();
  const email=fromField||window.prompt('Enter your email to '+actionLabel+':','')?.trim().toLowerCase()||'';
  if(email&&!fromField){
    const emailInput=document.getElementById('txrSigninEmail');
    if(emailInput)emailInput.value=email;
  }
  return email;
}

async function txrSignInWithGoogle(){
  const authErr=document.getElementById('txrAuthErr');
  if(authErr)authErr.style.display='none';
  if(!txrSupabaseClient){
    if(authErr){authErr.style.display='block';authErr.textContent='Google login unavailable. Check Supabase config.';}
    return;
  }
  const btn=document.getElementById('txrGoogleSignInBtn');
  if(btn){btn.disabled=true;btn.textContent='Redirecting...';}
  try{
    const redirectTo=txrGetOAuthReturnUrl();
    txrTrackEvent('login_click',{method:'google',source:'login_modal'});
    console.info('[TXR][SUPABASE] starting Google OAuth, redirectTo:',redirectTo);
    const {error}=await txrSupabaseClient.auth.signInWithOAuth({
      provider:'google',
      options:{
        redirectTo,
        queryParams:{prompt:'select_account'}
      }
    });
    if(error)throw error;
  }catch(err){
    if(btn){btn.disabled=false;btn.textContent='Continue with Google';}
    if(authErr){authErr.style.display='block';authErr.textContent=err?.message||'Google login failed. Please try again.';}
  }
}

// Seeds identity from SkillMapper handoff (?au=) and shared localStorage keys.
function txrBootstrapIdentity(){
  function txrReadSharedIdentity(){
    let smUserbaseEmail='';
    let smUserbaseName='';
    try{
      const rawSmUserbase=localStorage.getItem('sm_userbase')||'';
      if(rawSmUserbase){
        const parsed=JSON.parse(rawSmUserbase);
        if(Array.isArray(parsed)&&parsed.length){
          smUserbaseEmail=(parsed[0]?.email||'').trim();
          smUserbaseName=(parsed[0]?.name||'').trim();
        }else if(parsed&&typeof parsed==='object'){
          smUserbaseEmail=(parsed.email||parsed.user?.email||'').trim();
          smUserbaseName=(parsed.name||parsed.user?.name||'').trim();
        }
      }
    }catch(_err){}
    const smEmail=(localStorage.getItem('sm_user_email')||'').trim();
    const smName=(localStorage.getItem('sm_user_name')||'').trim();
    const sharedEmail=(localStorage.getItem('tr_shared_email')||'').trim();
    const sharedName=(localStorage.getItem('tr_shared_name')||'').trim();
    const txrEmail=(localStorage.getItem('txr_user_email')||'').trim();
    return {
      email:txrEmail||smEmail||smUserbaseEmail||sharedEmail,
      name:(localStorage.getItem('txr_user_name')||'').trim()||smName||smUserbaseName||sharedName
    };
  }

  const urlParams=new URLSearchParams(window.location.search);const urlEmail=urlParams.get('au');
  if(urlEmail&&!localStorage.getItem('txr_user_email')){const decoded=decodeURIComponent(urlEmail);const smName=localStorage.getItem('sm_user_name')||'';localStorage.setItem('txr_user_email',decoded);localStorage.setItem('txr_user_name',smName);localStorage.setItem('tr_shared_email',decoded);if(smName)localStorage.setItem('tr_shared_name',smName);window.history.replaceState({},'',(window.location.search.replace(/[?&]au=[^&]*/,'').replace(/^&/,'?'))||window.location.pathname);}
  const identity=txrReadSharedIdentity();
  if(identity.email&&!localStorage.getItem('txr_user_email')){
    localStorage.setItem('txr_user_email',identity.email);
    localStorage.setItem('tr_shared_email',identity.email);
    if(identity.name){
      localStorage.setItem('txr_user_name',identity.name);
      localStorage.setItem('tr_shared_name',identity.name);
    }
  }
  if(localStorage.getItem('txr_user_email')){txrUpdateNavLinks();}
  txrRenderUserChip();
}
function txrSwitchAuthTab(tab){
  const signup=tab!=='signin';
  const signupForm=document.getElementById('txrSignupForm');
  const signinForm=document.getElementById('txrSigninForm');
  const resetForm=document.getElementById('txrResetForm');
  const signupBtn=document.getElementById('txrAuthTabSignup');
  const signinBtn=document.getElementById('txrAuthTabSignin');
  const err=document.getElementById('txrCreateErr');
  const ok=document.getElementById('txrCreateOk');
  if(signupForm)signupForm.style.display=signup?'block':'none';
  if(signinForm)signinForm.style.display=signup?'none':'block';
  if(resetForm)resetForm.style.display='none';
  if(signupBtn){signupBtn.style.background=signup?'#6E56F0':'#fff';signupBtn.style.color=signup?'#fff':'#111827';signupBtn.style.borderColor=signup?'#6E56F0':'#d9d9d9';}
  if(signinBtn){signinBtn.style.background=signup?'#fff':'#111827';signinBtn.style.color=signup?'#111827':'#fff';signinBtn.style.borderColor=signup?'#d9d9d9':'#111827';}
  if(err)err.style.display='none';
  if(ok)ok.style.display='none';
  txrTrackEvent('auth_tab_switched',{tab:signup?'signup':'signin'});
}
function txrShowResetPasswordForm(){
  const signupForm=document.getElementById('txrSignupForm');
  const signinForm=document.getElementById('txrSigninForm');
  const resetForm=document.getElementById('txrResetForm');
  const signupBtn=document.getElementById('txrAuthTabSignup');
  const signinBtn=document.getElementById('txrAuthTabSignin');
  const err=document.getElementById('txrCreateErr');
  const ok=document.getElementById('txrCreateOk');
  if(signupForm)signupForm.style.display='none';
  if(signinForm)signinForm.style.display='none';
  if(resetForm)resetForm.style.display='block';
  if(signupBtn){signupBtn.style.background='#fff';signupBtn.style.color='#111827';signupBtn.style.borderColor='#d9d9d9';}
  if(signinBtn){signinBtn.style.background='#111827';signinBtn.style.color='#fff';signinBtn.style.borderColor='#111827';}
  if(err)err.style.display='none';
  if(ok){ok.style.display='block';ok.textContent='Recovery verified. Set your new password.';}
}
function txrApplyDefaultLoginModalView(){
  const t=document.getElementById('txrLoginTitle');
  const s=document.getElementById('txrLoginSub');
  if(t)t.textContent='Welcome to Talentxray';
  if(s)s.textContent='Sign in with Google to use the tool.';
  const g=document.getElementById('txrGoogleBtn');
  const d=document.getElementById('txrAuthDivider');
  const r=document.getElementById('txrAuthTabsRow');
  const c=document.getElementById('txrConsentBlock');
  if(g)g.style.display='';
  if(d)d.style.display='';
  if(r)r.style.display='';
  if(c)c.style.display='';
  const resetForm=document.getElementById('txrResetForm');
  const el=document.getElementById('txrResetEmailLine');
  if(el)el.style.display='none';
  if(resetForm)resetForm.style.display='none';
  const signupForm=document.getElementById('txrSignupForm');
  const signinForm=document.getElementById('txrSigninForm');
  if(signupForm)signupForm.style.display='block';
  if(signinForm)signinForm.style.display='none';
  const su=document.getElementById('txrAuthTabSignup');
  const si=document.getElementById('txrAuthTabSignin');
  if(su){su.style.background='#6E56F0';su.style.color='#fff';su.style.borderColor='#6E56F0';}
  if(si){si.style.background='#fff';si.style.color='#111827';si.style.borderColor='#d9d9d9';}
}
/* Auth return URLs — OAuth must return to the page the user started on.
   If redirectTo is not allow-listed in Supabase → Auth → Redirect URLs, GoTrue
   falls back to Site URL (often SkillMapper), which breaks TalentXray login. */
function txrIsLocalDevHost(){
  const h=(window.location.hostname||'').toLowerCase();
  return h==='localhost'||h==='127.0.0.1'||h==='[::1]';
}
function txrAuthEmailBase(){
  return(AUTH_EMAIL_BASE||'https://talentxray.talentsradar.com').replace(/\/+$/,'');
}
function txrNormalizeAppUrl(href){
  const url=new URL(href||window.location.href);
  let path=url.pathname||'/';
  if(path.endsWith('/index.html'))path=path.slice(0,-'/index.html'.length)||'/';
  if(!path.endsWith('/'))path+='/';
  return url.origin+path;
}
function txrAuthEmailReturnUrl(suffixQuery){
  const q=String(suffixQuery||'').replace(/^\?/,'');
  if(txrIsLocalDevHost())return txrNormalizeAppUrl()+(q?'?'+q:'');
  return txrAuthEmailBase()+'/'+(q?'?'+q:'');
}
/** Google OAuth callback — same origin/path the user started from. */
function txrGetOAuthReturnUrl(){
  const returnUrl=txrNormalizeAppUrl();
  try{sessionStorage.setItem('txr_oauth_return',returnUrl);}catch(_err){}
  return returnUrl;
}
function txrCleanAuthCallbackUrl(){
  const url=new URL(window.location.href);
  let changed=false;
  if(url.hash&&(url.hash.includes('access_token')||url.hash.includes('error'))){
    url.hash='';
    changed=true;
  }
  ['code','error','error_description','error_code'].forEach(function(k){
    if(url.searchParams.has(k)){url.searchParams.delete(k);changed=true;}
  });
  if(!changed)return;
  const q=url.searchParams.toString();
  window.history.replaceState({},document.title,url.pathname+(q?'?'+q:''));
}
function txrGetResetRedirect(){
  return txrAuthEmailReturnUrl('?txr_reset=1');
}
function txrGetMagicLinkRedirect(){
  return txrAuthEmailReturnUrl('?txr_magic=1');
}
async function txrSignUpWithPassword(){
  const name=(document.getElementById('txrSignupName')?.value||'').trim();
  const email=(document.getElementById('txrSignupEmail')?.value||'').trim().toLowerCase();
  const password=(document.getElementById('txrSignupPassword')?.value||'').trim();
  const err=document.getElementById('txrCreateErr');
  const ok=document.getElementById('txrCreateOk');
  const emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if(!name||!emailRe.test(email)||password.length<6){
    if(ok)ok.style.display='none';
    if(err){err.style.display='block';err.textContent='Enter name, valid email, and password (min 6 chars).';}
    return;
  }
  if(!txrSupabaseClient){
    if(err){err.style.display='block';err.textContent='Email login unavailable. Check Supabase config.';}
    return;
  }
  if(err)err.style.display='none';
  if(ok)ok.style.display='none';
  const consent=document.getElementById('txrConsent')?.checked?'yes':'no';
  try{
    const {data,error}=await txrSupabaseClient.auth.signUp({
      email,
      password,
      options:{
        data:{name,full_name:name},
        emailRedirectTo:txrGetMagicLinkRedirect()
      }
    });
    if(error){
      const msg=String(error.message||'').toLowerCase();
      if(msg.includes('already registered')||msg.includes('already been registered')||msg.includes('user already')||msg.includes('repeated_signup')){
        txrSwitchAuthTab('signin');
        const signInEmail=document.getElementById('txrSigninEmail');
        if(signInEmail)signInEmail.value=email;
        if(ok){ok.style.display='block';ok.textContent='We already have your email. Please sign in instead.';}
        if(err)err.style.display='none';
        return;
      }
      throw error;
    }
    const hasNoIdentity=(!data?.session && data?.user?.identities && Array.isArray(data.user.identities) && data.user.identities.length===0);
    const looksExistingConfirmedUser=(!data?.session && data?.user && (data.user.email_confirmed_at||data.user.confirmed_at));
    if(hasNoIdentity||looksExistingConfirmedUser){
      txrSwitchAuthTab('signin');
      const signInEmail=document.getElementById('txrSigninEmail');
      if(signInEmail)signInEmail.value=email;
      if(ok){ok.style.display='block';ok.textContent='We already have your email. Please sign in instead.';}
      if(err)err.style.display='none';
      return;
    }
    if(data?.session?.user?.email){
      txrCompleteLogin(data.session.user.email,name,{silent:false});
      return;
    }
    if(ok){ok.style.display='block';ok.textContent='Account created. Check your email to verify, then sign in. If not found, check Spam/Promotions.';}
    txrTrackEvent('signup_success',{method:'email'});
    txrPostJson('/api/lead',{email,name,consent,source:'email_signup'});
  }catch(e){
    if(err){err.style.display='block';err.textContent=e?.message||'Sign up failed. Please try again.';}
  }
}
async function txrSignInWithPassword(){
  const email=(document.getElementById('txrSigninEmail')?.value||'').trim().toLowerCase();
  const password=(document.getElementById('txrSigninPassword')?.value||'').trim();
  const err=document.getElementById('txrCreateErr');
  const emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if(!emailRe.test(email)||!password){
    if(err){err.style.display='block';err.textContent='Enter valid email and password.';}
    return;
  }
  if(!txrSupabaseClient){
    if(err){err.style.display='block';err.textContent='Email login unavailable. Check Supabase config.';}
    return;
  }
  if(err)err.style.display='none';
  try{
    const {data,error}=await txrSupabaseClient.auth.signInWithPassword({email,password});
    if(error)throw error;
    const name=data?.user?.user_metadata?.full_name||data?.user?.user_metadata?.name||'';
    txrCompleteLogin(email,name,{silent:false});
    txrTrackEvent('login_success',{method:'email_password',source:'interactive'});
  }catch(e){
    if(err){err.style.display='block';err.textContent=e?.message||'Sign in failed. Please try again.';}
  }
}
async function txrForgotPassword(){
  txrSwitchAuthTab('signin');
  const email=txrResolveSigninEmail('reset your password');
  const err=document.getElementById('txrCreateErr');
  const ok=document.getElementById('txrCreateOk');
  const emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if(!emailRe.test(email)){
    if(err){err.style.display='block';err.textContent='Enter your email first to reset password.';}
    return;
  }
  const sb=txrEnsureSupabaseClient();
  if(!sb){
    if(err){err.style.display='block';err.textContent='Password reset unavailable: '+txrSupabaseConfigError();}
    return;
  }
  if(err)err.style.display='none';
  try{
    const redirectTo=txrGetResetRedirect();
    if(/(?:\?|&)txr_debug=1(?:&|$)/.test(window.location.search+window.location.hash)||localStorage.getItem('txr_debug')==='1')
      console.info('[TXR] resetPasswordForEmail redirectTo (must be allow-listed in Supabase):',redirectTo);
    const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo});
    if(error)throw error;
    if(ok){ok.style.display='block';ok.textContent='Reset link sent. Check your inbox; if not found, check Spam/Promotions.';}
    txrShowToast('Reset link sent to '+email,'ok');
    txrTrackEvent('password_reset_requested',{method:'email'});
  }catch(e){
    if(err){err.style.display='block';err.textContent=e?.message||'Could not send reset email.';}
    txrShowToast('Could not send reset email','err');
  }
}
async function txrSendMagicLink(){
  txrSwitchAuthTab('signin');
  const email=txrResolveSigninEmail('sign in with a link');
  const err=document.getElementById('txrCreateErr');
  const ok=document.getElementById('txrCreateOk');
  const emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if(!emailRe.test(email)){
    if(err){err.style.display='block';err.textContent='Enter your email first for magic link sign-in.';}
    return;
  }
  const sb=txrEnsureSupabaseClient();
  if(!sb){
    if(err){err.style.display='block';err.textContent='Sign-in link unavailable: '+txrSupabaseConfigError();}
    return;
  }
  if(err)err.style.display='none';
  try{
    const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:txrGetMagicLinkRedirect()}});
    if(error)throw error;
    if(ok){ok.style.display='block';ok.textContent='Sign-in link sent. Check your inbox; if not found, check Spam/Promotions.';}
    txrShowToast('Sign-in link sent to '+email,'ok');
    txrTrackEvent('magic_link_sent',{method:'email_otp'});
  }catch(e){
    if(err){err.style.display='block';err.textContent=e?.message||'Could not send sign-in link.';}
    txrShowToast('Could not send sign-in link','err');
  }
}
async function txrUpdatePassword(){
  const pwd1=(document.getElementById('txrResetPassword')?.value||'').trim();
  const pwd2=(document.getElementById('txrResetPassword2')?.value||'').trim();
  const err=document.getElementById('txrCreateErr');
  const ok=document.getElementById('txrCreateOk');
  if(pwd1.length<6||pwd2.length<6){
    if(err){err.style.display='block';err.textContent='Password must be at least 6 characters.';}
    return;
  }
  if(pwd1!==pwd2){
    if(err){err.style.display='block';err.textContent='Passwords do not match.';}
    return;
  }
  if(!txrSupabaseClient){
    if(err){err.style.display='block';err.textContent='Password update unavailable. Check Supabase config.';}
    return;
  }
  if(err)err.style.display='none';
  try{
    const {error}=await txrSupabaseClient.auth.updateUser({password:pwd1});
    if(error)throw error;
    if(ok){ok.style.display='block';ok.textContent='Password updated. You are now signed in.';}
    const {data:{session}}=await txrSupabaseClient.auth.getSession();
    if(session?.user?.email){
      const name=session.user.user_metadata?.full_name||session.user.user_metadata?.name||'';
      txrCompleteLogin(session.user.email,name,{silent:false});
      return;
    }
    txrSwitchAuthTab('signin');
  }catch(e){
    if(err){err.style.display='block';err.textContent=e?.message||'Could not update password.';}
  }
}
function txrUpdateNavLinks(){const email=localStorage.getItem('txr_user_email');if(!email)return;const enc=encodeURIComponent(email);['suiteNavSM','smLinkLogin'].forEach(id=>{const el=document.getElementById(id);if(el){const base=el.href.split('?')[0];const params=new URLSearchParams(el.href.includes('?')?el.href.split('?')[1]:'');params.set('au',enc);el.href=base+'?'+params.toString();}});}
function txrRenderUserChip(){
  const email=localStorage.getItem('txr_user_email');
  const chip=document.getElementById('txrUserChip');
  if(!chip)return;
  const name=localStorage.getItem('txr_user_name')||'';
  const initials=name.trim().split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase()||(email?email[0].toUpperCase():'TX');
  document.getElementById('txrInitials').textContent=initials;
  document.getElementById('txrUserEmail').textContent=name||email||'Guest';
  if(document.getElementById('txrMenuName'))document.getElementById('txrMenuName').textContent=name||'Guest';
  if(document.getElementById('txrMenuEmail'))document.getElementById('txrMenuEmail').textContent=email||'Not signed in';
  const actionBtn=document.getElementById('txrMenuAction');
  if(actionBtn){
    actionBtn.textContent=email?'Sign out':'Sign in';
    actionBtn.style.color=email?'#b91c1c':'var(--accent)';
    actionBtn.style.fontWeight='700';
  }
  chip.style.display='flex';
}
function txrEnforceLoginGate(opts){
  const options=opts||{};
  const modal=document.getElementById('loginModal');
  if(!modal)return;
  const hasEmail=!!(localStorage.getItem('txr_user_email')||'').trim();
  modal.style.display=hasEmail?'none':'flex';
  if(!hasEmail&&options.trackGate){
    txrTrackEvent('login_gate_shown',{source:options.source||'page_load'});
  }
}
function txrToggleUserMenu(){const m=document.getElementById('txrUserMenu');if(m)m.style.display=m.style.display==='none'?'block':'none';}
document.addEventListener('click',function(e){const m=document.getElementById('txrUserMenu');const chip=document.getElementById('txrUserChip');if(m&&!m.contains(e.target)&&!chip.contains(e.target))m.style.display='none';});
function txrPrimaryAction(){
  const hasEmail=!!localStorage.getItem('txr_user_email');
  const menu=document.getElementById('txrUserMenu');
  if(menu)menu.style.display='none';
  if(hasEmail){txrSignOut();return;}
  const modal=document.getElementById('loginModal');
  if(modal){
    txrApplyDefaultLoginModalView();
    modal.style.display='flex';
    txrTrackEvent('login_modal_opened',{source:'user_chip'});
  }
}
async function txrSignOut(){
  txrTrackEvent('logout',{source:'user_menu'});
  txrSessionHydrated=false;
  ['txr_user_email','txr_user_name','txr_consent','tr_shared_email','tr_shared_name','sm_user_email','sm_user_name','sm_userbase'].forEach(k=>localStorage.removeItem(k));
  if(txrSupabaseClient){try{await txrSupabaseClient.auth.signOut();}catch(_err){}}
  txrRenderUserChip();
  txrApplyDefaultLoginModalView();
  document.getElementById('loginModal').style.display='flex';
}
function txrCompleteLogin(email,name,opts){const options=opts||{};if(options.silent&&txrSessionHydrated)return;const consent=document.getElementById('txrConsent')?.checked;localStorage.setItem('txr_user_email',email);localStorage.setItem('txr_user_name',name);if(typeof consent==='boolean')localStorage.setItem('txr_consent',consent?'yes':'no');localStorage.setItem('tr_shared_email',email);localStorage.setItem('tr_shared_name',name);localStorage.setItem('sm_user_email',email);localStorage.setItem('sm_user_name',name);document.getElementById('loginModal').style.display='none';txrUpdateNavLinks();txrRenderUserChip();if(!options.silent&&!localStorage.getItem('txr_onboarded')){document.getElementById('onboardOverlay').classList.add('show');}txrTrackEvent('login_success',{method:'google',source:options.silent?'session_restore':'interactive'});txrUpsertSmUser(email,name);txrSessionHydrated=true;txrRecordToolLogin();const consentValue=localStorage.getItem('txr_consent')||'yes';txrPostJson('/api/login-event',{email,name,consent:consentValue,method:'google'}).then(ok=>{if(ok)return;try{fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'form-name=txr-users&email='+encodeURIComponent(email)+'&name='+encodeURIComponent(name)+'&consent='+encodeURIComponent(consentValue)});}catch(e){}});}
export {
  txrBootstrapIdentity, txrInitSupabaseAuth, txrEnforceLoginGate, txrCompleteLogin,
  txrSignInWithGoogle, txrSwitchAuthTab, txrSignUpWithPassword, txrSignInWithPassword,
  txrSendMagicLink, txrForgotPassword, txrUpdatePassword,
  txrToggleUserMenu, txrPrimaryAction, txrSignOut, txrUpdateNavLinks, txrRenderUserChip,
};
