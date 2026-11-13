// A person who signs in with Google gets their Google profile photo. We download it, turn it into base64 and store it on
// Cloudinary, so the picture lives with us and does not depend on a Google link. If Cloudinary is not set up (or is down)
// the Google picture address is used directly, so the person still sees their photo, and it moves to Cloudinary at a later sign in.
const User = require('../models/User');
const cloud = require('./cloudinary');
const { readDataUri } = require('../utils/image');
const { MAX_BYTES } = require('../config/avatar');

const GOOGLE_RE = /^https:\/\/[a-z0-9-]+\.googleusercontent\.com\//i;
const isGoogleUrl = (u) => typeof u === 'string' && GOOGLE_RE.test(u);
const bigger = (u) => u.replace(/=s\d+(-c)?$/, '=s400-c');

// Should this sign in fetch the Google photo? Yes when there is no photo yet, or only a Google link that can move to Cloudinary.
const needsGoogleImport = (user, picture) => isGoogleUrl(picture) && (!user.avatar || (isGoogleUrl(user.avatar) && cloud.enabled()));

async function toCloudinary(userId, picture) {
  const r = await fetch(bigger(picture), { redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error('Google answered ' + r.status);
  if (Number(r.headers.get('content-length') || 0) > MAX_BYTES) throw new Error('photo too big');
  const buf = Buffer.from(await r.arrayBuffer());
  const p = readDataUri('data:image/jpeg;base64,' + buf.toString('base64')); // the real type is read from the bytes
  if (p.error) throw new Error(p.error);
  return cloud.uploadAvatar(userId, p.dataUri);
}

// Returns the photo address now saved for the person ('' when they keep a photo they uploaded themselves).
async function importGoogle(userId, picture) {
  if (!isGoogleUrl(picture)) return ''; // only Google's own picture servers, so this cannot make the server fetch other addresses
  let url = '';
  if (cloud.enabled()) {
    try { url = await toCloudinary(userId, picture); } catch (e) { console.error('Google photo could not be moved to Cloudinary:', e.message); }
  }
  if (!url) url = bigger(picture);
  // only fill an empty photo or replace a Google link: a photo the person uploaded themselves is never replaced
  const done = await User.updateOne({ _id: userId, $or: [{ avatar: '' }, { avatar: { $exists: false } }, { avatar: { $regex: GOOGLE_RE } }] }, { avatar: url });
  return done.matchedCount === 1 ? url : '';
}

module.exports = { importGoogle, needsGoogleImport, isGoogleUrl };
