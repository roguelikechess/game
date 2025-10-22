import { nanoid } from '../utils/nanoid.js';
import { buildRoster } from './roster.js';
import { getUnitDefinition, buildBaseStats, rollTraits } from './units.js';
import { getItemCapacityForUnit, describeItem, applyItemBonuses } from './items.js';
import { ITEM_BLUEPRINTS } from './items.js';

const RARITY_PRIORITY = {
  epic: 5,
  unique: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
};

const ROLE_PRIORITY = {
  frontline: 0,
  midline: 1,
  backline: 2,
};

function cloneUnitState(unit) {
  if (!unit) {
    return null;
  }
  return {
    ...unit,
    items: Array.isArray(unit.items)
      ? unit.items.map((item) => ({ ...item }))
      : [],
  };
}

function cloneSlot(slot) {
  return { slot: slot.slot, unit: cloneUnitState(slot.unit) };
}

function cloneParty(party) {
  return {
    frontline: party.frontline.map(cloneSlot),
    midline: party.midline.map(cloneSlot),
    backline: party.backline.map(cloneSlot),
    bench: party.bench.map((unit) => cloneUnitState(unit)),
  };
}

export function listUnitsWithLocation(party) {
  const result = [];
  ['frontline', 'midline', 'backline'].forEach((lineKey) => {
    const line = party[lineKey];
    line.forEach((slot, index) => {
      if (slot.unit) {
        result.push({
          unit: slot.unit,
          location: { type: 'line', line: lineKey, index },
        });
      }
    });
  });
  party.bench.forEach((unit, index) => {
    result.push({
      unit,
      location: { type: 'bench', index },
    });
  });
  return result;
}

function findUnitSlot(party, instanceId) {
  if (!instanceId) {
    return null;
  }
  for (const lineKey of ['frontline', 'midline', 'backline']) {
    const line = party[lineKey] || [];
    for (let index = 0; index < line.length; index += 1) {
      const slot = line[index];
      if (slot?.unit?.instanceId === instanceId) {
        return { lineKey, index, slot, unit: slot.unit };
      }
    }
  }
  const benchIndex = (party.bench || []).findIndex((unit) => unit?.instanceId === instanceId);
  if (benchIndex >= 0) {
    return { lineKey: 'bench', index: benchIndex, slot: null, unit: party.bench[benchIndex] };
  }
  return null;
}

function multiplierForLevel(level) {
  if (level >= 4) {
    return 8;
  }
  if (level === 3) {
    return 4;
  }
  if (level === 2) {
    return 2;
  }
  return 1;
}

function upgradeStats(unit) {
  if (unit.level >= 4) {
    return;
  }
  const nextLevel = Math.min(unit.level + 1, 4);
  const baseStats = unit.baseStats || unit.currentStats;
  const multiplier = multiplierForLevel(nextLevel);

  const scaled = { ...unit.currentStats };
  const healthBase = baseStats.maxHealth ?? baseStats.health ?? scaled.maxHealth;
  const attackBase = baseStats.attack ?? scaled.attack;
  const defenseBase = baseStats.defense ?? scaled.defense;
  const spellBase = baseStats.spellPower ?? scaled.spellPower;

  if (healthBase != null) {
    const healthValue = Math.round(healthBase * multiplier);
    scaled.health = healthValue;
    scaled.maxHealth = healthValue;
  }
  if (attackBase != null) {
    scaled.attack = Math.round(attackBase * multiplier);
  }
  if (defenseBase != null) {
    scaled.defense = Math.round(defenseBase * multiplier);
  }
  if (spellBase != null) {
    scaled.spellPower = Math.round(spellBase * multiplier);
  }

  unit.level = nextLevel;
  unit.experience = 0;
  unit.currentStats = scaled;
  unit.currentHealth = scaled.maxHealth ?? unit.currentHealth;
  if (scaled.maxMana != null) {
    unit.currentMana = scaled.maxMana;
  }
}

export function createInstance(definitionId, level = 1) {
  const definition = getUnitDefinition(definitionId);
  if (!definition) {
    throw new Error(`Missing unit definition: ${definitionId}`);
  }
  const baseStats = buildBaseStats(definition);
  const traitIds = rollTraits(definition);
  const traitBonus = traitIds.includes('arcane-battery') ? 1.4 : 1;
  const instance = {
    instanceId: nanoid('unit'),
    definitionId: definition.id,
    level: 1,
    experience: 0,
    baseStats: { ...baseStats },
    currentStats: {
      ...baseStats,
      manaRegen: Math.round(baseStats.manaRegen * traitBonus),
    },
    currentHealth: baseStats.maxHealth,
    currentMana: baseStats.maxMana,
    traitIds,
    items: [],
  };

  for (let step = 1; step < level; step += 1) {
    upgradeStats(instance);
  }

  return instance;
}

export function createInitialRoster() {
  return buildRoster();
}

export function createInitialParty() {
  return {
    frontline: [],
    midline: [],
    backline: [],
    bench: [],
  };
}

export function countDeployedUnits(party) {
  return ['frontline', 'midline', 'backline']
    .map((line) => party[line].filter((slot) => slot?.unit).length)
    .reduce((sum, value) => sum + value, 0);
}

export function addUnitToBench(party, unit) {
  return {
    ...party,
    bench: [...party.bench, unit],
  };
}

export function removeUnitById(party, instanceId) {
  if (!instanceId) {
    return { party, removed: null };
  }
  const targets = new Set([instanceId]);
  const { updated, removed } = removeUnitsByIdsInternal(party, targets);
  return { party: updated, removed: removed[0] || null };
}

function removeUnitsByIdsInternal(party, ids) {
  if (!ids || ids.size === 0) {
    return { updated: party, removed: [] };
  }
  const updated = cloneParty(party);
  const removed = [];

  ['frontline', 'midline', 'backline'].forEach((lineKey) => {
    updated[lineKey] = updated[lineKey].map((slot, index) => {
      if (!slot) {
        return { slot: index + 1, unit: null };
      }
      if (!slot.unit) {
        return { ...slot, unit: null };
      }
      if (ids.has(slot.unit.instanceId)) {
        removed.push(cloneUnitState(slot.unit));
        return { ...slot, unit: null };
      }
      return { ...slot, unit: cloneUnitState(slot.unit) };
    });
  });

  updated.bench = updated.bench
    .filter((unit) => {
      if (ids.has(unit.instanceId)) {
        removed.push(cloneUnitState(unit));
        return false;
      }
      return true;
    })
    .map((unit) => cloneUnitState(unit));

  return { updated, removed };
}

export function removeUnitsByIds(party, instanceIds) {
  const ids = new Set(instanceIds);
  const { updated, removed } = removeUnitsByIdsInternal(party, ids);
  return { party: updated, removed };
}

export function healParty(party) {
  const updated = cloneParty(party);
  ['frontline', 'midline', 'backline'].forEach((lineKey) => {
    updated[lineKey] = updated[lineKey].map((slot, index) => {
      if (!slot) {
        return { slot: index + 1, unit: null };
      }
      if (!slot.unit) {
        return { ...slot, unit: null };
      }
      const refreshed = cloneUnitState(slot.unit);
      const stats = refreshed.currentStats;
      refreshed.currentHealth = stats?.maxHealth ?? stats?.health ?? refreshed.currentHealth;
      refreshed.currentMana = stats?.maxMana ?? stats?.mana ?? refreshed.currentMana ?? 0;
      return { ...slot, unit: refreshed };
    });
  });
  updated.bench = updated.bench.map((unit) => {
    const refreshed = cloneUnitState(unit);
    const stats = refreshed.currentStats;
    refreshed.currentHealth = stats?.maxHealth ?? stats?.health ?? refreshed.currentHealth;
    refreshed.currentMana = stats?.maxMana ?? stats?.mana ?? refreshed.currentMana ?? 0;
    return refreshed;
  });
  return updated;
}

export function moveUnitToSlot(party, unitId, target) {
  const updated = cloneParty(party);

  const allSlots = [...updated.frontline, ...updated.midline, ...updated.backline];
  const sourceSlot = allSlots.find((slot) => slot.unit && slot.unit.instanceId === unitId);
  if (sourceSlot) {
    sourceSlot.unit = null;
  }

  const benchIndex = updated.bench.findIndex((unit) => unit.instanceId === unitId);
  let unit = null;
  if (benchIndex >= 0) {
    unit = updated.bench.splice(benchIndex, 1)[0];
  } else {
    unit = party.frontline
      .concat(party.midline, party.backline)
      .map((slot) => slot.unit)
      .find((member) => member && member.instanceId === unitId);
  }

  if (!unit) {
    return party;
  }

  const targetLine = updated[target.line];
  if (!targetLine[target.slotIndex]) {
    targetLine[target.slotIndex] = {
      slot: target.slotIndex + 1,
      unit: null,
    };
  }

  targetLine[target.slotIndex].unit = unit;
  return updated;
}

export function swapBenchWithSlot(party, benchIndex, target) {
  const updated = cloneParty(party);
  const benchUnit = updated.bench[benchIndex];
  if (!benchUnit) {
    return party;
  }
  const targetLine = updated[target.line];
  if (!targetLine) {
    return party;
  }
  if (!targetLine[target.slotIndex]) {
    targetLine[target.slotIndex] = { slot: target.slotIndex + 1, unit: null };
  }
  const previous = targetLine[target.slotIndex].unit;
  targetLine[target.slotIndex] = {
    slot: targetLine[target.slotIndex].slot || target.slotIndex + 1,
    unit: { ...benchUnit },
  };
  if (previous) {
    updated.bench[benchIndex] = { ...previous };
  } else {
    updated.bench.splice(benchIndex, 1);
  }
  return updated;
}

export function swapUnits(party, source, target, limit = 5) {
  if (!source || !target) {
    return { party, error: 'invalid' };
  }
  if (
    source.type === target.type &&
    source.type === 'line' &&
    source.line === target.line &&
    source.slotIndex === target.slotIndex
  ) {
    return { party, error: 'same' };
  }
  if (source.type === target.type && source.type === 'bench' && source.index === target.index) {
    return { party, error: 'same' };
  }

  const updated = cloneParty(party);

  function ensureLineSlot(lineKey, slotIndex) {
    if (!updated[lineKey]) {
      updated[lineKey] = [];
    }
    if (!updated[lineKey][slotIndex]) {
      updated[lineKey][slotIndex] = { slot: slotIndex + 1, unit: null };
    }
    return updated[lineKey][slotIndex];
  }

  function getSourceUnit(location) {
    if (location.type === 'line') {
      const slot = ensureLineSlot(location.line, location.slotIndex);
      return { kind: 'line', slot, lineKey: location.line, index: location.slotIndex, unit: slot.unit };
    }
    const index = location.index;
    const unit = index < updated.bench.length ? updated.bench[index] : null;
    return { kind: 'bench', index, unit };
  }

  const from = getSourceUnit(source);
  const to = getSourceUnit(target);

  if (!from.unit) {
    return { party, error: 'empty' };
  }

  const deployedCount = countDeployedUnits(updated);
  const movingFromBench = from.kind === 'bench';
  const movingToLine = to.kind === 'line';
  const movingIntoEmptyLine = movingToLine && !to.unit;

  if (movingFromBench && movingToLine && movingIntoEmptyLine && deployedCount >= limit) {
    return { party, error: 'limit' };
  }

  if (from.kind === 'bench' && to.kind === 'line') {
    ensureLineSlot(target.line, target.slotIndex);
    if (to.unit) {
      updated.bench[from.index] = cloneUnitState(to.unit);
    } else {
      updated.bench.splice(from.index, 1);
    }
    to.slot.unit = cloneUnitState(from.unit);
    return { party: updated, error: null };
  }

  if (from.kind === 'line' && to.kind === 'bench') {
    const benchUnit = to.unit ? cloneUnitState(to.unit) : null;
    const moved = cloneUnitState(from.unit);
    from.slot.unit = benchUnit;
    if (to.index < updated.bench.length) {
      updated.bench[to.index] = moved;
    } else {
      updated.bench.push(moved);
    }
    return { party: updated, error: null };
  }

  if (from.kind === 'line' && to.kind === 'line') {
    const temp = to.slot.unit ? cloneUnitState(to.slot.unit) : null;
    to.slot.unit = cloneUnitState(from.unit);
    from.slot.unit = temp;
    return { party: updated, error: null };
  }

  if (from.kind === 'bench' && to.kind === 'bench') {
    const fromUnit = cloneUnitState(from.unit);
    if (to.index >= updated.bench.length) {
      updated.bench.splice(from.index, 1);
      updated.bench.push(fromUnit);
      return { party: updated, error: null };
    }
    const toUnit = to.unit ? cloneUnitState(to.unit) : null;
    updated.bench[from.index] = toUnit;
    updated.bench[to.index] = fromUnit;
    return { party: updated, error: null };
  }

  return { party, error: 'invalid' };
}

export function listAllUnits(party) {
  return party.frontline
    .concat(party.midline, party.backline)
    .map((slot) => slot.unit)
    .filter(Boolean);
}

export function findUpgradeCombos(party) {
  const catalog = {};
  listUnitsWithLocation(party).forEach((entry) => {
    const key = `${entry.unit.definitionId}|${entry.unit.level}`;
    if (!catalog[key]) {
      catalog[key] = [];
    }
    catalog[key].push(entry);
  });

  return Object.entries(catalog)
    .filter(([, entries]) => entries.length >= 3)
    .map(([key, entries]) => {
      const [definitionId, levelStr] = key.split('|');
      return {
        definitionId,
        level: Number(levelStr),
        units: entries,
      };
    })
    .filter((entry) => entry.level < 4);
}

function rarityScore(rarity) {
  return RARITY_PRIORITY[rarity] || 0;
}

function ensureItemArray(unit) {
  if (!Array.isArray(unit.items)) {
    unit.items = [];
  }
  return unit.items;
}

function sortEligibleUnits(entries) {
  return entries.sort((a, b) => {
    if (a.location.type !== b.location.type) {
      return a.location.type === 'line' ? -1 : 1;
    }
    if (a.location.type === 'line' && b.location.type === 'line') {
      const roleDiff = (ROLE_PRIORITY[a.location.line] || 0) - (ROLE_PRIORITY[b.location.line] || 0);
      if (roleDiff !== 0) {
        return roleDiff;
      }
    }
    const rarityDiff = rarityScore(b.definition?.rarity) - rarityScore(a.definition?.rarity);
    if (rarityDiff !== 0) {
      return rarityDiff;
    }
    const levelDiff = (b.unit.level || 1) - (a.unit.level || 1);
    if (levelDiff !== 0) {
      return levelDiff;
    }
    const aIndex = a.location.slotIndex ?? a.location.index ?? 0;
    const bIndex = b.location.slotIndex ?? b.location.index ?? 0;
    return aIndex - bIndex;
  });
}

export function autoAssignItemToParty(party, item) {
  if (!item || !ITEM_BLUEPRINTS[item.blueprintId]) {
    return { party, assignedTo: null, merges: [], overflow: true };
  }
  const updated = cloneParty(party);
  const candidates = listUnitsWithLocation(updated)
    .map((entry) => {
      const definition = getUnitDefinition(entry.unit.definitionId);
      const capacity = getItemCapacityForUnit(definition, { level: entry.unit?.level });
      const items = ensureItemArray(entry.unit);
      return {
        ...entry,
        definition,
        capacity,
        items,
      };
    })
    .filter((entry) => entry.unit && entry.capacity > entry.items.length);

  if (!candidates.length) {
    return { party: updated, assignedTo: null, merges: [], overflow: true };
  }

  const target = sortEligibleUnits(candidates)[0];
  target.items.push({ ...item });
  const adjustedStats = applyItemBonuses(target.unit.currentStats, target.unit.items || []).stats;
  if (typeof adjustedStats.maxHealth === 'number') {
    target.unit.currentHealth = Math.min(adjustedStats.maxHealth, target.unit.currentHealth ?? adjustedStats.maxHealth);
  }
  if (typeof adjustedStats.maxMana === 'number') {
    target.unit.currentMana = Math.min(adjustedStats.maxMana, target.unit.currentMana ?? adjustedStats.maxMana);
  }
  return { party: updated, assignedTo: target.unit.instanceId, merges: [], overflow: false };
}

export function summarizeUnitItems(unit) {
  if (!unit?.items?.length) {
    return [];
  }
  return unit.items.map((item) => describeItem(item));
}

export function unequipItemFromUnit(party, instanceId, itemId) {
  if (!instanceId || !itemId) {
    return { party, item: null, error: 'invalid' };
  }
  const updated = cloneParty(party);
  const location = findUnitSlot(updated, instanceId);
  if (!location?.unit) {
    return { party: updated, item: null, error: 'unit-missing' };
  }
  const items = ensureItemArray(location.unit);
  const index = items.findIndex((item) => item.id === itemId);
  if (index < 0) {
    return { party: updated, item: null, error: 'not-found' };
  }
  const [removed] = items.splice(index, 1);
  const adjusted = applyItemBonuses(location.unit.currentStats, items).stats;
  if (typeof adjusted.maxHealth === 'number') {
    const nextHealth = Math.min(location.unit.currentHealth ?? adjusted.maxHealth, adjusted.maxHealth);
    location.unit.currentHealth = Math.max(0, nextHealth);
  }
  if (typeof adjusted.maxMana === 'number') {
    const nextMana = Math.min(location.unit.currentMana ?? adjusted.maxMana, adjusted.maxMana);
    location.unit.currentMana = Math.max(0, nextMana);
  }
  return { party: updated, item: removed || null, error: null };
}

export function equipItemToUnit(party, instanceId, item) {
  if (!instanceId || !item) {
    return { party, assignedTo: null, merges: [], error: 'invalid' };
  }
  if (!ITEM_BLUEPRINTS[item.blueprintId]) {
    return { party, assignedTo: null, merges: [], error: 'unknown-item' };
  }
  const updated = cloneParty(party);
  const location = findUnitSlot(updated, instanceId);
  if (!location?.unit) {
    return { party: updated, assignedTo: null, merges: [], error: 'unit-missing' };
  }
  const definition = getUnitDefinition(location.unit.definitionId);
  const capacity = getItemCapacityForUnit(definition, { level: location.unit?.level });
  const items = ensureItemArray(location.unit);
  if (items.length >= capacity) {
    return { party: updated, assignedTo: location.unit.instanceId, merges: [], error: 'capacity' };
  }
  items.push({ ...item });
  const adjusted = applyItemBonuses(location.unit.currentStats, items).stats;
  if (typeof adjusted.maxHealth === 'number') {
    const nextHealth = Math.min(location.unit.currentHealth ?? adjusted.maxHealth, adjusted.maxHealth);
    location.unit.currentHealth = Math.max(0, nextHealth);
  }
  if (typeof adjusted.maxMana === 'number') {
    const nextMana = Math.min(location.unit.currentMana ?? adjusted.maxMana, adjusted.maxMana);
    location.unit.currentMana = Math.max(0, nextMana);
  }
  return { party: updated, assignedTo: location.unit.instanceId, merges: [], error: null };
}

function removeConsumedUnits(party, consumed) {
  const benchIndexes = [];
  consumed.forEach((entry) => {
    if (entry.location.type === 'line') {
      const targetLine = party[entry.location.line];
      if (targetLine && targetLine[entry.location.index]) {
        targetLine[entry.location.index] = {
          ...targetLine[entry.location.index],
          unit: null,
        };
      }
    } else if (entry.location.type === 'bench') {
      benchIndexes.push(entry.location.index);
    }
  });

  benchIndexes
    .sort((a, b) => b - a)
    .forEach((index) => {
      party.bench.splice(index, 1);
    });
}

export function upgradePartyUnits(party, { definitionId, level, targetInstanceId }) {
  const noChange = { party, overflowItems: [] };
  if (level >= 4) {
    return noChange;
  }
  const combos = findUpgradeCombos(party);
  const combo = combos.find(
    (entry) =>
      entry.definitionId === definitionId &&
      entry.level === level &&
      entry.units.some((unitEntry) => unitEntry.unit.instanceId === targetInstanceId)
  );
  if (!combo) {
    return noChange;
  }

  const upgraded = cloneParty(party);
  const upgradedCombo = findUpgradeCombos(upgraded).find(
    (entry) => entry.definitionId === definitionId && entry.level === level
  );

  if (!upgradedCombo || upgradedCombo.units.length < 3) {
    return noChange;
  }

  const targetEntry = upgradedCombo.units.find(
    (entry) => entry.unit.instanceId === targetInstanceId
  );
  if (!targetEntry) {
    return noChange;
  }

  const remaining = upgradedCombo.units.filter(
    (entry) => entry.unit.instanceId !== targetInstanceId
  );
  const consumed = remaining.slice(0, 2);

  const targetUnit = targetEntry.unit;
  const targetItems = ensureItemArray(targetUnit).map((item) => ({ ...item }));
  const consumedItems = [];
  consumed.forEach((entry) => {
    const items = ensureItemArray(entry.unit);
    items.forEach((item) => {
      consumedItems.push({ ...item });
    });
  });

  removeConsumedUnits(upgraded, consumed);

  const targetSlot = findUnitSlot(upgraded, targetInstanceId);
  if (targetSlot?.unit) {
    upgradeStats(targetSlot.unit);
    const definition = getUnitDefinition(targetSlot.unit.definitionId);
    const capacity = getItemCapacityForUnit(definition, { level: targetSlot.unit?.level });
    const combinedItems = targetItems.concat(consumedItems);
    const keptItems = combinedItems.slice(0, capacity).map((item) => ({ ...item }));
    const overflowItems = combinedItems.slice(capacity).map((item) => ({ ...item }));
    targetSlot.unit.items = keptItems;
    const adjusted = applyItemBonuses(targetSlot.unit.currentStats, keptItems).stats;
    targetSlot.unit.currentStats = adjusted;
    if (typeof adjusted.maxHealth === 'number') {
      const nextHealth = Math.min(targetSlot.unit.currentHealth ?? adjusted.maxHealth, adjusted.maxHealth);
      targetSlot.unit.currentHealth = Math.max(0, nextHealth);
    }
    if (typeof adjusted.maxMana === 'number') {
      const nextMana = Math.min(targetSlot.unit.currentMana ?? adjusted.maxMana, adjusted.maxMana);
      targetSlot.unit.currentMana = Math.max(0, nextMana);
    }
    return { party: upgraded, overflowItems };
  }

  return noChange;
}

export function listPartyUnitsWithLocation(party) {
  return listUnitsWithLocation(party);
}
