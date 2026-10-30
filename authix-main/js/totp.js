// TOTP (RFC 6238) / HOTP (RFC 4226) com Web Crypto.
const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const HASH = { SHA1: 'SHA-1', SHA256: 'SHA-256', SHA512: 'SHA-512' };
export function b32decode(s) {
  s = String(s).toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0, v = 0; const out = [];
  for (const c of s) {
    const i = A.indexOf(c);
    if (i < 0) throw new Error('Chave Base32 inválida');
    v = ((v << 5) | i) & 0xfffff; bits += 5;
    if (bits >= 8) { out.push((v >>> (bits - 8)) & 255); bits -= 8; }
  }
  if (!out.length) throw new Error('Chave vazia');
  return new Uint8Array(out);
}
export async function code(acc, time = Date.now()) {
  const period = acc.period || 30, digits = acc.digits || 6, alg = acc.algorithm || 'SHA1';
  const buf = new ArrayBuffer(8);
  new DataView(buf).setBigUint64(0, BigInt(Math.floor(time / 1000 / period)));
  const key = await crypto.subtle.importKey('raw', b32decode(acc.secret), { name: 'HMAC', hash: HASH[alg] }, false, ['sign']);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 10 ** digits;
  return String(n).padStart(digits, '0');
}
export function parseUri(uri) {
  const u = new URL(uri.trim());
  if (u.protocol !== 'otpauth:' || u.hostname !== 'totp') throw new Error('Somente otpauth://totp/ é suportado');
  const label = decodeURIComponent(u.pathname.replace(/^\//, ''));
  const i = label.indexOf(':');
  const p = u.searchParams;
  const alg = (p.get('algorithm') || 'SHA1').toUpperCase().replace('-', '');
  const digits = parseInt(p.get('digits') || '6', 10), period = parseInt(p.get('period') || '30', 10);
  if (!HASH[alg]) throw new Error('Algoritmo não suportado');
  if (![6, 8].includes(digits)) throw new Error('Dígitos devem ser 6 ou 8');
  if (!(period >= 5 && period <= 300)) throw new Error('Período inválido');
  const secret = (p.get('secret') || '').replace(/\s/g, '').toUpperCase();
  b32decode(secret);
  return { issuer: p.get('issuer') || (i > -1 ? label.slice(0, i).trim() : ''),
    name: (i > -1 ? label.slice(i + 1) : label).trim(), secret, algorithm: alg, digits, period };
}
export function buildUri(a) {
  const l = encodeURIComponent((a.issuer ? a.issuer + ':' : '') + a.name);
  const q = new URLSearchParams({ secret: a.secret, issuer: a.issuer || '', algorithm: a.algorithm, digits: a.digits, period: a.period });
  return `otpauth://totp/${l}?${q}`;
}
