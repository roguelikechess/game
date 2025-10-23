import { nanoid } from '../utils/nanoid.js';

export const RARITY_SEQUENCE = ['common', 'uncommon', 'rare', 'unique', 'epic'];

const ENHANCE_BASE_COST = {
  common: 8,
  uncommon: 14,
  rare: 24,
  unique: 36,
  epic: 54,
};

const SELL_BASE_VALUE = {
  common: 6,
  uncommon: 10,
  rare: 18,
  unique: 28,
  epic: 42,
};

const UPGRADE_SCALE = 0.55;
const MULTIPLIER_FLOOR = 0.32;

export const ITEM_BLUEPRINTS = {
  'steel-saber': {
    name: '강철 검',
    type: 'weapon',
    slot: 'hand',
    lootWeight: 1.1,
    statBonuses: {
      attack: { common: 28, uncommon: 48, rare: 74, unique: 108, epic: 152 },
    },
    modifiers: {
      lifesteal: { common: 0.06, uncommon: 0.08, rare: 0.1, unique: 0.12, epic: 0.15 },
    },
  },
  'echo-blades': {
    name: '메아리 단검',
    type: 'weapon',
    slot: 'hand',
    lootWeight: 0.9,
    statBonuses: {
      attack: { common: 20, uncommon: 38, rare: 60, unique: 86, epic: 120 },
      range: { common: 22, uncommon: 34, rare: 52, unique: 72, epic: 96 },
    },
    modifiers: {
      attackIntervalMultiplier: { common: 0.98, uncommon: 0.92, rare: 0.88, unique: 0.84, epic: 0.8 },
    },
  },
  'astral-staff': {
    name: '성운 지팡이',
    type: 'weapon',
    slot: 'hand',
    lootWeight: 1,
    statBonuses: {
      spellPower: { common: 32, uncommon: 56, rare: 84, unique: 122, epic: 170 },
      mana: { common: 22, uncommon: 34, rare: 50, unique: 72, epic: 98 },
    },
  },
  'bulwark-plate': {
    name: '보루 갑옷',
    type: 'armor',
    slot: 'body',
    lootWeight: 1,
    statBonuses: {
      defense: { common: 24, uncommon: 38, rare: 56, unique: 78, epic: 106 },
      magicDefense: { common: 18, uncommon: 28, rare: 40, unique: 56, epic: 76 },
      maxHealth: { common: 160, uncommon: 230, rare: 320, unique: 430, epic: 580 },
    },
  },
  'wyrmhide-vest': {
    name: '용피 조끼',
    type: 'armor',
    slot: 'body',
    lootWeight: 0.95,
    statBonuses: {
      maxHealth: { common: 240, uncommon: 330, rare: 450, unique: 600, epic: 800 },
    },
    modifiers: {
      speed: { common: 0.12, uncommon: 0.18, rare: 0.26, unique: 0.36, epic: 0.48 },
      regenPercentPerSecond: { common: 0.004, uncommon: 0.006, rare: 0.008, unique: 0.011, epic: 0.014 },
    },
  },
  'aegis-mantle': {
    name: '수호 망토',
    type: 'armor',
    slot: 'body',
    lootWeight: 1.05,
    statBonuses: {
      defense: { common: 18, uncommon: 28, rare: 40, unique: 56, epic: 76 },
      magicDefense: { common: 18, uncommon: 28, rare: 40, unique: 56, epic: 76 },
      spellPower: { common: 18, uncommon: 28, rare: 40, unique: 56, epic: 76 },
    },
    modifiers: {
      manaRegen: { common: 3.8, uncommon: 5.6, rare: 8, unique: 11.2, epic: 15.4 },
    },
  },
  'farshot-ring': {
    name: '원거리의 반지',
    type: 'accessory',
    slot: 'trinket',
    lootWeight: 0.35,
    statBonuses: {
      range: { common: 120, uncommon: 170, rare: 230, unique: 300, epic: 380 },
    },
    modifiers: {
      shieldShredOnHit: { common: 0.08, uncommon: 0.12, rare: 0.16, unique: 0.2, epic: 0.25 },
    },
  },
  'swift-necklace': {
    name: '질풍의 목걸이',
    type: 'accessory',
    slot: 'trinket',
    lootWeight: 1,
    modifiers: {
      attackIntervalMultiplier: { common: 0.92, uncommon: 0.86, rare: 0.78, unique: 0.68, epic: 0.56 },
    },
  },
  'stride-pendant': {
    name: '질주 펜던트',
    type: 'accessory',
    slot: 'trinket',
    lootWeight: 0.95,
    modifiers: {
      speed: { common: 0.14, uncommon: 0.22, rare: 0.32, unique: 0.44, epic: 0.6 },
      debuffDurationReduction: { common: 0.08, uncommon: 0.12, rare: 0.16, unique: 0.21, epic: 0.26 },
    },
  },
  'focus-amulet': {
    name: '집중의 부적',
    type: 'accessory',
    slot: 'trinket',
    lootWeight: 0.9,
    modifiers: {
      manaRegen: { common: 4.5, uncommon: 6.8, rare: 10.2, unique: 14.6, epic: 20 },
    },
  },
  'chrono-charm': {
    name: '시간왜곡 참',
    type: 'accessory',
    slot: 'trinket',
    lootWeight: 0.85,
    modifiers: {
      cooldownReduction: { common: 0.12, uncommon: 0.2, rare: 0.28, unique: 0.36, epic: 0.46 },
    },
  },
};

function getBlueprintLootWeight(blueprint) {
  if (!blueprint) {
    return 1;
  }
  const weight = blueprint.lootWeight;
  if (typeof weight === 'number' && weight > 0) {
    return weight;
  }
  return 1;
}

function getBonusValue(table = {}, rarity) {
  return table[rarity] ?? table.common ?? 0;
}

function getUpgradeLevel(item) {
  if (!item) {
    return 0;
  }
  const value = Number(item.upgradeLevel) || 0;
  return Math.max(0, Math.floor(value));
}

function scaleAdditive(value, level) {
  if (typeof value !== 'number') {
    return value;
  }
  return value * (1 + level * UPGRADE_SCALE);
}

function scaleIntervalMultiplier(value, level) {
  if (typeof value !== 'number') {
    return value;
  }
  if (value <= 0) {
    return value;
  }
  const improvement = 1 - value;
  if (improvement <= 0) {
    return value;
  }
  const scaledImprovement = improvement * (1 + level * UPGRADE_SCALE);
  const result = 1 - scaledImprovement;
  return Math.max(MULTIPLIER_FLOOR, Math.min(1, parseFloat(result.toFixed(3))));
}

function scaleCooldownReduction(value, level) {
  if (typeof value !== 'number') {
    return value;
  }
  const scaled = value * (1 + level * UPGRADE_SCALE);
  return Math.min(0.75, parseFloat(scaled.toFixed(3)));
}

function computeBlueprintBonuses(blueprint, rarity, upgradeLevel) {
  const stats = {};
  const modifiers = {};
  if (blueprint?.statBonuses) {
    Object.entries(blueprint.statBonuses).forEach(([key, table]) => {
      const baseValue = getBonusValue(table, rarity);
      if (baseValue == null) {
        return;
      }
      stats[key] = scaleAdditive(baseValue, upgradeLevel);
    });
  }
  if (blueprint?.modifiers) {
    Object.entries(blueprint.modifiers).forEach(([key, table]) => {
      const baseValue = getBonusValue(table, rarity);
      if (baseValue == null) {
        return;
      }
      if (key === 'attackIntervalMultiplier') {
        modifiers[key] = scaleIntervalMultiplier(baseValue, upgradeLevel);
      } else if (key === 'cooldownReduction') {
        modifiers[key] = scaleCooldownReduction(baseValue, upgradeLevel);
      } else {
        modifiers[key] = scaleAdditive(baseValue, upgradeLevel);
      }
    });
  }
  return { stats, modifiers };
}

export function computeItemEffectValues(blueprintId, rarity, upgradeLevel = 0) {
  const blueprint = ITEM_BLUEPRINTS[blueprintId];
  if (!blueprint) {
    return { stats: {}, modifiers: {} };
  }
  return computeBlueprintBonuses(blueprint, rarity, Math.max(0, upgradeLevel));
}

function ensureStatsObject(result, key, value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return;
  }
  if (!result[key]) {
    result[key] = 0;
  }
  result[key] += value;
}

export function aggregateItemEffects(items = []) {
  const summary = {
    stats: {},
    modifiers: {
      attackIntervalMultiplier: 1,
      speed: 0,
      manaRegen: 0,
      cooldownReduction: 0,
      lifesteal: 0,
      regenPercentPerSecond: 0,
      debuffDurationReduction: 0,
      shieldShredOnHit: 0,
    },
    names: [],
  };

  items.forEach((item) => {
    if (!item) {
      return;
    }
    const blueprint = ITEM_BLUEPRINTS[item.blueprintId];
    if (!blueprint) {
      return;
    }
    const rarity = item.rarity || 'common';
    const upgradeLevel = getUpgradeLevel(item);
    const upgradeLabel = upgradeLevel > 0 ? ` · 강화 +${upgradeLevel}` : '';
    summary.names.push(`${blueprint.name} (${getRarityLabel(rarity)}${upgradeLabel})`);
    const { stats, modifiers } = computeBlueprintBonuses(blueprint, rarity, upgradeLevel);
    Object.entries(stats).forEach(([key, value]) => {
      ensureStatsObject(summary.stats, key, value);
    });
    if (modifiers.attackIntervalMultiplier) {
      const mult = modifiers.attackIntervalMultiplier;
      if (typeof mult === 'number' && mult > 0) {
        summary.modifiers.attackIntervalMultiplier *= mult;
      }
    }
    if (modifiers.speed) {
      ensureStatsObject(summary.modifiers, 'speed', modifiers.speed);
    }
    if (modifiers.manaRegen) {
      ensureStatsObject(summary.modifiers, 'manaRegen', modifiers.manaRegen);
    }
    if (modifiers.cooldownReduction) {
      ensureStatsObject(summary.modifiers, 'cooldownReduction', modifiers.cooldownReduction);
    }
    if (modifiers.lifesteal) {
      ensureStatsObject(summary.modifiers, 'lifesteal', modifiers.lifesteal);
    }
    if (modifiers.regenPercentPerSecond) {
      ensureStatsObject(summary.modifiers, 'regenPercentPerSecond', modifiers.regenPercentPerSecond);
    }
    if (modifiers.debuffDurationReduction) {
      ensureStatsObject(summary.modifiers, 'debuffDurationReduction', modifiers.debuffDurationReduction);
    }
    if (modifiers.shieldShredOnHit) {
      ensureStatsObject(summary.modifiers, 'shieldShredOnHit', modifiers.shieldShredOnHit);
    }
  });

  return summary;
}

export function getRarityLabel(rarity) {
  switch (rarity) {
    case 'uncommon':
      return '언커먼';
    case 'rare':
      return '레어';
    case 'unique':
      return '유니크';
    case 'epic':
      return '에픽';
    default:
      return '커먼';
  }
}

export function applyItemBonuses(baseStats = {}, items = []) {
  const applied = { ...baseStats };
  const { stats: flatBonuses, modifiers } = aggregateItemEffects(items);

  Object.entries(flatBonuses).forEach(([key, value]) => {
    if (typeof value !== 'number') {
      return;
    }
    if (key === 'maxHealth') {
      applied.maxHealth = Math.max(0, (applied.maxHealth || applied.health || 0) + value);
      applied.health = Math.max(0, (applied.health || applied.maxHealth || 0) + value);
    } else if (key === 'mana' || key === 'maxMana') {
      applied.maxMana = Math.max(0, (applied.maxMana || applied.mana || 0) + value);
      applied.mana = Math.max(0, (applied.mana || applied.maxMana || 0) + value);
    } else if (key === 'range') {
      applied.range = Math.max(20, (applied.range || 0) + value);
    } else if (key === 'attack' || key === 'defense' || key === 'magicDefense' || key === 'spellPower') {
      applied[key] = Math.max(0, (applied[key] || 0) + value);
    } else {
      applied[key] = (applied[key] || 0) + value;
    }
  });

  if (typeof modifiers.speed === 'number') {
    applied.speed = parseFloat(Math.max(0, (applied.speed || 0) + modifiers.speed).toFixed(2));
  }
  if (typeof modifiers.manaRegen === 'number') {
    applied.manaRegen = Math.max(0, (applied.manaRegen || 0) + modifiers.manaRegen);
  }
  if (typeof modifiers.cooldownReduction === 'number') {
    applied.cooldownReduction = Math.max(
      0,
      Math.min(0.8, (applied.cooldownReduction || 0) + modifiers.cooldownReduction)
    );
  }
  if (typeof applied.attackInterval === 'number') {
    applied.attackInterval = parseFloat(
      Math.max(0.4, applied.attackInterval * (modifiers.attackIntervalMultiplier || 1)).toFixed(2)
    );
  }

  return { stats: applied, modifiers };
}

export function getItemCapacityForUnit(definition, context = {}) {
  const rarity = definition?.rarity || 'common';
  let capacity;
  if (rarity === 'epic') {
    capacity = 4;
  } else if (rarity === 'rare' || rarity === 'unique') {
    capacity = 3;
  } else {
    capacity = 2;
  }
  const level = context.level ?? context.unit?.level ?? null;
  if (typeof level === 'number' && level >= 4) {
    capacity += 1;
  }
  return capacity;
}

export function createItemInstance(blueprintId, rarity = 'common') {
  return {
    id: nanoid('item'),
    blueprintId,
    rarity,
    upgradeLevel: 0,
  };
}

export function getItemEnhanceCost(item) {
  if (!item) {
    return Infinity;
  }
  const rarity = item.rarity || 'common';
  const baseCost = ENHANCE_BASE_COST[rarity] || ENHANCE_BASE_COST.common;
  const level = getUpgradeLevel(item);
  const growth = level + 1;
  const multiplier = 1 + level * 0.75;
  return Math.max(1, Math.round(baseCost * growth * multiplier));
}

export function getItemSellValue(item) {
  if (!item) {
    return 0;
  }
  const rarity = item.rarity || 'common';
  const baseValue = SELL_BASE_VALUE[rarity] || SELL_BASE_VALUE.common;
  const level = getUpgradeLevel(item);
  const bonus = Math.round(baseValue * 0.65 * level);
  return Math.max(1, baseValue + bonus);
}

export function getNextRarity(current) {
  const index = RARITY_SEQUENCE.indexOf(current);
  if (index < 0 || index + 1 >= RARITY_SEQUENCE.length) {
    return null;
  }
  return RARITY_SEQUENCE[index + 1];
}

function weightedChoice(entries) {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0) {
    return entries[0]?.[0] || null;
  }
  let roll = Math.random() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) {
      return value;
    }
  }
  return entries[0]?.[0] || null;
}

export function rollLoot(round = 1, options = {}) {
  const { guaranteed = false, type: forcedType = null, rarityBias = 0 } = options;
  const dropChance = Math.min(0.88, 0.42 + round * 0.02);
  if (!guaranteed && Math.random() > dropChance) {
    return null;
  }

  const typeWeights = forcedType
    ? [[forcedType, 1]]
    : [
        ['weapon', 0.4],
        ['armor', 0.35],
        ['accessory', 0.25],
      ];

  const type = weightedChoice(typeWeights);

  const rarityWeights = [
    ['common', 0.5],
    ['uncommon', 0.32],
    ['rare', 0.18],
  ].map(([rarity, weight], index) => {
    const modifier = 1 + Math.max(0, rarityBias) * index - Math.max(0, -rarityBias) * (2 - index);
    const adjustedWeight = Math.max(0.01, weight * modifier);
    return [rarity, adjustedWeight];
  });

  const rarity = weightedChoice(rarityWeights);

  const entries = Object.entries(ITEM_BLUEPRINTS)
    .filter(([, blueprint]) => !type || blueprint.type === type)
    .map(([id, blueprint]) => [id, getBlueprintLootWeight(blueprint)])
    .filter(([, weight]) => weight > 0);

  if (!entries.length) {
    return null;
  }

  const blueprintId = weightedChoice(entries);
  return { blueprintId, rarity };
}

export function describeItem(item) {
  if (!item) {
    return '알 수 없는 장비';
  }
  const blueprint = ITEM_BLUEPRINTS[item.blueprintId];
  const rarity = getRarityLabel(item.rarity || 'common');
  const upgradeLevel = getUpgradeLevel(item);
  const upgradeSuffix = upgradeLevel > 0 ? ` (강화 +${upgradeLevel})` : '';
  if (!blueprint) {
    return `${rarity} 장비${upgradeSuffix}`;
  }
  return `${rarity} ${blueprint.name}${upgradeSuffix}`;
}

