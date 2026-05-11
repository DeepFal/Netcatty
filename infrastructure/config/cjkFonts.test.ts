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
      userFallback: 'PingFang SC',
      latinFontId: 'fira-code',
      platform: 'darwin',
    });
    const firaIdx = stack.indexOf('Fira Code');
    const userIdx = stack.indexOf('PingFang SC');
    assert.ok(firaIdx >= 0 && userIdx > firaIdx, 'user fallback after primary');
  });

  it('uses per-Latin-font recommended CJK when user fallback is empty', () => {
    const stack = composeFontFamilyStack({
      primaryFamily: '"Cascadia Code", monospace',
      userFallback: '',
      latinFontId: 'cascadia-code',
      platform: 'win32',
    });
    assert.match(stack, /Microsoft YaHei UI/);
  });

  it('falls back to OS default when Latin font has no recommendation', () => {
    const stack = composeFontFamilyStack({
      primaryFamily: '"Unknown Font", monospace',
      userFallback: '',
      latinFontId: 'unknown',
      platform: 'darwin',
    });
    assert.match(stack, /PingFang SC/);
  });

  it('quotes multi-word user fallback names', () => {
    const stack = composeFontFamilyStack({
      primaryFamily: 'Menlo, monospace',
      userFallback: 'Source Han Sans CN',
      latinFontId: 'menlo',
      platform: 'linux',
    });
    assert.match(stack, /"Source Han Sans CN"/);
  });

  it('does not duplicate identical fallback entries', () => {
    const stack = composeFontFamilyStack({
      primaryFamily: '"Cascadia Code", monospace',
      userFallback: 'Microsoft YaHei UI',
      latinFontId: 'cascadia-code',
      platform: 'win32',
    });
    const matches = stack.match(/Microsoft YaHei UI/g) || [];
    assert.equal(matches.length, 1);
  });

  it('always terminates with generic monospace', () => {
    const stack = composeFontFamilyStack({
      primaryFamily: 'Menlo',
      userFallback: '',
      latinFontId: 'menlo',
      platform: 'darwin',
    });
    assert.ok(stack.trim().endsWith('monospace'));
  });

  it('explicit user fallback overrides the per-font recommendation', () => {
    const stack = composeFontFamilyStack({
      primaryFamily: '"JetBrains Mono", monospace',
      userFallback: 'PingFang SC',
      latinFontId: 'jetbrains-mono',
      platform: 'darwin',
    });
    // user choice (PingFang SC) should come before the recommendation
    // (Sarasa Mono SC); since recommendation is suppressed when user
    // fallback is set, Sarasa should still be present only in the system
    // fallback stack, AFTER PingFang.
    const userIdx = stack.indexOf('PingFang SC');
    const sarasaIdx = stack.indexOf('Sarasa Mono SC');
    assert.ok(userIdx >= 0);
    assert.ok(sarasaIdx > userIdx, 'system Sarasa appears after explicit user choice');
  });
});

describe('getDefaultCjkFallback', () => {
  it('returns Microsoft YaHei UI on Windows', () => {
    assert.equal(getDefaultCjkFallback('win32'), 'Microsoft YaHei UI');
  });
  it('returns PingFang SC on macOS', () => {
    assert.equal(getDefaultCjkFallback('darwin'), 'PingFang SC');
  });
  it('returns Noto Sans Mono CJK SC on Linux', () => {
    assert.equal(getDefaultCjkFallback('linux'), 'Noto Sans Mono CJK SC');
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
  it('contains common Windows + macOS + Linux CJK fonts', () => {
    assert.match(CJK_SYSTEM_FALLBACK_STACK, /PingFang SC/);
    assert.match(CJK_SYSTEM_FALLBACK_STACK, /Microsoft YaHei/);
    assert.match(CJK_SYSTEM_FALLBACK_STACK, /Noto Sans Mono CJK SC/);
  });
});
