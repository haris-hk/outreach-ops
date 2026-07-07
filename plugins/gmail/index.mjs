// @ts-check
// Gmail reply-detection plugin — READ-ONLY.
//
// Reworked from the upstream job-lead ingest plugin: instead of pulling leads
// out of a label, it answers one question for the sequencer: "did any
// contacted lead write back?" It searches for messages FROM the given
// addresses and returns reply events; engine/check-replies.mjs (the caller)
// writes them to data/outcomes.tsv canonically.
//
// SCOPES: the OAuth refresh token only needs https://www.googleapis.com/auth/gmail.readonly.
// This plugin has no send capability, requests none, and the engine's
// safety test greps core for send calls — keep it that way.
//
// Enable: config/plugins.yml → gmail: { enabled: true, days_back: 30 }
// .env: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

async function getAccessToken(env, fetchFn = globalThis.fetch) {
  const res = await fetchFn(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GMAIL_CLIENT_ID,
      client_secret: env.GMAIL_CLIENT_SECRET,
      refresh_token: env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`gmail: token exchange HTTP ${res.status}`);
  const json = await res.json();
  if (!json.access_token) throw new Error('gmail: no access_token in token response');
  return json.access_token;
}

async function listFrom(token, email, daysBack, fetchFn = globalThis.fetch) {
  const url = new URL(`${GMAIL_API}/messages`);
  if (url.hostname !== 'gmail.googleapis.com') throw new Error('gmail: untrusted host');
  url.searchParams.set('q', `from:${email} newer_than:${daysBack}d`);
  url.searchParams.set('maxResults', '5');
  const res = await fetchFn(url.href, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`gmail: search HTTP ${res.status}`);
  const json = await res.json();
  return (json.messages || []).map((m) => m.id);
}

/**
 * replies(contacts, ctx) → [{email, message_ids, replied: true}]
 * contacts: [{ lead_id, email }]. READ-ONLY — metadata search only, bodies
 * are never fetched (the sequencer only needs the fact of a reply).
 */
export async function replies(contacts, ctx) {
  const env = ctx?.env || {};
  if (!env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET || !env.GMAIL_REFRESH_TOKEN) return [];
  const daysBack = Number(ctx?.settings?.days_back || 30);
  const token = await getAccessToken(env, ctx?.fetchFn);
  const out = [];
  for (const c of contacts.slice(0, 50)) {
    if (!c?.email) continue;
    try {
      const ids = await listFrom(token, c.email, daysBack, ctx?.fetchFn);
      if (ids.length) out.push({ lead_id: c.lead_id, email: c.email, message_ids: ids, replied: true });
    } catch (err) {
      out.push({ lead_id: c.lead_id, email: c.email, error: err.message });
    }
  }
  return out;
}
