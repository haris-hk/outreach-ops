// @ts-check
// Companies House provider plugin — newly incorporated UK companies from the
// official (free-key) registry API. A fresh incorporation is a strong
// new-business trigger: they need everything (site, tooling, services).
//
//   watchlists:
//     sources:
//       - { provider: companies-house, sic_codes: "62012,62020", days: 30, max: 25 }
//       - { provider: companies-house, query: "solar", days: 60 }

const HOST = 'https://api.company-information.service.gov.uk';

/** Map one advanced-search item → Signal (or null). Exported for tests. */
export function chCompanyToSignal(item) {
  const name = item?.company_name;
  const num = item?.company_number;
  if (!name || !num) return null;
  if (item.company_status && item.company_status !== 'active') return null;
  const inc = item.date_of_creation ? Date.parse(item.date_of_creation) : undefined;
  const sic = Array.isArray(item.sic_codes) ? item.sic_codes.slice(0, 3).join(', ') : undefined;
  const town = item?.registered_office_address?.locality;
  return {
    company: String(name).slice(0, 80),
    signal_type: 'listing',
    headline: `newly incorporated (UK)${item.date_of_creation ? ` ${item.date_of_creation}` : ''}`,
    detail: [town, sic && `SIC ${sic}`].filter(Boolean).join(' · ') || undefined,
    source_url: `https://find-and-update.company-information.service.gov.uk/company/${num}`,
    observed_at: Number.isNaN(inc) ? undefined : inc,
  };
}

export default {
  search,
  provider: {
    id: 'companies-house',
    detect() { return null; }, // keyed providers never auto-detect

    async fetch(entry, ctx) {
      const key = ctx?.env?.COMPANIES_HOUSE_API_KEY || process.env.COMPANIES_HOUSE_API_KEY;
      if (!key) throw new Error('COMPANIES_HOUSE_API_KEY not set — enable companies-house and add the (free) key to .env');

      const days = Number(entry.days || 30);
      const from = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
      const url = new URL('/advanced-search/companies', HOST);
      if (url.hostname !== 'api.company-information.service.gov.uk') throw new Error('companies-house: untrusted host');
      url.searchParams.set('incorporated_from', from);
      url.searchParams.set('company_status', 'active');
      url.searchParams.set('size', String(Math.min(Number(entry.max) || 25, 50)));
      if (entry.sic_codes) url.searchParams.set('sic_codes', String(entry.sic_codes));
      if (entry.query) url.searchParams.set('company_name_includes', String(entry.query));

      const res = await fetch(url.href, {
        headers: { authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}` },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`companies-house: HTTP ${res.status}`);
      const json = await res.json();
      return (json?.items || []).map(chCompanyToSignal).filter(Boolean);
    },
  },
};

/** Map one advanced-search item → discover.mjs Company. Exported for tests. */
export function chCompanyToCompany(item) {
  const s = chCompanyToSignal(item);
  if (!s) return null;
  return {
    company: s.company,
    location: item?.registered_office_address?.locality || undefined,
    detail: s.headline + (s.detail ? ` · ${s.detail}` : ''),
    source_url: s.source_url,
  };
}

/** search(query, ctx) → Company[] — UK registry discovery for discover.mjs. */
export async function search(query, ctx) {
  const key = ctx?.env?.COMPANIES_HOUSE_API_KEY;
  if (!key) return [];
  try {
    const days = Number(ctx?.settings?.days) || 365;
    const from = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    const url = new URL('/advanced-search/companies', HOST);
    if (url.hostname !== 'api.company-information.service.gov.uk') throw new Error('untrusted host');
    url.searchParams.set('incorporated_from', from);
    url.searchParams.set('company_status', 'active');
    url.searchParams.set('size', String(Math.min(Number(query?.limit) || 25, 50)));
    if (query?.keywords) url.searchParams.set('company_name_includes', String(query.keywords));
    if (ctx?.settings?.sic_codes) url.searchParams.set('sic_codes', String(ctx.settings.sic_codes));
    const res = await fetch(url.href, {
      headers: { authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}` },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return (json?.items || []).map(chCompanyToCompany).filter(Boolean);
  } catch (err) {
    console.error(`  ⚠️  companies-house search: ${err.message}`);
    return [];
  }
}
