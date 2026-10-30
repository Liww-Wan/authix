// Web Crypto: PBKDF2-HMAC-SHA-256 (600k iter) -> AES-256-GCM. IV aleatório de 12 bytes a cada cifragem.
const enc = new TextEncoder(), dec = new TextDecoder();
export const ITER = 600000;
export const b64 = u => { let s = ''; u.forEach(b => s += String.fromCharCode(b)); return btoa(s); };
export const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export const rnd = n => crypto.getRandomValues(new Uint8Array(n));
export async function deriveKey(pw, salt, iter = ITER) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); // chave não-extraível
}
export async function encryptJSON(key, obj) {
  const iv = rnd(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return { iv: b64(iv), ct: b64(new Uint8Array(ct)) };
}
export async function decryptJSON(key, p) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(p.iv) }, key, unb64(p.ct));
  return JSON.parse(dec.decode(pt));
}
