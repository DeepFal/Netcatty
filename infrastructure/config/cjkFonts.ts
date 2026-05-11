export type SupportedPlatform = 'darwin' | 'win32' | 'linux' | (string & {});

const CJK_SYSTEM_FALLBACK_FONTS = [
  '"Sarasa Mono SC"',
  '"Noto Sans Mono CJK SC"',
  '"Source Han Mono SC"',
  '"PingFang SC"',
  '"Hiragino Sans GB"',
  '"Microsoft YaHei UI"',
  '"Microsoft YaHei"',
  '"SimSun"',
];

export const CJK_SYSTEM_FALLBACK_STACK = CJK_SYSTEM_FALLBACK_FONTS.join(', ');

const NERD_FONT_FALLBACK_FONTS = [
  '"Symbols Nerd Font Mono"',
  '"Symbols Nerd Font"',
];

export function getDefaultCjkFallback(platform: SupportedPlatform): string {
  if (platform === 'win32') return 'Microsoft YaHei UI';
  if (platform === 'darwin') return 'PingFang SC';
  return 'Noto Sans Mono CJK SC';
}

const PER_FONT_CJK_PAIRING: Record<string, string> = {
  'fira-code':       'Sarasa Mono SC',
  'fira-mono':       'Sarasa Mono SC',
  'jetbrains-mono':  'Sarasa Mono SC',
  'cascadia-code':   'Microsoft YaHei UI',
  'cascadia-mono':   'Microsoft YaHei UI',
  'source-code-pro': 'Source Han Mono SC',
  'ibm-plex-mono':   'IBM Plex Sans JP',
  'iosevka':         'Sarasa Mono SC',
  'ioskeley-mono':   'Sarasa Mono SC',
  'mononoki':        'Sarasa Mono SC',
  'menlo':           'PingFang SC',
  'monaco':          'PingFang SC',
  'consolas':        'Microsoft YaHei UI',
  'courier-new':     'Microsoft YaHei',
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

  push(userFallbackQuoted);
  push(recommendedQuoted);

  for (const sys of CJK_SYSTEM_FALLBACK_FONTS) push(sys);
  for (const nerd of NERD_FONT_FALLBACK_FONTS) push(nerd);

  pieces.push('monospace');
  return pieces.join(', ');
}
