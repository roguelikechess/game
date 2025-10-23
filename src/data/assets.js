import { CHARACTERS } from './characters.js';

function uniqueSources(list) {
  return Array.from(new Set((list || []).filter(Boolean)));
}

const portrait = (id, color) => {
  const sources = uniqueSources([
    `assets/portraits/${id}/portrait.png`,
    `assets/portraits/${id}/portrait.webp`,
    `assets/portraits/${id}.png`,
    `assets/portraits/${id}.webp`,
  ]);
  const splashSources = uniqueSources([
    `assets/portraits/${id}/splash.png`,
    `assets/portraits/${id}/splash.webp`,
    `assets/portraits/${id}_splash.png`,
    `assets/portraits/${id}_splash.webp`,
  ]);
  return {
    id,
    src: sources[0] || null,
    sources,
    splashSources,
    fallback: { shape: 'circle', color },
  };
};

const DEFAULT_SPRITE_GEOMETRY = {
  width: 320,
  height: 320,
  anchor: { x: 160, y: 320 },
  displayHeight: null,
  offsetX: 0,
  offsetY: 0,
  token: { diameter: 48, offsetX: 0, offsetY: 0 },
};

const SPRITE_GEOMETRY_BY_JOB = {
  swordsman: { width: 320, height: 320, anchor: { x: 160, y: 320 }, displayHeight: 64 },
  knight: { width: 352, height: 352, anchor: { x: 176, y: 352 }, displayHeight: 66 },
  warrior: { width: 360, height: 360, anchor: { x: 180, y: 360 }, displayHeight: 68 },
  archer: { width: 300, height: 300, anchor: { x: 150, y: 300 }, displayHeight: 60 },
  mage: { width: 312, height: 312, anchor: { x: 156, y: 312 }, displayHeight: 60 },
  healer: { width: 308, height: 308, anchor: { x: 154, y: 308 }, displayHeight: 60 },
  consecrator: { width: 316, height: 316, anchor: { x: 158, y: 316 }, displayHeight: 62 },
  warlock: { width: 324, height: 324, anchor: { x: 162, y: 324 }, displayHeight: 62 },
  default: DEFAULT_SPRITE_GEOMETRY,
};

const SPRITE_JOB_MAP = CHARACTERS.reduce((map, character) => {
  if (character?.spriteId && character?.jobId && !map[character.spriteId]) {
    map[character.spriteId] = character.jobId;
  }
  return map;
}, {});

function cloneGeometry(geometry) {
  if (!geometry) {
    return null;
  }
  const anchor = geometry.anchor ? { ...geometry.anchor } : undefined;
  const token = geometry.token ? { ...geometry.token } : undefined;
  return { ...geometry, anchor, token };
}

function resolveSpriteGeometry(id) {
  const job = SPRITE_JOB_MAP[id];
  const base = SPRITE_GEOMETRY_BY_JOB[job] || SPRITE_GEOMETRY_BY_JOB.default;
  const geometry = cloneGeometry(base) || cloneGeometry(DEFAULT_SPRITE_GEOMETRY);
  if (!geometry.token) {
    geometry.token = { ...DEFAULT_SPRITE_GEOMETRY.token };
  }
  return geometry;
}

function normalizeSpriteGeometry(geometry) {
  if (!geometry) {
    return cloneGeometry(DEFAULT_SPRITE_GEOMETRY);
  }
  const baseWidth = Number.isFinite(geometry.width) ? geometry.width : DEFAULT_SPRITE_GEOMETRY.width;
  const baseHeight = Number.isFinite(geometry.height) ? geometry.height : DEFAULT_SPRITE_GEOMETRY.height;
  const anchorX = Number.isFinite(geometry.anchor?.x)
    ? geometry.anchor.x
    : (Number.isFinite(baseWidth) ? baseWidth : DEFAULT_SPRITE_GEOMETRY.anchor.x);
  const anchorY = Number.isFinite(geometry.anchor?.y)
    ? geometry.anchor.y
    : (Number.isFinite(baseHeight) ? baseHeight : DEFAULT_SPRITE_GEOMETRY.anchor.y);
  const displayHeight = Number.isFinite(geometry.displayHeight) && geometry.displayHeight > 0
    ? geometry.displayHeight
    : null;
  const offsetX = Number.isFinite(geometry.offsetX) ? geometry.offsetX : DEFAULT_SPRITE_GEOMETRY.offsetX;
  const offsetY = Number.isFinite(geometry.offsetY) ? geometry.offsetY : DEFAULT_SPRITE_GEOMETRY.offsetY;
  const tokenDiameter = Number.isFinite(geometry.token?.diameter)
    ? geometry.token.diameter
    : DEFAULT_SPRITE_GEOMETRY.token.diameter;
  const tokenOffsetX = Number.isFinite(geometry.token?.offsetX)
    ? geometry.token.offsetX
    : DEFAULT_SPRITE_GEOMETRY.token.offsetX;
  const tokenOffsetY = Number.isFinite(geometry.token?.offsetY)
    ? geometry.token.offsetY
    : DEFAULT_SPRITE_GEOMETRY.token.offsetY;

  return {
    width: baseWidth,
    height: baseHeight,
    anchor: { x: anchorX, y: anchorY },
    displayHeight,
    offsetX,
    offsetY,
    token: { diameter: tokenDiameter, offsetX: tokenOffsetX, offsetY: tokenOffsetY },
  };
}

const SPRITE_ACTIONS = ['idle', 'move', 'attack', 'skill'];

function buildVariantSources(id, action, provided) {
  if (Array.isArray(provided)) {
    return uniqueSources(provided);
  }
  if (typeof provided === 'string') {
    return uniqueSources([provided]);
  }
  const base = `assets/sprites/${id}/${action}`;
  const fallback = action === 'idle'
    ? [`assets/sprites/${id}.png`, `assets/sprites/${id}.webp`]
    : [`assets/sprites/${id}_${action}.png`, `assets/sprites/${id}_${action}.webp`];
  return uniqueSources([
    `${base}.png`,
    `${base}.webp`,
    ...fallback,
  ]);
}

const sprite = (id, color, accent, options = {}) => {
  const { variants = {}, geometry = null } = options;
  const variantSources = {};
  SPRITE_ACTIONS.forEach((action) => {
    variantSources[action] = buildVariantSources(id, action, variants[action]);
  });
  const resolvedVariants = SPRITE_ACTIONS.reduce((acc, action) => {
    acc[action] = variantSources[action][0] || null;
    return acc;
  }, {});
  const idleSources = variantSources.idle.length ? variantSources.idle : uniqueSources([
    resolvedVariants.idle,
    `assets/sprites/${id}.png`,
  ]);
  const primarySrc = idleSources[0] || resolvedVariants.idle || `assets/sprites/${id}.png`;
  return {
    id,
    src: primarySrc,
    sources: idleSources,
    variants: resolvedVariants,
    variantSources,
    fallback: { primary: color, accent },
    geometry: normalizeSpriteGeometry(geometry ?? resolveSpriteGeometry(id)),
  };
};

const itemIcon = (id, color) => ({
  id,
  src: `assets/items/${id}.png`,
  fallback: { color },
});

const portraitData = [
  { id: 'alric', color: '#f46f4c' },
  { id: 'keira', color: '#ff8f6b' },
  { id: 'marin', color: '#4a8d4f' },
  { id: 'brenn', color: '#b75a2a' },
  { id: 'toren', color: '#8b4f2c' },
  { id: 'lyss', color: '#2f9fb8' },
  { id: 'fenn', color: '#3a86d0' },
  { id: 'rhea', color: '#6b5fd9' },
  { id: 'nima', color: '#cf4f7f' },
  { id: 'joren', color: '#5ab878' },
  { id: 'pax', color: '#9c6cdd' },
  { id: 'hana', color: '#f2a64a' },
  { id: 'mirra', color: '#5779d9' },
  { id: 'tessia', color: '#8a4fda' },
  { id: 'draven', color: '#2f7fa8' },
  { id: 'orren', color: '#6ccf77' },
  { id: 'liora', color: '#f29552' },
  { id: 'zekhar', color: '#503b88' },
  { id: 'sorin', color: '#2f6e64' },
  { id: 'karin', color: '#cf5454' },
  { id: 'thorek', color: '#a2653a' },
  { id: 'celene', color: '#4c9ac5' },
  { id: 'lyra', color: '#9b53de' },
  { id: 'nerys', color: '#7fc77a' },
  { id: 'vael', color: '#5c48a5' },
  { id: 'kaelith', color: '#ff9860' },
  { id: 'morwynn', color: '#2f4c7d' },
  { id: 'draeg', color: '#b73a3a' },
  { id: 'orin', color: '#2fb4d4' },
  { id: 'eira', color: '#71c2a9' },
  { id: 'zaros', color: '#3c2f68' },
  { id: 'aurielle', color: '#ffc14f' },
  { id: 'myrren', color: '#6a82ff' },
  { id: 'kaelen', color: '#2f9ad9' },
  { id: 'seraphel', color: '#f4a1c8' },
];

const spriteData = [
  { id: 'alric', color: '#f46f4c', accent: '#ffd9c2' },
  { id: 'keira', color: '#ff8f6b', accent: '#ffe3cf' },
  { id: 'marin', color: '#4a8d4f', accent: '#cfeabf' },
  { id: 'brenn', color: '#b75a2a', accent: '#f2c19b' },
  { id: 'toren', color: '#8b4f2c', accent: '#f0c09a' },
  { id: 'lyss', color: '#2f9fb8', accent: '#bfeaff' },
  { id: 'fenn', color: '#3a86d0', accent: '#bcd6ff' },
  { id: 'rhea', color: '#6b5fd9', accent: '#dad4ff' },
  { id: 'nima', color: '#cf4f7f', accent: '#ffc6dd' },
  { id: 'joren', color: '#5ab878', accent: '#d2f7d8' },
  { id: 'pax', color: '#9c6cdd', accent: '#e8d9ff' },
  { id: 'hana', color: '#f2a64a', accent: '#ffe6b8' },
  { id: 'mirra', color: '#5779d9', accent: '#d7e2ff' },
  { id: 'tessia', color: '#8a4fda', accent: '#edd9ff' },
  { id: 'draven', color: '#2f7fa8', accent: '#c2edff' },
  { id: 'orren', color: '#6ccf77', accent: '#dcffe3' },
  { id: 'liora', color: '#f29552', accent: '#ffe0c1' },
  { id: 'zekhar', color: '#503b88', accent: '#d8ccff' },
  { id: 'sorin', color: '#2f6e64', accent: '#bfe9dd' },
  { id: 'karin', color: '#cf5454', accent: '#ffd0d0' },
  { id: 'thorek', color: '#a2653a', accent: '#f2d2b5' },
  { id: 'celene', color: '#4c9ac5', accent: '#d3efff' },
  { id: 'lyra', color: '#9b53de', accent: '#edd5ff' },
  { id: 'nerys', color: '#7fc77a', accent: '#e2ffe1' },
  { id: 'vael', color: '#5c48a5', accent: '#e0d5ff' },
  { id: 'kaelith', color: '#ff9860', accent: '#ffe2c8' },
  { id: 'morwynn', color: '#2f4c7d', accent: '#c7d7ff' },
  { id: 'draeg', color: '#b73a3a', accent: '#ffc1c1' },
  { id: 'orin', color: '#2fb4d4', accent: '#c2f5ff' },
  { id: 'eira', color: '#71c2a9', accent: '#dcf8ef' },
  { id: 'zaros', color: '#3c2f68', accent: '#d3c8ff' },
  { id: 'aurielle', color: '#ffc14f', accent: '#ffeecd' },
  { id: 'myrren', color: '#6a82ff', accent: '#d6ddff' },
  { id: 'kaelen', color: '#2f9ad9', accent: '#c6e8ff' },
  { id: 'seraphel', color: '#f4a1c8', accent: '#ffe2f1' },
].map((entry) => ({
  ...entry,
  geometry: resolveSpriteGeometry(entry.id),
}));

export const PORTRAITS = portraitData.map(({ id, color }) => portrait(id, color));

export const SPRITES = spriteData.map(({ id, color, accent, variants, geometry }) =>
  sprite(id, color, accent, { variants, geometry })
);

const itemIconData = [
  { id: 'steel-saber', color: '#d96d4d' },
  { id: 'echo-blades', color: '#5f7ddc' },
  { id: 'astral-staff', color: '#7f6fe3' },
  { id: 'bulwark-plate', color: '#7f8aa2' },
  { id: 'wyrmhide-vest', color: '#c97d3d' },
  { id: 'aegis-mantle', color: '#5aa8b2' },
  { id: 'farshot-ring', color: '#d0a54b' },
  { id: 'swift-necklace', color: '#e9874f' },
  { id: 'stride-pendant', color: '#6fbc91' },
  { id: 'focus-amulet', color: '#6aa7d9' },
  { id: 'chrono-charm', color: '#a172d9' },
];

export const ITEM_ICONS = itemIconData.map(({ id, color }) => itemIcon(id, color));

const background = (id, color) => ({
  id,
  src: `assets/backgrounds/${id}.png`,
  fallbackColor: color,
});

const backgroundData = [
  { id: 'meadow-dawn', color: '#9ddc79' },
  { id: 'ruined-keep', color: '#4a5a6a' },
  { id: 'ashen-desert', color: '#c88f5a' },
  { id: 'midnight-harbor', color: '#283b5b' },
  { id: 'celestial-arena', color: '#6b5fd9' },
];

export const BATTLE_BACKGROUNDS = backgroundData.map(({ id, color }) => background(id, color));

const lobbyBgmData = [
  { id: 'lobby-tranquil', label: '고요한 성소', src: 'assets/audio/lobby_tranquil.ogg' },
  { id: 'lobby-ember', label: '잿불의 휴식', src: 'assets/audio/lobby_ember.ogg' },
  { id: 'lobby-aurora', label: '새벽의 여명', src: 'assets/audio/lobby_aurora.ogg' },
];

const battleBgmData = [
  { id: 'battle-storm', label: '폭풍의 진군', src: 'assets/audio/battle_storm.ogg' },
  { id: 'battle-ironclad', label: '강철 진군', src: 'assets/audio/battle_ironclad.ogg' },
  { id: 'battle-celestial', label: '성좌의 결투', src: 'assets/audio/battle_celestial.ogg' },
];

const effectSetData = [
  {
    id: 'steel-clash',
    label: '강철 충돌',
    samples: {
      hit: 'assets/audio/effects/steel_hit.ogg',
      victory: 'assets/audio/effects/steel_victory.ogg',
      defeat: 'assets/audio/effects/steel_defeat.ogg',
    },
  },
  {
    id: 'arcane-ring',
    label: '비전의 메아리',
    samples: {
      hit: 'assets/audio/effects/arcane_hit.ogg',
      victory: 'assets/audio/effects/arcane_victory.ogg',
      defeat: 'assets/audio/effects/arcane_defeat.ogg',
    },
  },
  {
    id: 'wild-hunt',
    label: '야성의 사냥',
    samples: {
      hit: 'assets/audio/effects/wild_hit.ogg',
      victory: 'assets/audio/effects/wild_victory.ogg',
      defeat: 'assets/audio/effects/wild_defeat.ogg',
    },
  },
];

export const LOBBY_BGM = lobbyBgmData;
export const BATTLE_BGM = battleBgmData;
export const EFFECT_SETS = effectSetData;

export function getPortraitById(id) {
  return PORTRAITS.find((entry) => entry.id === id) || null;
}

export function getSpriteById(id) {
  return SPRITES.find((entry) => entry.id === id) || null;
}

export function getSpriteGeometryById(id) {
  const spriteEntry = getSpriteById(id);
  if (!spriteEntry?.geometry) {
    return null;
  }
  const { geometry } = spriteEntry;
  const anchor = geometry.anchor ? { ...geometry.anchor } : undefined;
  const token = geometry.token ? { ...geometry.token } : undefined;
  return { ...geometry, anchor, token };
}

export function getItemIconById(id) {
  return ITEM_ICONS.find((entry) => entry.id === id) || null;
}

export function getBattleBackgroundById(id) {
  return BATTLE_BACKGROUNDS.find((entry) => entry.id === id) || null;
}

export function getBattleBackgroundForRound(round) {
  if (!BATTLE_BACKGROUNDS.length) {
    return null;
  }
  const safeRound = Number.isFinite(round) ? Math.max(1, Math.floor(round)) : 1;
  const index = Math.floor((safeRound - 1) / 10) % BATTLE_BACKGROUNDS.length;
  return BATTLE_BACKGROUNDS[index];
}
