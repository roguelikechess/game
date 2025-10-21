import { UNITS, getUnitDefinition } from './units.js';
import { addUnitToBench, createInstance, removeUnitById } from './party.js';

const BASE_COST = 3;
const RARITY_COST = {
  common: 3,
  uncommon: 4,
  rare: 5,
  unique: 6,
  epic: 7,
};

const BASE_RARITY_WEIGHTS = {
  common: 60,
  uncommon: 24,
  rare: 10,
  unique: 4,
  epic: 2,
};

const UNITS_BY_RARITY = UNITS.reduce((acc, unit) => {
  const rarity = unit.rarity || 'common';
  if (!acc[rarity]) {
    acc[rarity] = [];
  }
  acc[rarity].push(unit);
  return acc;
}, {});

function getWeightsForRun(run) {
  const level = Math.max(1, Number(run?.companyLevel) || 1);
  const bonus = Math.max(0, level - 1);
  return {
    common: Math.max(8, BASE_RARITY_WEIGHTS.common - bonus * 4),
    uncommon: BASE_RARITY_WEIGHTS.uncommon + bonus * 2,
    rare: BASE_RARITY_WEIGHTS.rare + bonus * 1.5,
    unique: BASE_RARITY_WEIGHTS.unique + Math.max(0, bonus * 0.8),
    epic: BASE_RARITY_WEIGHTS.epic + Math.max(0, Math.floor(bonus * 0.5)),
  };
}

function pickRarity(weights) {
  const entries = Object.entries(weights || BASE_RARITY_WEIGHTS);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  const roll = Math.random() * total;
  let cumulative = 0;
  for (const [rarity, weight] of entries) {
    cumulative += weight;
    if (roll < cumulative) {
      return rarity;
    }
  }
  return 'common';
}

function randomUnit(weights) {
  const rarity = pickRarity(weights);
  const pool = UNITS_BY_RARITY[rarity];
  const source = pool && pool.length ? pool : UNITS;
  const index = Math.floor(Math.random() * source.length);
  return source[index];
}

export function generateShop(run) {
  const weights = getWeightsForRun(run);
  return Array.from({ length: 4 }, () => {
    const unit = randomUnit(weights);
    const cost = RARITY_COST[unit.rarity] || BASE_COST;
    return {
      unit,
      cost,
      rerollCost: 1,
    };
  });
}

export function purchaseUnit(run, offering) {
  if (run.gold < offering.cost) {
    return run;
  }
  const newUnit = createInstance(offering.unit.id, 1);

  return {
    ...run,
    gold: run.gold - offering.cost,
    activeParty: addUnitToBench(run.activeParty, newUnit),
  };
}

export function rerollShop(run, currentGold) {
  if (currentGold < 1) {
    return { offerings: generateShop(run), gold: currentGold };
  }
  return { offerings: generateShop(run), gold: currentGold - 1 };
}

export function getUnitSellValue(unit) {
  if (!unit) {
    return 0;
  }
  const definition = getUnitDefinition(unit.definitionId);
  const rarity = definition?.rarity || unit.rarity;
  const baseCost = RARITY_COST[rarity] || BASE_COST;
  const level = Math.max(1, Number(unit.level) || 1);
  if (level <= 1) {
    return Math.max(1, baseCost - 1);
  }
  if (level === 2) {
    return Math.max(1, baseCost * 2 + 1);
  }
  if (level === 3) {
    return Math.max(1, baseCost * 6 + 5);
  }
  return Math.max(1, baseCost * 12 + 15);
}

export function sellUnit(run, instanceId) {
  const { party, removed } = removeUnitById(run.activeParty, instanceId);
  if (!removed) {
    return { run, removed: null, goldGained: 0, itemsReturned: [] };
  }
  const goldGained = getUnitSellValue(removed);
  const returnedItems = Array.isArray(removed.items)
    ? removed.items.filter(Boolean).map((item) => ({ ...item }))
    : [];
  return {
    run: {
      ...run,
      gold: run.gold + goldGained,
      activeParty: party,
      inventory: [...(run.inventory || []), ...returnedItems],
    },
    removed,
    goldGained,
    itemsReturned: returnedItems,
  };
}
