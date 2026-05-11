import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractPrimaryFamily,
  detectInstalledWithContext,
  isFontInstalled,
  clearFontAvailabilityCache,
} from './fontAvailability';

describe('extractPrimaryFamily', () => {
  it('strips quotes from a quoted name', () => {
    assert.equal(extractPrimaryFamily('"Fira Code", monospace'), 'Fira Code');
  });
  it('returns unquoted single-word names as-is', () => {
    assert.equal(extractPrimaryFamily('Menlo, monospace'), 'Menlo');
  });
  it('returns the first family in a list', () => {
    assert.equal(
      extractPrimaryFamily('"Source Code Pro", "Fira Code", monospace'),
      'Source Code Pro',
    );
  });
  it('handles a single name without comma', () => {
    assert.equal(extractPrimaryFamily('Iosevka'), 'Iosevka');
  });
});

function makeContextWithInstalledFamilies(installed: Set<string>) {
  // Mock canvas measurement: each generic fallback has a stable width;
  // a "real" installed font produces a different width per fallback.
  // Collision-resistant: position-weighted polynomial hash.
  const widthFor = (family: string): number => {
    let h = 0;
    for (let i = 0; i < family.length; i++) {
      h = (h * 31 + family.charCodeAt(i)) >>> 0;
    }
    return 100 + (h % 9973); // large prime modulus
  };
  return {
    measureText: (font: string, _text: string) => {
      const match = font.match(/^\d+px\s+(.+)$/);
      if (!match) return 0;
      const familyList = match[1];
      const families = familyList
        .split(',')
        .map((f) => f.trim().replace(/^["']|["']$/g, ''));
      for (const f of families) {
        if (installed.has(f) || ['serif', 'sans-serif', 'monospace'].includes(f)) {
          return widthFor(f);
        }
      }
      return 0;
    },
    hasDocumentFontsApi: false as const,
  };
}

describe('detectInstalledWithContext', () => {
  it('detects an installed font (width differs from all 3 generic fallbacks)', () => {
    const ctx = makeContextWithInstalledFamilies(new Set(['Fira Code']));
    assert.equal(detectInstalledWithContext('Fira Code', ctx), true);
  });

  it('rejects a non-installed font (all fallback widths match)', () => {
    const ctx = makeContextWithInstalledFamilies(new Set(['Fira Code']));
    assert.equal(detectInstalledWithContext('Definitely Not A Font', ctx), false);
  });

  it('treats KNOWN_BUNDLED_FAMILIES as installed even without canvas evidence', () => {
    const ctx = makeContextWithInstalledFamilies(new Set()); // nothing installed
    assert.equal(detectInstalledWithContext('JetBrains Mono', ctx), true);
  });

  it('uses document.fonts.check() as a positive signal when available', () => {
    const ctx = {
      measureText: () => 0, // pretend canvas says no
      hasDocumentFontsApi: true,
      documentFontsCheck: (spec: string) => spec.includes('Custom Loaded'),
    };
    assert.equal(detectInstalledWithContext('Custom Loaded', ctx), true);
    assert.equal(detectInstalledWithContext('Other', ctx), false);
  });

  it('falls back to canvas detection when document.fonts.check says no', () => {
    const ctx = {
      ...makeContextWithInstalledFamilies(new Set(['Sarasa Mono SC'])),
      hasDocumentFontsApi: true as const,
      documentFontsCheck: () => false,
    };
    assert.equal(detectInstalledWithContext('Sarasa Mono SC', ctx), true);
    assert.equal(detectInstalledWithContext('Unknown', ctx), false);
  });
});

describe('isFontInstalled (top-level)', () => {
  it('returns true for bundled families without needing a DOM', () => {
    clearFontAvailabilityCache();
    assert.equal(isFontInstalled('JetBrains Mono'), true);
  });

  it('returns true for non-bundled families when no DOM is present (safe default)', () => {
    // node:test has no document. Non-bundled call falls into the "no ctx" branch.
    clearFontAvailabilityCache();
    assert.equal(isFontInstalled('Some Unknown Font'), true);
  });
});
