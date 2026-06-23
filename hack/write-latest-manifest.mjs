import fs from 'node:fs';
import path from 'node:path';

const [sourcePath = '', outPath = 'site/latest.json'] = process.argv.slice(2);
const repo = process.env.GITHUB_REPOSITORY ?? 'FloSch62/Kubus';

function readJson(file) {
  if (!file) return undefined;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
}

function packageVersion() {
  const pkg = readJson('package.json');
  return typeof pkg?.version === 'string' ? pkg.version : '0.0.0';
}

function normalizeVersion(tag) {
  return tag.trim().replace(/^v/i, '');
}

const source = readJson(sourcePath) ?? {};
const tag =
  process.env.RELEASE_TAG ||
  source.tagName ||
  source.tag_name ||
  source.tag ||
  `v${packageVersion()}`;
const releaseName = process.env.RELEASE_NAME || source.name || tag;
const releaseUrl =
  process.env.RELEASE_URL ||
  source.url ||
  source.html_url ||
  `https://github.com/${repo}/releases/tag/${tag}`;
const publishedAt =
  process.env.RELEASE_PUBLISHED_AT ||
  source.publishedAt ||
  source.published_at ||
  new Date().toISOString();

const manifest = {
  version: normalizeVersion(String(tag)),
  releaseName: String(releaseName),
  releaseUrl: String(releaseUrl),
  publishedAt: String(publishedAt),
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${outPath} for ${manifest.version}`);
