#!/usr/bin/env node
/**
 * Build-failing client secret scanner for Garden City Underworld.
 * Scans client source (`src/`, `public/`, `index.html`) and optionally built output (`dist/`)
 * to prevent accidental leaks of private keys, cloud/API tokens, or server secrets in client bundles.
 */
import fs from 'node:fs';
import path from 'node:path';

const scanDist = process.argv.includes('--dist');
const rootDir = process.cwd();

const SECRET_RULES = [
  { id: 'private-key', desc: 'PEM Private Key block', regex: /-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH|PGP)?\s*PRIVATE KEY-----/g },
  { id: 'aws-access-key', desc: 'AWS Access Key ID', regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { id: 'github-token', desc: 'GitHub Personal/Fine-grained Access Token', regex: /\b(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}|gho_[A-Za-z0-9]{36})\b/g },
  { id: 'openai-key', desc: 'OpenAI / API Secret Key', regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/g },
  { id: 'stripe-live-key', desc: 'Stripe Live Secret Key', regex: /\b(?:sk_live|rk_live)_[A-Za-z0-9]{20,}\b/g },
  { id: 'google-api-key', desc: 'Google Cloud / Firebase API Key', regex: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { id: 'slack-token', desc: 'Slack API Token', regex: /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/g },
  { id: 'vercel-token', desc: 'Vercel Access Token', regex: /\bvercel_[A-Za-z0-9_-]{24,}\b/g },
  { id: 'jwt-hardcoded', desc: 'Hardcoded JWT token', regex: /\beyJ[A-Za-z0-9_-]{12,}\.eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{16,}\b/g },
  { id: 'vite-secret-env', desc: 'Secret prefixed with VITE_ in client code', regex: /import\.meta\.env\.VITE_[A-Z0-9_]*(?:SECRET|PRIVATE_KEY|PASSWORD|TOKEN|API_KEY)\b/g },
  { id: 'hardcoded-secret-literal', desc: 'Hardcoded secret assignment', regex: /\b(?:API_SECRET|CLIENT_SECRET|PRIVATE_KEY|DB_PASSWORD|SERVER_SESSION_SECRET|HMAC_SECRET)\s*[:=]\s*['"][A-Za-z0-9_\-\/+=]{12,}['"]/g }
];

const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.html', '.css', '.svg', '.webmanifest', '.env']);
const SKIP_DIRS = new Set(['node_modules', '.git', '.osm-cache', 'chunks']);
const MAX_FILE_BYTES = 3 * 1024 * 1024; // skip giant binary/wasm/geojson dumps > 3MB

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!TEXT_EXTENSIONS.has(ext) && !entry.name.startsWith('.env')) continue;
      if (entry.name === '.env.example') continue;
      // Skip large Rapier WASM JS bundle (pure compiled Rust WASM, contains no app secrets)
      if (entry.name.startsWith('rapier-') && entry.name.endsWith('.js')) continue;
      const stat = fs.statSync(full);
      if (stat.size <= MAX_FILE_BYTES) out.push(full);
    }
  }
  return out;
}

const targets = scanDist
  ? walk(path.join(rootDir, 'dist'))
  : [
      ...walk(path.join(rootDir, 'src')),
      ...walk(path.join(rootDir, 'public')),
      path.join(rootDir, 'index.html')
    ].filter((f) => fs.existsSync(f));

const findings = [];
for (const filePath of targets) {
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rule of SECRET_RULES) {
    rule.regex.lastIndex = 0;
    const match = rule.regex.exec(content);
    if (match) {
      const rel = path.relative(rootDir, filePath);
      const line = content.slice(0, match.index).split('\n').length;
      findings.push({ file: rel, line, rule: rule.id, desc: rule.desc });
    }
  }
}

if (findings.length > 0) {
  console.error('\n❌ SECRET SCAN FAILED — potential secret detected in client code/bundle:');
  for (const f of findings) {
    console.error(`  - [${f.rule}] ${f.file}:${f.line} — ${f.desc}`);
  }
  console.error('\nRemove secrets from client code immediately. Secrets belong strictly on the server.\n');
  process.exit(1);
}

console.log(`✓ Secret scan passed (${targets.length} ${scanDist ? 'dist' : 'client'} files checked, 0 secrets found)`);
