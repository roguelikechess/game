import { nanoid } from '../utils/nanoid.js';
import { ITEM_BLUEPRINTS, createItemInstance } from './items.js';

export const ITEM_SHOP_SIZE = 4;
export const ITEM_SHOP_REROLL_COST = 3;

const OFFER_TYPES = new Set(['weapon', 'armor']);

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

function getRarityWeights(level = 1) {
  const bonus = Math.max(0, level - 3);
  const uncommon = Math.max(18, 70 - bonus * 3.5);
  const rare = 24 + bonus * 2.4;
  const unique = 6 + Math.max(0, bonus * 1.2);
  const epic = level >= 12 ? Math.max(0, (level - 11) * 1.5) : 0;
  return {
    uncommon,
    rare,
    unique,
    epic,
  };
}

const OFFER_POOL = Object.entries(ITEM_BLUEPRINTS)
  .filter(([, blueprint]) => OFFER_TYPES.has(blueprint.type))
  .map(([id, blueprint]) => ({ id, blueprint }));

function selectBlueprint() {
  if (!OFFER_POOL.length) {
    return null;
  }
  const entries = OFFER_POOL.map(({ id, blueprint }) => [id, blueprint.lootWeight || 1]);
  const selectedId = weightedChoice(entries);
  return OFFER_POOL.find((entry) => entry.id === selectedId) || OFFER_POOL[0];
}

function selectRarity(level) {
  const weights = getRarityWeights(level);
  const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
  if (!entries.length) {
    return 'uncommon';
  }
  return weightedChoice(entries) || 'uncommon';
}

function getOfferCost(blueprint, rarity, level) {
  const typeBase = blueprint.type === 'armor' ? 24 : 26;
  const rarityMultiplier = {
    uncommon: 1,
    rare: 1.75,
    unique: 2.65,
    epic: 3.4,
  }[rarity] || 1;
  const levelMultiplier = 1 + Math.max(0, level - 1) * 0.08;
  return Math.max(6, Math.round(typeBase * rarityMultiplier * levelMultiplier));
}

export function generateItemShopOffers(run, count = ITEM_SHOP_SIZE) {
  const level = Math.max(1, Number(run?.companyLevel) || 1);
  return Array.from({ length: count }, () => {
    const blueprintEntry = selectBlueprint();
    const rarity = selectRarity(level);
    const blueprint = blueprintEntry?.blueprint;
    const blueprintId = blueprintEntry?.id;
    if (!blueprint || !blueprintId) {
      return null;
    }
    const cost = getOfferCost(blueprint, rarity, level);
    return {
      id: nanoid('iOffer'),
      blueprintId,
      rarity,
      type: blueprint.type,
      cost,
    };
  }).filter(Boolean);
}

export function createInitialItemShop(run) {
  return {
    offerings: generateItemShopOffers(run),
    locked: false,
  };
}

export function createItemFromOffer(offer) {
  if (!offer) {
    return null;
  }
  const item = createItemInstance(offer.blueprintId, offer.rarity);
  return { ...item, upgradeLevel: 0 };
}

export function rerollItemShop(run, shop, gold) {
  if (!shop || gold < ITEM_SHOP_REROLL_COST) {
    return { shop, gold };
  }
  const offerings = generateItemShopOffers(run);
  return {
    shop: { ...shop, offerings },
    gold: gold - ITEM_SHOP_REROLL_COST,
  };
}

export function restockItemShop(run, shop) {
  if (!shop) {
    return createInitialItemShop(run);
  }
  return {
    ...shop,
    offerings: generateItemShopOffers(run),
  };
}
