/**
 * Detects whether a CSS font-family is actually rendered (system-installed
 * or loaded via @font-face) on the current machine. Used to filter the
 * terminal font dropdowns so users can't pick a font that won't display.
 *
 * Strategy (in order):
 *   1. Bundled-via-@fontsource fonts: hard-coded short list (always true).
 *   2. document.fonts.check(): catches both @font-face and system-loaded
 *      fonts in Chromium-based renderers (Electron).
 *   3. Canvas width measurement against 3 generic fallbacks (serif,
 *      sans-serif, monospace). A font is considered installed only if its
 *      measured width differs from ALL three fallbacks for the test
 *      string — this avoids false positives when the target happens to
 *      have identical metrics to one fallback.
 *
 * Cached after first measurement; call clearFontAvailabilityCache() to
 * re-detect (e.g. after the user installs new fonts).
 */

const KNOWN_BUNDLED_FAMILIES = new Set<string>([
  'JetBrains Mono',
]);

/** "Fira Code", monospace → Fira Code   |  Menlo, monospace → Menlo */
export function extractPrimaryFamily(familyCssString: string): string {
  const first = familyCssString.split(',')[0]?.trim() ?? '';
  return first.replace(/^["']|["']$/g, '');
}

const cache = new Map<string, boolean>();

interface DetectionContext {
  measureText: (font: string, text: string) => number;
  hasDocumentFontsApi: boolean;
  documentFontsCheck?: (spec: string) => boolean;
}

const TEST_STRING = 'mmmmmmmmmmlli';
const FALLBACK_FAMILIES = ['serif', 'sans-serif', 'monospace'] as const;

function buildBrowserContext(): DetectionContext | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  return {
    measureText: (font, text) => {
      ctx.font = font;
      return ctx.measureText(text).width;
    },
    hasDocumentFontsApi:
      typeof document.fonts !== 'undefined' &&
      typeof document.fonts.check === 'function',
    documentFontsCheck: (spec) => {
      try {
        return document.fonts.check(spec);
      } catch {
        return false;
      }
    },
  };
}

/** Pure detection logic — exported for testing without a DOM. */
export function detectInstalledWithContext(
  family: string,
  ctx: DetectionContext,
): boolean {
  if (KNOWN_BUNDLED_FAMILIES.has(family)) return true;

  if (ctx.hasDocumentFontsApi && ctx.documentFontsCheck) {
    if (ctx.documentFontsCheck(`16px "${family}"`)) return true;
  }

  return FALLBACK_FAMILIES.every((fb) => {
    const baseWidth = ctx.measureText(`72px ${fb}`, TEST_STRING);
    const targetWidth = ctx.measureText(`72px "${family}", ${fb}`, TEST_STRING);
    return baseWidth !== targetWidth;
  });
}

export function isFontInstalled(family: string): boolean {
  if (KNOWN_BUNDLED_FAMILIES.has(family)) return true;

  const cached = cache.get(family);
  if (cached !== undefined) return cached;

  const ctx = buildBrowserContext();
  // Without a DOM (SSR, tests) treat non-bundled fonts as unknown ≈ available
  // so we don't aggressively hide everything in non-renderer contexts.
  if (!ctx) {
    cache.set(family, true);
    return true;
  }

  const result = detectInstalledWithContext(family, ctx);
  cache.set(family, result);
  return result;
}

export function clearFontAvailabilityCache(): void {
  cache.clear();
}
