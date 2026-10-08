import * as V from './vault.js';
import * as T from './totp.js';
import * as Q from './qr.js';
const $ = id => document.getElementById(id);
const h = (t, p = {}, ...k) => { const e = document.createElement(t); for (const [a, v] of Object.entries(p)) a === 'class' ? e.className = v : a.startsWith('on') ? e.addEventListener(a.slice(2), v) : e.setAttribute(a, v); e.append(...k); return e; };
const LOCK_MS = 120000;
let idle, timer, rows = [], shown = new Set(), stopCam = null, editing = null;
const toast = m => { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2500); };
const view = id => { $('lock').hidden = id !== 'lock'; $('app').hidden = id !== 'app'; };
const busy = async (btn, fn) => { btn.disabled = true; try { await fn(); } finally { btn.disabled = false; } };

function showLock() {
  const ex = V.exists(); view('lock');
  $('pw2').hidden = ex; $('wipeBtn').hidden = !ex;
  $('unlockBtn').textContent = ex ? 'Desbloquear' : 'Criar cofre';
  $('lockInfo').textContent = ex ? 'Digite a senha mestra.' : 'Crie uma senha mestra forte (mín. 12 caracteres).';
  $('pw').value = $('pw2').value = $('msg').textContent = '';
}
async function go() {
  await busy($('unlockBtn'), async () => {
    $('msg').textContent = '';
    try {
      const pw = $('pw').value;
      if (V.exists()) await V.unlock(pw);
      else {
        if (pw.length < 12) throw new Error('Use ao menos 12 caracteres.');
        if (pw !== $('pw2').value) throw new Error('As senhas não conferem.');
        await V.create(pw);
      }
      $('pw').value = $('pw2').value = ''; enter();
    } catch (e) { $('msg').textContent = e.message; }
  });
}
function enter() { view('app'); render(); clearInterval(timer); timer = setInterval(tick, 500); poke(); }
function lock() {
  V.lock(); rows = []; shown.clear(); editing = null; clearInterval(timer); clearTimeout(idle);
  stopCamera(); $('list').replaceChildren(); $('search').value = '';
  for (const d of ['dlgAcc', 'dlgBk']) $(d).close();
  for (const i of ['fUri', 'fIssuer', 'fName', 'fSecret', 'bMaster', 'bPw', 'bImpPw']) $(i).value = '';
  $('accQr').removeAttribute('src'); $('accQr').hidden = true;
  showLock();
}
function poke() { if (!V.isUnlocked()) return; clearTimeout(idle); idle = setTimeout(lock, LOCK_MS); }
for (const ev of ['pointerdown', 'keydown', 'touchstart', 'mousemove']) document.addEventListener(ev, poke, { passive: true });

function render() {
  const q = $('search').value.trim().toLowerCase(), ul = $('list'), all = V.list();
  ul.replaceChildren(); rows = [];
  const items = all.filter(a => (a.issuer + ' ' + a.name).toLowerCase().includes(q));
  $('empty').hidden = all.length > 0;
  for (const a of items) {
    const code = h('div', { class: 'code', title: 'Clique para copiar' }, '••• •••'), bar = h('i');
    const r = { a, code, bar, ctr: -1, val: '' };
    code.addEventListener('click', () => copy(r));
    ul.append(h('li', {},
      h('div', { class: 'svc' }, a.issuer || a.name), h('div', { class: 'usr' }, a.issuer ? a.name : ''),
      code, h('div', { class: 'bar' }, bar),
      h('div', { class: 'row' },
        h('button', { onclick: () => copy(r) }, 'Copiar'),
        h('button', { onclick: () => { shown.has(a.id) ? shown.delete(a.id) : shown.add(a.id); paint(r); } }, 'Mostrar/Ocultar'),
        h('button', { onclick: () => openAcc(a) }, 'Editar'),
        h('button', { class: 'danger', onclick: async () => { if (confirm(`Excluir "${a.issuer || a.name}"?`)) { await V.remove(a.id); shown.delete(a.id); render(); } } }, 'Excluir'))));
    rows.push(r);
  }
  tick();
}
const fmt = (s) => s.slice(0, s.length / 2) + ' ' + s.slice(s.length / 2);
function paint(r) { r.code.textContent = shown.has(r.a.id) && r.val ? fmt(r.val) : '••• •••'; }
async function tick() {
  const now = Date.now();
  for (const r of rows) {
    const p = r.a.period || 30, c = Math.floor(now / 1000 / p);
    r.bar.style.width = (100 - ((now / 1000) % p) / p * 100) + '%';
    if (c !== r.ctr) { r.ctr = c; try { r.val = await T.code(r.a, now); } catch { r.val = ''; } paint(r); }
  }
}
async function copy(r) {
  if (!r.val) return;
  try { await navigator.clipboard.writeText(r.val); toast('Código copiado'); } catch { toast('Não foi possível copiar'); }
}

// --- adicionar / editar ---
function stopCamera() { if (stopCam) { stopCam(); stopCam = null; } $('cam').hidden = true; }
function fill(a) {
  $('fIssuer').value = a.issuer || ''; $('fName').value = a.name || ''; $('fSecret').value = a.secret || '';
  $('fAlg').value = a.algorithm || 'SHA1'; $('fDig').value = String(a.digits || 6); $('fPer').value = a.period || 30;
}
function openAcc(a) {
  editing = a || null; $('accTitle').textContent = a ? 'Editar conta' : 'Adicionar conta';
  fill(a || {}); $('fUri').value = $('accMsg').textContent = ''; $('accQr').hidden = true; $('accQr').removeAttribute('src');
  $('accQrBtn').hidden = !a; $('dlgAcc').showModal();
}
function fromUri(text) { try { fill(T.parseUri(text)); $('fUri').value = ''; $('accMsg').textContent = ''; } catch (e) { $('accMsg').textContent = e.message; } }
async function saveAcc() {
  try {
    if ($('fUri').value.trim()) fromUri($('fUri').value);
    const secret = $('fSecret').value.replace(/\s/g, '').toUpperCase(), name = $('fName').value.trim(), issuer = $('fIssuer').value.trim();
    T.b32decode(secret);
    if (!name && !issuer) throw new Error('Informe o serviço ou o usuário.');
    const period = parseInt($('fPer').value, 10);
    if (!(period >= 5 && period <= 300)) throw new Error('Período inválido.');
    await V.upsert({ id: editing?.id, issuer, name, secret, algorithm: $('fAlg').value, digits: parseInt($('fDig').value, 10), period });
    stopCamera(); $('dlgAcc').close(); render(); toast('Conta salva');
  } catch (e) { $('accMsg').textContent = e.message; }
}

// --- backup ---
const download = (name, text) => { const u = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' })); const a = h('a', { href: u, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000); };
async function doExport() {
  await busy($('bExport'), async () => {
    $('bMsg').textContent = '';
    try {
      const bp = $('bPw').value;
      if (bp.length < 12) throw new Error('A senha do backup deve ter ao menos 12 caracteres.');
      await V.verify($('bMaster').value);
      download('webauth-vault.wv', await V.exportBackup(bp));
      $('bMaster').value = $('bPw').value = ''; toast('Backup exportado');
    } catch (e) { $('bMsg').textContent = e.message; }
  });
}
async function doImport() {
  await busy($('bImport'), async () => {
    $('bMsg').textContent = '';
    try {
      const f = $('bFile').files[0]; if (!f) throw new Error('Selecione um arquivo .wv');
      if (f.size > 5e6) throw new Error('Arquivo grande demais');
      const n = await V.importBackup(await f.text(), $('bImpPw').value);
      $('bImpPw').value = ''; $('bFile').value = ''; render(); toast(`${n} conta(s) importada(s)`);
    } catch (e) { $('bMsg').textContent = e.message; }
  });
}

$('unlockBtn').onclick = go;
for (const i of ['pw', 'pw2']) $(i).addEventListener('keydown', e => e.key === 'Enter' && go());
$('wipeBtn').onclick = () => { if (confirm('Apagar PERMANENTEMENTE o cofre deste navegador? Sem backup, não há recuperação.')) { V.wipe(); showLock(); } };
$('lockBtn').onclick = lock;
$('addBtn').onclick = () => openAcc(null);
$('search').oninput = render;
$('accCancel').onclick = () => { stopCamera(); $('dlgAcc').close(); };
$('dlgAcc').addEventListener('close', stopCamera);
$('accSave').onclick = saveAcc;
$('fUri').onchange = () => $('fUri').value.trim() && fromUri($('fUri').value);
$('qrFile').onchange = async e => { try { fromUri(await Q.decodeFile(e.target.files[0])); } catch (x) { $('accMsg').textContent = x.message; } e.target.value = ''; };
$('camBtn').onclick = async () => {
  try { stopCamera(); $('cam').hidden = false; stopCam = await Q.startCamera($('cam'), t => { stopCam = null; $('cam').hidden = true; fromUri(t); }); }
  catch { $('cam').hidden = true; $('accMsg').textContent = 'Câmera indisponível ou permissão negada.'; }
};
$('accQrBtn').onclick = () => { $('accQr').src = Q.makeQR(T.buildUri(editing)); $('accQr').hidden = false; };
$('backupBtn').onclick = () => { $('bMsg').textContent = ''; $('dlgBk').showModal(); };
$('bClose').onclick = () => $('dlgBk').close();
$('bExport').onclick = doExport;
$('bImport').onclick = doImport;

if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});
showLock();
