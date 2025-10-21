import { listAllUnits } from './party.js';
import { getUnitDefinition } from './units.js';
import { getJobById } from './jobs.js';

const FRONTLINE_JOBS = new Set(['swordsman', 'knight', 'warrior']);
const BACKLINE_JOBS = new Set(['healer', 'consecrator', 'warlock']);
const HEALING_JOBS = new Set(['healer', 'consecrator']);
const RANGED_JOBS = new Set(['archer', 'mage', 'warlock']);

function makeAugment(config) {
  return config;
}

function scaleStat(unit, key, percent) {
  const current = unit.stats[key];
  if (typeof current !== 'number') {
    return;
  }
  unit.stats[key] = Math.round(current * (1 + percent));
}

function addFlat(unit, key, amount) {
  if (typeof amount !== 'number' || Number.isNaN(amount) || amount === 0) {
    return;
  }
  const current = Number(unit.stats[key]) || 0;
  unit.stats[key] = parseFloat((current + amount).toFixed(3));
}

function scaleHealth(unit, percent) {
  const base = unit.maxHealth || unit.stats.maxHealth || unit.stats.health;
  if (typeof base !== 'number') {
    return;
  }
  const delta = Math.round(base * percent);
  if (delta === 0) {
    return;
  }
  unit.stats.maxHealth = (unit.stats.maxHealth || base) + delta;
  unit.maxHealth = (unit.maxHealth || base) + delta;
  unit.health = Math.min(unit.maxHealth, (unit.health || unit.maxHealth) + delta);
  unit.stats.health = unit.maxHealth;
}

function scaleMana(unit, percent) {
  const base = unit.maxMana || unit.stats.maxMana || unit.stats.mana;
  if (typeof base !== 'number') {
    return;
  }
  const delta = Math.round(base * percent);
  if (delta === 0) {
    return;
  }
  unit.stats.maxMana = (unit.stats.maxMana || base) + delta;
  unit.maxMana = (unit.maxMana || base) + delta;
  unit.mana = Math.min(unit.maxMana, (unit.mana || unit.maxMana) + delta);
  unit.stats.mana = unit.maxMana;
}

function addTrait(unit, key, amount) {
  if (typeof amount !== 'number' || Number.isNaN(amount) || amount === 0) {
    return;
  }
  unit.traitEffects[key] = (unit.traitEffects[key] || 0) + amount;
}

function applyCooldown(unit, amount) {
  if (typeof amount !== 'number' || Number.isNaN(amount) || amount === 0) {
    return;
  }
  unit.cooldownReduction = Math.max(0, Math.min(0.7, (unit.cooldownReduction || 0) + amount));
}

function applyAttackInterval(unit, percent) {
  const interval = unit.stats.attackInterval;
  if (typeof interval !== 'number') {
    return;
  }
  const value = interval * (1 - percent);
  unit.stats.attackInterval = parseFloat(Math.max(0.34, value).toFixed(3));
  unit.lastAttackInterval = unit.stats.attackInterval;
}

function computeComposition(party) {
  const units = listAllUnits(party);
  const jobs = new Map();
  const roles = new Map();
  units.forEach((unit) => {
    if (!unit) {
      return;
    }
    const definition = getUnitDefinition(unit.definitionId);
    const jobId = unit.jobId || definition?.jobId || null;
    if (jobId) {
      jobs.set(jobId, (jobs.get(jobId) || 0) + 1);
    }
    const role = unit.role || getJobById(jobId || '')?.role || definition?.role;
    if (role) {
      roles.set(role, (roles.get(role) || 0) + 1);
    }
  });
  return {
    units,
    jobs,
    roles,
    hasJob(jobId) {
      return (jobs.get(jobId) || 0) > 0;
    },
    countJob(jobId) {
      return jobs.get(jobId) || 0;
    },
    countRole(role) {
      return roles.get(role) || 0;
    },
  };
}

function normalizeLevelValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }
  return parseFloat(numeric.toFixed(3));
}

function deriveAugmentLevels(entry) {
  if (!entry) {
    return [];
  }
  if (Array.isArray(entry.levels)) {
    return entry.levels.map(normalizeLevelValue).filter((level) => level > 0);
  }
  const stacks = Math.max(0, Math.floor(Number(entry.stacks) || 0));
  const totalPower = Math.max(0, Number(entry.power) || 0);
  if (stacks > 0 && totalPower > 0) {
    const perStack = totalPower / stacks;
    return Array.from({ length: stacks }, () => normalizeLevelValue(perStack)).filter((level) => level > 0);
  }
  if (totalPower > 0) {
    return [normalizeLevelValue(totalPower)].filter((level) => level > 0);
  }
  return [];
}

export function normalizeAugmentEntry(entry) {
  if (!entry || !entry.id) {
    return null;
  }
  const levels = deriveAugmentLevels(entry);
  if (!levels.length) {
    return null;
  }
  const power = levels.reduce((sum, level) => sum + level, 0);
  return {
    id: entry.id,
    power,
    stacks: levels.length,
    levels,
  };
}

function computeStackPower(level, index = 0) {
  const tierScale = Math.pow(level, 0.82);
  const stackScale = Math.pow(0.6, index);
  let earlyPenalty = 1;
  if (level <= 1) {
    earlyPenalty = 0.5;
  } else if (level <= 2) {
    earlyPenalty = 0.7;
  }
  const value = tierScale * stackScale * earlyPenalty;
  return Number.isFinite(value) ? parseFloat(value.toFixed(4)) : 0;
}

function buildAugmentContributions(source) {
  if (typeof source === 'number') {
    const level = normalizeLevelValue(source);
    if (level <= 0) {
      return [];
    }
    return [computeStackPower(level, 0)].filter((value) => value > 0);
  }
  const normalized = normalizeAugmentEntry(source);
  if (!normalized) {
    return [];
  }
  const ordered = [...normalized.levels].sort((a, b) => b - a);
  return ordered
    .map((level, index) => computeStackPower(level, index))
    .filter((value) => value > 0);
}

export function getAugmentPowerSummary(source) {
  const contributions = buildAugmentContributions(source);
  const totalPower = contributions.reduce((sum, value) => sum + value, 0);
  return {
    contributions,
    totalPower,
    stacks: contributions.length,
  };
}

const AUGMENTS = [
  makeAugment({
    id: 'blood-reaver',
    name: '혈귀',
    description: '아군 전체가 전투에서 체력을 흡수합니다.',
    format: (power) => `아군이 ${Math.round(power * 4)}%의 생명흡혈을 얻습니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        addTrait(unit, 'lifesteal', 0.04 * power);
      });
    },
  }),
  makeAugment({
    id: 'stalwart-line',
    name: '강철 전열',
    description: '전열 전투원이 더 단단해집니다.',
    format: (power) => `전열의 체력이 ${Math.round(power * 9)}% 증가하고 방어력이 ${Math.round(
      power * 6
    )}% 증가합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        if (!FRONTLINE_JOBS.has(unit.jobId) && unit.role !== 'frontline') {
          return;
        }
        scaleHealth(unit, 0.09 * power);
        scaleStat(unit, 'defense', 0.06 * power);
        scaleStat(unit, 'magicDefense', 0.05 * power);
        unit.guardMitigation = Math.min(0.6, (unit.guardMitigation || 0) + 0.05 * power);
      });
    },
  }),
  makeAugment({
    id: 'arcane-conduit',
    name: '비전 도관',
    description: '마법사의 주문력이 강화됩니다.',
    format: (power) => `마법사와 저주술사의 주문력이 ${Math.round(
      power * 10
    )}% 증가하고 마나 회복이 초당 ${Math.round(power * 2)} 증가합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        if (!['mage', 'warlock'].includes(unit.jobId)) {
          return;
        }
        scaleStat(unit, 'spellPower', 0.1 * power);
        addFlat(unit, 'manaRegen', 2 * power);
      });
    },
  }),
  makeAugment({
    id: 'tranquil-aegis',
    name: '정화의 숨결',
    description: '치유사가 있으면 회복이 빨라집니다.',
    format: (power, composition) => {
      if (!composition || (!composition.hasJob('healer') && !composition.hasJob('consecrator'))) {
        return '치유사가 없으면 효과가 발동하지 않습니다.';
      }
      return `치유 계열 전투원의 마나 회복이 초당 ${Math.round(
        power * 4
      )} 증가하고 쿨타임이 ${Math.round(power * 4)}% 감소합니다.`;
    },
    apply({ ally }, power, composition) {
      const enabled = composition.hasJob('healer') || composition.hasJob('consecrator');
      if (!enabled) {
        return;
      }
      ally.push((unit) => {
        if (!HEALING_JOBS.has(unit.jobId)) {
          return;
        }
        addFlat(unit, 'manaRegen', 4 * power);
        applyCooldown(unit, 0.04 * power);
      });
    },
  }),
  makeAugment({
    id: 'precision-volley',
    name: '정밀 사격',
    description: '궁수의 집중력이 향상됩니다.',
    format: (power) => `궁수의 사거리가 ${power * 28} 증가하고 치명타 확률이 ${Math.round(
      power * 4
    )}% 증가합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        if (unit.jobId !== 'archer') {
          return;
        }
        addFlat(unit, 'range', power * 28);
        addTrait(unit, 'criticalChance', 0.04 * power);
      });
    },
  }),
  makeAugment({
    id: 'relentless-drill',
    name: '맹렬한 훈련',
    description: '공세 속도를 높입니다.',
    format: (power) => `아군의 공격 속도가 ${Math.round(power * 6)}% 빨라지고 치명타 확률이 ${Math.round(
      power * 2
    )}% 증가합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        applyAttackInterval(unit, 0.06 * power);
        addTrait(unit, 'criticalChance', 0.02 * power);
      });
    },
  }),
  makeAugment({
    id: 'iron-bulwark',
    name: '철벽 결속',
    description: '모든 아군의 피해 저항이 증가합니다.',
    format: (power) => `아군이 받는 피해가 ${Math.round(power * 4)}% 감소합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        addTrait(unit, 'damageReduction', 0.04 * power);
      });
    },
  }),
  makeAugment({
    id: 'mystic-fount',
    name: '마력의 샘',
    description: '마나가 넘쳐흐릅니다.',
    format: (power) => `아군의 최대 마나가 ${Math.round(power * 12)}% 증가하고 마나 회복이 초당 ${Math.round(
      power * 3
    )} 증가합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        scaleMana(unit, 0.12 * power);
        addFlat(unit, 'manaRegen', 3 * power);
      });
    },
  }),
  makeAugment({
    id: 'wind-march',
    name: '질풍 행진곡',
    description: '모든 아군의 기동력이 향상됩니다.',
    format: (power) => `이동 속도가 ${parseFloat((power * 0.12).toFixed(2))} 증가합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        addFlat(unit, 'speed', 0.12 * power);
        unit.speedBonus += 0.12 * power;
      });
    },
  }),
  makeAugment({
    id: 'chrono-harmony',
    name: '시간의 합주',
    description: '재사용 대기가 크게 줄어듭니다.',
    format: (power) => `스킬 쿨타임이 ${Math.round(power * 5)}% 감소합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        applyCooldown(unit, 0.05 * power);
      });
    },
  }),
  makeAugment({
    id: 'guardian-veil',
    name: '수호의 장막',
    description: '전투 시작 시 보호막을 부여합니다.',
    format: (power) => `전투 시작 시 아군에게 ${power * 110}의 보호막을 부여합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        unit.shield = (unit.shield || 0) + 110 * power;
      });
    },
  }),
  makeAugment({
    id: 'shattering-salvo',
    name: '분쇄 탄막',
    description: '적의 방어를 무너뜨립니다.',
    format: (power) => `적이 받는 피해가 ${Math.round(power * 8)}% 증가합니다.`,
    apply({ enemy }, power) {
      enemy.push((unit) => {
        unit.damageTakenBonus = (unit.damageTakenBonus || 0) + 0.08 * power;
      });
    },
  }),
  makeAugment({
    id: 'crippling-dread',
    name: '쇄도 공포',
    description: '적의 이동을 느려지게 합니다.',
    format: (power) => `적 이동 속도가 ${Math.round(power * 10)}% 감소합니다.`,
    apply({ enemy }, power) {
      enemy.push((unit) => {
        unit.stats.speed = parseFloat((unit.stats.speed * (1 - 0.1 * power)).toFixed(3));
      });
    },
  }),
  makeAugment({
    id: 'valor-anthem',
    name: '용기의 진군가',
    description: '공격력이 상승합니다.',
    format: (power) => `아군 공격력이 ${Math.round(power * 8)}% 증가합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        scaleStat(unit, 'attack', 0.08 * power);
      });
    },
  }),
  makeAugment({
    id: 'vanguard-oath',
    name: '선봉의 맹세',
    description: '전열 공격이 강화됩니다.',
    format: (power) => `전열 공격력이 ${Math.round(power * 6)}% 증가하고 방어막 효율이 향상됩니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        if (!FRONTLINE_JOBS.has(unit.jobId) && unit.role !== 'frontline') {
          return;
        }
        scaleStat(unit, 'attack', 0.06 * power);
        unit.guardMitigation = Math.min(0.65, (unit.guardMitigation || 0) + 0.06 * power);
      });
    },
  }),
  makeAugment({
    id: 'spellweave',
    name: '주문의 직조',
    description: '마법사가 더 자주 주문을 시전합니다.',
    format: (power) => `마법사와 저주술사의 쿨타임이 ${Math.round(power * 4)}% 추가로 감소합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        if (!['mage', 'warlock'].includes(unit.jobId)) {
          return;
        }
        applyCooldown(unit, 0.04 * power);
      });
    },
  }),
  makeAugment({
    id: 'sanctum-chime',
    name: '성소의 종소리',
    description: '전투 중 지속 회복이 일어납니다.',
    format: (power) => `아군이 매초 체력의 ${parseFloat((power * 0.8).toFixed(1))}%를 재생합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        addTrait(unit, 'regenPercentPerSecond', 0.008 * power);
      });
    },
  }),
  makeAugment({
    id: 'stormcall',
    name: '폭풍 부름',
    description: '중열 화력이 강화됩니다.',
    format: (power) => `궁수와 마법사의 공격력이 ${Math.round(power * 6)}% 증가하고 사거리가 ${power * 18} 증가합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        if (!['archer', 'mage'].includes(unit.jobId)) {
          return;
        }
        scaleStat(unit, 'attack', 0.06 * power);
        addFlat(unit, 'range', power * 18);
      });
    },
  }),
  makeAugment({
    id: 'ether-channel',
    name: '에테르 통로',
    description: '전투 중 마나 순환이 촉진됩니다.',
    format: (power) => `아군의 마나 회복이 초당 ${power * 2} 증가합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        addFlat(unit, 'manaRegen', 2 * power);
      });
    },
  }),
  makeAugment({
    id: 'battlefield-insight',
    name: '전장의 통찰',
    description: '치명적인 일격을 준비합니다.',
    format: (power) => `치명타 확률이 ${Math.round(power * 3)}% 증가하고 치명타 배율이 ${parseFloat(
      (power * 0.1 + 1.5).toFixed(2)
    )}배가 됩니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        addTrait(unit, 'criticalChance', 0.03 * power);
        const base = unit.traitEffects.criticalMultiplier || 1.5;
        unit.traitEffects.criticalMultiplier = Math.max(base, base + 0.1 * power);
      });
    },
  }),
  makeAugment({
    id: 'steady-heart',
    name: '굳건한 심장',
    description: '모든 아군의 체력이 증가합니다.',
    format: (power) => `아군의 체력이 ${Math.round(power * 7)}% 증가합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        scaleHealth(unit, 0.07 * power);
      });
    },
  }),
  makeAugment({
    id: 'empowered-barrier',
    name: '강화 장벽',
    description: '피해를 크게 줄입니다.',
    format: (power) => `아군이 추가로 ${power * 70}의 보호막을 얻고 받는 피해가 ${Math.round(
      power * 3
    )}% 감소합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        unit.shield = (unit.shield || 0) + 70 * power;
        addTrait(unit, 'damageReduction', 0.03 * power);
      });
    },
  }),
  makeAugment({
    id: 'corrosion-hex',
    name: '부식의 낙인',
    description: '적의 방어력을 떨어뜨립니다.',
    format: (power) => `적 방어력이 ${Math.round(power * 12)}% 감소합니다.`,
    apply({ enemy }, power) {
      enemy.push((unit) => {
        if (typeof unit.stats.defense === 'number') {
          unit.stats.defense = Math.max(0, Math.round(unit.stats.defense * (1 - 0.12 * power)));
        }
        if (typeof unit.stats.magicDefense === 'number') {
          unit.stats.magicDefense = Math.max(
            0,
            Math.round(unit.stats.magicDefense * (1 - 0.1 * power))
          );
        }
      });
    },
  }),
  makeAugment({
    id: 'spirit-beacon',
    name: '영혼의 등불',
    description: '회복량이 증가합니다.',
    format: (power) => `아군이 매초 체력의 ${parseFloat((power * 0.5).toFixed(1))}%를 추가로 회복합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        addTrait(unit, 'regenPercentPerSecond', 0.005 * power);
      });
    },
  }),
  makeAugment({
    id: 'shadow-pressure',
    name: '압도적 그림자',
    description: '적의 공격 의지를 꺾습니다.',
    format: (power) => `적이 주는 피해가 ${Math.round(power * 8)}% 감소합니다.`,
    apply({ enemy }, power) {
      enemy.push((unit) => {
        unit.damageDealtPenalty = (unit.damageDealtPenalty || 0) + 0.08 * power;
      });
    },
  }),
  makeAugment({
    id: 'glacial-ward',
    name: '빙결 수호',
    description: '감속 효과에 강해집니다.',
    format: (power) => `이동 속도가 ${parseFloat((power * 0.08).toFixed(2))} 증가하고 받는 피해가 ${Math.round(
      power * 2
    )}% 감소합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        addFlat(unit, 'speed', 0.08 * power);
        unit.speedBonus += 0.08 * power;
        addTrait(unit, 'damageReduction', 0.02 * power);
      });
    },
  }),
  makeAugment({
    id: 'blazing-concord',
    name: '화염의 합창',
    description: '축성사와 저주술사의 화력을 높입니다.',
    format: (power) => `축성사와 저주술사의 공격력이 ${Math.round(
      power * 5
    )}% 증가하고 주문력이 ${Math.round(power * 9)}% 증가합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        if (!['consecrator', 'warlock'].includes(unit.jobId)) {
          return;
        }
        scaleStat(unit, 'attack', 0.05 * power);
        scaleStat(unit, 'spellPower', 0.09 * power);
      });
    },
  }),
  makeAugment({
    id: 'echoed-command',
    name: '메아리 지휘',
    description: '지원병의 속도를 높입니다.',
    format: (power) => `치유사와 축성사의 쿨타임이 ${Math.round(power * 5)}% 감소하고 사거리가 ${power * 14} 증가합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        if (!HEALING_JOBS.has(unit.jobId)) {
          return;
        }
        applyCooldown(unit, 0.05 * power);
        addFlat(unit, 'range', power * 14);
      });
    },
  }),
  makeAugment({
    id: 'predators-mark',
    name: '포식자의 징표',
    description: '사냥꾼의 표식이 적을 꿰뚫습니다.',
    format: (power) => `궁수가 파티에 있을 경우 적이 추가로 ${Math.round(power * 5)}% 더 많은 피해를 받습니다.`,
    apply({ enemy }, power, composition) {
      if (!composition.hasJob('archer')) {
        return;
      }
      enemy.push((unit) => {
        unit.damageTakenBonus = (unit.damageTakenBonus || 0) + 0.05 * power;
      });
    },
  }),
  makeAugment({
    id: 'radiant-circle',
    name: '찬란한 원형',
    description: '후열의 마나 운용이 쉬워집니다.',
    format: (power) => `후열 전투원의 최대 마나가 ${Math.round(power * 10)}% 증가하고 쿨타임이 ${Math.round(
      power * 3
    )}% 감소합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        if (!BACKLINE_JOBS.has(unit.jobId) && unit.role !== 'backline') {
          return;
        }
        scaleMana(unit, 0.1 * power);
        applyCooldown(unit, 0.03 * power);
      });
    },
  }),
  makeAugment({
    id: 'arc-light',
    name: '아크 라이트',
    description: '원거리 전투가 안정화됩니다.',
    format: (power) => `원거리 계열 전투원의 사거리가 ${power * 16} 증가하고 이동 속도가 ${parseFloat(
      (power * 0.05).toFixed(2)
    )} 상승합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        if (!RANGED_JOBS.has(unit.jobId)) {
          return;
        }
        addFlat(unit, 'range', power * 16);
        addFlat(unit, 'speed', 0.05 * power);
        unit.speedBonus += 0.05 * power;
      });
    },
  }),
  makeAugment({
    id: 'warden-pulse',
    name: '수호자의 파장',
    description: '전열이 받는 치유량이 증가합니다.',
    format: (power) => `전열 전투원이 매초 체력의 ${parseFloat((power * 0.6).toFixed(1))}%를 회복합니다.`,
    apply({ ally }, power) {
      ally.push((unit) => {
        if (!FRONTLINE_JOBS.has(unit.jobId) && unit.role !== 'frontline') {
          return;
        }
        addTrait(unit, 'regenPercentPerSecond', 0.006 * power);
      });
    },
  }),
  makeAugment({
    id: 'void-hush',
    name: '침묵의 공허',
    description: '적의 마나 회복을 방해합니다.',
    format: (power) => `적의 마나 회복이 초당 ${power * 3} 감소합니다.`,
    apply({ enemy }, power) {
      enemy.push((unit) => {
        unit.stats.manaRegen = Math.max(0, (unit.stats.manaRegen || 0) - power * 3);
      });
    },
  }),
];

export { AUGMENTS };

export function getAugmentById(id) {
  return AUGMENTS.find((augment) => augment.id === id) || null;
}

export function getAugmentTierForLevel(level = 1) {
  const clamped = Math.max(1, Number(level) || 1);
  return Math.max(1, Math.floor((clamped + 1) / 2));
}

export function rollAugmentOptions(count = 3) {
  const pool = [...AUGMENTS];
  const options = [];
  while (options.length < count && pool.length) {
    const index = Math.floor(Math.random() * pool.length);
    options.push(pool.splice(index, 1)[0]);
  }
  return options;
}

export function describeAugmentEffect(augment, power, party = null) {
  if (!augment) {
    return '';
  }
  const { totalPower } = getAugmentPowerSummary(power);
  const effectivePower = Math.round(totalPower * 100) / 100;
  const composition = party ? computeComposition(party) : null;
  if (typeof augment.format === 'function') {
    return augment.format(effectivePower, composition);
  }
  return augment.description;
}

export function evaluateAugments({ augments = [], party = null }) {
  if (!party || !augments.length) {
    return {
      applyToAlly() {},
      applyToEnemy() {},
    };
  }
  const composition = computeComposition(party);
  const allyModifiers = [];
  const enemyModifiers = [];
  augments.forEach((entry) => {
    if (!entry || !entry.id) {
      return;
    }
    const augment = getAugmentById(entry.id);
    if (!augment) {
      return;
    }
    const { contributions } = getAugmentPowerSummary(entry);
    if (!contributions.length) {
      return;
    }
    const context = { ally: allyModifiers, enemy: enemyModifiers };
    contributions.forEach((power) => {
      augment.apply(context, power, composition);
    });
  });
  return {
    applyToAlly(unit) {
      allyModifiers.forEach((fn) => fn(unit, composition));
    },
    applyToEnemy(unit) {
      enemyModifiers.forEach((fn) => fn(unit, composition));
    },
  };
}
