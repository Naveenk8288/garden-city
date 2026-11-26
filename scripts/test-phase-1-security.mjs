import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';

const scratchBundle = '/Users/naveennk/.gemini/antigravity/brain/0d036a07-751d-4413-9d2a-9facf79621cf/scratch/phase_1_security_tests.mjs';
fs.mkdirSync('/Users/naveennk/.gemini/antigravity/brain/0d036a07-751d-4413-9d2a-9facf79621cf/scratch', { recursive: true });

await build({
  stdin: {
    contents: `
      import {
        PrivacyManager,
        PRIVACY_CONSENT_KEY,
        isLocalStoragePermitted,
        safeStorageGet,
        safeStorageSet
      } from './src/security/PrivacyManager.ts';
      import { el } from './src/security/SafeDOM.ts';
      import { gdIconHTML } from './src/ui/GDIcon.ts';
      export const exportsForTest = {
        PrivacyManager, PRIVACY_CONSENT_KEY, isLocalStoragePermitted,
        safeStorageGet, safeStorageSet, el, gdIconHTML
      };
    `,
    resolveDir: process.cwd(),
    loader: 'ts'
  },
  bundle: true,
  outfile: scratchBundle,
  format: 'esm',
  platform: 'node'
});

// Minimal in-memory localStorage & DOM mocks for Node unit testing
const store = new Map();
globalThis.localStorage = {
  get length() { return store.size; },
  key: (i) => Array.from(store.keys())[i] ?? null,
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
  clear: () => { store.clear(); }
};

const { exportsForTest } = await import(scratchBundle);
const {
  PrivacyManager, PRIVACY_CONSENT_KEY, isLocalStoragePermitted,
  safeStorageGet, safeStorageSet, el, gdIconHTML
} = exportsForTest;

// 1. PrivacyManager consent, session-only blocking, export JSON & full delete (DPDP Act 2023 / GDPR)
{
  const pm = new PrivacyManager(false);
  pm.setConsent('accepted');
  assert.equal(isLocalStoragePermitted(), true);
  assert.equal(safeStorageSet('garden_city_underworld_save_v1', JSON.stringify({ cash: 5000 })), true);
  assert.equal(JSON.parse(safeStorageGet('garden_city_underworld_save_v1')).cash, 5000);

  // Export My Data
  const exported = pm.buildDataExport();
  assert.equal(exported.application, 'Garden City Underworld');
  assert.ok(exported.compliance.includes('India DPDP Act 2023'));
  assert.ok(exported.compliance.includes('EU GDPR'));
  assert.equal(exported.localStorageData.garden_city_underworld_save_v1.cash, 5000);

  // Switching to Session-Only immediately purges game keys and blocks future writes
  pm.setConsent('session_only');
  assert.equal(isLocalStoragePermitted(), false);
  assert.equal(localStorage.getItem('garden_city_underworld_save_v1'), null);
  assert.equal(safeStorageSet('garden_city_underworld_save_v1', JSON.stringify({ cash: 9999 })), false);
  assert.equal(localStorage.getItem('garden_city_underworld_save_v1'), null);

  // Delete My Account & Data wipes everything including consent key
  pm.setConsent('accepted');
  safeStorageSet('garden_city_campaign_v1', JSON.stringify({ loyalty: 10 }));
  const del = await pm.deleteAllUserData();
  assert.ok(del.deletedKeys.includes(PRIVACY_CONSENT_KEY));
  assert.ok(del.deletedKeys.includes('garden_city_campaign_v1'));
  assert.equal(store.size, 0, 'All local keys must be permanently deleted');
  console.log('✓ Test 1: DPDP/GDPR PrivacyManager (consent, session-only, export, permanent delete) passed');
}

// 2. SafeDOM blocks inline on* attributes and javascript: URLs
{
  const fakeAttrs = new Map();
  globalThis.document = {
    createElement: (tag) => ({
      tagName: tag.toUpperCase(),
      style: {},
      textContent: '',
      children: [],
      setAttribute: (k, v) => fakeAttrs.set(k, v),
      appendChild: function (c) { this.children.push(c); }
    }),
    createTextNode: (t) => ({ nodeType: 3, textContent: t })
  };

  const node = el('a', {
    text: '<script>alert(1)</script>',
    attrs: {
      onclick: 'alert(1)',
      href: 'javascript:alert(1)',
      title: 'Safe Title'
    }
  });
  assert.equal(node.textContent, '<script>alert(1)</script>', 'Untrusted text stays inert in textContent');
  assert.equal(fakeAttrs.has('onclick'), false, 'SafeDOM must block inline on* event attributes');
  assert.equal(fakeAttrs.has('href'), false, 'SafeDOM must block javascript: URLs');
  assert.equal(fakeAttrs.get('title'), 'Safe Title');

  // GDIcon allowlist blocks injection in name/color
  const svgStr = gdIconHTML('evil"><script>', 16, 'red;background:url(x)');
  assert.ok(!svgStr.includes('<script>'), 'GDIcon must enforce static icon name allowlist');
  assert.ok(svgStr.includes('#gd-story'), 'Invalid icon name falls back to safe allowlisted icon');
  assert.ok(svgStr.includes('color:#00E5C3'), 'Invalid color falls back to safe hex palette');
  console.log('✓ Test 2: SafeDOM attribute/URL filtering & GDIcon allowlist passed');
}

// 3. Client secret scanner detects leaked secrets and passes on clean repo
{
  // Confirm clean repo passes
  execFileSync(process.execPath, ['scripts/check-client-secrets.mjs'], { stdio: 'pipe' });

  // Confirm scanner catches a synthetic secret inside a temporary file
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gcu-secret-test-'));
  const tmpSrc = path.join(tmpDir, 'src');
  fs.mkdirSync(tmpSrc, { recursive: true });
  const fakeAws = 'AKIA' + 'IOSFODNN7EXAMPLE';
  fs.writeFileSync(path.join(tmpSrc, 'leak.ts'), `export const k = "${fakeAws}";\n`);
  let failedAsExpected = false;
  try {
    execFileSync(process.execPath, [path.resolve('scripts/check-client-secrets.mjs')], { cwd: tmpDir, stdio: 'pipe' });
  } catch {
    failedAsExpected = true;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  assert.equal(failedAsExpected, true, 'Secret scanner must fail the build when a key is present in client src/');
  console.log('✓ Test 3: Client secret scanner blocks leaked keys & passes clean codebase');
}

// 4. Required Phase 1 security docs & configs exist
{
  for (const rel of ['SECURITY.md', '.env.example', '.gitleaks.toml', 'eslint.config.mjs', '.githooks/pre-commit', '.github/workflows/security-phase1.yml']) {
    assert.ok(fs.existsSync(rel), `Missing required Phase 1 security file: ${rel}`);
  }
  console.log('✓ Test 4: All Phase 1 security artifacts & CI hooks verified');
}

console.log('\nALL PHASE 1 SECURITY FOUNDATION TESTS PASSED!');
