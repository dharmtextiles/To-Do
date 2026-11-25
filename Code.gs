/* ===== Team To Do – server (Google Apps Script) =====
   Deploy: Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone.
   Data is stored in YOUR Google Drive as team-todo-db.json (that file is the backup too). */
const MASTER_EMAIL = '';   // <-- your Gmail address (the master/admin)
const MASTER_NAME  = 'Master';   // name shown when the master completes a task
const GOOGLE_CLIENT_ID = '662396230702-gcactc5ctmvj43vmh16v4nq13jr54eqg.apps.googleusercontent.com';
const DB_NAME = 'team-todo-db.json', BACKUP_FOLDER = 'Team To Do Backups';

function doGet(){ return ContentService.createTextOutput('Team To Do server is running'); }
function doPost(e){
  let out;
  try{ out = handle_(JSON.parse(e.postData.contents)); }
  catch(err){ out = {error: String(err.message || err)}; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
function setup(){ file_(); }          // run once from the editor to authorise Drive access
function backup(){                    // run by a daily trigger (see README) or the app's "Backup now"
  const f = DriveApp.getFoldersByName(BACKUP_FOLDER);
  const folder = f.hasNext() ? f.next() : DriveApp.createFolder(BACKUP_FOLDER);
  file_().makeCopy('team-todo-backup-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd-HHmm') + '.json', folder);
}

/* ---- signed session tokens (30 days) ---- */
function secret_(){ const p = PropertiesService.getScriptProperties(); let s = p.getProperty('S');
  if(!s){ s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('S', s); } return s; }
function sign_(m){ return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(m, secret_())); }
function makeToken_(email){ const m = email + '|' + (Date.now() + 30*864e5); return Utilities.base64EncodeWebSafe(m) + '.' + sign_(m); }
function readToken_(t){ try{
  const p = String(t).split('.'); const m = Utilities.newBlob(Utilities.base64DecodeWebSafe(p[0])).getDataAsString();
  if(sign_(m) !== p[1]) return null; const a = m.split('|'); return +a[1] > Date.now() ? a[0] : null; }catch(e){ return null; } }
function verifyGoogle_(idToken){
  const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), {muteHttpExceptions:true});
  if(r.getResponseCode() !== 200) throw new Error('Google sign-in failed');
  const j = JSON.parse(r.getContentText());
  if(j.aud !== GOOGLE_CLIENT_ID || String(j.email_verified) !== 'true') throw new Error('Google sign-in failed');
  return String(j.email).toLowerCase(); }

/* ---- database in Drive ---- */
function file_(){ const it = DriveApp.getFilesByName(DB_NAME); if(it.hasNext()) return it.next();
  return DriveApp.createFile(DB_NAME, JSON.stringify({users:{}, tasks:[], deleted:{}}), 'application/json'); }
function load_(){ const d = JSON.parse(file_().getBlob().getDataAsString()); d.users = d.users||{}; d.tasks = d.tasks||[]; d.deleted = d.deleted||{}; return d; }
function save_(d){ file_().setContent(JSON.stringify(d)); }

function handle_(q){
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try{
    const email = q.action === 'login' ? verifyGoogle_(q.idToken) : readToken_(q.token);
    if(!email) return {error:'auth'};
    const d = load_(), isM = email === MASTER_EMAIL.toLowerCase(), u = d.users[email];
    if(!isM && !u) return {error:'denied'};
    const me = {email:email, name: isM ? MASTER_NAME : u.name, role: isM ? 'master' : 'editor'};
    const now = Date.now(); let changed = false;

    if(q.action === 'push'){
      (q.tasks||[]).slice(0,200).forEach(function(t){
        if(!t || !t.id || d.deleted[t.id]) return;
        const i = d.tasks.findIndex(function(x){ return x.id === t.id; }), old = i < 0 ? null : d.tasks[i];
        const n = {id:String(t.id).slice(0,24), title:String(t.title||'').slice(0,300), assignee:String(t.assignee||'').slice(0,60),
          due:+t.due||null, rep:t.rep==='daily'||t.rep==='weekly'?t.rep:'', from:+t.from||null, rec:!!t.rec,
          created: old ? old.created : now, by: old ? old.by : me.name, done:!!t.done, doneBy:null, doneAt:null, u:now};
        if(!isM) n.assignee = (t.assignee === me.name) ? me.name : (old ? old.assignee : '');   // only the master assigns other people
        if(n.done){ n.doneBy = old && old.done ? old.doneBy : me.name; n.doneAt = old && old.done ? old.doneAt : now; }  // name comes from the verified login
        if(i < 0) d.tasks.push(n); else d.tasks[i] = n;
      });
      if(isM) (q.del||[]).forEach(function(id){ d.tasks = d.tasks.filter(function(t){ return t.id !== id; }); d.deleted[id] = now; });
      changed = true;
    }
    if(q.action === 'addUser' || q.action === 'delUser' || q.action === 'backup'){
      if(!isM) return {error:'Only the master can do this'};
      const em = String(q.email||'').trim().toLowerCase(), nm = String(q.name||'').trim().slice(0,40);
      if(q.action === 'addUser'){
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em) || !nm) return {error:'Enter a valid email and a name'};
        if(Object.keys(d.users).some(function(k){ return k !== em && d.users[k].name.toLowerCase() === nm.toLowerCase(); }) || nm.toLowerCase() === MASTER_NAME.toLowerCase()) return {error:'That name is already used'};
        d.users[em] = {name:nm}; changed = true;
      } else if(q.action === 'delUser'){ delete d.users[em]; changed = true; }
      else backup();
    }
    if(changed) save_(d);
    const out = {me:me, now:now, tasks:d.tasks, people:[MASTER_NAME].concat(Object.keys(d.users).map(function(k){ return d.users[k].name; }))};
    if(isM) out.users = Object.keys(d.users).map(function(k){ return {email:k, name:d.users[k].name}; });
    if(q.action === 'login') out.token = makeToken_(email);
    return out;
  } finally { lock.releaseLock(); }
}
