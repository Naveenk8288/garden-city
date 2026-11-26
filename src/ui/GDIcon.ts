/**
 * Garden City Underworld Icon Helper (GDIcon) backed by public/gd-sprite.svg.
 * Uses strict static allowlists and safe SVG DOM creation (no untrusted HTML injection).
 * Palette:
 *   bg:     #0B0F1A
 *   pink:   #FF2E88
 *   cyan:   #00E5C3
 *   amber:  #FFB020
 */
export const GD_PALETTE = {
  bg: '#0B0F1A',
  pink: '#FF2E88',
  cyan: '#00E5C3',
  amber: '#FFB020'
} as const;

export type GDIconName =
  | 'story'
  | 'boss'
  | 'dialogue'
  | 'loyalty'
  | 'power'
  | 'cutscene'
  | 'gun'
  | 'holster'
  | 'metro'
  | 'map'
  | 'cash'
  | 'debug'
  | 'skip'
  | 'globe'
  | 'trophy'
  | 'skull';

const VALID_ICON_NAMES = new Set<string>([
  'story', 'boss', 'dialogue', 'loyalty', 'power', 'cutscene', 'gun',
  'holster', 'metro', 'map', 'cash', 'debug', 'skip', 'globe', 'trophy', 'skull'
]);

const SAFE_HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;

function resolveBaseUrl(): string {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } })?.env;
  return env?.BASE_URL || './';
}

function sanitizeColor(color: string): string {
  return SAFE_HEX_COLOR.test(color) ? color : GD_PALETTE.cyan;
}

/**
 * Creates a safe SVG DOM node for a static allowlisted icon from gd-sprite.svg.
 * Preferred over innerHTML so no user or runtime string can ever inject markup.
 */
export function createGDIconElement(
  name: GDIconName,
  size = 16,
  color: string = GD_PALETTE.cyan
): SVGSVGElement {
  const safeName: GDIconName = VALID_ICON_NAMES.has(name) ? name : 'story';
  const safeSize = Math.max(8, Math.min(64, Math.round(size)));
  const safeColor = sanitizeColor(color);

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'gd-icon');
  svg.setAttribute('width', String(safeSize));
  svg.setAttribute('height', String(safeSize));
  svg.setAttribute('aria-hidden', 'true');
  svg.style.color = safeColor;
  svg.style.verticalAlign = '-3px';
  svg.style.flexShrink = '0';

  const use = document.createElementNS(ns, 'use');
  use.setAttribute('href', `${resolveBaseUrl()}gd-sprite.svg#gd-${safeName}`);
  svg.appendChild(use);
  return svg;
}

/**
 * Legacy static-only SVG string helper (strictly allowlisted icon name & hex color).
 * Never pass user text here.
 */
export function gdIconHTML(name: GDIconName, size = 16, color: string = GD_PALETTE.cyan): string {
  const safeName: GDIconName = VALID_ICON_NAMES.has(name) ? name : 'story';
  const safeSize = Math.max(8, Math.min(64, Math.round(size)));
  const safeColor = sanitizeColor(color);
  return `<svg class="gd-icon" width="${safeSize}" height="${safeSize}" style="color:${safeColor};vertical-align:-3px;flex-shrink:0;" aria-hidden="true"><use href="${resolveBaseUrl()}gd-sprite.svg#gd-${safeName}"></use></svg>`;
}
