// @ts-check
/** @typedef {import('./_types.js').Signal} Signal */

// github-orgs — OSS activity signals for a watched company's GitHub org:
// new repos (created recently) and freshly pushed repos. Technical-fit
// evidence and warm peer-flavored hooks. Allowlist: api.github.com only.

const API = 'https://api.github.com';
const NEW_REPO_DAYS = 60;
const PUSH_DAYS = 14;

export default {
  id: 'github-orgs',

  detect(entry) {
    if (entry.github_org) return { url: `${API}/orgs/${entry.github_org}/repos` };
    const m = String(entry.github || '').match(/github\.com\/([\w.-]+)\/?$/);
    return m ? { url: `${API}/orgs/${m[1]}/repos` } : null;
  },

  async fetch(entry, ctx) {
    const org = entry.github_org || String(entry.github || '').match(/github\.com\/([\w.-]+)\/?$/)?.[1];
    if (!org) return [];
    const url = new URL(`${API}/orgs/${encodeURIComponent(org)}/repos`);
    if (url.hostname !== 'api.github.com') throw new Error('github-orgs: untrusted host');
    url.searchParams.set('sort', 'pushed');
    url.searchParams.set('per_page', '30');

    const res = await ctx.fetchJson(url.href, { headers: { accept: 'application/vnd.github+json' } });
    const repos = Array.isArray(res) ? res : [];
    const now = Date.now();
    /** @type {Signal[]} */
    const signals = [];
    for (const r of repos) {
      if (!r?.name || !r?.html_url || r.fork || r.archived) continue;
      const created = Date.parse(r.created_at || '') || 0;
      const pushed = Date.parse(r.pushed_at || '') || 0;
      if (now - created < NEW_REPO_DAYS * 864e5) {
        signals.push({
          company: entry.company || org,
          company_url: entry.careers_url || undefined,
          signal_type: 'oss',
          headline: `new repo: ${r.name}${r.language ? ` (${r.language})` : ''}`,
          detail: r.description || undefined,
          source_url: r.html_url,
          observed_at: created,
        });
      } else if (now - pushed < PUSH_DAYS * 864e5 && (r.stargazers_count || 0) >= 5) {
        signals.push({
          company: entry.company || org,
          signal_type: 'oss',
          headline: `active OSS: ${r.name} pushed ${new Date(pushed).toISOString().slice(0, 10)}`,
          detail: r.description || undefined,
          source_url: r.html_url,
          observed_at: pushed,
        });
      }
    }
    return signals.slice(0, 10);
  },
};
