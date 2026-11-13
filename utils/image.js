// Checks a photo that arrives as a base64 data URL: right type, real picture, not too big.
const { MAX_BYTES, TYPES } = require('../config/avatar');

const startsWith = (buf, bytes, at = 0) => bytes.every((b, i) => buf[at + i] === b);
function kindOf(buf) {
  if (buf.length < 12) return null;
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
  return null;
}

const mb = (n) => Math.round((n / 1024 / 1024) * 10) / 10;

// Returns { dataUri, mime, bytes } or { error }. We look at the first bytes of the file, not only at what the browser says it is.
function readDataUri(value, maxBytes = MAX_BYTES) {
  if (typeof value !== 'string' || !value) return { error: 'Choose a photo first' };
  const comma = value.indexOf(',');
  const head = comma > 0 ? value.slice(0, comma) : '';
  const m = /^data:(image\/[a-z]+);base64$/.exec(head);
  if (!m || !TYPES.includes(m[1])) return { error: 'Please use a JPEG, PNG or WebP photo' };
  const b64 = value.slice(comma + 1);
  if (b64.length > Math.ceil(maxBytes / 3) * 4 + 4) return { error: `The photo is too big. The limit is ${mb(maxBytes)} MB` };
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return { error: 'That file could not be read as a photo' };
  const buf = Buffer.from(b64, 'base64');
  if (buf.length > maxBytes) return { error: `The photo is too big. The limit is ${mb(maxBytes)} MB` };
  const mime = kindOf(buf);
  if (!mime) return { error: 'That file is not a real JPEG, PNG or WebP photo' };
  return { dataUri: `data:${mime};base64,${b64}`, mime, bytes: buf.length };
}

module.exports = { readDataUri, kindOf };
