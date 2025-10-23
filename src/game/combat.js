import { getUnitDefinition, buildBaseStats, getUnitSkill } from './units.js';
import { getJobById } from './jobs.js';
import { getTraitById } from './traits.js';
import { UNITS } from './units.js';
import { getSpriteById, getBattleBackgroundForRound } from '../data/assets.js';
import { applyItemBonuses } from './items.js';
import { evaluateAugments } from './augments.js';

export const FIELD_WIDTH = 960;
export const FIELD_HEIGHT = 540;
const LINE_Y = {
  frontline: FIELD_HEIGHT * 0.34,
  midline: FIELD_HEIGHT * 0.54,
  backline: FIELD_HEIGHT * 0.74,
};

const STEP_SECONDS = 0.1;
const MAX_TIME = 60;
const PIXELS_PER_SPEED = 96;
const STANDARD_TOKEN_DIAMETER = 48;
const MOVEMENT_EVENT_INTERVAL = 0.4;
const DEFENSE_DIVISOR_FACTOR = 0.01;
const MINIMUM_DAMAGE_AFTER_DEFENSE = 1;
const MAGICAL_JOBS = new Set([
  'mage',
  'healer',
  'warlock',
  'consecrator',
  'sorcerer',
  'cleric',
  'oracle',
  'priest',
  'druid',
  'shaman',
  'sage',
  'summoner',
]);

const TARGET_CENTER_JOBS = new Set([
  'archer',
  'mage',
  'healer',
  'consecrator',
  'warlock',
  'sorcerer',
  'oracle',
  'priest',
  'sage',
  'summoner',
]);

const MAX_ENEMY_LEVEL = 4;
const LEVEL_FLOAT_THRESHOLD = MAX_ENEMY_LEVEL - 0.5;
const SCALING_THRESHOLD_FOR_MAX_LEVEL = LEVEL_FLOAT_THRESHOLD / 1.6;
const BASE_SHIELD_DURATION = 5;
const SHIELD_DURATION_PER_SPELL_POWER = 0.0025;
const MAX_SHIELD_DURATION = 9;

let cachedFirstMaxEnemyRound = null;

function resolveTokenMetrics(spriteAsset) {
  const geometry = spriteAsset?.geometry;
  const token = geometry?.token || {};
  const offsetX = Number.isFinite(token.offsetX) ? token.offsetX : 0;
  const offsetY = Number.isFinite(token.offsetY) ? token.offsetY : 0;
  return { radius: STANDARD_TOKEN_DIAMETER / 2, offsetX, offsetY };
}

const GENERIC_ENEMY_TEMPLATES = {
  frontline: [
    {
      id: 'raider-brute',
      name: '약탈자 괴수',
      jobId: 'warrior',
      signatureTraitId: null,
      traitIds: [],
      statAdjustments: { attack: -8, health: 160, speed: -0.08 },
    },
    {
      id: 'iron-husk',
      name: '철갑병',
      jobId: 'knight',
      signatureTraitId: null,
      traitIds: [],
      statAdjustments: { defense: 12, attack: -6, speed: -0.05 },
    },
    {
      id: 'feral-stalker',
      name: '야성 추격자',
      jobId: 'swordsman',
      signatureTraitId: null,
      traitIds: [],
      statAdjustments: { attack: 8, health: -40, speed: 0.06 },
    },
  ],
  midline: [
    {
      id: 'raider-slinger',
      name: '약탈자 투석병',
      jobId: 'archer',
      signatureTraitId: null,
      traitIds: [],
      statAdjustments: { attackInterval: 0.2, range: -20 },
    },
    {
      id: 'ember-adept',
      name: '불꽃 수행자',
      jobId: 'mage',
      signatureTraitId: null,
      traitIds: [],
      statAdjustments: { spellPower: -12, mana: -20, speed: 0.04 },
    },
    {
      id: 'scout-ambusher',
      name: '정찰대 매복자',
      jobId: 'archer',
      signatureTraitId: null,
      traitIds: [],
      statAdjustments: { attack: -6, speed: 0.08, range: 30 },
    },
  ],
  backline: [
    {
      id: 'cult-acolyte',
      name: '사교도 견습생',
      jobId: 'warlock',
      signatureTraitId: null,
      traitIds: [],
      statAdjustments: { spellPower: -10, mana: -30, speed: 0.04 },
    },
    {
      id: 'field-medic',
      name: '야전 치유사',
      jobId: 'healer',
      signatureTraitId: null,
      traitIds: [],
      statAdjustments: { mana: -20, speed: 0.02, range: 20 },
    },
    {
      id: 'blight-sibyl',
      name: '역병 예언자',
      jobId: 'consecrator',
      signatureTraitId: null,
      traitIds: [],
      statAdjustments: { defense: -8, mana: 10, attackInterval: 0.1 },
    },
  ],
};

function colorForRole(role) {
  switch (role) {
    case 'frontline':
      return '#4f83ff';
    case 'midline':
      return '#6fd08c';
    case 'backline':
      return '#b98bff';
    default:
      return '#8aa0b8';
  }
}

function mergeAnimationSets(preferred, fallback) {
  if (!preferred && !fallback) {
    return null;
  }
  if (fallback === null) {
    return null;
  }
  const result = {};
  if (fallback) {
    Object.entries(fallback).forEach(([key, value]) => {
      if (value) {
        result[key] = value;
      }
    });
  }
  if (preferred) {
    Object.entries(preferred).forEach(([key, value]) => {
      if (value) {
        result[key] = value;
      }
    });
  }
  return Object.keys(result).length > 0 ? result : null;
}

function aggregateTraitEffects(traitIds) {
  return traitIds.reduce(
    (acc, traitId) => {
      const trait = getTraitById(traitId);
      if (!trait?.effects) {
        return acc;
      }
      const effects = trait.effects;
      if (effects.criticalChance) {
        acc.criticalChance += effects.criticalChance;
      }
      if (effects.criticalMultiplier) {
        acc.criticalMultiplier = Math.max(acc.criticalMultiplier, effects.criticalMultiplier);
      }
      if (effects.regenPercentPerSecond) {
        acc.regenPercentPerSecond += effects.regenPercentPerSecond;
      }
      if (effects.lifesteal) {
        acc.lifesteal += effects.lifesteal;
      }
      if (effects.manaRegenMultiplier) {
        acc.manaRegenMultiplier *= effects.manaRegenMultiplier;
      }
      if (effects.damageReduction) {
        acc.damageReduction += effects.damageReduction;
      }
      if (effects.rampingAttackSpeed) {
        acc.rampingAttackSpeed += effects.rampingAttackSpeed;
      }
      if (effects.debuffDurationReduction) {
        acc.debuffDurationReduction += effects.debuffDurationReduction;
      }
      return acc;
    },
    {
      criticalChance: 0.05,
      criticalMultiplier: 1.5,
      regenPercentPerSecond: 0,
      lifesteal: 0,
      manaRegenMultiplier: 1,
      damageReduction: 0,
      rampingAttackSpeed: 0,
      debuffDurationReduction: 0,
    }
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampPlacement(position, side) {
  if (!position) {
    return null;
  }
  const edgePadding = FIELD_WIDTH * 0.04;
  const allyMaxX = FIELD_WIDTH - edgePadding;
  const enemyMinX = edgePadding;
  const maxX = side === 'allies' ? allyMaxX : FIELD_WIDTH - edgePadding;
  const minX = side === 'allies' ? edgePadding : enemyMinX;
  const maxY = FIELD_HEIGHT * 0.92;
  const minY = FIELD_HEIGHT * 0.08;
  return {
    x: clamp(position.x, minX, maxX),
    y: clamp(position.y, minY, maxY),
  };
}

function cloneCombatant(unit) {
  if (!unit) {
    return null;
  }
  return {
    ...unit,
    traitEffects: { ...(unit.traitEffects || {}) },
    stats: { ...(unit.stats || {}) },
    statuses: Array.isArray(unit.statuses) ? [...unit.statuses] : [],
    buffs: Array.isArray(unit.buffs) ? [...unit.buffs] : [],
    debuffs: Array.isArray(unit.debuffs) ? [...unit.debuffs] : [],
    recentPositions: [],
    activeShields: [],
    healingReceivedMultiplier: 1,
    shieldReceivedMultiplier: 1,
    shield: 0,
  };
}

function createCombatant({ unit, line, index, total, placements }, side, augmentContext = null) {
  const definition = getUnitDefinition(unit.definitionId);
  const job = definition ? getJobById(definition.jobId) : null;
  const baseStats = unit.currentStats ? { ...unit.currentStats } : buildBaseStats(definition);
  const traitIds = unit.traitIds && unit.traitIds.length > 0
    ? unit.traitIds
    : [definition?.signatureTraitId].filter(Boolean);
  const traitEffects = aggregateTraitEffects(traitIds);
  const spriteAsset = definition?.spriteId ? getSpriteById(definition.spriteId) : null;
  const animations = mergeAnimationSets(spriteAsset?.variants, definition?.animations);
  const lineOffsets = side === 'allies'
    ? { frontline: 0.34, midline: 0.26, backline: 0.18 }
    : { frontline: 0.66, midline: 0.74, backline: 0.82 };
  const base = lineOffsets[line] ?? (side === 'allies' ? 0.3 : 0.7);
  const centerBase = FIELD_WIDTH * base;
  const spacing = 110;
  const offset = (index - (total - 1) / 2) * spacing;
  const direction = side === 'allies' ? 1 : -1;
  let spawnX = centerBase + offset * direction;
  let spawnY = LINE_Y[line] || FIELD_HEIGHT * 0.5;

  if (side === 'allies' && placements?.[unit.instanceId]) {
    const clamped = clampPlacement(placements[unit.instanceId], side);
    if (clamped) {
      spawnX = clamped.x;
      spawnY = clamped.y;
    }
  }

  const carriedItems = Array.isArray(unit.items) ? unit.items.map((item) => ({ ...item })) : [];
  const { stats: statsWithItems, modifiers: itemModifiers } = applyItemBonuses(baseStats, carriedItems);
  const maxHealth = statsWithItems.maxHealth || statsWithItems.health || 600;
  const maxMana = statsWithItems.maxMana || statsWithItems.mana || 80;

  const tokenMetrics = resolveTokenMetrics(spriteAsset);

  if (itemModifiers.lifesteal) {
    traitEffects.lifesteal += Math.max(0, itemModifiers.lifesteal);
  }
  if (itemModifiers.regenPercentPerSecond) {
    traitEffects.regenPercentPerSecond += Math.max(0, itemModifiers.regenPercentPerSecond);
  }
  if (itemModifiers.debuffDurationReduction) {
    traitEffects.debuffDurationReduction = (traitEffects.debuffDurationReduction || 0)
      + Math.max(0, itemModifiers.debuffDurationReduction);
  }

  const debuffDurationReduction = Math.max(0, Math.min(0.8, traitEffects.debuffDurationReduction || 0));
  const debuffDurationMultiplier = Math.max(0.2, 1 - debuffDurationReduction);
  const shieldShredOnHit = Math.max(0, Math.min(0.95, itemModifiers.shieldShredOnHit || 0));

  const combatant = {
    id: unit.instanceId,
    definitionId: unit.definitionId,
    name: definition?.name || 'Adventurer',
    jobId: definition?.jobId,
    rarity: definition?.rarity || null,
    role: job?.role || 'frontline',
    behavior: job?.behavior || { type: 'charger', engageRange: 60 },
    skill: definition ? getUnitSkill(definition.id) : null,
    traitIds,
    traitEffects,
    side,
    x: spawnX,
    y: spawnY,
    radius: tokenMetrics.radius,
    tokenOffsetX: tokenMetrics.offsetX,
    tokenOffsetY: tokenMetrics.offsetY,
    color: side === 'allies'
      ? (spriteAsset?.fallback?.primary || colorForRole(job?.role))
      : (spriteAsset?.fallback?.primary || '#e25b5b'),
    sprite: spriteAsset || null,
    animations,
    stats: { ...statsWithItems },
    maxHealth,
    health: clamp(unit.currentHealth || maxHealth, 0, maxHealth),
    maxMana,
    mana: clamp(unit.currentMana || maxMana, 0, maxMana),
    attackTimer: 0,
    skillTimer: 3 + Math.random() * 3,
    attackBonus: 0,
    defenseBonus: 0,
    magicDefenseBonus: 0,
    rangeBonus: 0,
    speedBonus: 0,
    attackIntervalBonus: 0,
    spellPowerBonus: 0,
    statuses: [],
    buffs: [],
    debuffs: [],
    shield: 0,
    activeShields: [],
    guardMitigation: 0,
    damageTakenBonus: 0,
    damageDealtPenalty: 0,
    lastAttackInterval: statsWithItems.attackInterval,
    rampStacks: 0,
    recentPositions: [],
    cooldownReduction: Math.min(0.7, itemModifiers.cooldownReduction || 0),
    items: carriedItems,
    level: unit.level || 1,
    healingReceivedMultiplier: 1,
    shieldReceivedMultiplier: 1,
    debuffDurationMultiplier,
    shieldShredOnHit,
  };
  if (augmentContext) {
    if (side === 'allies' && typeof augmentContext.applyToAlly === 'function') {
      augmentContext.applyToAlly(combatant);
    } else if (side === 'enemies' && typeof augmentContext.applyToEnemy === 'function') {
      augmentContext.applyToEnemy(combatant);
    }
  }
  return combatant;
}

function gatherAllies(party, placements, augmentContext) {
  const allies = [];
  ['frontline', 'midline', 'backline'].forEach((lineKey) => {
    const present = party[lineKey].filter((slot) => slot.unit);
    present.forEach((slot, index) => {
      allies.push(
        createCombatant(
          {
            unit: slot.unit,
            line: lineKey,
            index,
            total: present.length,
            placements,
          },
          'allies',
          augmentContext
        )
      );
    });
  });
  return allies;
}

function charactersForJob(jobId) {
  return UNITS.filter((unit) => unit.jobId === jobId);
}

function randomChoice(list) {
  if (!list.length) {
    return null;
  }
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

function selectEnemyTemplate(role) {
  const generics = GENERIC_ENEMY_TEMPLATES[role] || [];
  const useGeneric = generics.length > 0 && Math.random() < 0.6;
  if (useGeneric) {
    const chosen = randomChoice(generics);
    if (chosen) {
      return { ...chosen };
    }
  }
  const jobPool = {
    frontline: ['swordsman', 'knight', 'warrior'],
    midline: ['archer', 'mage'],
    backline: ['healer', 'consecrator', 'warlock'],
  }[role] || ['warrior'];
  const jobId = randomChoice(jobPool) || jobPool[0];
  const candidates = charactersForJob(jobId);
  if (candidates.length > 0) {
    const chosenCharacter = randomChoice(candidates);
    if (chosenCharacter) {
      return chosenCharacter;
    }
  }
  if (generics.length > 0) {
    const fallback = randomChoice(generics);
    if (fallback) {
      return { ...fallback };
    }
  }
  return {
    id: `${jobId}-trooper`,
    name: `${jobId} Trooper`,
    jobId,
    signatureTraitId: null,
    traitIds: [],
    skillId: null,
    statAdjustments: {},
  };
}

function createEnemyCombatant(role, index, total, scalingFactor, round = 1) {
  const definition = selectEnemyTemplate(role);
  const baseStats = buildBaseStats(definition);
  const traitIds = definition.traitIds?.length
    ? definition.traitIds
    : definition.signatureTraitId
    ? [definition.signatureTraitId]
    : [];
  const traitEffects = aggregateTraitEffects(traitIds);
  const spriteAsset = definition?.spriteId ? getSpriteById(definition.spriteId) : null;
  const animations = mergeAnimationSets(spriteAsset?.variants, definition?.animations);
  const lineOffsets = { frontline: 0.66, midline: 0.74, backline: 0.82 };
  const base = lineOffsets[role] ?? 0.72;
  const centerBase = FIELD_WIDTH * base;
  const spacing = 110;
  const offset = (index - (total - 1) / 2) * spacing;

  const scaledStats = { ...baseStats };
  const levelFloat = scalingFactor * 1.6;
  const level = Math.min(MAX_ENEMY_LEVEL, Math.max(1, Math.round(levelFloat)));
  const reachedCap = level >= MAX_ENEMY_LEVEL;
  const overflowScaling = reachedCap ? Math.max(0, scalingFactor - SCALING_THRESHOLD_FOR_MAX_LEVEL) : 0;
  const roundsBeyondCap = reachedCap
    ? Math.max(0, Math.floor(Math.max(1, round)) - getFirstMaxEnemyRound())
    : 0;
  const postCapRamp = roundsBeyondCap > 0 ? roundsBeyondCap * 0.05 + roundsBeyondCap * roundsBeyondCap * 0.003 : 0;
  const postCapScalar = reachedCap ? overflowScaling * 0.6 + postCapRamp : 0;

  ['maxHealth', 'health', 'attack', 'defense', 'magicDefense', 'spellPower', 'mana', 'maxMana'].forEach((key) => {
    if (typeof scaledStats[key] === 'number') {
      let value = Math.round(scaledStats[key] * scalingFactor);
      if (postCapScalar > 0 && typeof baseStats[key] === 'number') {
        value += Math.round(baseStats[key] * postCapScalar);
      }
      scaledStats[key] = value;
    }
  });
  if (typeof scaledStats.speed === 'number') {
    let adjusted = scaledStats.speed * (0.95 + scalingFactor * 0.1);
    if (postCapScalar > 0) {
      const speedBoost = Math.min(0.45, postCapRamp * 0.18 + overflowScaling * 0.08);
      adjusted *= 1 + speedBoost;
    }
    scaledStats.speed = parseFloat(Math.min(3.5, adjusted).toFixed(2));
  }
  if (typeof scaledStats.attackInterval === 'number') {
    const bonus = 0.02 * (scalingFactor - 1);
    let interval = scaledStats.attackInterval - bonus;
    if (postCapScalar > 0) {
      const intervalCut = Math.min(0.3, postCapRamp * 0.09 + overflowScaling * 0.04);
      interval -= intervalCut;
    }
    scaledStats.attackInterval = parseFloat(Math.max(0.5, interval).toFixed(2));
  }

  const tokenMetrics = resolveTokenMetrics(spriteAsset);

  return {
    id: `enemy-${definition.id}-${Math.random().toString(16).slice(2, 6)}`,
    definitionId: definition.id,
    name: definition.name,
    jobId: definition.jobId,
    rarity: definition.rarity || null,
    role,
    behavior: getJobById(definition.jobId)?.behavior || { type: 'charger', engageRange: 60 },
    skill: definition.skillId ? getUnitSkill(definition.id) : null,
    traitIds,
    traitEffects,
    side: 'enemies',
    x: centerBase - offset,
    y: LINE_Y[role] || FIELD_HEIGHT * 0.5,
    radius: tokenMetrics.radius,
    tokenOffsetX: tokenMetrics.offsetX,
    tokenOffsetY: tokenMetrics.offsetY,
    color: spriteAsset?.fallback?.primary || '#e25b5b',
    sprite: spriteAsset || null,
    animations,
    stats: { ...scaledStats },
    maxHealth: scaledStats.maxHealth || scaledStats.health || 640,
    health: scaledStats.maxHealth || scaledStats.health || 640,
    maxMana: scaledStats.maxMana || scaledStats.mana || 80,
    mana: scaledStats.maxMana || scaledStats.mana || 80,
    attackTimer: 0,
    skillTimer: 3 + Math.random() * 3,
    attackBonus: 0,
    defenseBonus: 0,
    rangeBonus: 0,
    speedBonus: 0,
    attackIntervalBonus: 0,
    spellPowerBonus: 0,
    statuses: [],
    buffs: [],
    debuffs: [],
    shield: 0,
    activeShields: [],
    guardMitigation: 0,
    damageTakenBonus: 0,
    damageDealtPenalty: 0,
    lastAttackInterval: baseStats.attackInterval,
    rampStacks: 0,
    recentPositions: [],
    cooldownReduction: 0,
    items: [],
    level,
    healingReceivedMultiplier: 1,
    shieldReceivedMultiplier: 1,
  };
}

export function isBossRound(round) {
  if (!Number.isFinite(round)) {
    return false;
  }
  const value = Math.floor(round);
  return value > 0 && value % 10 === 0;
}

function scalingForRound(round) {
  const safeRound = Math.max(1, Math.floor(Number(round) || 1));
  const stage = safeRound - 1;
  const bossClears = Math.max(0, Math.floor(stage / 10));
  const growth = 0.045 + bossClears * 0.012;
  const base = 0.48 + stage * growth;
  const cap = 2 + bossClears * 0.24;
  return Math.min(cap, base);
}

function getFirstMaxEnemyRound() {
  if (cachedFirstMaxEnemyRound != null) {
    return cachedFirstMaxEnemyRound;
  }
  let round = 1;
  while (round < 400) {
    const scaling = scalingForRound(round);
    if (Math.round(scaling * 1.6) >= MAX_ENEMY_LEVEL) {
      cachedFirstMaxEnemyRound = round;
      return cachedFirstMaxEnemyRound;
    }
    round += 1;
  }
  cachedFirstMaxEnemyRound = 400;
  return cachedFirstMaxEnemyRound;
}

function generateStandardEnemies(allyCount, round, overrideScaling = null) {
  const minimumAllies = Math.max(1, Math.floor(allyCount));
  let desired = Math.max(2, Math.ceil(minimumAllies * 0.9));
  if (round <= 1) {
    desired = Math.min(3, desired);
  } else if (round <= 3) {
    desired = Math.max(3, Math.min(4, desired + 1));
  } else {
    desired += Math.floor((round - 3) / 2) + 1;
  }
  const naturalCap = 9 + Math.floor(round / 6);
  const earlyCap = 6;
  const postFiftyBonus = round > 50 ? Math.floor((round - 50) / 4) : 0;
  const dynamicCap = round <= 50 ? earlyCap : Math.min(naturalCap, earlyCap + postFiftyBonus);
  desired = Math.min(desired, Math.max(earlyCap, dynamicCap));

  const distribution = [1, desired > 1 ? 1 : 0, desired > 2 ? 1 : 0];
  let remaining = Math.max(0, desired - distribution.reduce((sum, value) => sum + value, 0));
  let index = 0;
  while (remaining > 0) {
    distribution[index % distribution.length] += 1;
    remaining -= 1;
    index += 1;
  }

  const scaling = overrideScaling ?? scalingForRound(round);
  const layout = ['frontline', 'midline', 'backline'];
  const enemies = [];
  layout.forEach((role, roleIndex) => {
    const count = Math.max(0, distribution[roleIndex]);
    if (count === 0) {
      return;
    }
    const total = count;
    for (let i = 0; i < total; i += 1) {
      enemies.push(createEnemyCombatant(role, i, total, scaling, round));
    }
  });
  return enemies;
}

function createBossCombatant(round, scaling, previousScaling) {
  const template = selectEnemyTemplate('frontline');
  const baseStats = buildBaseStats(template);
  const traitIds = template.traitIds?.length
    ? template.traitIds
    : template.signatureTraitId
    ? [template.signatureTraitId]
    : [];
  const traitEffects = aggregateTraitEffects(traitIds);
  const spriteAsset = template?.spriteId ? getSpriteById(template.spriteId) : null;
  const animations = mergeAnimationSets(spriteAsset?.variants, template?.animations);
  const tokenMetrics = resolveTokenMetrics(spriteAsset);

  const prev = Math.max(1, previousScaling);
  const healthMultiplier = Math.max(prev * 4.8, scaling * 3.6);
  const offenseMultiplier = Math.max(prev * 1.9, scaling * 1.6);
  const defenseMultiplier = Math.max(prev * 1.75, scaling * 1.45);

  const scaledStats = { ...baseStats };
  if (typeof scaledStats.maxHealth === 'number') {
    const bossHealth = Math.round(scaledStats.maxHealth * healthMultiplier);
    scaledStats.maxHealth = bossHealth;
    scaledStats.health = bossHealth;
  }
  if (typeof scaledStats.attack === 'number') {
    scaledStats.attack = Math.round(scaledStats.attack * offenseMultiplier);
  }
  if (typeof scaledStats.spellPower === 'number') {
    scaledStats.spellPower = Math.round(scaledStats.spellPower * offenseMultiplier * 0.9);
  }
  if (typeof scaledStats.defense === 'number') {
    scaledStats.defense = Math.round(scaledStats.defense * defenseMultiplier);
  }
  if (typeof scaledStats.maxMana === 'number') {
    const manaScale = Math.max(1, prev * 1.2);
    scaledStats.maxMana = Math.round(scaledStats.maxMana * manaScale);
    scaledStats.mana = scaledStats.maxMana;
  }
  if (typeof scaledStats.manaRegen === 'number') {
    scaledStats.manaRegen = Math.round(scaledStats.manaRegen * Math.max(1.2, prev * 1.05));
  }
  if (typeof scaledStats.attackInterval === 'number') {
    const interval = Math.max(0.45, scaledStats.attackInterval * 0.82);
    scaledStats.attackInterval = parseFloat(interval.toFixed(2));
  }
  if (typeof scaledStats.speed === 'number') {
    const speed = Math.min(3.2, scaledStats.speed * (1.05 + prev * 0.08));
    scaledStats.speed = parseFloat(speed.toFixed(2));
  }

  return {
    id: `boss-${template.id}-${Math.random().toString(16).slice(2, 6)}`,
    definitionId: template.id,
    name: `${template.name} (보스)`,
    jobId: template.jobId,
    rarity: template.rarity || null,
    role: 'frontline',
    behavior: getJobById(template.jobId)?.behavior || { type: 'charger', engageRange: 68 },
    skill: template.skillId ? getUnitSkill(template.id) : null,
    traitIds,
    traitEffects,
    side: 'enemies',
    x: FIELD_WIDTH * 0.66,
    y: LINE_Y.frontline || FIELD_HEIGHT * 0.6,
    radius: tokenMetrics.radius * 1.08,
    tokenOffsetX: tokenMetrics.offsetX,
    tokenOffsetY: tokenMetrics.offsetY,
    color: spriteAsset?.fallback?.primary || '#c53030',
    sprite: spriteAsset || null,
    animations,
    stats: { ...scaledStats },
    maxHealth: scaledStats.maxHealth || scaledStats.health || 3200,
    health: scaledStats.maxHealth || scaledStats.health || 3200,
    maxMana: scaledStats.maxMana || scaledStats.mana || 120,
    mana: scaledStats.maxMana || scaledStats.mana || 120,
    attackTimer: 0,
    skillTimer: 2,
    attackBonus: 0,
    defenseBonus: 0,
    rangeBonus: 0,
    speedBonus: 0,
    attackIntervalBonus: 0,
    spellPowerBonus: 0,
    statuses: [],
    buffs: [],
    debuffs: [],
    shield: 0,
    activeShields: [],
    guardMitigation: Math.max(0.18, traitEffects.damageReduction || 0),
    damageTakenBonus: -0.08,
    damageDealtPenalty: 0,
    lastAttackInterval: scaledStats.attackInterval,
    rampStacks: 0,
    recentPositions: [],
    cooldownReduction: 0.12,
    items: [],
    level: 4,
    isBoss: true,
    healingReceivedMultiplier: 1,
    shieldReceivedMultiplier: 1,
  };
}

function generateBossEncounter(allyCount, round) {
  const previousScaling = scalingForRound(Math.max(1, round - 1));
  const bossScaling = scalingForRound(round);
  const minionScaling = Math.max(previousScaling * 1.05, bossScaling * 0.82);
  const minionBaseRound = Math.max(1, round - 1);
  const minionCount = Math.max(2, Math.min(6, allyCount + 2));
  const baseMinions = generateStandardEnemies(minionCount, minionBaseRound, minionScaling).slice(0, minionCount);
  const boss = createBossCombatant(round, bossScaling, previousScaling);
  return [boss, ...baseMinions];
}

function generateEnemies(allyCount, round) {
  if (isBossRound(round)) {
    return generateBossEncounter(allyCount, round);
  }
  return generateStandardEnemies(allyCount, round);
}

export function planEncounter({ round = 1, allyCount = 1 } = {}) {
  const count = Math.max(1, allyCount);
  const enemies = generateEnemies(count, round).map((enemy) => cloneCombatant(enemy)).filter(Boolean);
  const background = getBattleBackgroundForRound(round);
  return {
    id: `enc-${round}-${Math.random().toString(36).slice(2, 6)}`,
    round,
    background,
    boss: isBossRound(round),
    enemies,
  };
}

function livingUnits(units) {
  return units.filter((unit) => unit.health > 0);
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function nearestTarget(actor, potential) {
  const alive = livingUnits(potential);
  if (!alive.length) {
    return null;
  }
  return alive.reduce((closest, unit) => {
    if (!closest) {
      return unit;
    }
    const dist = distance(actor, unit);
    const bestDist = distance(actor, closest);
    return dist < bestDist ? unit : closest;
  }, null);
}

function applyBuff(actor, buff) {
  actor.buffs.push({ ...buff });
}

function applyDebuff(target, debuff) {
  target.debuffs.push({ ...debuff });
}

function recordStatusEvent(events, timestamp, targets, kind, effectType, duration, source) {
  if (!events || !Array.isArray(targets) || targets.length === 0) {
    return;
  }
  const normalizedDuration = Number(duration);
  const appliedDuration = Number.isFinite(normalizedDuration) ? Math.max(0, normalizedDuration) : 0;
  events.push({
    kind: 'status',
    timestamp,
    attackerId: source?.id,
    targetIds: targets.map((target) => target.id),
    statusKind: kind,
    effectType: effectType || kind,
    duration: appliedDuration,
  });
}

function grantBuff(target, buff, options = {}) {
  if (!target || !buff) {
    return;
  }
  applyBuff(target, buff);
  const duration = options.duration ?? buff.duration;
  if (options.events && duration > 0) {
    recordStatusEvent(options.events, options.timestamp, [target], 'buff', options.effectType, duration, options.source);
  }
}

function inflictDebuff(target, debuff, options = {}) {
  if (!target || !debuff) {
    return;
  }
  const multiplier = target.debuffDurationMultiplier ?? 1;
  const applied = { ...debuff };
  if (typeof applied.duration === 'number' && Number.isFinite(applied.duration)) {
    applied.duration = Math.max(0, applied.duration * multiplier);
  }
  applyDebuff(target, applied);
  let duration = null;
  if (typeof options.duration === 'number' && Number.isFinite(options.duration)) {
    duration = Math.max(0, options.duration * multiplier);
  } else if (typeof debuff.duration === 'number' && Number.isFinite(debuff.duration)) {
    duration = Math.max(0, debuff.duration * multiplier);
  } else if (typeof applied.duration === 'number' && Number.isFinite(applied.duration)) {
    duration = Math.max(0, applied.duration);
  }
  if (options.events && duration > 0) {
    recordStatusEvent(options.events, options.timestamp, [target], 'debuff', options.effectType, duration, options.source);
  }
}

function shouldCenterOnTarget(actor) {
  if (!actor) {
    return false;
  }
  if (TARGET_CENTER_JOBS.has(actor.jobId)) {
    return true;
  }
  return actor.role === 'midline' || actor.role === 'backline';
}

function resolveAreaCenter(actor, target) {
  if (target && shouldCenterOnTarget(actor)) {
    return target;
  }
  return actor;
}

function effectiveSpellPower(actor) {
  if (!actor) {
    return 0;
  }
  return (actor.stats?.spellPower || 0) + (actor.spellPowerBonus || 0);
}

function createSpellPowerScaler(actor, skill) {
  const scaling = skill?.spellPowerScaling || null;
  const spellPower = effectiveSpellPower(actor);

  function coerce(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  return {
    damage(base) {
      if (!Number.isFinite(base)) {
        return base;
      }
      const ratio = scaling ? coerce(scaling.damage ?? scaling.generic) : 0;
      return ratio ? base + spellPower * ratio : base;
    },
    heal(base) {
      if (!Number.isFinite(base)) {
        return base;
      }
      const ratio = scaling ? coerce(scaling.heal ?? scaling.generic) : 0;
      return ratio ? base + spellPower * ratio : base;
    },
    shield(base) {
      if (!Number.isFinite(base)) {
        return base;
      }
      const ratio = scaling ? coerce(scaling.shield ?? scaling.heal ?? scaling.generic) : 0;
      return ratio ? base + spellPower * ratio : base;
    },
    effect(base) {
      if (!Number.isFinite(base)) {
        return base;
      }
      const ratio = scaling ? coerce(scaling.effect) : 0;
      return ratio ? base * (1 + spellPower * ratio) : base;
    },
    duration(base) {
      if (!Number.isFinite(base)) {
        return base;
      }
      const ratio = scaling ? coerce(scaling.duration) : 0;
      return ratio ? base * (1 + spellPower * ratio) : base;
    },
    mana(base) {
      if (!Number.isFinite(base)) {
        return base;
      }
      const ratio = scaling ? coerce(scaling.mana) : 0;
      return ratio ? base + spellPower * ratio : base;
    },
  };
}

function ensureShieldContainers(actor) {
  if (!actor) {
    return;
  }
  if (!Array.isArray(actor.activeShields)) {
    actor.activeShields = [];
  }
  if (typeof actor.shield !== 'number' || Number.isNaN(actor.shield)) {
    actor.shield = 0;
  }
}

function grantShield(target, amount, options = {}) {
  if (!target || !Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  ensureShieldContainers(target);
  const multiplier = target.shieldReceivedMultiplier ?? 1;
  const appliedAmount = Math.max(0, amount * multiplier);
  if (appliedAmount <= 0) {
    return 0;
  }
  const source = options.source || null;
  const spellPower = source ? effectiveSpellPower(source) : 0;
  const durationBonus = Math.min(
    Math.max(0, MAX_SHIELD_DURATION - BASE_SHIELD_DURATION),
    spellPower * SHIELD_DURATION_PER_SPELL_POWER
  );
  let duration = options.duration ?? BASE_SHIELD_DURATION;
  duration = Math.max(0.5, duration + durationBonus);
  duration = Math.min(MAX_SHIELD_DURATION, duration);

  const entry = {
    amount: appliedAmount,
    remaining: duration,
    sourceId: source?.id || null,
  };
  target.activeShields.push(entry);
  target.shield = (target.shield || 0) + appliedAmount;

  if (options.events) {
    const effectType = options.effectType || 'shield';
    recordStatusEvent(options.events, options.timestamp, [target], 'buff', effectType, duration, source);
  }

  return appliedAmount;
}

function absorbShieldDamage(target, incoming) {
  if (!target || !Number.isFinite(incoming) || incoming <= 0) {
    return 0;
  }
  ensureShieldContainers(target);
  if (!target.shield || target.shield <= 0) {
    return 0;
  }
  let remaining = incoming;
  const next = [];
  target.activeShields.forEach((entry) => {
    if (!entry || entry.remaining <= 0 || entry.amount <= 0) {
      return;
    }
    if (remaining > 0) {
      const absorbed = Math.min(entry.amount, remaining);
      entry.amount -= absorbed;
      remaining -= absorbed;
    }
    if (entry.amount > 0 && entry.remaining > 0) {
      next.push(entry);
    }
  });
  let absorbedTotal = Math.max(0, incoming - remaining);
  if (remaining > 0 && target.shield > absorbedTotal) {
    const fallback = Math.min(target.shield - absorbedTotal, remaining);
    absorbedTotal += fallback;
    remaining -= fallback;
  }
  target.activeShields = next;
  target.shield = Math.max(0, target.shield - absorbedTotal);
  if (target.shield < 0.01) {
    target.shield = 0;
  }
  return absorbedTotal;
}

function decayShields(actor, delta) {
  if (!actor || !Number.isFinite(delta) || delta <= 0) {
    return;
  }
  ensureShieldContainers(actor);
  if (!actor.activeShields.length) {
    return;
  }
  const next = [];
  actor.activeShields.forEach((entry) => {
    if (!entry || entry.amount <= 0) {
      return;
    }
    const remaining = entry.remaining != null ? entry.remaining - delta : Infinity;
    if (remaining > 0) {
      entry.remaining = remaining;
      next.push(entry);
    } else {
      actor.shield = Math.max(0, actor.shield - entry.amount);
    }
  });
  actor.activeShields = next;
  if (actor.shield < 0.01) {
    actor.shield = 0;
  }
}

function reduceDebuffDurations(target, predicate, amount) {
  if (!target || !Array.isArray(target.debuffs) || amount <= 0) {
    return;
  }
  let changed = false;
  target.debuffs.forEach((debuff) => {
    if (!debuff || !predicate(debuff)) {
      return;
    }
    if (typeof debuff.duration === 'number' && Number.isFinite(debuff.duration)) {
      const nextDuration = Math.max(0, debuff.duration - amount);
      if (nextDuration !== debuff.duration) {
        debuff.duration = nextDuration;
        changed = true;
      }
    }
  });
  if (changed) {
    target.debuffs = target.debuffs.filter((debuff) => {
      if (!debuff) {
        return false;
      }
      if (typeof debuff.duration === 'number' && debuff.duration <= 0) {
        return false;
      }
      return true;
    });
  }
}

function sootheAllyDebuffs(target, amount) {
  reduceDebuffDurations(
    target,
    (debuff) =>
      !!debuff
      && (debuff.slowMultiplier != null
        || (typeof debuff.damageTakenBonus === 'number' && debuff.damageTakenBonus > 0)
        || (typeof debuff.defenseShred === 'number' && debuff.defenseShred > 0)
        || (typeof debuff.magicDefenseShred === 'number' && debuff.magicDefenseShred > 0)),
    amount
  );
}

function sanctifyAllyDebuffs(target, amount) {
  reduceDebuffDurations(
    target,
    (debuff) => !!debuff && ((typeof debuff.healReduction === 'number' && debuff.healReduction > 0)
      || (typeof debuff.shieldReduction === 'number' && debuff.shieldReduction > 0)),
    amount
  );
}

function updateEffects(actor, delta) {
  const pendingBuffs = Array.isArray(actor.buffs) ? actor.buffs : [];
  const pendingDebuffs = Array.isArray(actor.debuffs) ? actor.debuffs : [];

  actor.attackBonus = 0;
  actor.defenseBonus = 0;
  actor.magicDefenseBonus = 0;
  actor.rangeBonus = 0;
  actor.speedBonus = 0;
  actor.attackIntervalBonus = 0;
  actor.spellPowerBonus = 0;
  actor.guardMitigation = 0;
  actor.damageTakenBonus = 0;
  actor.damageDealtPenalty = 0;
  ensureShieldContainers(actor);

  actor.healingReceivedMultiplier = 1;
  actor.shieldReceivedMultiplier = 1;

  const newDebuffs = [];
  pendingDebuffs.forEach((debuff) => {
    const remaining = debuff.duration !== undefined ? debuff.duration - delta : Infinity;
    if (debuff.tickDamage) {
      const dmg = debuff.tickDamage * delta;
      actor.health = Math.max(0, actor.health - dmg);
    }
    if (debuff.slowMultiplier) {
      actor.speedBonus -= (1 - debuff.slowMultiplier) * (actor.stats.speed || 1);
    }
    if (debuff.damageTakenBonus) {
      actor.damageTakenBonus += debuff.damageTakenBonus;
    }
    if (debuff.damageDealtPenalty) {
      actor.damageDealtPenalty += debuff.damageDealtPenalty;
    }
    if (typeof debuff.healReduction === 'number' && debuff.healReduction > 0) {
      actor.healingReceivedMultiplier *= Math.max(0, 1 - Math.min(0.95, debuff.healReduction));
    }
    if (typeof debuff.shieldReduction === 'number' && debuff.shieldReduction > 0) {
      actor.shieldReceivedMultiplier *= Math.max(0, 1 - Math.min(0.95, debuff.shieldReduction));
    }
    if (remaining > 0) {
      debuff.duration = remaining;
      newDebuffs.push(debuff);
    }
  });
  actor.debuffs = newDebuffs;
  actor.healingReceivedMultiplier = Math.max(0, Math.min(1, actor.healingReceivedMultiplier));
  actor.shieldReceivedMultiplier = Math.max(0, Math.min(1, actor.shieldReceivedMultiplier));

  const newBuffs = [];
  pendingBuffs.forEach((buff) => {
    const remaining = buff.duration !== undefined ? buff.duration - delta : Infinity;
    if (buff.healPerSecond) {
      const heal = buff.healPerSecond * delta * actor.healingReceivedMultiplier;
      actor.health = Math.min(actor.maxHealth, actor.health + heal);
    }
    if (buff.manaPerSecond) {
      actor.mana = Math.min(actor.maxMana, actor.mana + buff.manaPerSecond * delta);
    }
    if (buff.attackBonus) {
      actor.attackBonus += buff.attackBonus;
    }
    if (buff.defenseBonus) {
      actor.defenseBonus += buff.defenseBonus;
    }
    if (buff.magicDefenseBonus) {
      actor.magicDefenseBonus += buff.magicDefenseBonus;
    }
    if (buff.spellPowerBonus) {
      actor.spellPowerBonus += buff.spellPowerBonus;
    }
    if (buff.rangeBonus) {
      actor.rangeBonus += buff.rangeBonus;
    }
    if (buff.speedMultiplier) {
      actor.speedBonus += (buff.speedMultiplier - 1) * (actor.stats.speed || 1);
    }
    if (buff.attackIntervalModifier) {
      actor.attackIntervalBonus += buff.attackIntervalModifier;
    }
    if (buff.guardRedirect) {
      actor.guardMitigation = Math.max(actor.guardMitigation, buff.guardRedirect);
    }
    if (remaining > 0) {
      buff.duration = remaining;
      newBuffs.push(buff);
    }
  });
  actor.buffs = newBuffs;

  decayShields(actor, delta);
}

function inferDamageType(source, context) {
  if (context.damageType) {
    return context.damageType;
  }
  if (!source) {
    return 'physical';
  }
  if (MAGICAL_JOBS.has(source.jobId)) {
    return 'magic';
  }
  if (source.role === 'backline' && source.jobId && source.jobId !== 'archer') {
    return 'magic';
  }
  return 'physical';
}

function applyDamage(target, amount, source, log, events, timestamp, context = {}) {
  let damage = amount;
  if (target.damageTakenBonus) {
    damage *= 1 + target.damageTakenBonus;
  }
  damage *= 1 - (target.traitEffects.damageReduction || 0);
  if (target.guardMitigation) {
    damage *= 1 - target.guardMitigation;
  }
  if (source?.damageDealtPenalty) {
    damage *= 1 - source.damageDealtPenalty;
  }
  if (damage <= 0) {
    damage = 0;
  }

  if (damage > 0 && !context.ignoreDefense) {
    const damageType = inferDamageType(source, context);
    const baseDefense = damageType === 'magic'
      ? target.stats.magicDefense || target.stats.spellPower || 0
      : target.stats.defense || 0;
    const bonusDefense = damageType === 'magic' ? target.magicDefenseBonus || 0 : target.defenseBonus || 0;
    const effectiveDefense = Math.max(0, baseDefense + bonusDefense);
    const divisor = 1 + effectiveDefense * DEFENSE_DIVISOR_FACTOR;
    damage = damage / divisor;
    if (damage > 0) {
      damage = Math.max(MINIMUM_DAMAGE_AFTER_DEFENSE, damage);
    }
  }

  let remainingDamage = damage;
  let absorbedByShield = 0;
  if (remainingDamage > 0) {
    absorbedByShield = absorbShieldDamage(target, remainingDamage);
    remainingDamage -= absorbedByShield;
  }

  const shredShield = () => {
    if (!source || !source.shieldShredOnHit) {
      return 0;
    }
    const ratio = Math.max(0, Math.min(0.95, source.shieldShredOnHit));
    if (ratio <= 0) {
      return 0;
    }
    const currentShield = target.shield || 0;
    if (currentShield <= 0) {
      return 0;
    }
    const removed = absorbShieldDamage(target, currentShield * ratio);
    if (removed > 0 && events) {
      events.push({
        kind: 'shield',
        timestamp,
        attackerId: source?.id,
        targetIds: [target.id],
        amount: Math.round(removed),
        remainingHealth: target.health,
        positionUpdates: context.positions,
        description: `${source?.name || '공격자'}가 ${target.name}의 보호막을 약화시켰다`,
      });
    }
    return removed;
  };

  if (remainingDamage <= 0) {
    shredShield();
    events.push({
      kind: 'shield',
      timestamp,
      attackerId: source?.id,
      targetIds: [target.id],
      amount: Math.round(absorbedByShield || damage),
      remainingHealth: target.health,
      positionUpdates: context.positions,
      description: `${target.name}의 보호막이 공격을 막아냈다`,
    });
    return 0;
  }

  target.health = Math.max(0, target.health - remainingDamage);

  if (source && source.traitEffects.lifesteal > 0) {
    const heal = remainingDamage * source.traitEffects.lifesteal;
    source.health = Math.min(source.maxHealth, source.health + heal);
  }

  shredShield();

  events.push({
    kind: 'attack',
    timestamp,
    attackerId: source?.id,
    targetIds: [target.id],
    amount: Math.round(remainingDamage),
    remainingHealth: target.health,
    positionUpdates: context.positions,
    description: `${source?.name || '적'}이 ${target.name}에게 ${Math.round(remainingDamage)} 피해`,
  });

  if (target.health <= 0) {
    log.push({
      round: events.length,
      actor: target.name,
      action: '쓰러짐',
      value: 0,
    });
  }

  return remainingDamage;
}

function applyHeal(target, amount, source, events, timestamp, context = {}, description = null) {
  if (!target) {
    return 0;
  }
  const multiplier = target.healingReceivedMultiplier != null ? target.healingReceivedMultiplier : 1;
  const adjustedAmount = amount * multiplier;
  const heal = Math.round(adjustedAmount);
  const previous = target.health;
  target.health = Math.min(target.maxHealth, target.health + heal);
  const actualHeal = target.health - previous;
  if (actualHeal <= 0) {
    return 0;
  }
  events.push({
    kind: 'heal',
    timestamp,
    attackerId: source?.id,
    targetIds: [target.id],
    amount: actualHeal,
    remainingHealth: target.health,
    positionUpdates: context.positions,
    description: description || `${source?.name || '지원가'}가 ${target.name}을 치유 (${actualHeal})`,
  });
  return actualHeal;
}

function emitAreaIndicator(events, timestamp, actor, center, radius, options = {}) {
  if (!events || !actor || !center) {
    return;
  }
  const resolvedRadius = Number(radius);
  if (!Number.isFinite(resolvedRadius) || resolvedRadius <= 0) {
    return;
  }
  const cx = Number(center.x);
  const cy = Number(center.y);
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
    return;
  }
  events.push({
    kind: 'area',
    timestamp,
    attackerId: actor.id,
    area: {
      x: cx,
      y: cy,
      radius: resolvedRadius,
      color:
        options.color ||
        (actor.side === 'allies' ? 'rgba(142, 210, 255, 0.9)' : 'rgba(255, 164, 142, 0.9)'),
      duration: options.duration || 0.8,
      type: options.type || 'circle',
    },
  });
}

function selectHealableTarget(actor, friends, reach) {
  if (!actor || !Array.isArray(friends) || !friends.length) {
    return null;
  }
  const candidates = friends
    .filter((ally) => ally && ally.health > 0)
    .map((ally) => ({
      ally,
      ratio: ally.maxHealth ? ally.health / ally.maxHealth : 1,
      dist: distance(actor, ally),
    }))
    .filter((entry) => entry.dist <= reach + 12 || entry.ally.id === actor.id);

  const pool = candidates.length
    ? candidates
    : friends
        .filter((ally) => ally && ally.health > 0)
        .map((ally) => ({
          ally,
          ratio: ally.maxHealth ? ally.health / ally.maxHealth : 1,
          dist: distance(actor, ally),
        }));

  if (!pool.length) {
    return null;
  }

  pool.sort((a, b) => {
    if (a.ratio !== b.ratio) {
      return a.ratio - b.ratio;
    }
    return a.dist - b.dist;
  });

  return pool[0].ally || null;
}

function attemptAttack(actor, opponents, friends, log, events, timestamp) {
  if (!actor || actor.attackTimer > 0 || actor.health <= 0) {
    return false;
  }

  const reach = actor.role === 'frontline'
    ? actor.behavior.engageRange || 60
    : (actor.stats.range || 180) + actor.rangeBonus;

  if (actor.jobId === 'healer') {
    const healTarget = selectHealableTarget(actor, friends, reach);
    if (!healTarget) {
      return false;
    }
    const spellPower = effectiveSpellPower(actor);
    const healAmount = Math.max(35, spellPower * 0.85);
    const positions = {
      [actor.id]: { x: actor.x, y: actor.y },
      [healTarget.id]: { x: healTarget.x, y: healTarget.y },
    };
    applyHeal(healTarget, healAmount, actor, events, timestamp, { positions });
    sootheAllyDebuffs(healTarget, 1.4);
    const intervalBase = Math.max(0.45, actor.stats.attackInterval + actor.attackIntervalBonus);
    actor.lastAttackInterval = intervalBase;
    actor.attackTimer = intervalBase;
    return true;
  }

  const target = nearestTarget(actor, opponents);
  if (!target || target.health <= 0) {
    return false;
  }
  const dist = distance(actor, target);
  if (dist > reach) {
    return false;
  }

  const positions = {
    [actor.id]: { x: actor.x, y: actor.y },
    [target.id]: { x: target.x, y: target.y },
  };
  const isWarlock = actor.jobId === 'warlock';
  const isConsecrator = actor.jobId === 'consecrator';
  const usesMagic = actor.jobId === 'mage' || isWarlock;

  if (isWarlock) {
    const spellPower = effectiveSpellPower(actor);
    const baseDamage = spellPower * 0.85 + (actor.attackBonus || 0) * 0.35;
    applyDamage(target, baseDamage, actor, log, events, timestamp, {
      positions,
      damageType: 'magic',
    });
    const penalty = Math.min(0.28, 0.1 + spellPower * 0.00055);
    const weakness = Math.min(0.32, 0.12 + spellPower * 0.00065);
    const duration = Math.min(6, 3.2 + spellPower * 0.008);
    inflictDebuff(
      target,
      {
        duration,
        damageTakenBonus: weakness,
        damageDealtPenalty: penalty,
      },
      { events, timestamp, source: actor, effectType: 'hex' }
    );
  } else {
    const baseStat = usesMagic ? effectiveSpellPower(actor) : actor.stats.attack;
    let damage = baseStat + actor.attackBonus;
    const variance = 0.85 + Math.random() * 0.3;
    damage *= variance;
    if (Math.random() < actor.traitEffects.criticalChance) {
      damage *= actor.traitEffects.criticalMultiplier;
    }
    if (actor.rampStacks && actor.traitEffects.rampingAttackSpeed) {
      damage *= 1 + actor.rampStacks * 0.05;
    }
    const dealt = applyDamage(target, damage, actor, log, events, timestamp, {
      positions,
      damageType: usesMagic ? 'magic' : 'physical',
    });
    if (isConsecrator && dealt > 0) {
      friends.forEach((ally) => {
        if (ally && ally.health > 0) {
          sanctifyAllyDebuffs(ally, 0.6);
        }
      });
    }
  }

  const intervalBase = Math.max(0.4, actor.stats.attackInterval + actor.attackIntervalBonus);
  if (actor.traitEffects.rampingAttackSpeed) {
    actor.rampStacks += actor.traitEffects.rampingAttackSpeed;
  }
  actor.lastAttackInterval = Math.max(0.35, intervalBase - actor.rampStacks * 0.05);
  actor.attackTimer = actor.lastAttackInterval;
  return true;
}

function consumeMana(actor, amount) {
  if (actor.mana < amount) {
    return false;
  }
  actor.mana -= amount;
  return true;
}

function trySkill(actor, allies, enemies, log, events, timestamp) {
  const skill = actor.skill;
  if (!skill || actor.skillTimer > 0 || actor.health <= 0) {
    return false;
  }
  const effect = skill.effect || {};
  const spellScaler = createSpellPowerScaler(actor, skill);
  let used = false;
  const targetEnemy = nearestTarget(actor, enemies);
  const targetAlly = allies
    .filter((ally) => ally.health > 0 && ally.health < ally.maxHealth)
    .sort((a, b) => a.health / a.maxHealth - b.health / b.maxHealth)[0];
  const allyTeam = allies.filter((ally) => ally.health > 0);
  const enemyTeam = enemies.filter((enemy) => enemy.health > 0);

  switch (effect.kind) {
    case 'self-buff': {
      const buff = {
        duration: effect.duration || 5,
        attackIntervalModifier: effect.stat === 'attackInterval' ? effect.modifier || -0.2 : 0,
        attackBonus: effect.stat === 'attack' ? effect.modifier || 12 : 0,
      };
      const effectType = effect.stat === 'attackInterval' ? 'haste' : effect.stat === 'attack' ? 'fury' : 'buff';
      grantBuff(actor, buff, { events, timestamp, source: actor, effectType });
      used = true;
      break;
    }
    case 'cleave':
      if (!targetEnemy) break;
      const cleaveCenter = resolveAreaCenter(actor, targetEnemy);
      emitAreaIndicator(events, timestamp, actor, cleaveCenter, effect.radius || 80, {
        color: 'rgba(255, 214, 132, 0.95)',
      });
      enemyTeam.forEach((enemy) => {
        if (distance(cleaveCenter, enemy) <= (effect.radius || 80)) {
          const damage = (actor.stats.attack + actor.attackBonus) * (effect.damageMultiplier || 1.2);
          applyDamage(enemy, damage, actor, log, events, timestamp, {
            positions: {
              [actor.id]: { x: actor.x, y: actor.y },
              [enemy.id]: { x: enemy.x, y: enemy.y },
            },
          });
        }
      });
      used = true;
      break;
    case 'dash-flurry':
      if (!targetEnemy) break;
      {
        const hits = Math.max(1, Math.round(effect.hits || 2));
        const baseMultiplier = effect.damageMultiplier || 0.8;
        const ramp = effect.ramp || 0;
        for (let i = 0; i < hits; i += 1) {
          const stepMultiplier = baseMultiplier * (1 + ramp * i);
          const damage = (actor.stats.attack + actor.attackBonus) * stepMultiplier;
          applyDamage(targetEnemy, damage, actor, log, events, timestamp, {
            positions: {
              [actor.id]: { x: actor.x, y: actor.y },
              [targetEnemy.id]: { x: targetEnemy.x, y: targetEnemy.y },
            },
          });
        }
        if (effect.shield) {
          grantShield(actor, spellScaler.shield(effect.shield), {
            source: actor,
            events,
            timestamp,
            effectType: 'shield',
          });
        }
        if (effect.damageTakenBonus) {
          inflictDebuff(
            targetEnemy,
            {
              duration: effect.slowDuration || 2.4,
              damageTakenBonus: effect.damageTakenBonus,
            },
            { events, timestamp, source: actor, effectType: 'exposed' }
          );
        }
        if (effect.slow) {
          inflictDebuff(
            targetEnemy,
            {
              duration: effect.slowDuration || 2.4,
              slowMultiplier: 1 - effect.slow,
            },
            { events, timestamp, source: actor, effectType: 'slow' }
          );
        }
      }
      used = true;
      break;
    case 'counter':
      if (effect.shield || effect.shield === 0) {
        grantShield(actor, spellScaler.shield(effect.shield || 150), {
          source: actor,
          events,
          timestamp,
          effectType: 'shield',
        });
      }
      grantBuff(
        actor,
        {
          duration: effect.duration || 4,
          attackBonus: (effect.damageMultiplier || 1.4) * 12,
        },
        { events, timestamp, source: actor, effectType: 'fury' }
      );
      used = true;
      break;
    case 'shield':
      emitAreaIndicator(events, timestamp, actor, actor, effect.radius || 120, {
        color: 'rgba(124, 198, 255, 0.9)',
        duration: 1.1,
      });
      allyTeam.forEach((ally) => {
        if (distance(actor, ally) <= (effect.radius || 120)) {
          if (effect.shieldValue) {
            grantShield(ally, spellScaler.shield(effect.shieldValue || 180), {
              source: actor,
              events,
              timestamp,
              effectType: 'ward',
            });
          }
          const buff = {
            duration: effect.duration || 6,
          };
          if (effect.defenseBonus) {
            buff.defenseBonus = effect.defenseBonus;
          }
          const effectType = effect.defenseBonus ? 'fortify' : 'ward';
          grantBuff(ally, buff, { events, timestamp, source: actor, effectType });
        }
      });
      used = true;
      break;
    case 'stun-strike':
      if (!targetEnemy) break;
      applyDamage(targetEnemy, (actor.stats.attack + actor.attackBonus) * (effect.damageMultiplier || 1.3), actor, log, events, timestamp);
      inflictDebuff(
        targetEnemy,
        { duration: effect.stunDuration || 2, slowMultiplier: 0.1 },
        { events, timestamp, source: actor, effectType: 'stun' }
      );
      used = true;
      break;
    case 'guard':
      allyTeam.forEach((ally) => {
        if (ally.id !== actor.id) {
          grantBuff(
            ally,
            { duration: effect.duration || 6, guardRedirect: effect.redirectPercent || 0.3 },
            { events, timestamp, source: actor, effectType: 'ward' }
          );
        }
      });
      used = true;
      break;
    case 'ground-slam':
      if (!targetEnemy) break;
      emitAreaIndicator(events, timestamp, actor, actor, effect.radius || 110, {
        color: 'rgba(255, 190, 126, 0.95)',
      });
      enemyTeam.forEach((enemy) => {
        if (distance(actor, enemy) <= (effect.radius || 110)) {
          applyDamage(enemy, (actor.stats.attack + actor.attackBonus) * (effect.damageMultiplier || 1.1), actor, log, events, timestamp);
          inflictDebuff(
            enemy,
            { duration: 3, slowMultiplier: 1 - (effect.slow || 0.3) },
            { events, timestamp, source: actor, effectType: 'slow' }
          );
        }
      });
      used = true;
      break;
    case 'ward-pulse':
      {
        const radius = effect.radius || 140;
        emitAreaIndicator(events, timestamp, actor, actor, radius, {
          color: 'rgba(172, 216, 255, 0.95)',
          duration: 1.2,
        });
        allyTeam.forEach((ally) => {
          if (distance(actor, ally) <= radius) {
            if (effect.shieldValue) {
              grantShield(ally, spellScaler.shield(effect.shieldValue), {
                source: actor,
                events,
                timestamp,
                effectType: 'ward',
              });
            }
            const buff = { duration: effect.duration || 6 };
            if (effect.defenseBonus) {
              buff.defenseBonus = effect.defenseBonus;
            }
            if (effect.attackBonus) {
              buff.attackBonus = effect.attackBonus;
            }
            const buffType = effect.attackBonus && effect.defenseBonus
              ? 'valor'
              : effect.attackBonus
              ? 'fury'
              : 'fortify';
            grantBuff(ally, buff, { events, timestamp, source: actor, effectType: buffType });
            sanctifyAllyDebuffs(ally, 0.8);
          }
        });
        enemyTeam.forEach((enemy) => {
          if (distance(actor, enemy) <= radius) {
            const damage = (actor.stats.attack + actor.attackBonus) * (effect.damageMultiplier || 0.6);
            applyDamage(enemy, damage, actor, log, events, timestamp);
            if (effect.slow) {
              inflictDebuff(
                enemy,
                {
                  duration: effect.slowDuration || 2.4,
                  slowMultiplier: 1 - effect.slow,
                },
                { events, timestamp, source: actor, effectType: 'slow' }
              );
            }
          }
        });
      }
      used = true;
      break;
    case 'rampage':
      const healthRatio = actor.health / actor.maxHealth;
      if (healthRatio <= (effect.threshold || 0.5)) {
        grantBuff(
          actor,
          { duration: 8, attackBonus: effect.attackBonus || 24 },
          { events, timestamp, source: actor, effectType: 'fury' }
        );
        used = true;
      }
      break;
    case 'warcry':
      allyTeam.forEach((ally) => {
        const heal = ally.maxHealth * (effect.healPercent || 0.1);
        applyHeal(ally, heal, actor, events, timestamp, {}, `${actor.name}의 포효`);
      });
      used = true;
      break;
    case 'burst-shot':
      if (!targetEnemy) break;
      for (let i = 0; i < (effect.shots || 3); i += 1) {
        applyDamage(targetEnemy, actor.stats.attack * (effect.damageMultiplier || 0.85), actor, log, events, timestamp);
      }
      used = true;
      break;
    case 'seismic-shock':
      if (!targetEnemy) break;
      {
        const mainDamage = (actor.stats.attack + actor.attackBonus) * (effect.damageMultiplier || 1.3);
        applyDamage(targetEnemy, mainDamage, actor, log, events, timestamp);
        if (effect.stunDuration) {
          inflictDebuff(
            targetEnemy,
            { duration: effect.stunDuration, slowMultiplier: 0.05 },
            { events, timestamp, source: actor, effectType: 'stun' }
          );
        }
        if (effect.damageTakenBonus) {
          inflictDebuff(
            targetEnemy,
            { duration: 3, damageTakenBonus: effect.damageTakenBonus },
            { events, timestamp, source: actor, effectType: 'exposed' }
          );
        }
        enemyTeam.forEach((enemy) => {
          if (enemy.id === targetEnemy.id) {
            return;
          }
          if (distance(targetEnemy, enemy) <= (effect.radius || 110)) {
            const splash = mainDamage * (effect.splashMultiplier || 0.5);
            applyDamage(enemy, splash, actor, log, events, timestamp);
          }
        });
      }
      used = true;
      break;
    case 'line-shot':
      if (!targetEnemy) break;
      const sortedEnemies = enemyTeam
        .slice()
        .sort((a, b) => Math.abs(actor.y - a.y) - Math.abs(actor.y - b.y))
        .slice(0, 3);
      sortedEnemies.forEach((enemy) => {
        applyDamage(enemy, actor.stats.attack * (effect.damageMultiplier || 0.8), actor, log, events, timestamp);
      });
      used = true;
      break;
    case 'seeker-barrage':
      if (!enemyTeam.length) break;
      {
        const limit = Math.min(enemyTeam.length, Math.max(1, Math.round(effect.targets || 3)));
        const ordered = enemyTeam
          .slice()
          .sort((a, b) => a.health - b.health)
          .slice(0, limit);
        ordered.forEach((enemy, index) => {
          const ramp = effect.ramp || 0;
          const damage = (actor.stats.attack + actor.attackBonus) * (effect.damageMultiplier || 0.85) * (1 + ramp * index);
          applyDamage(enemy, damage, actor, log, events, timestamp);
          if (effect.slow) {
            inflictDebuff(
              enemy,
              {
                duration: 1.6 + index * 0.4,
                slowMultiplier: Math.max(0.1, 1 - effect.slow),
              },
              { events, timestamp, source: actor, effectType: 'slow' }
            );
          }
          if (effect.pierce) {
            const extra = enemyTeam.find((candidate) => candidate.id !== enemy.id && candidate.health > 0);
            if (extra) {
              applyDamage(extra, damage * effect.pierce, actor, log, events, timestamp);
            }
          }
        });
      }
      used = true;
      break;
    case 'precision':
      grantBuff(
        actor,
        {
          duration: effect.duration || 6,
          rangeBonus: effect.rangeBonus || 30,
          attackIntervalModifier: -(effect.critBonus || 0) * 0.2,
        },
        { events, timestamp, source: actor, effectType: 'focus' }
      );
      actor.traitEffects.criticalChance += effect.critBonus || 0.2;
      used = true;
      break;
    case 'aoe-spell':
      {
        const areaCenter = resolveAreaCenter(actor, targetEnemy);
        const radius = effect.radius || 120;
        emitAreaIndicator(events, timestamp, actor, areaCenter, radius, {
          color: 'rgba(204, 170, 255, 0.95)',
        });
        enemyTeam.forEach((enemy) => {
          if (distance(areaCenter, enemy) <= radius) {
            const baseDamage = effectiveSpellPower(actor) * (effect.damageMultiplier || 1.2);
            const damage = spellScaler.damage(baseDamage);
            applyDamage(enemy, damage, actor, log, events, timestamp, { damageType: 'magic' });
          }
        });
      }
      used = true;
      break;
    case 'slow-field':
      {
        const fieldCenter = resolveAreaCenter(actor, targetEnemy);
        const radius = effect.radius || 150;
        const duration = Math.max(1, spellScaler.duration(effect.duration || 4));
        const slowAmount = Math.max(0.05, Math.min(0.9, spellScaler.effect(effect.slow || 0.4)));
        emitAreaIndicator(events, timestamp, actor, fieldCenter, radius, {
          color: 'rgba(162, 208, 255, 0.9)',
          duration: 1.2,
        });
        enemyTeam.forEach((enemy) => {
          if (distance(fieldCenter, enemy) <= radius) {
            inflictDebuff(
              enemy,
              { duration, slowMultiplier: Math.max(0.1, 1 - slowAmount) },
              { events, timestamp, source: actor, effectType: 'slow' }
            );
          }
        });
      }
      used = true;
      break;
    case 'mana-burst':
      if (!consumeMana(actor, effect.manaCost || 40)) break;
      {
        const burstCenter = resolveAreaCenter(actor, targetEnemy);
        const radius = effect.radius || 110;
        emitAreaIndicator(events, timestamp, actor, burstCenter, radius, {
          color: 'rgba(180, 156, 255, 0.95)',
        });
        enemyTeam.forEach((enemy) => {
          if (distance(burstCenter, enemy) <= radius) {
            const baseDamage = (effect.damagePerMana || 1) * (effect.manaCost || 40);
            const damage = spellScaler.damage(baseDamage);
            applyDamage(enemy, damage, actor, log, events, timestamp, { damageType: 'magic' });
          }
        });
      }
      used = true;
      break;
    case 'arcane-cascade':
      if (!enemyTeam.length) break;
      {
        const pulses = Math.max(1, Math.round(effect.pulses || 3));
        const slowAmount = effect.slow
          ? Math.max(0.05, Math.min(0.9, spellScaler.effect(effect.slow)))
          : null;
        const exposureBonus = effect.damageTakenBonus
          ? Math.min(0.5, spellScaler.effect(effect.damageTakenBonus))
          : null;
        const manaGift = effect.manaGift ? Math.max(0, spellScaler.mana(effect.manaGift)) : null;
        for (let i = 0; i < pulses; i += 1) {
          const target = enemyTeam[i % enemyTeam.length];
          if (!target || target.health <= 0) {
            continue;
          }
          const baseDamage = effectiveSpellPower(actor) * (effect.damageMultiplier || 1.05);
          const damage = spellScaler.damage(baseDamage);
          applyDamage(target, damage, actor, log, events, timestamp, { damageType: 'magic' });
          if (slowAmount) {
            inflictDebuff(
              target,
              {
                duration: Math.max(1.6, spellScaler.duration(1.8)),
                slowMultiplier: Math.max(0.1, 1 - slowAmount),
              },
              { events, timestamp, source: actor, effectType: 'slow' }
            );
          }
          if (exposureBonus) {
            inflictDebuff(
              target,
              {
                duration: Math.max(2, spellScaler.duration(2.5)),
                damageTakenBonus: exposureBonus,
              },
              { events, timestamp, source: actor, effectType: 'exposed' }
            );
          }
        }
        if (manaGift) {
          allyTeam.forEach((ally) => {
            const current = ally.mana ?? 0;
            const max = ally.maxMana ?? current + manaGift;
            ally.mana = Math.min(max, current + manaGift);
          });
        }
      }
      used = true;
      break;
    case 'single-heal':
      if (!targetAlly) break;
      {
        const percentHeal = effect.maxHealthHealPercent
          ? (targetAlly.maxHealth || 0) * effect.maxHealthHealPercent
          : 0;
        const healed = percentHeal + spellScaler.heal(effect.healAmount || 260);
        applyHeal(targetAlly, healed, actor, events, timestamp);
      }
      if (effect.shieldValue) {
        grantShield(targetAlly, spellScaler.shield(effect.shieldValue), {
          source: actor,
          events,
          timestamp,
          effectType: 'ward',
        });
      }
      sootheAllyDebuffs(targetAlly, 1.8);
      used = true;
      break;
    case 'regen':
      if (!targetAlly) break;
      if (effect.maxHealthHealPercent) {
        const burst = (targetAlly.maxHealth || 0) * effect.maxHealthHealPercent;
        if (burst > 0) {
          applyHeal(targetAlly, burst, actor, events, timestamp);
        }
      }
      grantBuff(
        targetAlly,
        {
          duration: Math.max(2, spellScaler.duration(effect.duration || 6)),
          healPerSecond: spellScaler.heal(effect.tickHeal || 30),
        },
        { events, timestamp, source: actor, effectType: 'regen' }
      );
      if (effect.shieldValue) {
        grantShield(targetAlly, spellScaler.shield(effect.shieldValue), {
          source: actor,
          events,
          timestamp,
          effectType: 'ward',
        });
      }
      sootheAllyDebuffs(targetAlly, 1.2);
      used = true;
      break;
    case 'renewal-burst':
      {
        const primary = targetAlly || allyTeam.slice().sort((a, b) => a.health / a.maxHealth - b.health / b.maxHealth)[0];
        if (!primary) break;
        const healBase = (primary.maxHealth || 0) * (effect.primaryHealPercent || 0.18)
          + spellScaler.heal(effect.flatHeal || 0);
        applyHeal(primary, healBase, actor, events, timestamp);
        const primaryShield = effect.primaryShield ? spellScaler.shield(effect.primaryShield) : 0;
        if (primaryShield > 0) {
          grantShield(primary, primaryShield, {
            source: actor,
            events,
            timestamp,
            effectType: 'ward',
          });
        }
        sootheAllyDebuffs(primary, 1.5);
        const radius = effect.radius || 120;
        emitAreaIndicator(events, timestamp, actor, primary, radius, {
          color: 'rgba(146, 230, 196, 0.95)',
          duration: 1.1,
        });
        allyTeam.forEach((ally) => {
          if (distance(primary, ally) <= radius) {
            if (effect.allyHealPercent) {
              const burst = (ally.maxHealth || 0) * effect.allyHealPercent;
              if (burst > 0) {
                applyHeal(ally, burst, actor, events, timestamp);
              }
            }
            grantBuff(
              ally,
              {
                duration: Math.max(2.5, spellScaler.duration(effect.duration || 6)),
                healPerSecond: spellScaler.heal(effect.regen || 24),
              },
              { events, timestamp, source: actor, effectType: 'regen' }
            );
            if (effect.allyShield) {
              grantShield(ally, spellScaler.shield(effect.allyShield), {
                source: actor,
                events,
                timestamp,
                effectType: 'ward',
              });
            }
            sootheAllyDebuffs(ally, ally.id === primary.id ? 0 : 1.1);
          }
        });
      }
      used = true;
      break;
    case 'team-regen':
      allyTeam.forEach((ally) => {
        if (effect.maxHealthHealPercent) {
          const burst = (ally.maxHealth || 0) * effect.maxHealthHealPercent;
          if (burst > 0) {
            applyHeal(ally, burst, actor, events, timestamp);
          }
        }
        grantBuff(
          ally,
          {
            duration: Math.max(3, spellScaler.duration(effect.duration || 8)),
            healPerSecond: spellScaler.heal(effect.healPerSecond || 15),
            manaPerSecond: spellScaler.mana(effect.manaPerSecond || 4),
          },
          { events, timestamp, source: actor, effectType: 'regen' }
        );
        if (effect.shieldValue) {
          grantShield(ally, spellScaler.shield(effect.shieldValue), {
            source: actor,
            events,
            timestamp,
            effectType: 'ward',
          });
        }
        sootheAllyDebuffs(ally, 0.9);
      });
      used = true;
      break;
    case 'smite-buff':
      if (targetEnemy) {
        const baseDamage = effectiveSpellPower(actor) * (effect.damageMultiplier || 1.1);
        const damage = spellScaler.damage(baseDamage);
        applyDamage(targetEnemy, damage, actor, log, events, timestamp, { damageType: 'magic' });
      }
      const attackBonus = Math.round(spellScaler.effect(effect.attackBonus || 16));
      const spellPowerBonus = effect.spellPowerBonus
        ? Math.round(spellScaler.effect(effect.spellPowerBonus))
        : 0;
      allyTeam.forEach((ally) => {
        grantBuff(
          ally,
          {
            duration: Math.max(3, spellScaler.duration(effect.duration || 6)),
            attackBonus,
            ...(spellPowerBonus ? { spellPowerBonus } : {}),
          },
          { events, timestamp, source: actor, effectType: 'fury' }
        );
        if (effect.shieldValue) {
          grantShield(ally, spellScaler.shield(effect.shieldValue), {
            source: actor,
            events,
            timestamp,
            effectType: 'ward',
          });
        }
        sanctifyAllyDebuffs(ally, 0.8);
      });
      used = true;
      break;
    case 'fortify':
      allyTeam.forEach((ally) => {
        const defenseBonus = Math.round(spellScaler.effect(effect.defenseBonus || 20));
        const magicDefenseBonus = effect.magicDefenseBonus
          ? Math.round(spellScaler.effect(effect.magicDefenseBonus))
          : 0;
        const spellPowerBonus = effect.spellPowerBonus
          ? Math.round(spellScaler.effect(effect.spellPowerBonus))
          : 0;
        const buff = {
          duration: Math.max(3.5, spellScaler.duration(effect.duration || 8)),
          defenseBonus,
        };
        if (magicDefenseBonus > 0) {
          buff.magicDefenseBonus = magicDefenseBonus;
        }
        if (spellPowerBonus > 0) {
          buff.spellPowerBonus = spellPowerBonus;
        }
        grantBuff(ally, buff, { events, timestamp, source: actor, effectType: 'fortify' });
        if (effect.shieldValue) {
          grantShield(ally, spellScaler.shield(effect.shieldValue), {
            source: actor,
            events,
            timestamp,
            effectType: 'ward',
          });
        }
        sanctifyAllyDebuffs(ally, 0.9);
      });
      used = true;
      break;
    case 'chain-buff':
      allyTeam
        .slice()
        .sort((a, b) => (a.role === 'frontline' ? -1 : 1) - (b.role === 'frontline' ? -1 : 1))
        .slice(0, effect.targets || 3)
        .forEach((ally) => {
          const attackBonus = Math.round(spellScaler.effect(effect.attackBonus || 12));
          const defenseBonus = Math.round(spellScaler.effect(effect.defenseBonus || 10));
          const magicDefenseBonus = effect.magicDefenseBonus
            ? Math.round(spellScaler.effect(effect.magicDefenseBonus))
            : 0;
          const spellPowerBonus = effect.spellPowerBonus
            ? Math.round(spellScaler.effect(effect.spellPowerBonus))
            : 0;
          const buff = {
            duration: Math.max(3, spellScaler.duration(effect.duration || 6)),
            attackBonus,
            defenseBonus,
          };
          if (magicDefenseBonus > 0) {
            buff.magicDefenseBonus = magicDefenseBonus;
          }
          if (spellPowerBonus > 0) {
            buff.spellPowerBonus = spellPowerBonus;
          }
          grantBuff(ally, buff, { events, timestamp, source: actor, effectType: 'valor' });
          if (effect.shieldValue) {
            grantShield(ally, spellScaler.shield(effect.shieldValue), {
              source: actor,
              events,
              timestamp,
              effectType: 'ward',
            });
          }
          sanctifyAllyDebuffs(ally, 0.8);
        });
      used = true;
      break;
    case 'sanctify-wave':
      allyTeam.forEach((ally) => {
        const shieldValue = effect.shieldValue ? spellScaler.shield(effect.shieldValue) : 0;
        if (shieldValue > 0) {
          grantShield(ally, shieldValue, {
            source: actor,
            events,
            timestamp,
            effectType: 'ward',
          });
        }
        const attackBonus = effect.attackBonus ? Math.round(spellScaler.effect(effect.attackBonus)) : 0;
        const spellPowerBonus = effect.spellPowerBonus
          ? Math.round(spellScaler.effect(effect.spellPowerBonus))
          : 0;
        const defenseBonus = effect.defenseBonus ? Math.round(spellScaler.effect(effect.defenseBonus)) : 0;
        const magicDefenseBonus = effect.magicDefenseBonus
          ? Math.round(spellScaler.effect(effect.magicDefenseBonus))
          : 0;
        const manaPerSecond = effect.manaPerSecond ? spellScaler.mana(effect.manaPerSecond) : 0;
        const buff = { duration: Math.max(3, spellScaler.duration(effect.duration || 6)) };
        if (attackBonus) {
          buff.attackBonus = attackBonus;
        }
        if (spellPowerBonus) {
          buff.spellPowerBonus = spellPowerBonus;
        }
        if (defenseBonus) {
          buff.defenseBonus = defenseBonus;
        }
        if (magicDefenseBonus) {
          buff.magicDefenseBonus = magicDefenseBonus;
        }
        if (manaPerSecond) {
          buff.manaPerSecond = manaPerSecond;
        }
        const auraType = (attackBonus || spellPowerBonus) && (defenseBonus || magicDefenseBonus)
          ? 'valor'
          : attackBonus || spellPowerBonus
          ? 'fury'
          : (defenseBonus || magicDefenseBonus)
          ? 'fortify'
          : manaPerSecond
          ? 'focus'
          : 'buff';
        grantBuff(ally, buff, { events, timestamp, source: actor, effectType: auraType });
        sanctifyAllyDebuffs(ally, 1.1);
      });
      used = true;
      break;
    case 'curse':
      if (!targetEnemy) break;
      {
        const duration = Math.max(2.4, spellScaler.duration(effect.duration || 7));
        const damageTaken = Math.min(0.5, spellScaler.effect(effect.damageTakenBonus || 0.15));
        const damagePenalty = Math.min(0.4, spellScaler.effect(effect.damageDealtPenalty || 0.1));
        const healCut = effect.healReduction ? Math.min(0.9, spellScaler.effect(effect.healReduction)) : 0;
        const wardCut = effect.shieldReduction ? Math.min(0.9, spellScaler.effect(effect.shieldReduction)) : 0;
        const debuff = {
          duration,
          damageTakenBonus: damageTaken,
          damageDealtPenalty: damagePenalty,
        };
        if (healCut > 0) {
          debuff.healReduction = healCut;
        }
        if (wardCut > 0) {
          debuff.shieldReduction = wardCut;
        }
        const statusType = healCut > 0 ? 'healcut' : wardCut > 0 ? 'wardbreak' : 'curse';
        inflictDebuff(targetEnemy, debuff, { events, timestamp, source: actor, effectType: statusType });
      }
      used = true;
      break;
    case 'drain':
      if (!targetEnemy) break;
      const baseDrain = effect.damage || effectiveSpellPower(actor);
      const drainDamage = spellScaler.damage(baseDrain);
      const dealt = applyDamage(targetEnemy, drainDamage, actor, log, events, timestamp, { damageType: 'magic' });
      const healRatio = Math.min(1.2, spellScaler.effect(effect.healRatio || 0.6));
      actor.health = Math.min(actor.maxHealth, actor.health + dealt * healRatio);
      const manaGain = spellScaler.mana(effect.manaGain || 20);
      actor.mana = Math.min(actor.maxMana, actor.mana + manaGain);
      if (effect.healReduction || effect.shieldReduction) {
        const debuffDuration = Math.max(2, spellScaler.duration(effect.debuffDuration || effect.duration || 4));
        const healCut = effect.healReduction ? Math.min(0.9, spellScaler.effect(effect.healReduction)) : 0;
        const wardCut = effect.shieldReduction ? Math.min(0.9, spellScaler.effect(effect.shieldReduction)) : 0;
        if (healCut > 0 || wardCut > 0) {
          const debuff = { duration: debuffDuration };
          if (healCut > 0) {
            debuff.healReduction = healCut;
          }
          if (wardCut > 0) {
            debuff.shieldReduction = wardCut;
          }
          const statusType = healCut > 0 ? 'healcut' : 'wardbreak';
          inflictDebuff(targetEnemy, debuff, { events, timestamp, source: actor, effectType: statusType });
        }
      }
      used = true;
      break;
    case 'damage-over-time':
      {
        const dotCenter = resolveAreaCenter(actor, targetEnemy);
        emitAreaIndicator(events, timestamp, actor, dotCenter, effect.radius || 120, {
          color: 'rgba(226, 158, 255, 0.9)',
          duration: 1.4,
        });
        enemyTeam.forEach((enemy) => {
          if (distance(dotCenter, enemy) <= (effect.radius || 120)) {
            const duration = Math.max(3, spellScaler.duration(effect.duration || 6));
            const tickDamage = spellScaler.damage(effect.tickDamage || 24);
            const healCut = effect.healReduction ? Math.min(0.9, spellScaler.effect(effect.healReduction)) : 0;
            const wardCut = effect.shieldReduction ? Math.min(0.9, spellScaler.effect(effect.shieldReduction)) : 0;
            const debuff = { duration, tickDamage };
            if (healCut > 0) {
              debuff.healReduction = healCut;
            }
            if (wardCut > 0) {
              debuff.shieldReduction = wardCut;
            }
            const statusType = healCut > 0 ? 'healcut' : wardCut > 0 ? 'wardbreak' : 'burn';
            inflictDebuff(enemy, debuff, { events, timestamp, source: actor, effectType: statusType });
          }
        });
      }
      used = true;
      break;
    case 'void-collapse':
      if (!targetEnemy) break;
      {
        const baseDamage = effectiveSpellPower(actor) * (effect.damageMultiplier || 1.1);
        const primaryDamage = spellScaler.damage(baseDamage);
        const radius = effect.radius || 120;
        const dotDamage = effect.dotDamage ? spellScaler.damage(effect.dotDamage) : null;
        const dotDuration = effect.dotDuration ? Math.max(2.5, spellScaler.duration(effect.dotDuration || 4.5)) : null;
        const damageTakenBonus = effect.damageTakenBonus
          ? Math.min(0.6, spellScaler.effect(effect.damageTakenBonus))
          : null;
        const slowAmount = effect.slow ? Math.max(0.05, Math.min(0.9, spellScaler.effect(effect.slow))) : null;
        const manaBurn = effect.manaBurn ? Math.max(0, Math.round(spellScaler.mana(effect.manaBurn))) : null;
        const healCut = effect.healReduction ? Math.min(0.9, spellScaler.effect(effect.healReduction)) : 0;
        const wardCut = effect.shieldReduction ? Math.min(0.9, spellScaler.effect(effect.shieldReduction)) : 0;

        applyDamage(targetEnemy, primaryDamage, actor, log, events, timestamp, { damageType: 'magic' });
        if (dotDamage && dotDuration) {
          inflictDebuff(
            targetEnemy,
            {
              duration: dotDuration,
              tickDamage: dotDamage,
            },
            { events, timestamp, source: actor, effectType: 'void' }
          );
        }
        if (damageTakenBonus) {
          inflictDebuff(
            targetEnemy,
            {
              duration: dotDuration || Math.max(2.8, spellScaler.duration(effect.dotDuration || 4.5)),
              damageTakenBonus,
            },
            { events, timestamp, source: actor, effectType: 'exposed' }
          );
        }
        if (slowAmount) {
          inflictDebuff(
            targetEnemy,
            {
              duration: dotDuration || Math.max(2.8, spellScaler.duration(effect.dotDuration || 4.5)),
              slowMultiplier: Math.max(0.1, 1 - slowAmount),
            },
            { events, timestamp, source: actor, effectType: 'slow' }
          );
        }
        if (healCut > 0 || wardCut > 0) {
          const durationForCuts = dotDuration || Math.max(2.8, spellScaler.duration(effect.dotDuration || 4.5));
          const debuff = { duration: durationForCuts };
          if (healCut > 0) {
            debuff.healReduction = healCut;
          }
          if (wardCut > 0) {
            debuff.shieldReduction = wardCut;
          }
          const statusType = healCut > 0 ? 'healcut' : 'wardbreak';
          inflictDebuff(targetEnemy, debuff, { events, timestamp, source: actor, effectType: statusType });
        }
        if (manaBurn) {
          targetEnemy.mana = Math.max(0, (targetEnemy.mana || 0) - manaBurn);
        }
        enemyTeam.forEach((enemy) => {
          if (enemy.id === targetEnemy.id) {
            return;
          }
          if (distance(targetEnemy, enemy) <= radius) {
            applyDamage(enemy, primaryDamage * 0.6, actor, log, events, timestamp, { damageType: 'magic' });
            if (dotDamage && dotDuration) {
              inflictDebuff(
                enemy,
                {
                  duration: Math.max(2.5, dotDuration * 0.6),
                  tickDamage: dotDamage * 0.6,
                },
                { events, timestamp, source: actor, effectType: 'void' }
              );
            }
            if (slowAmount) {
              inflictDebuff(
                enemy,
                {
                  duration: Math.max(2, (dotDuration || Math.max(2.8, spellScaler.duration(effect.dotDuration || 4.5))) * 0.6),
                  slowMultiplier: Math.max(0.1, 1 - slowAmount * 0.8),
                },
                { events, timestamp, source: actor, effectType: 'slow' }
              );
            }
            if (healCut > 0 || wardCut > 0) {
              const durationForCuts = Math.max(2, (dotDuration || Math.max(2.8, spellScaler.duration(effect.dotDuration || 4.5))) * 0.6);
              const debuff = { duration: durationForCuts };
              if (healCut > 0) {
                debuff.healReduction = healCut;
              }
              if (wardCut > 0) {
                debuff.shieldReduction = wardCut;
              }
              const statusType = healCut > 0 ? 'healcut' : 'wardbreak';
              inflictDebuff(enemy, debuff, { events, timestamp, source: actor, effectType: statusType });
            }
            if (manaBurn) {
              enemy.mana = Math.max(0, (enemy.mana || 0) - manaBurn * 0.6);
            }
          }
        });
      }
      used = true;
      break;
    default:
      break;
  }

  if (used) {
    const skillCooldown = Math.max(0.5, skill?.cooldown || 0);
    const reduction = Math.min(0.7, Math.max(0, actor.cooldownReduction || 0));
    const variance = Math.random() * Math.max(0.4, skillCooldown * 0.2);
    const appliedCooldown = Math.max(0.4, skillCooldown * (1 - reduction) + variance);
    events.push({
      kind: 'ability',
      timestamp,
      attackerId: actor.id,
      targetIds: targetEnemy ? [targetEnemy.id] : [],
      amount: 0,
      description: `${actor.name}이(가) ${skill.name} 사용`,
      positionUpdates: {
        [actor.id]: { x: actor.x, y: actor.y },
      },
      cooldownDuration: appliedCooldown,
      baseCooldown: skillCooldown,
      skillName: skill.name,
    });
    log.push({
      round: events.length,
      actor: actor.name,
      action: `uses ${skill.name}`,
      value: 0,
    });
    actor.skillTimer = appliedCooldown;
  }
  return used;
}

function battlefieldBoundsFor(actor) {
  const horizontalPadding = FIELD_WIDTH * 0.04;
  const minX = horizontalPadding;
  const maxX = FIELD_WIDTH - horizontalPadding;
  const minY = FIELD_HEIGHT * 0.08;
  const maxY = FIELD_HEIGHT * 0.92;
  return { minX, maxX, minY, maxY };
}

function computeMovementIntent(actor, opponents, delta) {
  const bounds = battlefieldBoundsFor(actor);
  const target = nearestTarget(actor, opponents);
  if (!target) {
    return {
      x: clamp(actor.x, bounds.minX, bounds.maxX),
      y: clamp(actor.y, bounds.minY, bounds.maxY),
    };
  }

  const behavior = actor.behavior || { type: 'charger', engageRange: 60 };
  const moveSpeed = Math.max(0, (actor.stats.speed + actor.speedBonus) * PIXELS_PER_SPEED * delta);
  const dist = distance(actor, target);
  const towardTarget = target.x > actor.x ? 1 : -1;
  const attackReach =
    actor.role === 'frontline'
      ? Math.max(behavior.engageRange || 80, (actor.stats.range || 120) * 0.9)
      : (actor.stats.range || 200) + actor.rangeBonus;

  let nextX = actor.x;
  let nextY = actor.y;

  if (behavior.type === 'skirmisher') {
    const retreatRange = behavior.retreatRange || Math.max(attackReach * 0.55, 140);
    const preferredRange = behavior.preferredRange || attackReach * 0.9;
    if (dist < retreatRange) {
      const away = actor.side === 'allies' ? -1 : 1;
      nextX += away * moveSpeed;
    } else if (dist > preferredRange * 1.1) {
      nextX += towardTarget * moveSpeed * 0.6;
    }
    if (dist > attackReach * 1.25) {
      nextX += towardTarget * moveSpeed * 0.5;
    }
  } else if (behavior.type === 'support') {
    const retreatRange = behavior.retreatRange || Math.max(attackReach * 0.5, 140);
    if (dist < retreatRange) {
      const away = actor.side === 'allies' ? -1 : 1;
      nextX += away * moveSpeed;
    } else if (dist > attackReach * 1.1) {
      nextX += towardTarget * moveSpeed * 0.4;
    }
  } else {
    const engageRange = behavior.engageRange || Math.max(attackReach, 80);
    if (dist > engageRange * 0.7) {
      nextX += towardTarget * moveSpeed * (behavior.pursuitSpeed || 1.25);
    }
    if (dist > attackReach * 0.95) {
      nextX += towardTarget * moveSpeed * 0.6;
    }
  }

  const verticalGap = target.y - actor.y;
  if (Math.abs(verticalGap) > 2) {
    const verticalStep = Math.sign(verticalGap) * moveSpeed * (behavior.verticalPursuit || 0.7);
    if (Math.abs(verticalStep) >= Math.abs(verticalGap)) {
      nextY = target.y;
    } else {
      nextY += verticalStep;
    }
  }

  nextX = clamp(nextX, bounds.minX, bounds.maxX);
  nextY = clamp(nextY, bounds.minY, bounds.maxY);
  return { x: nextX, y: nextY };
}

function enforceMinimumSeparation(pendingPositions) {
  if (!Array.isArray(pendingPositions) || pendingPositions.length < 2) {
    return;
  }

  const MAX_ITERATIONS = 4;
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    let moved = false;

    for (let i = 0; i < pendingPositions.length; i += 1) {
      const a = pendingPositions[i];
      if (!a || a.actor.health <= 0) {
        continue;
      }
      for (let j = i + 1; j < pendingPositions.length; j += 1) {
        const b = pendingPositions[j];
        if (!b || b.actor.health <= 0) {
          continue;
        }

        const baseRadius = (a.actor.radius || 24) + (b.actor.radius || 24);
        const buffer = a.actor.side === b.actor.side ? 10 : 6;
        const requiredDistance = baseRadius + buffer;

        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distSquared = dx * dx + dy * dy;

        if (distSquared === 0) {
          const angle = (i * 7 + j * 3 + iteration) * 0.35;
          dx = Math.cos(angle) || 1;
          dy = Math.sin(angle);
          distSquared = dx * dx + dy * dy;
        }

        const dist = Math.sqrt(distSquared);
        if (dist < requiredDistance) {
          const overlap = requiredDistance - dist;
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          const adjustment = overlap * 0.5;
          a.x -= nx * adjustment;
          a.y -= ny * adjustment;
          b.x += nx * adjustment;
          b.y += ny * adjustment;
          moved = true;
        }
      }
    }

    pendingPositions.forEach((entry) => {
      const bounds = battlefieldBoundsFor(entry.actor);
      entry.x = clamp(entry.x, bounds.minX, bounds.maxX);
      entry.y = clamp(entry.y, bounds.minY, bounds.maxY);
    });

    if (!moved) {
      break;
    }
  }
}

function simulateBattle(allies, enemies) {
  let time = 0;
  const events = [];
  const log = [];
  const lastBroadcastPositions = new Map();
  let queuedMovement = {};
  let lastMovementEventTime = -MOVEMENT_EVENT_INTERVAL;

  [...allies, ...enemies].forEach((unit) => {
    lastBroadcastPositions.set(unit.id, { x: unit.x, y: unit.y });
  });

  while (time < MAX_TIME) {
    const livingAllies = livingUnits(allies);
    const livingEnemies = livingUnits(enemies);
    if (!livingAllies.length || !livingEnemies.length) {
      break;
    }

    const living = [...livingAllies, ...livingEnemies];
    const movementPlans = new Map();

    living.forEach((actor) => {
      const opponents = actor.side === 'allies' ? enemies : allies;
      const manaRegen = (actor.stats.manaRegen || 0) * actor.traitEffects.manaRegenMultiplier;
      actor.mana = Math.min(actor.maxMana, actor.mana + manaRegen * STEP_SECONDS);
      actor.health = Math.min(
        actor.maxHealth,
        actor.health + actor.maxHealth * actor.traitEffects.regenPercentPerSecond * STEP_SECONDS
      );

      updateEffects(actor, STEP_SECONDS);

      actor.attackTimer = Math.max(0, actor.attackTimer - STEP_SECONDS);
      actor.skillTimer = Math.max(0, actor.skillTimer - STEP_SECONDS);

      movementPlans.set(actor, computeMovementIntent(actor, opponents, STEP_SECONDS));
    });

    const pendingPositions = living.map((actor) => {
      const intent = movementPlans.get(actor);
      if (!intent) {
        return { actor, x: actor.x, y: actor.y };
      }
      return { actor, x: intent.x, y: intent.y };
    });

    enforceMinimumSeparation(pendingPositions);

    pendingPositions.forEach(({ actor, x, y }) => {
      actor.x = x;
      actor.y = y;
      actor.recentPositions.push({ x: actor.x, y: actor.y, t: time });
      if (actor.recentPositions.length > 8) {
        actor.recentPositions.shift();
      }

      const lastBroadcast = lastBroadcastPositions.get(actor.id) || { x: actor.x, y: actor.y };
      const dx = actor.x - lastBroadcast.x;
      const dy = actor.y - lastBroadcast.y;
      if (Math.sqrt(dx * dx + dy * dy) > 6) {
        queuedMovement[actor.id] = { x: actor.x, y: actor.y };
      }
    });

    if (
      Object.keys(queuedMovement).length > 0 &&
      time - lastMovementEventTime >= MOVEMENT_EVENT_INTERVAL
    ) {
      events.push({
        kind: 'move',
        timestamp: time,
        amount: 0,
        positionUpdates: queuedMovement,
      });
      Object.entries(queuedMovement).forEach(([unitId, pos]) => {
        lastBroadcastPositions.set(unitId, pos);
      });
      queuedMovement = {};
      lastMovementEventTime = time;
    }

    living.forEach((actor) => {
      if (actor.health <= 0) {
        return;
      }
      const opponents = actor.side === 'allies' ? enemies : allies;
      const friends = actor.side === 'allies' ? allies : enemies;
      const usedSkill = trySkill(actor, friends, opponents, log, events, time);
      if (!usedSkill) {
        attemptAttack(actor, opponents, friends, log, events, time);
      }
    });

    time += STEP_SECONDS;
  }

  if (Object.keys(queuedMovement).length > 0) {
    events.push({
      kind: 'move',
      timestamp: time,
      amount: 0,
      positionUpdates: queuedMovement,
    });
    Object.entries(queuedMovement).forEach(([unitId, pos]) => {
      lastBroadcastPositions.set(unitId, pos);
    });
  }

  const victorious = livingUnits(enemies).length === 0 && livingUnits(allies).length > 0;

  return {
    events,
    log,
    duration: time,
    allies,
    enemies,
    victorious,
  };
}

export function resolveCombat({ party, round = 1, placements = {}, encounter = null, augments = [] }) {
  const augmentEffects = evaluateAugments({ augments, party });
  const allies = gatherAllies(party, placements, augmentEffects);
  const enemyBlueprints = encounter?.enemies?.length
    ? encounter.enemies
    : generateEnemies(allies.length || 1, round);
  const enemies = enemyBlueprints.map((enemy) => cloneCombatant(enemy)).filter(Boolean);
  if (typeof augmentEffects.applyToEnemy === 'function') {
    enemies.forEach((enemy) => augmentEffects.applyToEnemy(enemy));
  }
  const background = encounter?.background || getBattleBackgroundForRound(round);
  const outcome = simulateBattle(allies, enemies);

  const fallenAllies = outcome.allies
    .filter((unit) => unit.health <= 0)
    .map((unit) => ({
      instanceId: unit.id,
      definitionId: unit.definitionId,
      name: unit.name,
    }));
  const survivingAllies = outcome.allies
    .filter((unit) => unit.health > 0)
    .map((unit) => ({
      instanceId: unit.id,
      definitionId: unit.definitionId,
      name: unit.name,
    }));

  return {
    victorious: outcome.victorious,
    rounds: outcome.events.filter((event) => event.kind !== 'move').length,
    log: outcome.log,
    events: outcome.events,
    combatants: {
      allies: outcome.allies,
      enemies: outcome.enemies,
    },
    field: {
      width: FIELD_WIDTH,
      height: FIELD_HEIGHT,
      background,
    },
    duration: outcome.duration,
    fallenAllies,
    survivingAllies,
  };
}
