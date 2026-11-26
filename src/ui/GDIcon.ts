/**
 * Garden City Underworld Icon Helper (GDIcon) backed by public/gd-sprite.svg.
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

export function gdIconHTML(name: GDIconName, size = 16, color: string = GD_PALETTE.cyan): string {
  const base = (typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL) || './';
  return `<svg class="gd-icon" width="${size}" height="${size}" style="color:${color};vertical-align:-3px;flex-shrink:0;" aria-hidden="true"><use href="${base}gd-sprite.svg#gd-${name}"></use></svg>`;
}
