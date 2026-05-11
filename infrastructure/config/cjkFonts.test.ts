import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  composeFontFamilyStack,
  getDefaultCjkFallback,
  getRecommendedCjkFor,
  CJK_SYSTEM_FALLBACK_STACK,
} from './cjkFonts';

describe('composeFontFamilyStack', () => {
  it('puts the primary font first', () => {
    const stack = composeFontFamilyStack({
      primaryFamily: 'Menlo, monospace',
      userFallback: '',
      latinFontId: 'menlo',
      platform: 'darwin',
    });
    assert.match(stack, /^Menlo,\s*/);
  });

  it('inserts user fallback right after primary when provided', () => {
    const stack = composeFontFamilyStack({
      primaryFamily: '"Fira Code", monospace',
      userFallback: 'Sarasa Mono SC',
      latinFontId: 'fira-code',
      platform: 'darwin',
    });
    const firaIdx = stack.indexOf('Fira Code');
    const userIdx = stack.indexOf('Sarasa Mono SC');
    assert.ok(firaIdx >= 0 && userIdx > firaIdx, 'user fallback after primary');
  });

  it('uses per-Latin-font recommended CJK when user fallback is empty', () => {
    const stack = composeFontFamilyStack({
      primaryFamily: '"Cascadia Code", monospace',
      userFallback: '',
      latinFontId: 'cascadia-code',
      platform: 'win32',
    });
    // Cascadia Code now recommends Sarasa Mono SC (true monospace).
    assert.match(stack, /Sarasa Mono SC/);
  });

  it('falls back to OS default when Latin font has no recommendation', () => {
    const stack = composeFontFamilyStack({
      primaryFamily: '"Unknown Font", monospace',
      userFallback: '',
      latinFontId: 'unknown',
      platform: 'darwin',
    });
    // macOS no-recommendation default is now Sarasa Mono SC (bundled).
    assert.match(stack, /Sarasa Mono SC/);
  });

  it('quotes multi-word user fallback names', () => {
    const stack = composeFontFamilyStack({
      primaryFamily: 'Menlo, monospace',
      userFallback: 'Source Han Mono SC',
      latinFontId: 'menlo',
      platform: 'linux',
    });
    assert.match(stack, /"Source Han Mono SC"/);
  });

  it('does not duplicate identical fallback entries', () => {
    // User explicitly picks the same font the per-font pairing would,
    // and that font also lives in the system stack — should appear once.
    const stack = composeFontFamilyStack({
      primaryFamily: '"Cascadia Code", monospace',
      userFallback: 'Sarasa Mono SC',
      latinFontId: 'cascadia-code',
      platform: 'win32',
    });
    const matches = stack.match(/Sarasa Mono SC/g) || [];
    assert.equal(matches.length, 1);
  });

  it('places generic monospace right after the primary family', () => {
    const stack = composeFontFamilyStack({
      primaryFamily: 'Menlo',
      userFallback: '',
      latinFontId: 'menlo',
      platform: 'darwin',
    });
    // Primary first, then "monospace" — before any concrete CJK family.
    const families = stack.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
    assert.equal(families[0], 'Menlo');
    assert.equal(families[1], 'monospace');
  });

  it('keeps monospace ahead of every CJK fallback family', () => {
    // Regression guard for codex P1 review on PR #940: if the primary
    // font is missing, Latin glyphs must fall back to a monospace
    // generic — NOT a CJK font's full-width Latin variant — to keep
    // xterm's fixed cell grid aligned.
    const stack = composeFontFamilyStack({
      primaryFamily: '"Fira Code", monospace',
      userFallback: 'LXGW WenKai Mono',
      latinFontId: 'fira-code',
      platform: 'darwin',
    });
    const monoIdx = stack.indexOf(' monospace');
    const sarasaIdx = stack.indexOf('Sarasa Mono SC');
    const userFallbackIdx = stack.indexOf('LXGW WenKai Mono');
    const simSunIdx = stack.indexOf('SimSun');
    assert.ok(monoIdx > 0, 'monospace must appear in the stack');
    assert.ok(
      monoIdx < userFallbackIdx,
      'monospace must come before the user-chosen CJK fallback',
    );
    assert.ok(
      monoIdx < sarasaIdx,
      'monospace must come before the system Sarasa fallback',
    );
    assert.ok(
      monoIdx < simSunIdx,
      'monospace must come before the system SimSun fallback',
    );
  });

  it('explicit user fallback overrides the per-font recommendation', () => {
    const stack = composeFontFamilyStack({
      primaryFamily: '"JetBrains Mono", monospace',
      userFallback: 'LXGW WenKai Mono',
      latinFontId: 'jetbrains-mono',
      platform: 'darwin',
    });
    // User chose LXGW WenKai Mono; the JetBrains Mono recommendation
    // (Sarasa Mono SC) should be suppressed, so Sarasa only shows up
    // later in the system fallback stack, AFTER the user choice.
    const userIdx = stack.indexOf('LXGW WenKai Mono');
    const sarasaIdx = stack.indexOf('Sarasa Mono SC');
    assert.ok(userIdx >= 0);
    assert.ok(sarasaIdx > userIdx, 'system Sarasa appears after explicit user choice');
  });
});

describe('getDefaultCjkFallback', () => {
  it('returns SimSun on Windows (always installed, monospace)', () => {
    assert.equal(getDefaultCjkFallback('win32'), 'SimSun');
  });
  it('returns Sarasa Mono SC on macOS (bundled by app)', () => {
    assert.equal(getDefaultCjkFallback('darwin'), 'Sarasa Mono SC');
  });
  it('returns Noto Sans Mono CJK SC on Linux', () => {
    assert.equal(getDefaultCjkFallback('linux'), 'Noto Sans Mono CJK SC');
  });
  it('never returns a known proportional font', () => {
    const proportional = ['PingFang SC', 'Microsoft YaHei UI', 'Microsoft YaHei', 'Hiragino Sans GB'];
    for (const platform of ['darwin', 'win32', 'linux'] as const) {
      const v = getDefaultCjkFallback(platform);
      assert.ok(!proportional.includes(v), `${platform} default ${v} must not be proportional`);
    }
  });
});

describe('getRecommendedCjkFor', () => {
  it('returns null for unknown fonts', () => {
    assert.equal(getRecommendedCjkFor('unknown-font-id', 'darwin'), null);
  });
  it('returns a non-empty string for known fonts', () => {
    const v = getRecommendedCjkFor('jetbrains-mono', 'darwin');
    assert.ok(v && v.length > 0);
  });
});

describe('CJK_SYSTEM_FALLBACK_STACK', () => {
  it('contains true-monospace CJK fonts only', () => {
    assert.match(CJK_SYSTEM_FALLBACK_STACK, /Sarasa Mono SC/);
    assert.match(CJK_SYSTEM_FALLBACK_STACK, /Noto Sans Mono CJK SC/);
    assert.match(CJK_SYSTEM_FALLBACK_STACK, /SimSun/);
  });

  it('does not include known proportional CJK fonts', () => {
    assert.doesNotMatch(CJK_SYSTEM_FALLBACK_STACK, /PingFang SC/);
    assert.doesNotMatch(CJK_SYSTEM_FALLBACK_STACK, /Microsoft YaHei UI/);
    assert.doesNotMatch(CJK_SYSTEM_FALLBACK_STACK, /Hiragino Sans GB/);
  });
});
