// @ts-check
// Google Places provider plugin — local/SMB business discovery for the signal
// scan. Keyed provider: never auto-detects; runs only via an explicit
// icp.yml entry:
//
//   watchlists:
//     sources:
//       - { provider: google-places, query: "marketing agencies in Leeds", min_rating: 4.0, max: 15 }
//
// Uses Places API (New) text search. Each entry = ONE request (cost control).

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.displayName', 'places.websiteUri', 'places.formattedAddress',
  'places.rating', 'places.userRatingCount', 'places.googleMapsUri',
  'places.businessStatus',
].join(',');

/** Map one Places result → Signal (or null). Exported for tests. */
export function placeToSignal(place, entry = {}) {
  const name = place?.displayName?.text || place?.displayName;
  if (!name) return null;
  if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') return null;
  if (entry.min_rating && (place.rating ?? 0) < entry.min_rating) return null;
  const url = place.websiteUri || place.googleMapsUri;
  if (!url || !/^https:\/\//.test(url)) return null;
  const bits = [
    place.formattedAddress,
    place.rating ? `★${place.rating} (${place.userRatingCount ?? 0} reviews)` : null,
  ].filter(Boolean).join(' · ');
  return {
    company: String(name).slice(0, 80),
    company_url: place.websiteUri || undefined,
    signal_type: 'listing',
    headline: `local business: ${name}`.slice(0, 140),
    detail: bits || undefined,
    source_url: place.googleMapsUri || url,
  };
}

export default {
  search,
  provider: {
    id: 'google-places',
    detect() { return null; }, // keyed providers never auto-detect

    async fetch(entry, ctx) {
      const key = ctx?.env?.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
      if (!key) throw new Error('GOOGLE_PLACES_API_KEY not set — enable google-places and add the key to .env');
      if (!entry.query) throw new Error('google-places: entry needs a query (e.g. "dental clinics in Austin")');

      const url = new URL(ENDPOINT);
      if (url.hostname !== 'places.googleapis.com') throw new Error('google-places: untrusted host');
      const res = await fetch(url.href, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify({ textQuery: String(entry.query), maxResultCount: Math.min(Number(entry.max) || 15, 20) }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`google-places: HTTP ${res.status}`);
      const json = await res.json();
      return (json?.places || []).map((p) => placeToSignal(p, entry)).filter(Boolean);
    },
  },
};

/** Map one Places result → discover.mjs Company. Exported for tests. */
export function placeToCompany(place, entry = {}) {
  const s = placeToSignal(place, entry);
  if (!s) return null;
  return {
    company: s.company,
    website: s.company_url,
    location: place?.formattedAddress || undefined,
    detail: s.detail,
    source_url: s.source_url,
  };
}

/** search(query, ctx) → Company[] — local/SMB discovery for discover.mjs. */
export async function search(query, ctx) {
  const key = ctx?.env?.GOOGLE_PLACES_API_KEY;
  if (!key) return [];
  const text = [query?.keywords, query?.industry, query?.geo && `in ${query.geo}`].filter(Boolean).join(' ');
  if (!text.trim()) return [];
  try {
    const url = new URL(ENDPOINT);
    if (url.hostname !== 'places.googleapis.com') throw new Error('untrusted host');
    const res = await fetch(url.href, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELD_MASK },
      body: JSON.stringify({ textQuery: text, maxResultCount: Math.min(Number(query?.limit) || 15, 20) }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const minRating = Number(ctx?.settings?.min_rating) || 0;
    return (json?.places || []).map((p) => placeToCompany(p, { min_rating: minRating })).filter(Boolean);
  } catch (err) {
    console.error(`  ⚠️  google-places search: ${err.message}`);
    return [];
  }
}
