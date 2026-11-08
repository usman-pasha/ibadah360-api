const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const User = require('../models/User');
const places = require('../services/places');

// /api/places/masjids?lat=12.97&lng=77.59&radius=3000. Without lat and lng, the centre of the person's saved city is used.
router.get('/masjids', auth, safe(async (req, res) => {
  const radius = Math.min(10000, Math.max(500, parseInt(req.query.radius, 10) || 3000));
  let lat = Number(req.query.lat);
  let lng = Number(req.query.lng);
  let source = 'you';
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || req.query.lat === undefined || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    const user = await User.findById(req.userId);
    ({ lat, lng } = await places.geocode(user.city, user.state));
    source = 'city';
  }
  res.json({ center: { lat, lng, source }, radius, places: await places.masjids(lat, lng, radius), source: 'OpenStreetMap' });
}));

module.exports = router;
