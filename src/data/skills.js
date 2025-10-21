import { CHARACTERS } from './characters.js';

const SKILL_BLUEPRINTS = {
  'blade-tempest': {
    name: '블레이드 템페스트',
    jobId: 'swordsman',
    description: '짧은 시간 동안 공격 속도가 크게 증가하여 빠르게 베어낸다.',
    effect: { kind: 'self-buff', stat: 'attackInterval', modifier: -0.35, duration: 4 },
    cooldown: 11,
  },
  'sun-sunder': {
    name: '태양 가르기',
    jobId: 'swordsman',
    description: '순식간에 접근해 연속으로 베어 적을 몰아붙이고 둔화시킨다.',
    effect: { kind: 'dash-flurry', hits: 3, damageMultiplier: 0.7, ramp: 0.15, slow: 0.25, slowDuration: 2 },
    cooldown: 12,
  },
  'eclipse-rend': {
    name: '일식의 참격',
    jobId: 'swordsman',
    description: '어둠과 빛을 두 번 교차시켜 큰 피해를 주고 적을 약화시킨다.',
    effect: { kind: 'dash-flurry', hits: 2, damageMultiplier: 0.95, damageTakenBonus: 0.12, slow: 0.18, slowDuration: 2.4 },
    cooldown: 13,
  },
  'phoenix-guard': {
    name: '불사조 수호',
    jobId: 'swordsman',
    description: '검무로 적을 베고 자신에게 불꽃 보호막을 두른다.',
    effect: { kind: 'dash-flurry', hits: 3, damageMultiplier: 0.82, shield: 160, ramp: 0.18, slow: 0.22, slowDuration: 2.6 },
    cooldown: 11,
  },
  'celestial-rush': {
    name: '성좌 질주',
    jobId: 'swordsman',
    description: '성좌의 힘을 담은 일격으로 적을 가르고 빛의 여파를 남긴다.',
    effect: { kind: 'dash-flurry', hits: 4, damageMultiplier: 0.74, ramp: 0.22, slow: 0.28, slowDuration: 3.2, shield: 200 },
    cooldown: 11,
  },
  'moon-cleave': {
    name: '월광참',
    jobId: 'swordsman',
    description: '대상에게 돌진해 부채꼴 범위로 베어 큰 피해를 준다.',
    effect: { kind: 'cleave', radius: 80, damageMultiplier: 1.4 },
    cooldown: 10,
  },
  'riposte-surge': {
    name: '리포스트 서지',
    jobId: 'swordsman',
    description: '방어 자세로 전환하여 다음 공격을 막고 강력하게 반격한다.',
    effect: { kind: 'counter', damageMultiplier: 1.8, shield: 160 },
    cooldown: 13,
  },
  'aegis-bastion': {
    name: '이지스 보루',
    jobId: 'knight',
    description: '자신과 주변 아군에게 보호막을 부여하고 방어력을 높인다.',
    effect: { kind: 'shield', radius: 120, shieldValue: 220, defenseBonus: 18, duration: 6 },
    cooldown: 15,
  },
  'lance-charge': {
    name: '랜스 차지',
    jobId: 'knight',
    description: '지정한 적에게 돌진하며 꿰뚫어 기절을 건다.',
    effect: { kind: 'stun-strike', damageMultiplier: 1.5, stunDuration: 2.4 },
    cooldown: 14,
  },
  'guardian-oath': {
    name: '수호의 서약',
    jobId: 'knight',
    description: '동료 대신 피해를 받아내며 일정 시간 방패를 강화한다.',
    effect: { kind: 'guard', redirectPercent: 0.35, duration: 6 },
    cooldown: 17,
  },
  'solar-bulwark': {
    name: '태양의 보루',
    jobId: 'knight',
    description: '빛의 충격파로 아군을 감싸고 근처 적에게 충격을 준다.',
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
    description: '광휘를 폭발시켜 동료를 강화하고 적을 밀어낸다.',
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
    description: '전장의 동료들을 모아 방패를 강화하고 적의 움직임을 둔화시킨다.',
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
    description: '바닥을 내리쳐 충격파를 만들어 다수의 적에게 피해를 준다.',
    effect: { kind: 'ground-slam', radius: 110, damageMultiplier: 1.2, slow: 0.4 },
    cooldown: 11,
  },
  'berserk-flame': {
    name: '광전사의 불꽃',
    jobId: 'warrior',
    description: '체력이 낮을수록 공격력이 크게 증가한다.',
    effect: { kind: 'rampage', threshold: 0.5, attackBonus: 28 },
    cooldown: 0,
  },
  'unyielding-roar': {
    name: '불굴의 포효',
    jobId: 'warrior',
    description: '포효로 자신과 주변 아군의 체력을 회복시키고 공포를 유발한다.',
    effect: { kind: 'warcry', healPercent: 0.12, fearDuration: 1.6 },
    cooldown: 16,
  },
  'seismic-crash': {
    name: '지각 붕괴',
    jobId: 'warrior',
    description: '대지의 파동을 일으켜 단일 적에게 큰 피해와 충격을 준다.',
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
    description: '용암의 힘으로 땅을 폭발시켜 적을 넘어뜨리고 약화시킨다.',
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
    description: '순식간에 화살 세 발을 연달아 발사해 단일 적에게 큰 피해를 준다.',
    effect: { kind: 'burst-shot', shots: 3, damageMultiplier: 0.9 },
    cooldown: 11,
  },
  'piercing-rain': {
    name: '관통의 비',
    jobId: 'archer',
    description: '직선상의 적을 관통하는 화살비를 쏟아붓는다.',
    effect: { kind: 'line-shot', width: 60, damageMultiplier: 0.85 },
    cooldown: 14,
  },
  'hawk-eye': {
    name: '매의 눈',
    jobId: 'archer',
    description: '적을 조준하여 치명타 확률과 사거리를 증가시킨다.',
    effect: { kind: 'precision', critBonus: 0.25, rangeBonus: 40, duration: 7 },
    cooldown: 16,
  },
  'gale-splitter': {
    name: '질풍 일제사격',
    jobId: 'archer',
    description: '순식간에 여러 적을 겨냥해 집중 사격을 가한다.',
    effect: { kind: 'seeker-barrage', targets: 3, damageMultiplier: 0.85, ramp: 0.12 },
    cooldown: 12,
  },
  'shadow-barrage': {
    name: '그림자 집중포화',
    jobId: 'archer',
    description: '어둠의 화살이 가장 위협적인 적을 찾아 순차적으로 타격한다.',
    effect: { kind: 'seeker-barrage', targets: 4, damageMultiplier: 0.8, ramp: 0.14, slow: 0.18 },
    cooldown: 13,
  },
  'storm-hail': {
    name: '폭풍 화살우박',
    jobId: 'archer',
    description: '폭풍을 타고 날아온 화살우박이 전장을 휩쓴다.',
    effect: { kind: 'seeker-barrage', targets: 5, damageMultiplier: 0.78, ramp: 0.16, pierce: 0.4 },
    cooldown: 15,
  },
  'arcane-comet': {
    name: '비전 혜성',
    jobId: 'mage',
    description: '범위에 비전 혜성을 떨어뜨려 광역 피해를 준다.',
    effect: { kind: 'aoe-spell', radius: 130, damageMultiplier: 1.35 },
    cooldown: 5,
    spellPowerScaling: { damage: 0.8, effect: 0.0012 },
  },
  'temporal-shift': {
    name: '시간 왜곡',
    jobId: 'mage',
    description: '일시적으로 시간을 늦추어 적의 이동 속도를 크게 감소시킨다.',
    effect: { kind: 'slow-field', radius: 160, slow: 0.5, duration: 4.5 },
    cooldown: 7,
    spellPowerScaling: { effect: 0.0011, duration: 0.0007 },
  },
  'mana-implosion': {
    name: '마나 폭발',
    jobId: 'mage',
    description: '마나를 소모하여 주변 적에게 누적 피해를 폭발시킨다.',
    effect: { kind: 'mana-burst', manaCost: 60, damagePerMana: 1.1, radius: 120 },
    cooldown: 8,
    spellPowerScaling: { damage: 0.55 },
  },
  'astral-cascade': {
    name: '성운 연쇄',
    jobId: 'mage',
    description: '성운의 힘을 연속 방출해 여러 적을 타격하고 마나를 회복한다.',
    effect: { kind: 'arcane-cascade', pulses: 3, damageMultiplier: 1.05, radius: 140, manaGift: 14 },
    cooldown: 5.5,
    spellPowerScaling: { damage: 0.55, effect: 0.0009, mana: 0.12 },
  },
  'celestial-burst': {
    name: '천구 폭발',
    jobId: 'mage',
    description: '집중된 별빛을 폭발시켜 광역 피해와 둔화를 동시에 준다.',
    effect: { kind: 'arcane-cascade', pulses: 4, damageMultiplier: 1.15, radius: 150, manaGift: 18, slow: 0.22 },
    cooldown: 6.5,
    spellPowerScaling: { damage: 0.6, effect: 0.001, mana: 0.1 },
  },
  'radiant-mending': {
    name: '광휘 치유',
    jobId: 'healer',
    description: '광휘의 파동으로 아군 하나를 치유하고 짧은 보호막을 부여한다.',
    effect: { kind: 'single-heal', healAmount: 280, shieldValue: 140 },
    cooldown: 7,
    spellPowerScaling: { heal: 0.9, shield: 0.45 },
  },
  'guardian-prayer': {
    name: '수호 기도',
    jobId: 'healer',
    description: '일정 시간 대상에게 주기적 회복과 보호막을 부여한다.',
    effect: { kind: 'regen', duration: 6, tickHeal: 36, shieldValue: 120 },
    cooldown: 12,
    spellPowerScaling: { heal: 0.25, duration: 0.0006, shield: 0.32 },
  },
  'verdant-bloom': {
    name: '신록의 꽃',
    jobId: 'healer',
    description: '치유의 꽃이 피어나 대상을 회복시키고 보호막과 재생을 함께 나눈다.',
    effect: {
      kind: 'renewal-burst',
      primaryHealPercent: 0.2,
      flatHeal: 180,
      radius: 120,
      regen: 28,
      duration: 6,
      primaryShield: 160,
      allyShield: 90,
    },
    cooldown: 9,
    spellPowerScaling: { heal: 0.6, effect: 0.0006, shield: 0.35 },
  },
  'revitalizing-anthem': {
    name: '생기 넘치는 송가',
    jobId: 'healer',
    description: '노래로 전원의 체력과 마나를 서서히 회복시키고 얇은 보호막을 부여한다.',
    effect: { kind: 'team-regen', duration: 8, healPerSecond: 18, manaPerSecond: 6, shieldValue: 80 },
    cooldown: 18,
    spellPowerScaling: { heal: 0.22, mana: 0.06, duration: 0.0004, shield: 0.28 },
  },
  'spear-of-dawn': {
    name: '새벽의 창',
    jobId: 'consecrator',
    description: '빛의 창을 던져 적에게 피해를 주고 아군에게 공격 버프와 보호막을 준다.',
    effect: { kind: 'smite-buff', damageMultiplier: 1.1, attackBonus: 18, duration: 6, shieldValue: 90 },
    cooldown: 9,
    spellPowerScaling: { damage: 0.55, effect: 0.0004, shield: 0.28 },
  },
  'holy-bastion': {
    name: '성역의 장벽',
    jobId: 'consecrator',
    description: '아군의 방어력을 크게 높이고 보호막을 전개한다.',
    effect: { kind: 'fortify', defenseBonus: 24, magicDefenseBonus: 18, duration: 8, shieldValue: 140 },
    cooldown: 15,
    spellPowerScaling: { effect: 0.0007, duration: 0.0005, shield: 0.38 },
  },
  'radiant-chain': {
    name: '광휘 연쇄',
    jobId: 'consecrator',
    description: '연쇄되는 빛으로 다수의 아군에게 버프와 보호막을 전달한다.',
    effect: {
      kind: 'chain-buff',
      attackBonus: 12,
      defenseBonus: 12,
      magicDefenseBonus: 10,
      targets: 3,
      duration: 6,
      shieldValue: 100,
    },
    cooldown: 13,
    spellPowerScaling: { effect: 0.0005, duration: 0.0004, shield: 0.32 },
  },
  'dawn-sanctuary': {
    name: '여명의 성역',
    jobId: 'consecrator',
    description: '여명의 기운으로 전장을 정화하고 동료를 강화한다.',
    effect: {
      kind: 'sanctify-wave',
      duration: 7,
      attackBonus: 14,
      defenseBonus: 14,
      shieldValue: 160,
      manaPerSecond: 6,
      magicDefenseBonus: 14,
    },
    cooldown: 14,
    spellPowerScaling: { shield: 0.45, effect: 0.0005, mana: 0.08 },
  },
  'shadow-hex': {
    name: '그림자 저주',
    jobId: 'warlock',
    description: '적에게 저주를 걸어 피해를 증폭시키고 치유·보호 효과를 약화시킨다.',
    effect: {
      kind: 'curse',
      damageTakenBonus: 0.18,
      damageDealtPenalty: 0.12,
      duration: 7,
      healReduction: 0.35,
      shieldReduction: 0.28,
    },
    cooldown: 9,
    spellPowerScaling: { effect: 0.0006, duration: 0.0004 },
  },
  'void-siphon': {
    name: '공허 흡수',
    jobId: 'warlock',
    description: '적의 체력을 흡수해 자신의 체력과 마나를 회복하고 상대의 치유·보호 효과를 약화시킨다.',
    effect: {
      kind: 'drain',
      damage: 160,
      healRatio: 0.7,
      manaGain: 30,
      healReduction: 0.25,
      shieldReduction: 0.2,
      debuffDuration: 4,
    },
    cooldown: 11,
    spellPowerScaling: { damage: 0.55, heal: 0.42, mana: 0.12, effect: 0.0005 },
  },
  'nightmare-sigil': {
    name: '악몽의 인장',
    jobId: 'warlock',
    description: '범위 내 적에게 공포와 지속 피해를 가하고 치유·보호 효과를 약화시킨다.',
    effect: {
      kind: 'damage-over-time',
      radius: 120,
      tickDamage: 32,
      duration: 6,
      healReduction: 0.22,
      shieldReduction: 0.16,
    },
    cooldown: 16,
    spellPowerScaling: { damage: 0.32, duration: 0.0005 },
  },
  'void-collapse': {
    name: '공허 붕괴',
    jobId: 'warlock',
    description: '공허의 균열을 만들어 적을 찢어놓고 마나를 흡수하며 치유·보호 효과를 붕괴시킨다.',
    effect: {
      kind: 'void-collapse',
      damageMultiplier: 1.2,
      radius: 120,
      dotDamage: 32,
      dotDuration: 5,
      slow: 0.22,
      manaBurn: 18,
      damageTakenBonus: 0.1,
      healReduction: 0.28,
      shieldReduction: 0.24,
    },
    cooldown: 12,
    spellPowerScaling: { damage: 0.6, effect: 0.0006, mana: 0.06 },
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
