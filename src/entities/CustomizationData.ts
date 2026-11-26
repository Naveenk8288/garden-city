export type FaceId = 'seraph_halo' | 'hero_portrait' | 'fixer_beard' | 'cyber_visor' | 'shadow_mask' | 'kingpin_shades' | 'specops_helmet';
export type DressId = 'seraph_crimson' | 'cognac_bomber' | 'cyber_dj' | 'crimson_hoodie' | 'gold_blazer' | 'viper_biker' | 'tactical_armor' | 'royal_kurta' | 'arctic_trench';
export type PantsId = 'seraph_ivory' | 'olive_cargo' | 'cyber_joggers' | 'midnight_jeans' | 'kingpin_slacks' | 'desert_camo' | 'viper_track';
export type ShoesId = 'seraph_wings' | 'rust_boots' | 'neon_sneakers' | 'crimson_kicks' | 'stealth_boots' | 'gold_loafers' | 'viper_racers';
export type CharacterPresetId = 'aura_seraph' | 'striker' | 'kaal_dj' | 'kavya_shadow' | 'vikram_don' | 'zoya_viper' | 'rudra_ops';

export interface CharacterLoadout {
  presetId: CharacterPresetId;
  faceId: FaceId;
  dressId: DressId;
  pantsId: PantsId;
  shoesId: ShoesId;
}

export interface CharacterPreset {
  id: CharacterPresetId;
  name: string;
  codename: string;
  role: string;
  perkTitle: string;
  perkDesc: string;
  accent: string;
  loadout: Omit<CharacterLoadout, 'presetId'>;
}

export interface CosmeticItem<T extends string> {
  id: T;
  name: string;
  tag: string;
  swatch: string;
  accent?: string;
}

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: 'aura_seraph',
    name: 'AURA',
    codename: 'SERAPH',
    role: 'Golden Cloud Winged Sentinel',
    perkTitle: 'SKY DOVE GRACE',
    perkDesc: 'Animated White Dove Wings, Crimson Ribbon & +15% Move Speed',
    accent: '#fbbf24',
    loadout: { faceId: 'seraph_halo', dressId: 'seraph_crimson', pantsId: 'seraph_ivory', shoesId: 'seraph_wings' }
  },
  {
    id: 'striker',
    name: 'ARJUN',
    codename: 'STRIKER',
    role: 'Old City Marksman',
    perkTitle: 'EAGLE FOCUS',
    perkDesc: '+20% Headshot Damage & Tighter ADS',
    accent: '#f59e0b',
    loadout: { faceId: 'hero_portrait', dressId: 'cognac_bomber', pantsId: 'olive_cargo', shoesId: 'rust_boots' }
  },
  {
    id: 'kaal_dj',
    name: 'KAAL',
    codename: 'CYBER DJ',
    role: 'MG Road Pulse Icon',
    perkTitle: 'DROP THE BEAT',
    perkDesc: 'Passive +3 HP/sec Aura & +10% Move Speed',
    accent: '#38e8ff',
    loadout: { faceId: 'cyber_visor', dressId: 'cyber_dj', pantsId: 'cyber_joggers', shoesId: 'neon_sneakers' }
  },
  {
    id: 'kavya_shadow',
    name: 'KAVYA',
    codename: 'SHADOW',
    role: 'Cubbon Park Ghost',
    perkTitle: 'PHANTOM STEP',
    perkDesc: '+18% Sprint Speed & +25% Faster Reload',
    accent: '#ff4757',
    loadout: { faceId: 'shadow_mask', dressId: 'crimson_hoodie', pantsId: 'midnight_jeans', shoesId: 'crimson_kicks' }
  },
  {
    id: 'vikram_don',
    name: 'VIKRAM',
    codename: 'KINGPIN',
    role: 'Brigade Road Syndicate Boss',
    perkTitle: 'GARDEN FORTUNE',
    perkDesc: '+35% Bonus ₹ Cash from Knockouts',
    accent: '#facc15',
    loadout: { faceId: 'kingpin_shades', dressId: 'gold_blazer', pantsId: 'kingpin_slacks', shoesId: 'gold_loafers' }
  },
  {
    id: 'zoya_viper',
    name: 'ZOYA',
    codename: 'NEON VIPER',
    role: 'Indiranagar 100ft Racer',
    perkTitle: 'NEON SHIELD',
    perkDesc: '130 Max Armor & Reinforced Defense',
    accent: '#c084fc',
    loadout: { faceId: 'cyber_visor', dressId: 'viper_biker', pantsId: 'viper_track', shoesId: 'viper_racers' }
  },
  {
    id: 'rudra_ops',
    name: 'RUDRA',
    codename: 'COMMANDO',
    role: 'Peenya Tactical Enforcer',
    perkTitle: 'IRON JUGGERNAUT',
    perkDesc: '135 Max Health & -15% Incoming Damage',
    accent: '#22c55e',
    loadout: { faceId: 'specops_helmet', dressId: 'tactical_armor', pantsId: 'desert_camo', shoesId: 'stealth_boots' }
  }
];

export const FACE_OPTIONS: CosmeticItem<FaceId>[] = [
  { id: 'seraph_halo', name: 'Seraph Pearl Halo', tag: 'GOLDEN EYES • WHITE HAIR • HALO', swatch: '#f8fafc', accent: '#fbbf24' },
  { id: 'hero_portrait', name: 'Striker Headband', tag: 'UPLOADED FACE • BLOND SPIKES', swatch: '#d8cba8', accent: '#f59e0b' },
  { id: 'fixer_beard', name: 'Bengaluru Fixer', tag: 'TRIMMED BEARD • DARK FADE', swatch: '#5c3d28', accent: '#c68e67' },
  { id: 'cyber_visor', name: 'Cyber DJ Visor', tag: 'GLOWING CYAN LED SHADES', swatch: '#38e8ff', accent: '#0ea5e9' },
  { id: 'shadow_mask', name: 'Crimson Mask', tag: 'STEALTH HALF-MASK • RED TRIM', swatch: '#ef4444', accent: '#1e222b' },
  { id: 'kingpin_shades', name: 'Gold Aviators', tag: 'SLICK HAIR • BOSS SHADES', swatch: '#facc15', accent: '#2b2018' },
  { id: 'specops_helmet', name: 'Spec-Ops NVG', tag: 'TACTICAL HELMET + DUAL NVG', swatch: '#22c55e', accent: '#1e293b' }
];

export const DRESS_OPTIONS: CosmeticItem<DressId>[] = [
  { id: 'seraph_crimson', name: 'Seraph Dove-Wing Coat', tag: 'WHITE DOVE WINGS • CRIMSON RIBBON • GOLD', swatch: '#7f1d1d', accent: '#fbbf24' },
  { id: 'cognac_bomber', name: 'Cognac Leather Bomber', tag: 'OPEN LEATHER • WHITE TEE', swatch: '#8f5026', accent: '#edeae2' },
  { id: 'cyber_dj', name: 'Cyber DJ Neon Jacket', tag: 'OBSIDIAN • GLOWING CYAN LED', swatch: '#141926', accent: '#38e8ff' },
  { id: 'crimson_hoodie', name: 'Crimson Tactical Hoodie', tag: 'RED & BLACK STREET RIG', swatch: '#dc2626', accent: '#18181b' },
  { id: 'gold_blazer', name: 'Kingpin White-Gold Suit', tag: 'MAFIA BLAZER • GOLD LAPELS', swatch: '#f1f5f9', accent: '#facc15' },
  { id: 'viper_biker', name: 'Neon Viper Racing Jacket', tag: 'ELECTRIC PURPLE • PINK NEON', swatch: '#7e22ce', accent: '#f472b6' },
  { id: 'tactical_armor', name: 'Spec-Ops Plate Carrier', tag: 'HEAVY KEVLAR • OLIVE RIG', swatch: '#2f3a32', accent: '#22c55e' },
  { id: 'royal_kurta', name: 'Royal Bengaluru Jacket', tag: 'NAVY & GOLD FESTIVE STREET', swatch: '#1d4ed8', accent: '#fbbf24' },
  { id: 'arctic_trench', name: 'Arctic Shadow Coat', tag: 'ICE WHITE • GRAPHITE TRIM', swatch: '#cbd5e1', accent: '#38bdf8' }
];

export const PANTS_OPTIONS: CosmeticItem<PantsId>[] = [
  { id: 'seraph_ivory', name: 'Seraph Ivory & Gold', tag: 'CELESTIAL WHITE • GOLDEN TRIM', swatch: '#e7e2d8', accent: '#fbbf24' },
  { id: 'olive_cargo', name: 'Olive Tactical Cargos', tag: 'MULTI-POCKET STREET FIT', swatch: '#47403a' },
  { id: 'cyber_joggers', name: 'Cyber Neon Joggers', tag: 'BLACK • CYAN KNEE STRIPES', swatch: '#161b26', accent: '#38e8ff' },
  { id: 'midnight_jeans', name: 'Midnight Indigo Denim', tag: 'SLIM URBAN JEANS', swatch: '#1e2f4d' },
  { id: 'kingpin_slacks', name: 'Kingpin Tailored Slacks', tag: 'SHARP CHARCOAL SUIT FIT', swatch: '#262932', accent: '#facc15' },
  { id: 'desert_camo', name: 'Desert Ops Cargos', tag: 'KHAKI SAND • HEAVY POCKETS', swatch: '#8c7a5b' },
  { id: 'viper_track', name: 'Viper Neon Track Pants', tag: 'OBSIDIAN • PURPLE STRIPE', swatch: '#1a1626', accent: '#c084fc' }
];

export const SHOES_OPTIONS: CosmeticItem<ShoesId>[] = [
  { id: 'seraph_wings', name: 'Seraph Winged Boots', tag: 'IVORY LEATHER • GOLDEN GLOW SOLE', swatch: '#f8fafc', accent: '#fbbf24' },
  { id: 'rust_boots', name: 'Rust Leather Boots', tag: 'RUGGED BROWN • DARK SOLE', swatch: '#7b4520', accent: '#181a1f' },
  { id: 'neon_sneakers', name: 'Cyber LED High-Tops', tag: 'GLOWING CYAN OUTSOLE', swatch: '#141926', accent: '#38e8ff' },
  { id: 'crimson_kicks', name: 'Crimson Air Sneakers', tag: 'RED & WHITE STREET KICKS', swatch: '#dc2626', accent: '#f8fafc' },
  { id: 'stealth_boots', name: 'Spec-Ops Combat Boots', tag: 'MATTE BLACK STEEL-TOE', swatch: '#181b20', accent: '#475569' },
  { id: 'gold_loafers', name: 'Kingpin Gold Loafers', tag: 'OBSIDIAN • GOLD BUCKLE', swatch: '#1c1917', accent: '#facc15' },
  { id: 'viper_racers', name: 'Viper Purple Racers', tag: 'ELECTRIC PURPLE HIGH-TOPS', swatch: '#7e22ce', accent: '#f472b6' }
];

export const DEFAULT_LOADOUT: CharacterLoadout = {
  presetId: 'aura_seraph',
  faceId: 'seraph_halo',
  dressId: 'seraph_crimson',
  pantsId: 'seraph_ivory',
  shoesId: 'seraph_wings'
};

const LOADOUT_SAVE_KEY = 'garden_city_character_loadout_v2';

export function saveCharacterLoadout(loadout: CharacterLoadout): void {
  try {
    localStorage.setItem(LOADOUT_SAVE_KEY, JSON.stringify(loadout));
  } catch {
    // ignore
  }
}

export function loadCharacterLoadout(): CharacterLoadout {
  try {
    const raw = localStorage.getItem(LOADOUT_SAVE_KEY);
    if (!raw) return { ...DEFAULT_LOADOUT };
    const parsed = JSON.parse(raw);
    return {
      presetId: parsed.presetId || DEFAULT_LOADOUT.presetId,
      faceId: parsed.faceId || DEFAULT_LOADOUT.faceId,
      dressId: parsed.dressId || DEFAULT_LOADOUT.dressId,
      pantsId: parsed.pantsId || DEFAULT_LOADOUT.pantsId,
      shoesId: parsed.shoesId || DEFAULT_LOADOUT.shoesId
    };
  } catch {
    return { ...DEFAULT_LOADOUT };
  }
}

export function getPresetById(id: CharacterPresetId): CharacterPreset {
  return CHARACTER_PRESETS.find((p) => p.id === id) || CHARACTER_PRESETS[0];
}
