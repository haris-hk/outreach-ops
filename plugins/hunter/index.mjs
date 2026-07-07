// Hunter plugin — email finding (enrich hook) + verification (verify hook).
// Thin client; no-ops gracefully without a key; never throws into fan-outs.

const HOST = 'https://api.hunter.io';

async function get(path, params, key) {
  const url = new URL(path, HOST);
  if (url.hostname !== 'api.hunter.io') throw new Error('hunter: untrusted host');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('api_key', key);
  const res = await fetch(url.href, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`hunter: HTTP ${res.status}`);
  return res.json();
}

/** enrich(lead) → {contact_email?, contact_email_confidence?} */
export async function enrich(lead, ctx) {
  const key = ctx?.env?.HUNTER_API_KEY;
  if (!key || !lead.domain) return {};
  try {
    if (lead.contact) {
      const [first, ...rest] = String(lead.contact).split(/\s+/);
      const r = await get('/v2/email-finder', { domain: lead.domain, first_name: first, last_name: rest.join(' ') || first }, key);
      const d = r?.data;
      return d?.email ? { contact_email: d.email, contact_email_confidence: d.score } : {};
    }
    const r = await get('/v2/domain-search', { domain: lead.domain, limit: '5' }, key);
    const best = r?.data?.emails?.find((e) => ['founder', 'executive', 'management'].includes(e.seniority)) || r?.data?.emails?.[0];
    return best ? { contact_email: best.value, contact_email_confidence: best.confidence, contact_hint: [best.first_name, best.last_name].filter(Boolean).join(' ') || undefined } : {};
  } catch (err) {
    return { _hunter_error: err.message };
  }
}

/** verify(email) → {status: valid|invalid|risky|unknown, detail} */
export async function verify(email, ctx) {
  const key = ctx?.env?.HUNTER_API_KEY;
  if (!key) return { status: 'unknown', detail: 'no HUNTER_API_KEY' };
  try {
    const r = await get('/v2/email-verifier', { email }, key);
    const d = r?.data || {};
    const map = { deliverable: 'valid', undeliverable: 'invalid', risky: 'risky' };
    return { status: map[d.result] || 'unknown', detail: `hunter score ${d.score ?? '?'} (${d.result ?? 'no result'})` };
  } catch (err) {
    return { status: 'unknown', detail: err.message };
  }
}
