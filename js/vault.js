// Cofre: { v, kdf, iter, salt, iv, ct } em localStorage. Só o texto cifrado é persistido.
import * as C from './crypto.js';
const KEY = 'webauthvault.v1';
let key = null, meta = null, accounts = [];
export const exists = () => !!localStorage.getItem(KEY);
export const isUnlocked = () => !!key;
const need = () => { if (!key) throw new Error('Cofre bloqueado'); };
async function save() {
  const e = await C.encryptJSON(key, { accounts }); // IV novo a cada gravação
  localStorage.setItem(KEY, JSON.stringify({ ...meta, ...e }));
}
export async function create(pw) {
  const salt = C.rnd(16);
  key = await C.deriveKey(pw, salt);
  meta = { v: 1, kdf: 'PBKDF2-HMAC-SHA-256', iter: C.ITER, salt: C.b64(salt) };
  accounts = []; await save();
}
async function open(pw) {
  const m = JSON.parse(localStorage.getItem(KEY));
  const k = await C.deriveKey(pw, C.unb64(m.salt), m.iter);
  try { return { k, m, d: await C.decryptJSON(k, m) }; } catch { throw new Error('Senha incorreta ou cofre corrompido'); }
}
export async function unlock(pw) {
  const { k, m, d } = await open(pw);
  key = k; meta = { v: m.v, kdf: m.kdf, iter: m.iter, salt: m.salt }; accounts = d.accounts;
}
export const verify = async pw => { need(); await open(pw); };
export function lock() { key = null; meta = null; accounts = []; }
export const list = () => accounts.slice().sort((a, b) => (a.issuer + a.name).localeCompare(b.issuer + b.name, 'pt', { sensitivity: 'base' }));
export async function upsert(a) {
  need();
  const i = accounts.findIndex(x => x.id === a.id);
  if (i > -1) accounts[i] = a; else { a.id = crypto.randomUUID(); accounts.push(a); }
  await save();
}
export async function remove(id) { need(); accounts = accounts.filter(a => a.id !== id); await save(); }
export async function exportBackup(pw) {
  need();
  const salt = C.rnd(16), k = await C.deriveKey(pw, salt);
  const e = await C.encryptJSON(k, { accounts });
  return JSON.stringify({ format: 'webauth-vault-backup', v: 1, kdf: 'PBKDF2-HMAC-SHA-256', iter: C.ITER, salt: C.b64(salt), ...e });
}
export async function importBackup(text, pw) {
  need();
  const b = JSON.parse(text);
  if (b.format !== 'webauth-vault-backup' || !(b.iter >= 100000 && b.iter <= 5e6)) throw new Error('Arquivo de backup inválido');
  let d;
  try { d = await C.decryptJSON(await C.deriveKey(pw, C.unb64(b.salt), b.iter), b); } catch { throw new Error('Senha do backup incorreta ou arquivo corrompido'); }
  let n = 0;
  for (const a of d.accounts) {
    if (accounts.some(x => x.secret === a.secret && x.issuer === a.issuer && x.name === a.name)) continue;
    accounts.push({ ...a, id: crypto.randomUUID() }); n++;
  }
  await save(); return n;
}
export function wipe() { localStorage.removeItem(KEY); lock(); }
