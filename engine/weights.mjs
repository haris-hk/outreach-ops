#!/usr/bin/env node
// weights.mjs — print effective grading weights as JSON.
// Merge order: modes/_weights.default.yml <- profile/_weights.yml (user wins).
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml'; // namespace import: works on js-yaml v4 (CJS interop) and v5 (pure ESM, no default)

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function load(p) {
  const full = join(ROOT, p);
  if (!existsSync(full)) return {};
  return yaml.load(readFileSync(full, 'utf-8')) || {};
}

const deepMerge = (base, over) => {
  const out = { ...base };
  for (const [k, v] of Object.entries(over || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? deepMerge(base[k] || {}, v) : v;
  }
  return out;
};

const effective = deepMerge(load('modes/_weights.default.yml'), load('profile/_weights.yml'));

const sum = Object.values(effective.weights || {}).reduce((a, b) => a + b, 0);
if (Math.abs(sum - 1) > 0.001) {
  effective._warning = `weights sum to ${sum.toFixed(3)}, expected 1.0 — normalize before grading`;
}
console.log(JSON.stringify(effective, null, 2));
