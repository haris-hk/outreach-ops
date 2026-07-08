// @ts-check
// Apollo.io enrichment plugin — person discovery by title at a company, plus
// org firmographics. Thin client; no-ops gracefully without a key; never
// throws into the enrich fan-out. Called ONLY per-lead after firmographic
// filters (lazy, cost-ordered) — never for raw lists.
//
// Which titles to hunt: config/plugins.yml →
//   apollo: { enabled: true, titles: ["Founder", "CEO", "CTO"] }
// (defaults below when unset). Field names follow the v1 API; Apollo evolves —
// if a call 404s, check docs.apollo.io and adjust this thin client.

const HOST = 'https://api.apollo.io';
const DEFAULT_TITLES = ['Founder', 'Co-Founder', 'CEO', 'CTO', 'Owner'];

async function post(path, body, key) {
  const url = new URL(path, HOST);
  if (url.hostname !== 'api.apollo.io') throw new Error('apollo: untrusted host');
  const res = await fetch(url.href, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`apollo: HTTP ${res.status}`);
  return res.json();
}

/** Map one Apollo person record → enrich fields. Exported for tests. */
export function mapPerson(p) {
  if (!p || (!p.name && !p.first_name)) return null;
  const name = p.name || [p.first_name, p.last_name].filter(Boolean).join(' ');
  const out = {
    contact_name: name,
    contact_title: p.title || undefined,
    contact_hint: `${name}${p.title ? ` (${p.title})` : ''} via Apollo`,
  };
  // Apollo often locks emails behind credit reveal; only pass real addresses.
  if (p.email && !/not_unlocked|email_not_unlocked/.test(p.email)) out.contact_email = p.email;
  if (p.linkedin_url) out.contact_linkedin = p.linkedin_url;
  return out;
}

/** Map an Apollo organization record → enrich fields. Exported for tests. */
export function mapOrg(o) {
  if (!o) return {};
  const out = {};
  if (o.estimated_num_employees) out.company_size = o.estimated_num_employees;
  if (o.industry) out.industry = o.industry;
  if (o.founded_year) out.founded_year = o.founded_year;
  if (o.total_funding) out.total_funding = o.total_funding;
  if (o.latest_funding_round_date) out.latest_funding_date = o.latest_funding_round_date;
  if (o.website_url) out.company_url = o.website_url;
  return out;
}

/** enrich(lead, ctx) → contact + org fields (or {}). */
export async function enrich(lead, ctx) {
  const key = ctx?.env?.APOLLO_API_KEY;
  if (!key || !(lead.domain || lead.company)) return {};
  const titles = Array.isArray(ctx?.settings?.titles) && ctx.settings.titles.length
    ? ctx.settings.titles : DEFAULT_TITLES;
  const out = {};
  try {
    // 1. Org firmographics (also validates we matched the right company).
    const orgRes = await post('/v1/organizations/enrich',
      lead.domain ? { domain: lead.domain } : { name: lead.company }, key);
    Object.assign(out, mapOrg(orgRes?.organization));

    // 2. The person: search by title at this org/domain. If the lead already
    //    names a contact, skip — hunter/verify handles known names cheaper.
    if (!lead.contact) {
      const peopleRes = await post('/v1/mixed_people/search', {
        q_organization_domains: lead.domain ? [lead.domain] : undefined,
        organization_names: lead.domain ? undefined : [lead.company],
        person_titles: titles,
        page: 1,
        per_page: 3,
      }, key);
      const people = peopleRes?.people || peopleRes?.contacts || [];
      const mapped = mapPerson(people[0]);
      if (mapped) Object.assign(out, mapped);
      const alts = people.slice(1).map(mapPerson).filter(Boolean).map((m) => m.contact_hint);
      if (alts.length) out.contact_alternatives = alts;
    }
  } catch (err) {
    return { ...out, _apollo_error: err.message };
  }
  return out;
}

// Hook table for the generic plugin runner (node plugins.mjs run apollo enrich).
export default { enrich, search };

/** Map one Apollo org-search result → discover.mjs Company. Exported for tests. */
export function mapOrgSearchResult(o) {
  if (!o?.name) return null;
  const website = o.website_url || undefined;
  const source = website || o.linkedin_url;
  if (!source || !/^https:\/\//.test(source)) return null;
  return {
    company: String(o.name).slice(0, 80),
    website,
    domain: o.primary_domain || undefined,
    location: [o.city, o.state, o.country].filter(Boolean).join(', ') || undefined,
    detail: [o.industry, o.estimated_num_employees && `${o.estimated_num_employees} employees`].filter(Boolean).join(' · ') || undefined,
    source_url: source,
  };
}

/** search(query, ctx) → Company[] — ICP-driven org discovery (discover.mjs). */
export async function search(query, ctx) {
  const key = ctx?.env?.APOLLO_API_KEY;
  if (!key) return [];
  try {
    const body = {
      page: 1,
      per_page: Math.min(Number(query?.limit) || 25, 50),
    };
    if (query?.keywords) body.q_organization_keyword_tags = String(query.keywords).split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    if (query?.geo) body.organization_locations = String(query.geo).split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const res = await post('/v1/mixed_companies/search', body, key);
    const orgs = res?.organizations || res?.accounts || [];
    return orgs.map(mapOrgSearchResult).filter(Boolean);
  } catch (err) {
    console.error(`  ⚠️  apollo search: ${err.message}`);
    return [];
  }
}
