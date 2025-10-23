import { CHARACTERS, getCharacterById } from '../data/characters.js';
import { getJobById } from './jobs.js';
import { TRAITS as TRAIT_CATALOG, getTraitById } from './traits.js';
import { getSkillById } from './skills.js';

export const UNITS = CHARACTERS;

export function getUnitDefinition(id) {
  return getCharacterById(id);
}

const EXTRA_TRAIT_POOL_BY_JOB = {
  swordsman: ['ember-resonance', 'guardian-ward', 'shadow-thread'],
  knight: ['stoneheart', 'guardian-ward', 'glacial-focus'],
  warrior: ['stoneheart', 'spirit-surge', 'night-temper'],
  archer: ['ember-resonance', 'swift-arrows', 'storm-ritual'],
  mage: ['celestial-tide', 'glacial-focus', 'storm-ritual'],
  healer: ['guardian-ward', 'radiant-song', 'spirit-surge'],
  consecrator: ['radiant-song', 'celestial-tide', 'guardian-ward'],
  warlock: ['shadow-thread', 'night-temper', 'ember-resonance'],
};

export function getUnitSkill(definitionId, level = 1) {
  const definition = typeof definitionId === 'string' ? getCharacterById(definitionId) : definitionId;
  if (!definition) {
    return null;
  }
  return getSkillById(definition.skillId, { level });
}

export function buildBaseStats(definition) {
  if (!definition) {
    return {
      health: 600,
      maxHealth: 600,
      attack: 60,
      defense: 30,
      magicDefense: 30,
      spellPower: 30,
      mana: 80,
      speed: 1.1,
      attackInterval: 1.3,
      range: 120,
      manaRegen: 8,
    };
  }
  const job = getJobById(definition.jobId);
  const jobStats = job?.baseStats || {};
  const adjustments = definition.statAdjustments || {};
  const stats = {
    health: Math.round((jobStats.health || 600) + (adjustments.health || 0)),
    attack: Math.round((jobStats.attack || 60) + (adjustments.attack || 0)),
    defense: Math.round((jobStats.defense || 30) + (adjustments.defense || 0)),
    magicDefense: Math.round((jobStats.magicDefense || jobStats.defense || 30) + (adjustments.magicDefense || 0)),
    spellPower: Math.round((jobStats.spellPower || 30) + (adjustments.spellPower || 0)),
    mana: Math.round((jobStats.mana || 80) + (adjustments.mana || 0)),
    speed: parseFloat(((jobStats.speed || 1.1) + (adjustments.speed || 0)).toFixed(2)),
    attackInterval: parseFloat(
      Math.max(0.6, (jobStats.attackInterval || 1.3) + (adjustments.attackInterval || 0)).toFixed(2)
    ),
    range: Math.max(40, Math.round((jobStats.range || 120) + (adjustments.range || 0))),
    manaRegen: Math.max(0, Math.round((jobStats.manaRegen || 8) + (adjustments.manaRegen || 0))),
  };
  stats.maxHealth = stats.health;
  stats.maxMana = stats.mana;
  return stats;
}

export function rollTraits(definition) {
  const traitIds = new Set();
  if (definition?.signatureTraitId) {
    traitIds.add(definition.signatureTraitId);
  }
  const job = definition?.jobId ? getJobById(definition.jobId) : null;
  const basePool = (definition?.traitPool && definition.traitPool.length > 0)
    ? definition.traitPool
    : TRAIT_CATALOG.map((trait) => trait.id);
  const extras = EXTRA_TRAIT_POOL_BY_JOB[definition?.jobId] || [];
  const pool = Array.from(new Set([...basePool, ...extras]));
  const weightedPool = pool
    .map((traitId) => {
      const trait = getTraitById(traitId);
      if (!trait) {
        return null;
      }
      return { id: traitId, weight: weightTraitForJob(trait, job) };
    })
    .filter((entry) => entry && entry.weight > 0);

  if (weightedPool.length > 0) {
    const totalWeight = weightedPool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const entry of weightedPool) {
      roll -= entry.weight;
      if (roll <= 0) {
        traitIds.add(entry.id);
        break;
      }
    }
  }
  return Array.from(traitIds).filter((traitId) => !!getTraitById(traitId));
}

function weightTraitForJob(trait, job) {
  const effects = trait?.effects || {};
  const role = job?.role || 'frontline';
  let weight = 1;

  if (effects.damageReduction || effects.guardMitigation) {
    weight += role === 'frontline' ? 1.4 : 0.4;
  }
  if (effects.regenPercentPerSecond) {
    weight += role === 'frontline' ? 1 : 0.6;
  }
  if (effects.lifesteal) {
    weight += role === 'frontline' ? 0.9 : 0.6;
  }
  if (effects.criticalChance || effects.rampingAttackSpeed) {
    weight += role === 'midline' ? 1.1 : role === 'backline' ? 0.8 : 0.4;
  }
  if (effects.manaRegenMultiplier || effects.manaPerSecond) {
    weight += role === 'backline' ? 1.2 : 0.3;
  }
  if (effects.attackBonus) {
    weight += role === 'midline' ? 1 : 0.6;
  }
  if (effects.defenseBonus) {
    weight += role === 'frontline' ? 1 : 0.5;
  }
  if (effects.criticalMultiplier) {
    weight += role !== 'frontline' ? 0.6 : 0.3;
  }

  if (definitionHasTraitAffinity(job, trait)) {
    weight += 1.2;
  }

  return Math.max(0.2, weight);
}

function definitionHasTraitAffinity(job, trait) {
  if (!job || !trait) {
    return false;
  }
  const keyword = job.role || '';
  const description = (trait.description || '').toLowerCase();
  return description.includes(keyword);
}
