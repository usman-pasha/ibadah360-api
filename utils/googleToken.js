// Checks a Google ID token with Node's built-in crypto, so no extra npm module is needed.
// 1. Download Google's public keys (cached for as long as Google allows).
// 2. Check the RS256 signature, the issuer, the audience (your client ID) and the expiry.
const crypto = require('crypto');

const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
let keys = null; // { kid: KeyObject }
let keysUntil = 0;

const b64 = (s) => Buffer.from(s, 'base64url');

async function getKeys(force) {
  if (!force && keys && Date.now() < keysUntil) return keys;
  const r = await fetch(CERTS_URL, { signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error('Could not download Google keys (HTTP ' + r.status + ')');
  const j = await r.json();
  const next = {};
  for (const jwk of j.keys || []) next[jwk.kid] = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const m = /max-age=(\d+)/.exec(r.headers.get('cache-control') || '');
  keys = next;
  keysUntil = Date.now() + (m ? Number(m[1]) : 3600) * 1000;
  return keys;
}

// Returns the token payload when the token is valid. Throws an Error when it is not.
async function verifyGoogleToken(idToken, clientId) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new Error('Not a Google ID token');
  let header; let payload;
  try { header = JSON.parse(b64(parts[0]).toString()); payload = JSON.parse(b64(parts[1]).toString()); }
  catch { throw new Error('Token could not be read'); }
  if (header.alg !== 'RS256') throw new Error('Unexpected token algorithm');

  let key = (await getKeys(false))[header.kid];
  if (!key) key = (await getKeys(true))[header.kid]; // Google rotated its keys
  if (!key) throw new Error('Unknown Google key');
  const ok = crypto.verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), key, b64(parts[2]));
  if (!ok) throw new Error('Bad token signature');

  if (!ISSUERS.includes(payload.iss)) throw new Error('Token is not from Google');
  if (payload.aud !== clientId) throw new Error('Token was made for another app');
  const now = Date.now() / 1000;
  if (!(payload.exp > now - 60)) throw new Error('Token has expired');
  if (payload.iat && payload.iat > now + 300) throw new Error('Token is from the future');
  if (!payload.sub) throw new Error('Token has no user');
  return payload;
}

module.exports = { verifyGoogleToken };
