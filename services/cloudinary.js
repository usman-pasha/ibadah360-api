// Cloudinary (photo storage) without any extra npm package: a signed upload with Node's built-in fetch and crypto.
// Set CLOUDINARY_URL (cloudinary://API_KEY:API_SECRET@CLOUD_NAME) or the three CLOUDINARY_* values in .env.
const crypto = require('crypto');
const { SIZE_PX } = require('../config/avatar');

const fail = (msg, status) => Object.assign(new Error(msg), { status: status || 503, expose: true });

function config() {
  const url = (process.env.CLOUDINARY_URL || '').trim();
  const m = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(url);
  if (m) return { key: m[1], secret: m[2], cloud: m[3] };
  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = process.env;
  return cloud && key && secret ? { cloud, key, secret } : null;
}
const enabled = () => !!config();

// Cloudinary's signature: sort the parameters by name, join as name=value&name=value, add the secret, SHA-1.
const sign = (params, secret) => crypto.createHash('sha1')
  .update(Object.keys(params).filter((k) => params[k] !== undefined && params[k] !== '').sort().map((k) => `${k}=${params[k]}`).join('&') + secret)
  .digest('hex');

const publicIdOf = (userId) => `ibadah360/avatars/${userId}`; // one picture per person, a new upload replaces the old one

async function call(action, extra, file) {
  const c = config();
  if (!c) throw fail('Photo upload is not set up on this server yet. Add the Cloudinary keys to the .env file.');
  const params = { ...extra, timestamp: String(Math.floor(Date.now() / 1000)) };
  const form = new FormData();
  if (file) form.append('file', file);
  Object.entries(params).forEach(([k, v]) => form.append(k, v));
  form.append('api_key', c.key);
  form.append('signature', sign(params, c.secret));
  let r;
  try { r = await fetch(`https://api.cloudinary.com/v1_1/${c.cloud}/image/${action}`, { method: 'POST', body: form, signal: AbortSignal.timeout(30000) }); }
  catch (e) { throw fail('Could not reach the photo service. Please try again.'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error(`Cloudinary ${action} answered ${r.status}:`, j.error && j.error.message);
    if (r.status === 401 || r.status === 403) throw fail('The photo service did not accept the keys. Check the Cloudinary values in .env.');
    throw fail('The photo service had a problem. Please try again.');
  }
  return j;
}

// dataUri = 'data:image/jpeg;base64,....' already checked by utils/image.js. Returns the https address of the stored picture.
async function uploadAvatar(userId, dataUri) {
  const j = await call('upload', { public_id: publicIdOf(userId), overwrite: 'true', invalidate: 'true', transformation: `c_fill,g_face,w_${SIZE_PX},h_${SIZE_PX}` }, dataUri);
  if (!j.secure_url || !/^https:\/\/res\.cloudinary\.com\//.test(j.secure_url)) throw fail('The photo service sent an unexpected answer. Please try again.');
  return j.secure_url;
}

async function removeAvatar(userId) {
  await call('destroy', { public_id: publicIdOf(userId), invalidate: 'true' });
}

module.exports = { enabled, uploadAvatar, removeAvatar, sign, publicIdOf };
