import { txrTrackEvent } from './analytics.js';

function switchTab(tab,btn){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));document.getElementById('page-'+tab).classList.add('active');const activeBtn=btn||document.querySelector(`.tab-btn[onclick*="'${tab}'"]`);if(activeBtn)activeBtn.classList.add('active');txrTrackEvent('tab_switched',{tab_name:tab});window.scrollTo({top:0,behavior:'smooth'});}
function toggleFaq(qEl){qEl.closest('.faq-item').classList.toggle('open');}
function closeOnboard(){document.getElementById('onboardOverlay').classList.remove('show');localStorage.setItem('txr_onboarded','1');txrTrackEvent('onboarding_completed',{source:'got_it_button'});}
function toast(msg,type){const t=document.getElementById('toast');t.textContent=msg;t.className='toast '+(type||'');t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);}
export { switchTab, toggleFaq, closeOnboard, toast };
