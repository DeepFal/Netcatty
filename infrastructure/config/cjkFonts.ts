export type SupportedPlatform = 'darwin' | 'win32' | 'linux' | (string & {});

// True monospace CJK fonts only. Proportional fonts (PingFang SC,
// Microsoft YaHei UI, Hiragino Sans GB) render at non-2x widths in a
// terminal grid — including them here visibly broke alignment for users
// whose primary font lacked CJK glyphs. They are intentionally absent.
const CJK_SYSTEM_FALLBACK_FONTS = [
  '"Sarasa Mono SC"',
  '"Sarasa Mono TC"',
  '"Maple Mono CN"',
  '"LXGW WenKai Mono"',
  '"Noto Sans Mono CJK SC"',
  '"Source Han Mono SC"',
  '"NSimSun"',
  '"SimSun"',
];

export const CJK_SYSTEM_FALLBACK_STACK = CJK_SYSTEM_FALLBACK_FONTS.join(', ');

const NERD_FONT_FALLBACK_FONTS = [
  '"Symbols Nerd Font Mono"',
  '"Symbols Nerd Font"',
];

// Per-OS default CJK font when user hasn't explicitly set fallbackFont
// AND the current Latin font has no recommended pairing.
// All choices are TRUE monospace fonts that keep the terminal grid
// aligned. macOS has no system-installed monospace CJK font, so we
// reference Sarasa Mono SC which netcatty bundles as a webfont.
export function getDefaultCjkFallback(platform: SupportedPlatform): string {
  if (platform === 'win32') return 'SimSun';
  if (platform === 'darwin') return 'Sarasa Mono SC';
  return 'Noto Sans Mono CJK SC';
}

// Every entry must point at a TRUE monospace CJK font. Sarasa Mono SC
// is the safest universal choice because netcatty bundles it via
// @font-face, so it works even on machines without other CJK monospace
// fonts installed.
const PER_FONT_CJK_PAIRING: Record<string, string> = {
  'fira-code':       'Sarasa Mono SC',
  'fira-mono':       'Sarasa Mono SC',
  'jetbrains-mono':  'Sarasa Mono SC',
  'cascadia-code':   'Sarasa Mono SC',
  'cascadia-mono':   'Sarasa Mono SC',
  'source-code-pro': 'Source Han Mono SC',
  'ibm-plex-mono':   'Sarasa Mono SC',
  'iosevka':         'Sarasa Mono SC',
  'ioskeley-mono':   'Sarasa Mono SC',
  'mononoki':        'Sarasa Mono SC',
  'menlo':           'Sarasa Mono SC',
  'monaco':          'Sarasa Mono SC',
  'consolas':        'Sarasa Mono SC',
  'courier-new':     'Sarasa Mono SC',
  'dejavu-sans-mono':'Noto Sans Mono CJK SC',
  'liberation-mono': 'Noto Sans Mono CJK SC',
  'inconsolata':     'Noto Sans Mono CJK SC',
  'victor-mono':     'Sarasa Mono SC',
  'roboto-mono':     'Noto Sans Mono CJK SC',
  'space-mono':      'Sarasa Mono SC',
  'hack':            'Sarasa Mono SC',
  'ubuntu-mono':     'Noto Sans Mono CJK SC',
  'go-mono':         'Sarasa Mono SC',
};

export function getRecommendedCjkFor(
  latinFontId: string,
  platform: SupportedPlatform,
): string | null {
  void platform;
  return PER_FONT_CJK_PAIRING[latinFontId] ?? null;
}

function quoteIfNeeded(family: string): string {
  const trimmed = family.trim();
  if (!trimmed) return '';
  if (trimmed === 'monospace') return trimmed;
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed;
  if (trimmed.includes(',')) return trimmed;
  if (/\s/.test(trimmed)) return `"${trimmed}"`;
  return trimmed;
}

interface ComposeArgs {
  primaryFamily: string;
  userFallback: string;
  latinFontId: string;
  platform: SupportedPlatform;
}

export function composeFontFamilyStack(args: ComposeArgs): string {
  const { primaryFamily, userFallback, latinFontId, platform } = args;

  const userFallbackQuoted = userFallback.trim() ? quoteIfNeeded(userFallback) : null;

  const recommended = userFallbackQuoted
    ? null
    : (getRecommendedCjkFor(latinFontId, platform) ?? getDefaultCjkFallback(platform));
  const recommendedQuoted = recommended ? quoteIfNeeded(recommended) : null;

  const seen = new Set<string>();
  const pieces: string[] = [];
  const push = (item: string | null | undefined) => {
    if (!item) return;
    const key = item.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    pieces.push(item);
  };

  for (const p of primaryFamily.split(',').map((s) => s.trim()).filter(Boolean)) {
    if (p.toLowerCase() === 'monospace') continue;
    push(p);
  }

  // Guarantee Latin glyphs land on a monospace face when the primary
  // font isn't installed. CSS resolves per-glyph, so:
  //   - Latin chars: primary (if installed) → monospace generic. Cell
  //     width stays consistent for xterm's grid.
  //   - CJK chars: primary (no) → monospace generic (no Chinese glyphs)
  //     → keeps walking into the CJK fallbacks below.
  //   - Nerd PUA glyphs: similar — fall past primary/monospace/CJK to
  //     the Nerd Font stack.
  // Putting CJK fonts AHEAD of monospace was a regression flagged by
  // review on PR #940: a CJK font's full-width Latin glyphs would
  // render before monospace was ever consulted, breaking cell
  // alignment when the primary font wasn't installed.
  push('monospace');

  push(userFallbackQuoted);
  push(recommendedQuoted);

  for (const sys of CJK_SYSTEM_FALLBACK_FONTS) push(sys);
  for (const nerd of NERD_FONT_FALLBACK_FONTS) push(nerd);

  return pieces.join(', ');
}
