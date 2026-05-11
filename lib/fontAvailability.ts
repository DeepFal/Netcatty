/**
 * Decides whether a CSS font-family is actually rendered (system-installed
 * or loaded via @font-face) on the current machine. Used to filter the
 * terminal font dropdowns.
 *
 * Why not document.fonts.check(): in Chromium it returns true for any
 * syntactically-valid family name regardless of whether that font is
 * actually installed (a deliberate fingerprinting-mitigation choice), so
 * it produces massive false positives. We rely instead on:
 *
 *   1. KNOWN_BUNDLED_FAMILIES — fonts we ship via @font-face / @fontsource.
 *      Always true.
 *   2. setSystemFamilies() — an authoritative Set populated by fontStore
 *      after Local Font Access API returns. Membership lookup. When
 *      populated, this is the only signal needed for system fonts.
 *   3. Canvas width fallback — used only before setSystemFamilies() runs
 *      or when the Font Access API is unavailable / denied. A font counts
 *      as installed only when its rendered width differs from ALL three
 *      generic fallbacks (serif, sans-serif, monospace).
 */

const KNOWN_BUNDLED_FAMILIES = new Set<string>([
  'JetBrains Mono',     // @fontsource/jetbrains-mono (regular, 500, 600)
  'Sarasa Mono SC',     // public/fonts/SarasaMonoSC-Regular.woff2 (OFL)
]);

let systemFamilies: Set<string> | null = null;

/** "Fira Code", monospace → Fira Code   |  Menlo, monospace → Menlo */
export function extractPrimaryFamily(familyCssString: string): string {
  const first = familyCssString.split(',')[0]?.trim() ?? '';
  return first.replace(/^["']|["']$/g, '');
}

/**
 * Called by fontStore once Local Font Access API has returned the full
 * list of installed family names (lower-cased). After this runs,
 * isFontInstalled answers from this authoritative set rather than from
 * canvas measurement.
 */
export function setSystemFamilies(families: Set<string> | null): void {
  systemFamilies = families;
}

/** True when authoritative system data is available; canvas fallback skipped. */
export function hasAuthoritativeData(): boolean {
  return systemFamilies !== null;
}

const cache = new Map<string, boolean>();

interface DetectionContext {
  measureText: (font: string, text: string) => number;
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
  };
}

/** Pure detection logic — exported for testing without a DOM. */
export function detectInstalledWithContext(
  family: string,
  ctx: DetectionContext,
): boolean {
  if (KNOWN_BUNDLED_FAMILIES.has(family)) return true;
  return FALLBACK_FAMILIES.every((fb) => {
    const baseWidth = ctx.measureText(`72px ${fb}`, TEST_STRING);
    const targetWidth = ctx.measureText(`72px "${family}", ${fb}`, TEST_STRING);
    return baseWidth !== targetWidth;
  });
}

export function isFontInstalled(family: string): boolean {
  if (KNOWN_BUNDLED_FAMILIES.has(family)) return true;

  // Authoritative path: Local Font Access API enumeration.
  if (systemFamilies) {
    return systemFamilies.has(family.toLowerCase());
  }

  // Fallback path: canvas measurement, cached per family. Only used
  // before setSystemFamilies has run, or when the API is denied.
  const cached = cache.get(family);
  if (cached !== undefined) return cached;

  const ctx = buildBrowserContext();
  // No DOM (SSR / tests) and no authoritative data → treat as available
  // so we don't aggressively hide everything.
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
  systemFamilies = null;
}
