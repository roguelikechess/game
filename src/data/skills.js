import { CHARACTERS } from './characters.js';

const SKILL_BLUEPRINTS = {
  'blade-tempest': {
    name: '블레이드 템페스트',
    jobId: 'swordsman',
    description: '4초 동안 공격 간격을 0.35초 줄여 폭발적인 연속 참격을 가한다.',
    effect: { kind: 'self-buff', stat: 'attackInterval', modifier: -0.35, duration: 4 },
    cooldown: 11,
  },
  'sun-sunder': {
    name: '태양 가르기',
    jobId: 'swordsman',
    description:
      '3연속으로 70% 피해를 주며 타격마다 피해가 15%씩 증가하고 적을 2초간 25% 둔화시킨다.',
    effect: { kind: 'dash-flurry', hits: 3, damageMultiplier: 0.7, ramp: 0.15, slow: 0.25, slowDuration: 2 },
    cooldown: 12,
  },
  'eclipse-rend': {
    name: '일식의 참격',
    jobId: 'swordsman',
    description:
      '2연격으로 각각 95% 피해를 주고 2.4초 동안 적의 받는 피해를 12% 늘리며 이동 속도를 18% 늦춘다.',
    effect: { kind: 'dash-flurry', hits: 2, damageMultiplier: 0.95, damageTakenBonus: 0.12, slow: 0.18, slowDuration: 2.4 },
    cooldown: 13,
  },
  'phoenix-guard': {
    name: '불사조 수호',
    jobId: 'swordsman',
    description:
      '3연속으로 82% 피해를 가하며 타격마다 18%씩 더 강해지고 160의 보호막과 2.6초간 22% 둔화를 부여한다.',
    effect: { kind: 'dash-flurry', hits: 3, damageMultiplier: 0.82, shield: 160, ramp: 0.18, slow: 0.22, slowDuration: 2.6 },
    cooldown: 11,
  },
  'celestial-rush': {
    name: '성좌 질주',
    jobId: 'swordsman',
    description:
      '4연속으로 74% 피해를 주고 타격마다 22%씩 강화되며 200 보호막과 3.2초간 28% 둔화를 남긴다.',
    effect: { kind: 'dash-flurry', hits: 4, damageMultiplier: 0.74, ramp: 0.22, slow: 0.28, slowDuration: 3.2, shield: 200 },
    cooldown: 11,
  },
  'moon-cleave': {
    name: '월광참',
    jobId: 'swordsman',
    description: '돌진하여 반경 80 범위에 140% 피해를 가하는 부채꼴 참격을 펼친다.',
    effect: { kind: 'cleave', radius: 80, damageMultiplier: 1.4 },
    cooldown: 10,
  },
  'riposte-surge': {
    name: '리포스트 서지',
    jobId: 'swordsman',
    description: '다음 공격을 막아내고 160 보호막과 함께 180% 피해로 반격한다.',
    effect: { kind: 'counter', damageMultiplier: 1.8, shield: 160 },
    cooldown: 13,
  },
  'aegis-bastion': {
    name: '이지스 보루',
    jobId: 'knight',
    description: '반경 120 아군에게 220 보호막과 6초 동안 방어력 +18을 부여한다.',
    effect: { kind: 'shield', radius: 120, shieldValue: 220, defenseBonus: 18, duration: 6 },
    cooldown: 15,
  },
  'lance-charge': {
    name: '랜스 차지',
    jobId: 'knight',
    description: '돌진하여 150% 피해를 주고 2.4초 동안 기절시킨다.',
    effect: { kind: 'stun-strike', damageMultiplier: 1.5, stunDuration: 2.4 },
    cooldown: 14,
  },
  'guardian-oath': {
    name: '수호의 서약',
    jobId: 'knight',
    description: '6초 동안 지정 아군이 받는 피해의 35%를 대신 받아낸다.',
    effect: { kind: 'guard', redirectPercent: 0.35, duration: 6 },
    cooldown: 17,
  },
  'solar-bulwark': {
    name: '태양의 보루',
    jobId: 'knight',
    description:
      '반경 140에 65% 피해를 주고 아군에게 180 보호막과 6초 동안 방어력 +16을 부여한다.',
    effect: {
      kind: 'ward-pulse',
      radius: 140,
      shieldValue: 180,
      defenseBonus: 16,
      duration: 6,
      damageMultiplier: 0.65,
    },
    cooldown: 14,
  },
  'radiant-bastion': {
    name: '광휘의 성채',
    jobId: 'knight',
    description:
      '반경 150에 70% 피해를 주고 아군에게 210 보호막과 7초 동안 방어력 +18, 공격력 +12를 준다.',
    effect: {
      kind: 'ward-pulse',
      radius: 150,
      shieldValue: 210,
      defenseBonus: 18,
      duration: 7,
      damageMultiplier: 0.7,
      attackBonus: 12,
    },
    cooldown: 15,
  },
  'ironclad-clarion': {
    name: '철벽의 뿔피리',
    jobId: 'knight',
    description:
      '반경 160에 60% 피해를 주고 7초간 240 보호막과 방어력 +20을 부여하며 적을 2.4초간 20% 둔화시킨다.',
    effect: {
      kind: 'ward-pulse',
      radius: 160,
      shieldValue: 240,
      defenseBonus: 20,
      duration: 7,
      slow: 0.2,
      slowDuration: 2.4,
      damageMultiplier: 0.6,
    },
    cooldown: 16,
  },
  earthbreaker: {
    name: '대지 분쇄',
    jobId: 'warrior',
    description: '반경 110에 120% 피해를 주고 적을 크게 넘어뜨려 이동 속도를 40% 늦춘다.',
    effect: { kind: 'ground-slam', radius: 110, damageMultiplier: 1.2, slow: 0.4 },
    cooldown: 11,
  },
  'berserk-flame': {
    name: '광전사의 불꽃',
    jobId: 'warrior',
    description: '체력이 50% 이하로 떨어지면 공격력이 28만큼 증가한다.',
    effect: { kind: 'rampage', threshold: 0.5, attackBonus: 28 },
    cooldown: 0,
  },
  'unyielding-roar': {
    name: '불굴의 포효',
    jobId: 'warrior',
    description: '주변 아군의 체력을 12% 회복시키고 적을 1.6초 동안 공포 상태로 만든다.',
    effect: { kind: 'warcry', healPercent: 0.12, fearDuration: 1.6 },
    cooldown: 16,
  },
  'seismic-crash': {
    name: '지각 붕괴',
    jobId: 'warrior',
    description: '주 대상에게 135% 피해를 주고 반경 120 내 적에게 55% 충격 피해와 1.4초 기절을 준다.',
    effect: {
      kind: 'seismic-shock',
      damageMultiplier: 1.35,
      splashMultiplier: 0.55,
      radius: 120,
      stunDuration: 1.4,
    },
    cooldown: 13,
  },
  'molten-upheaval': {
    name: '용암 격동',
    jobId: 'warrior',
    description:
      '주 대상에게 145% 피해를 주고 반경 130에 65% 충격과 1.8초 기절, 추가로 받는 피해를 12% 늘린다.',
    effect: {
      kind: 'seismic-shock',
      damageMultiplier: 1.45,
      splashMultiplier: 0.65,
      radius: 130,
      stunDuration: 1.8,
      damageTakenBonus: 0.12,
    },
    cooldown: 14,
  },
  'falcon-volley': {
    name: '매의 연사',
    jobId: 'archer',
    description: '단일 대상에게 연속으로 90% 피해의 화살을 3발 발사한다.',
    effect: { kind: 'burst-shot', shots: 3, damageMultiplier: 0.9 },
    cooldown: 11,
  },
  'piercing-rain': {
    name: '관통의 비',
    jobId: 'archer',
    description: '폭 60의 직선을 따라 85% 피해의 관통 화살비를 퍼붓는다.',
    effect: { kind: 'line-shot', width: 60, damageMultiplier: 0.85 },
    cooldown: 14,
  },
  'hawk-eye': {
    name: '매의 눈',
    jobId: 'archer',
    description: '7초 동안 치명타 확률이 25% 오르고 공격 사거리가 40 증가한다.',
    effect: { kind: 'precision', critBonus: 0.25, rangeBonus: 40, duration: 7 },
    cooldown: 16,
  },
  'gale-splitter': {
    name: '질풍 일제사격',
    jobId: 'archer',
    description: '3명의 적을 추적하며 각 85% 피해를 주고 타격마다 12%씩 피해가 증가한다.',
    effect: { kind: 'seeker-barrage', targets: 3, damageMultiplier: 0.85, ramp: 0.12 },
    cooldown: 12,
  },
  'shadow-barrage': {
    name: '그림자 집중포화',
    jobId: 'archer',
    description:
      '4명의 우선 순위 적을 80% 피해로 사격하며 타격마다 14%씩 강화되고 18% 둔화를 준다.',
    effect: { kind: 'seeker-barrage', targets: 4, damageMultiplier: 0.8, ramp: 0.14, slow: 0.18 },
    cooldown: 13,
  },
  'storm-hail': {
    name: '폭풍 화살우박',
    jobId: 'archer',
    description:
      '5명의 적을 추적하며 78% 피해를 주고 타격마다 16%씩 증폭되며 최대 40% 확률로 관통한다.',
    effect: { kind: 'seeker-barrage', targets: 5, damageMultiplier: 0.78, ramp: 0.16, pierce: 0.4 },
    cooldown: 15,
  },
  'arcane-comet': {
    name: '비전 혜성',
    jobId: 'mage',
    description: '반경 130 범위에 혜성을 떨어뜨려 135%의 비전 피해를 준다.',
    effect: { kind: 'aoe-spell', radius: 130, damageMultiplier: 1.35 },
    cooldown: 5,
    spellPowerScaling: { damage: 0.8, effect: 0.0012 },
  },
  'temporal-shift': {
    name: '시간 왜곡',
    jobId: 'mage',
    description: '반경 160의 적을 4.5초 동안 50% 둔화시킨다.',
    effect: { kind: 'slow-field', radius: 160, slow: 0.5, duration: 4.5 },
    cooldown: 7,
    spellPowerScaling: { effect: 0.0011, duration: 0.0007 },
  },
  'mana-implosion': {
    name: '마나 폭발',
    jobId: 'mage',
    description: '마나 60을 소모해 반경 120에 마나 1당 공격력의 110% 피해를 폭발시킨다.',
    effect: { kind: 'mana-burst', manaCost: 60, damagePerMana: 1.1, radius: 120 },
    cooldown: 8,
    spellPowerScaling: { damage: 0.55 },
  },
  'astral-cascade': {
    name: '성운 연쇄',
    jobId: 'mage',
    description: '반경 140에서 105% 피해를 3회 방출하며 타격마다 마나를 14 회복한다.',
    effect: { kind: 'arcane-cascade', pulses: 3, damageMultiplier: 1.05, radius: 140, manaGift: 14 },
    cooldown: 5.5,
    spellPowerScaling: { damage: 0.55, effect: 0.0009, mana: 0.12 },
  },
  'celestial-burst': {
    name: '천구 폭발',
    jobId: 'mage',
    description:
      '반경 150에서 115% 피해를 4회 폭발시키고 타격마다 마나 18을 되돌려주며 22% 둔화를 건다.',
    effect: { kind: 'arcane-cascade', pulses: 4, damageMultiplier: 1.15, radius: 150, manaGift: 18, slow: 0.22 },
    cooldown: 6.5,
    spellPowerScaling: { damage: 0.6, effect: 0.001, mana: 0.1 },
  },
  'radiant-mending': {
    name: '광휘 치유',
    jobId: 'healer',
    description: '아군 하나를 320 회복시키고 최대 체력의 12%를 추가로 회복시킨다.',
    effect: { kind: 'single-heal', healAmount: 320, maxHealthHealPercent: 0.12 },
    cooldown: 7,
    spellPowerScaling: { heal: 0.92 },
  },
  'guardian-prayer': {
    name: '수호 기도',
    jobId: 'healer',
    description: '즉시 최대 체력의 8%를 회복시키고 6초 동안 매초 42씩 회복시킨다.',
    effect: {
      kind: 'regen',
      duration: 6,
      tickHeal: 42,
      maxHealthHealPercent: 0.08,
    },
    cooldown: 12,
    spellPowerScaling: { heal: 0.28, duration: 0.0006 },
  },
  'verdant-bloom': {
    name: '신록의 꽃',
    jobId: 'healer',
    description:
      '주대상을 체력의 22%에 160을 더해 치유하고 6초간 초당 32 회복을 유지시키며 주변 120 범위 아군에게 최대 체력의 6%를 회복시킨다.',
    effect: {
      kind: 'renewal-burst',
      primaryHealPercent: 0.22,
      flatHeal: 160,
      radius: 120,
      regen: 32,
      duration: 6,
      allyHealPercent: 0.06,
    },
    cooldown: 9,
    spellPowerScaling: { heal: 0.62 },
  },
  'revitalizing-anthem': {
    name: '생기 넘치는 송가',
    jobId: 'healer',
    description:
      '즉시 최대 체력의 6%를 회복시키고 8초 동안 아군 전원을 매초 20 회복시키며 마나를 7씩 채운다.',
    effect: {
      kind: 'team-regen',
      duration: 8,
      healPerSecond: 20,
      manaPerSecond: 7,
      maxHealthHealPercent: 0.06,
    },
    cooldown: 18,
    spellPowerScaling: { heal: 0.26, mana: 0.07, duration: 0.0004 },
  },
  'spear-of-dawn': {
    name: '새벽의 창',
    jobId: 'consecrator',
    description: '110% 피해를 주고 6초간 공격력 +42와 120 보호막을 아군에게 부여한다.',
    effect: {
      kind: 'smite-buff',
      damageMultiplier: 1.1,
      attackBonus: 42,
      duration: 6,
      shieldValue: 120,
    },
    cooldown: 9,
    spellPowerScaling: { damage: 0.55, shield: 0.32 },
  },
  'holy-bastion': {
    name: '성역의 장벽',
    jobId: 'consecrator',
    description: '8초 동안 방어력 +42, 마법 저항 +34를 부여하고 180 보호막을 둘러준다.',
    effect: {
      kind: 'fortify',
      defenseBonus: 42,
      magicDefenseBonus: 34,
      duration: 8,
      shieldValue: 180,
    },
    cooldown: 15,
    spellPowerScaling: { effect: 0.0005, duration: 0.0005, shield: 0.4 },
  },
  'radiant-chain': {
    name: '광휘 연쇄',
    jobId: 'consecrator',
    description: '3명의 아군에게 6초간 공격력 +28과 120 보호막을 순차로 전한다.',
    effect: {
      kind: 'chain-buff',
      attackBonus: 28,
      targets: 3,
      duration: 6,
      shieldValue: 120,
    },
    cooldown: 13,
    spellPowerScaling: { effect: 0.00035, duration: 0.0004, shield: 0.3 },
  },
  'dawn-sanctuary': {
    name: '여명의 성역',
    jobId: 'consecrator',
    description:
      '7초 동안 아군에게 주문력 +26과 초당 마나 8을 부여하고 140 보호막을 덧씌운다.',
    effect: {
      kind: 'sanctify-wave',
      duration: 7,
      spellPowerBonus: 26,
      shieldValue: 140,
      manaPerSecond: 8,
    },
    cooldown: 14,
    spellPowerScaling: { shield: 0.38, effect: 0.0005, mana: 0.09 },
  },
  'shadow-hex': {
    name: '그림자 저주',
    jobId: 'warlock',
    description: '7초 동안 대상이 받는 피해를 20% 늘리고 치유 효과를 32% 약화시킨다.',
    effect: {
      kind: 'curse',
      damageTakenBonus: 0.2,
      duration: 7,
      healReduction: 0.32,
    },
    cooldown: 9,
    spellPowerScaling: { effect: 0.0006, duration: 0.0004 },
  },
  'void-siphon': {
    name: '공허 흡수',
    jobId: 'warlock',
    description: '190 피해를 주고 그중 65%만큼 치유하며 마나를 32 회복한다.',
    effect: {
      kind: 'drain',
      damage: 190,
      healRatio: 0.65,
      manaGain: 32,
    },
    cooldown: 11,
    spellPowerScaling: { damage: 0.55, heal: 0.42, mana: 0.12 },
  },
  'nightmare-sigil': {
    name: '악몽의 인장',
    jobId: 'warlock',
    description: '반경 120에 6초 동안 초당 36 피해를 주고 치유 효과를 26% 줄인다.',
    effect: {
      kind: 'damage-over-time',
      radius: 120,
      tickDamage: 36,
      duration: 6,
      healReduction: 0.26,
    },
    cooldown: 16,
    spellPowerScaling: { damage: 0.34, duration: 0.0005, effect: 0.00045 },
  },
  'void-collapse': {
    name: '공허 붕괴',
    jobId: 'warlock',
    description: '반경 120에 125% 피해를 가하고 5초간 초당 36 피해와 24% 둔화를 남긴다.',
    effect: {
      kind: 'void-collapse',
      damageMultiplier: 1.25,
      radius: 120,
      dotDamage: 36,
      dotDuration: 5,
      slow: 0.24,
    },
    cooldown: 12,
    spellPowerScaling: { damage: 0.62, effect: 0.00045 },
  },
};

const RARITY_POWER_MULTIPLIERS = {
  common: 1,
  uncommon: 1.15,
  rare: 1.32,
  unique: 1.52,
  epic: 1.75,
};

const RARITY_COOLDOWN_FACTORS = {
  common: 1,
  uncommon: 0.95,
  rare: 0.9,
  unique: 0.85,
  epic: 0.78,
};

const NO_SCALE_KEYS = new Set(['duration', 'hit', 'manaCost', 'threshold', 'shots', 'targets', 'hits', 'pulses']);
const CLAMP_PERCENT_KEYS = new Set(['slow', 'damageTakenBonus', 'damageDealtPenalty', 'redirectPercent', 'healPercent']);

const LEVEL_SKIP_KEYS = new Set([
  'duration',
  'fearDuration',
  'stunDuration',
  'slowDuration',
  'manaCost',
  'threshold',
  'redirectPercent',
  'guardRedirect',
  'targets',
  'hits',
  'pulses',
  'shots',
  'tickInterval',
  'maxStacks',
  'maxBounces',
  'slowMultiplier',
]);

const LEVEL_RADIUS_KEYS = new Set(['radius', 'width', 'length', 'arcRadius']);

const LEVEL_RATIO_KEYS = new Set([
  'damageMultiplier',
  'splashMultiplier',
  'ramp',
  'healPercent',
  'primaryHealPercent',
  'allyHealPercent',
  'maxHealthHealPercent',
  'healRatio',
  'slow',
  'critBonus',
  'pierce',
  'attackIntervalModifier',
  'damageTakenBonus',
  'damageDealtPenalty',
  'healReduction',
  'shieldReduction',
  'manaRefundPercent',
]);

const LEVEL_FLAT_GROWTH = 0.22;
const LEVEL_RATIO_GROWTH = 0.03;
const LEVEL_RADIUS_GROWTH = 0.03;
const SPELL_POWER_BASE_MOD = 0.98;
const SPELL_POWER_LEVEL_GROWTH = 0.025;

function formatSkillName(characterName, blueprintName) {
  return blueprintName;
}

function instantiateSkill(character) {
  const blueprint = SKILL_BLUEPRINTS[character.skillBlueprintId];
  if (!blueprint) {
    return null;
  }
  const rarity = character.rarity || 'common';
  const multiplier = RARITY_POWER_MULTIPLIERS[rarity] || 1;
  const cooldownFactor = RARITY_COOLDOWN_FACTORS[rarity] || 1;
  const scaledEffect = blueprint.effect ? scaleSkillEffect(blueprint.effect, multiplier) : null;
  const scaledCooldown = blueprint.cooldown
    ? parseFloat(Math.max(0.5, blueprint.cooldown * cooldownFactor).toFixed(2))
    : blueprint.cooldown;
  return {
    ...blueprint,
    id: character.skillId,
    name: formatSkillName(character.name, blueprint.name),
    characterId: character.id,
    effect: scaledEffect,
    cooldown: scaledCooldown,
  };
}

export const SKILLS = CHARACTERS.map(instantiateSkill).filter(Boolean);

export function getSkillById(skillId) {
  return SKILLS.find((skill) => skill.id === skillId) || null;
}

function scaleSkillEffect(effect, multiplier) {
  const scaled = Array.isArray(effect) ? effect.map((value) => scaleSkillEffect(value, multiplier)) : { ...effect };
  Object.entries(scaled).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      scaled[key] = scaleSkillEffect(value, multiplier);
      return;
    }
    if (typeof value !== 'number') {
      return;
    }
    if (NO_SCALE_KEYS.has(key)) {
      return;
    }
    let nextValue = value * multiplier;
    if (CLAMP_PERCENT_KEYS.has(key)) {
      nextValue = Math.min(0.95, nextValue);
    }
    scaled[key] = parseFloat(nextValue.toFixed(2));
  });
  return scaled;
}

function normalizeLevel(level) {
  const numeric = Number(level);
  if (!Number.isFinite(numeric)) {
    return 1;
  }
  return Math.max(1, Math.floor(numeric));
}

function getLevelSteps(level) {
  return Math.max(0, normalizeLevel(level) - 1);
}

function computeLevelModifiers(level) {
  const steps = getLevelSteps(level);
  const flat = Math.pow(1 + LEVEL_FLAT_GROWTH, steps);
  const ratio = 1 + LEVEL_RATIO_GROWTH * steps;
  const radius = 1 + LEVEL_RADIUS_GROWTH * steps;
  const spellBase = steps > 0 ? SPELL_POWER_BASE_MOD : 1;
  const spell = spellBase * Math.pow(1 + SPELL_POWER_LEVEL_GROWTH, steps);
  return { steps, flat, ratio, radius, spell };
}

function scaleNumericValueByLevel(key, value, modifiers) {
  if (!Number.isFinite(value) || !modifiers || modifiers.steps <= 0) {
    return value;
  }
  if (LEVEL_SKIP_KEYS.has(key)) {
    return value;
  }
  if (LEVEL_RADIUS_KEYS.has(key)) {
    const scaled = value * modifiers.radius;
    if (Math.abs(scaled) >= 10 || Number.isInteger(value)) {
      return Math.round(scaled);
    }
    return parseFloat(scaled.toFixed(2));
  }
  if (LEVEL_RATIO_KEYS.has(key)) {
    let scaled = value * modifiers.ratio;
    if (CLAMP_PERCENT_KEYS.has(key)) {
      scaled = Math.min(0.95, Math.max(-0.95, scaled));
    }
    const precision = Math.abs(scaled) < 1 ? 3 : 2;
    return parseFloat(scaled.toFixed(precision));
  }
  let scaled = value * modifiers.flat;
  if (CLAMP_PERCENT_KEYS.has(key)) {
    scaled = Math.min(0.95, Math.max(-0.95, scaled));
  }
  if (Math.abs(scaled) >= 10 || Number.isInteger(value)) {
    return Math.round(scaled);
  }
  return parseFloat(scaled.toFixed(2));
}

function scaleEffectByLevel(effect, modifiers) {
  if (!effect) {
    return effect;
  }
  if (Array.isArray(effect)) {
    return effect.map((entry) => scaleEffectByLevel(entry, modifiers));
  }
  const scaled = { ...effect };
  Object.entries(scaled).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      scaled[key] = scaleEffectByLevel(value, modifiers);
      return;
    }
    if (typeof value !== 'number') {
      return;
    }
    scaled[key] = scaleNumericValueByLevel(key, value, modifiers);
  });
  return scaled;
}

function scaleSpellPowerRatios(scaling, modifiers) {
  if (!scaling) {
    return scaling;
  }
  const scaled = {};
  Object.entries(scaling).forEach(([key, value]) => {
    if (!Number.isFinite(value)) {
      return;
    }
    const adjusted = value * modifiers.spell;
    scaled[key] = parseFloat(adjusted.toFixed(4));
  });
  return scaled;
}

export function getSkillLevelModifiers(level = 1) {
  return computeLevelModifiers(level);
}

export function scaleSkillForLevel(skill, level = 1) {
  if (!skill) {
    return null;
  }
  const modifiers = computeLevelModifiers(level);
  const leveled = { ...skill };
  leveled.level = normalizeLevel(level);
  leveled.effect = skill.effect ? scaleEffectByLevel(skill.effect, modifiers) : skill.effect;
  leveled.spellPowerScaling = skill.spellPowerScaling
    ? scaleSpellPowerRatios(skill.spellPowerScaling, modifiers)
    : skill.spellPowerScaling;
  return leveled;
}
