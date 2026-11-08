// Nearby masjids from OpenStreetMap (Overpass) and city centres from Nominatim. Results are kept in MongoDB for a day.
const PlaceCache = require('../models/PlaceCache');

const fail = (message) => Object.assign(new Error(message), { status: 503, expose: true });

async function cached(key, load) {
  const hit = await PlaceCache.findOne({ key }).lean();
  if (hit) return hit.data;
  const data = await load();
  await PlaceCache.updateOne({ key }, { $set: { data, createdAt: new Date() } }, { upsert: true }).catch(() => {});
  return data;
}

const rad = (d) => (d * Math.PI) / 180;
function distance(a, b, c, d) { // metres between two points
  const x = Math.sin(rad(c - a) / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2;
  return Math.round(12742000 * Math.asin(Math.sqrt(x)));
}

async function geocode(city, state) {
  const q = [city, state, 'India'].filter(Boolean).join(', ');
  return cached('geo|' + q.toLowerCase(), async () => {
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q), { headers: { 'User-Agent': 'Ibadah360/1.0 (prayer app)' }, signal: AbortSignal.timeout(10000) });
      const j = await r.json();
      if (!j[0]) throw new Error('not found');
      return { lat: Number(j[0].lat), lng: Number(j[0].lon) };
    } catch (e) { throw fail('Could not find your city on the map. Use "My location" instead.'); }
  });
}

async function masjids(lat, lng, radius) {
  const key = `m|${lat.toFixed(3)}|${lng.toFixed(3)}|${radius}`;
  const raw = await cached(key, async () => {
    const q = `[out:json][timeout:25];(node["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});way["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng}););out center tags 80;`;
    try {
      const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q), signal: AbortSignal.timeout(28000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return (await r.json()).elements || [];
    } catch (e) { throw fail('The map server is busy. Please try again in a minute.'); }
  });
  return raw
    .map((e) => {
      const t = e.tags || {};
      const la = e.lat !== undefined ? e.lat : e.center && e.center.lat;
      const lo = e.lon !== undefined ? e.lon : e.center && e.center.lon;
      if (la === undefined || lo === undefined) return null;
      return {
        id: `${e.type}/${e.id}`, name: t.name || t['name:en'] || 'Masjid (name not on the map)', lat: la, lng: lo,
        distance: distance(lat, lng, la, lo),
        address: [t['addr:housenumber'], t['addr:street'], t['addr:suburb'] || t['addr:neighbourhood'], t['addr:city']].filter(Boolean).join(', '),
        phone: t.phone || t['contact:phone'] || null, website: t.website || t['contact:website'] || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 40);
}

module.exports = { geocode, masjids, distance };
