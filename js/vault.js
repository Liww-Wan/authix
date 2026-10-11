// Cofre local: somente o conteúdo cifrado é persistido. Metadados são sempre validados antes do PBKDF2.
import * as C from './crypto.js';
const KEY = 'webauthvault.v1';
const MIN_ITER = 100000, MAX_ITER = 1000000, MAX_ACCOUNTS = 500, MAX_BACKUP_BYTES = 5 * 1024 * 1024;
let key = null, meta = null, accounts = [];
export const exists = () => !!localStorage.getItem(KEY);
export const isUnlocked = () => !!key;
const need = () => { if (!key) throw new Error('Cofre bloqueado'); };
const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
function decodeB64(value, expectedLength, label, minLength = expectedLength) {
  if (typeof value !== 'string' || value.length > 8 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error(`${label} inválido`);
  let bytes;
  try { bytes = C.unb64(value); } catch { throw new Error(`${label} inválido`); }
  if (expectedLength != null ? bytes.length !== expectedLength : bytes.length < minLength) throw new Error(`${label} inválido`);
  return bytes;
}
function validateEnvelope(m, backup = false) {
  if (!isObj(m) || m.v !== 1 || m.kdf !== 'PBKDF2-HMAC-SHA-256' || !Number.isSafeInteger(m.iter) || m.iter < MIN_ITER || m.iter > MAX_ITER) throw new Error('Metadados criptográficos inválidos');
  if (backup && m.format !== 'webauth-vault-backup') throw new Error('Formato de backup inválido');
  decodeB64(m.salt, 16, 'Salt'); decodeB64(m.iv, 12, 'IV'); decodeB64(m.ct, null, 'Conteúdo cifrado', 17);
}
function validAccount(a) {
  if (!isObj(a)) return false;
  if (typeof a.issuer !== 'string' || a.issuer.length > 200 || typeof a.name !== 'string' || a.name.length > 320) return false;
  if (!a.issuer.trim() && !a.name.trim()) return false;
  if (typeof a.secret !== 'string' || a.secret.length > 512) return false;
  if (!/^[A-Z2-7]+=*$/i.test(a.secret.replace(/\s/g, ''))) return false;
  if (!['SHA1', 'SHA256', 'SHA512'].includes(a.algorithm)) return false;
  if (![6, 8].includes(a.digits) || !Number.isInteger(a.period) || a.period < 5 || a.period > 300) return false;
  if (a.id != null && (typeof a.id !== 'string' || a.id.length > 100)) return false;
  return true;
}
function validateAccounts(value) {
  if (!isObj(value) || !Array.isArray(value.accounts) || value.accounts.length > MAX_ACCOUNTS || !value.accounts.every(validAccount)) throw new Error('O conteúdo do cofre/backup não é válido');
  return value.accounts.map(a => ({ ...a, secret: a.secret.replace(/\s/g, '').toUpperCase() }));
}
async function save() {
  const e = await C.encryptJSON(key, { accounts });
  localStorage.setItem(KEY, JSON.stringify({ ...meta, ...e }));
}
export async function create(pw) {
  if (typeof pw !== 'string' || pw.length < 12 || pw.length > 1024) throw new Error('A senha mestra deve ter entre 12 e 1024 caracteres');
  if (exists()) throw new Error('Já existe um cofre neste navegador');
  const salt = C.rnd(16);
  key = await C.deriveKey(pw, salt);
  meta = { v: 1, kdf: 'PBKDF2-HMAC-SHA-256', iter: C.ITER, salt: C.b64(salt) };
  accounts = [];
  try { await save(); } catch (e) { lock(); throw new Error('Não foi possível salvar o cofre neste navegador'); }
}
async function open(pw) {
  let m;
  try { m = JSON.parse(localStorage.getItem(KEY)); validateEnvelope(m); }
  catch { throw new Error('Cofre inválido ou corrompido. Os dados locais não foram apagados.'); }
  let k, d;
  try {
    k = await C.deriveKey(pw, decodeB64(m.salt, 16, 'Salt'), m.iter);
    d = await C.decryptJSON(k, m);
    d = { accounts: validateAccounts(d) };
  } catch { throw new Error('Senha incorreta ou cofre corrompido'); }
  return { k, m, d };
}
export async function unlock(pw) {
  const { k, m, d } = await open(pw);
  key = k; meta = { v: m.v, kdf: m.kdf, iter: m.iter, salt: m.salt }; accounts = d.accounts;
}
export const verify = async pw => { need(); await open(pw); };
export function lock() { key = null; meta = null; accounts = []; }
export const list = () => accounts.slice().sort((a, b) => ((a.issuer || '') + (a.name || '')).localeCompare((b.issuer || '') + (b.name || ''), 'pt', { sensitivity: 'base' }));
export async function upsert(a) {
  need();
  if (!validAccount(a)) throw new Error('Dados da conta inválidos');
  const clean = { ...a, secret: a.secret.replace(/\s/g, '').toUpperCase() };
  const previous = accounts; const next = accounts.slice();
  const i = next.findIndex(x => x.id === clean.id);
  if (i > -1) next[i] = clean;
  else { if (next.length >= MAX_ACCOUNTS) throw new Error('Limite de contas atingido'); clean.id = crypto.randomUUID(); next.push(clean); }
  accounts = next;
  try { await save(); } catch { accounts = previous; throw new Error('Não foi possível salvar a conta; o cofre anterior foi preservado'); }
}
export async function remove(id) { need(); const previous = accounts; accounts = accounts.filter(a => a.id !== id); try { await save(); } catch { accounts = previous; throw new Error('Não foi possível salvar a exclusão; o cofre anterior foi preservado'); } }
export async function exportBackup(pw) {
  need();
  if (typeof pw !== 'string' || pw.length < 12 || pw.length > 1024) throw new Error('A senha do backup deve ter entre 12 e 1024 caracteres');
  const salt = C.rnd(16), k = await C.deriveKey(pw, salt);
  const e = await C.encryptJSON(k, { accounts });
  return JSON.stringify({ format: 'webauth-vault-backup', v: 1, kdf: 'PBKDF2-HMAC-SHA-256', iter: C.ITER, salt: C.b64(salt), ...e });
}
export async function importBackup(text, pw) {
  need();
  if (typeof text !== 'string' || text.length > MAX_BACKUP_BYTES) throw new Error('Arquivo de backup grande demais ou inválido');
  if (typeof pw !== 'string' || pw.length > 1024) throw new Error('Senha do backup inválida');
  let b;
  try { b = JSON.parse(text); validateEnvelope(b, true); } catch { throw new Error('Arquivo de backup inválido ou corrompido'); }
  let incoming;
  try {
    const k = await C.deriveKey(pw, decodeB64(b.salt, 16, 'Salt'), b.iter);
    incoming = validateAccounts(await C.decryptJSON(k, b));
  } catch (e) {
    if (e?.message === 'O conteúdo do cofre/backup não é válido') throw e;
    throw new Error('Senha do backup incorreta ou arquivo corrompido');
  }
  const merged = accounts.slice(); let n = 0;
  for (const a of incoming) {
    if (merged.some(x => x.secret === a.secret && x.issuer === a.issuer && x.name === a.name)) continue;
    if (merged.length >= MAX_ACCOUNTS) throw new Error('A importação excederia o limite de 500 contas');
    merged.push({ ...a, id: crypto.randomUUID() }); n++;
  }
  const previous = accounts; accounts = merged;
  try { await save(); } catch (e) { accounts = previous; throw new Error('Não foi possível salvar a importação; o cofre anterior foi preservado'); }
  return n;
}
export function wipe() { localStorage.removeItem(KEY); lock(); }
