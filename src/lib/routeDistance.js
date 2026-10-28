const GEOCODER_URL = 'https://nominatim.openstreetmap.org/search';
const ROUTER_URL = 'https://router.project-osrm.org/route/v1/driving';
const geocodeCache = new Map();
let lastGeocodeRequestAt = 0;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function geocode(place) {
  const query = `${String(place || '').trim()}, Ghana`;
  const cacheKey = query.toLowerCase();
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);

  // Nominatim asks public clients to stay at or below one request per second.
  const delay = Math.max(0, 1100 - (Date.now() - lastGeocodeRequestAt));
  if (delay) await wait(delay);
  lastGeocodeRequestAt = Date.now();

  const url = new URL(GEOCODER_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('countrycodes', 'gh');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');

  const response = await fetch(url);
  if (!response.ok) throw new Error('Place lookup is temporarily unavailable. Enter the distance manually.');
  const results = await response.json();
  const result = results[0];
  if (!result) throw new Error(`Could not find “${String(place).trim()}” in Ghana. Check the place name.`);

  const point = { longitude: Number(result.lon), latitude: Number(result.lat) };
  geocodeCache.set(cacheKey, point);
  return point;
}

export async function calculateRoadDistance(origin, destination) {
  if (!String(origin || '').trim() || !String(destination || '').trim()) {
    throw new Error('Enter both an origin and destination first.');
  }

  const start = await geocode(origin);
  const end = await geocode(destination);
  const coordinates = `${start.longitude},${start.latitude};${end.longitude},${end.latitude}`;
  const url = `${ROUTER_URL}/${coordinates}?overview=false&steps=false&alternatives=false`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Road distance is temporarily unavailable. Enter the distance manually.');

  const result = await response.json();
  const meters = result.code === 'Ok' ? Number(result.routes?.[0]?.distance) : 0;
  if (!Number.isFinite(meters) || meters <= 0) {
    throw new Error('No driving route was found between those places. Enter the distance manually.');
  }
  return Math.round(meters / 1000);
}
