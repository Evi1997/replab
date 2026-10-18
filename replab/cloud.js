// Account + cloud backup via Supabase's REST API (no SDK). One JSON row per user, protected by row-level security.
// The anon key is a public key by design; access is limited to your own row by the database policies.
const SUPA_URL = 'https://gcpzdexdatzyyzumbdcq.supabase.co';   // e.g. https://abcd1234.supabase.co
const SUPA_KEY = 'sb_publishable_ChzAdeFs2WhXcVdJckbO7A_VVHVn11Y';   // anon / public key
const SESSION_KEY = 'replab.session', DIRTY_KEY = 'replab.dirty', SYNCED_KEY = 'replab.synced';
const cloudOn = () => !!(SUPA_URL && SUPA_KEY);
const ls = {get:k => { try { return localStorage.getItem(k); } catch(e) { return null; } }, set:(k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch(e) {} }};
let SESSION = (() => { try { return JSON.parse(ls.get(SESSION_KEY)); } catch(e) { return null; } })();
function setSession(s){ SESSION = s; ls.set(SESSION_KEY, s ? JSON.stringify(s) : null); }

async function authCall(path, body){
  const r = await fetch(`${SUPA_URL}/auth/v1/${path}`, {method:'POST', headers:{apikey:SUPA_KEY, 'Content-Type':'application/json'}, body:JSON.stringify(body)});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.msg || j.error_description || j.message || `Login failed (${r.status})`);
  return j;
}
const keep = j => ({access:j.access_token, refresh:j.refresh_token, exp:Date.now() + (j.expires_in || 3600) * 1000 - 60000, email:j.user?.email, uid:j.user?.id});
async function signUp(email, password){
  const j = await authCall('signup', {email, password});
  if (!j.access_token) throw new Error('Account created. Confirm it from the email we sent, then log in.');
  setSession(keep(j));
}
async function signIn(email, password){ setSession(keep(await authCall('token?grant_type=password', {email, password}))); }
async function accessToken(){
  if (!SESSION) return null;
  if (Date.now() > SESSION.exp) {
    try { setSession(keep(await authCall('token?grant_type=refresh_token', {refresh_token:SESSION.refresh}))); }
    catch(e) { if (!(e instanceof TypeError)) setSession(null); return null; } // TypeError = offline: keep the session
  }
  return SESSION.access;
}
async function rest(method, query = '', body){
  const t = await accessToken(); if (!t) throw new Error('not logged in');
  const r = await fetch(`${SUPA_URL}/rest/v1/replab_data${query}`, {method, body:body && JSON.stringify(body),
    headers:{apikey:SUPA_KEY, Authorization:'Bearer ' + t, 'Content-Type':'application/json', Prefer:'resolution=merge-duplicates,return=minimal'}});
  if (!r.ok) throw new Error('sync ' + r.status);
  return method === 'GET' ? r.json() : null;
}

// Every local save marks the data dirty and pushes it shortly after (or when back online).
let pushTimer = null;
function queuePush(){ if (!cloudOn() || !SESSION) return; ls.set(DIRTY_KEY, '1'); clearTimeout(pushTimer); pushTimer = setTimeout(push, 1500); }
async function push(){
  if (!cloudOn() || !SESSION || !navigator.onLine) return false;
  try {
    const now = new Date().toISOString();
    await rest('POST', '', {user_id:SESSION.uid, data:S, updated_at:now});
    ls.set(DIRTY_KEY, null); ls.set(SYNCED_KEY, now); return true;
  } catch(e) { return false; }
}
// On open / after login: take the cloud copy unless this phone has unsynced changes.
async function syncOnOpen(){
  if (!cloudOn() || !SESSION || !navigator.onLine) return;
  try {
    const row = (await rest('GET', `?user_id=eq.${SESSION.uid}&select=data,updated_at`))[0];
    if (row && (!ls.get(DIRTY_KEY) || !S.profile)) {
      const d = defaults();
      S = {...d, ...row.data, settings:{...d.settings, ...row.data.settings}};
      ls.set(KEY, JSON.stringify(S)); ls.set(SYNCED_KEY, row.updated_at); ls.set(DIRTY_KEY, null);
      render();
    } else await push();
  } catch(e) {}
}
window.addEventListener('online', () => { if (ls.get(DIRTY_KEY)) push(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && ls.get(DIRTY_KEY)) push(); });

function loginView(){
  return `<div class="login"><div class="logo">REP<em>LAB</em></div>
    <p class="mut" style="margin:6px 0 26px">Your personal trainer. ${UI.signup ? 'Create an account' : 'Log in'} to keep your plan and progress safe, on any phone.</p>
    <div class="field"><label>Email</label><input id="l_em" type="email" autocomplete="email" inputmode="email" autocapitalize="off"></div>
    <div class="field"><label>Password${UI.signup ? ' (6+ characters)' : ''}</label><input id="l_pw" type="password" autocomplete="${UI.signup ? 'new-password' : 'current-password'}"></div>
    <button class="btn pri wide" data-a="login">${UI.signup ? 'Create account' : 'Log in'}</button>
    <button class="btn wide ghost" style="margin-top:8px" data-a="togsignup">${UI.signup ? 'I already have an account' : 'New here? Create an account'}</button></div>`;
}
function accountSection(){
  if (!cloudOn()) return '';
  const synced = ls.get(SYNCED_KEY), dirty = ls.get(DIRTY_KEY);
  return `<h2>Account</h2><div class="card"><div class="sm mut">Logged in as</div><b>${esc(SESSION?.email || '')}</b>
    <div class="sm" style="margin-top:6px">${dirty ? '<span class="pink">● Changes waiting to sync</span>' : synced ? `<span class="acc">● Backed up</span> <span class="mut">${new Date(synced).toLocaleString()}</span>` : ''}</div>
    <div class="row" style="margin-top:10px"><button class="btn s sp" data-a="syncnow">↻ Sync now</button><button class="btn s danger" data-a="logout">Log out</button></div></div>`;
}
