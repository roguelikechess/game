export const TRAITS = [
  {
    id: 'critical-edge',
    name: '극한의 일격',
    description: '공격 시 20% 확률로 치명타를 가하여 피해가 200%가 된다.',
    effects: {
      criticalChance: 0.2,
      criticalMultiplier: 2.0,
    },
  },
  {
    id: 'vital-renewal',
    name: '생명 순환',
    description: '전투 중 초당 체력을 1%씩 회복한다.',
    effects: {
      regenPercentPerSecond: 0.01,
    },
  },
  {
    id: 'life-draught',
    name: '생명 착취',
    description: '적에게 피해를 주면 25%를 흡혈하여 자신을 치유한다.',
    effects: {
      lifesteal: 0.25,
    },
  },
  {
    id: 'arcane-battery',
    name: '마력 축전',
    description: '마나 재생 속도가 40% 증가한다.',
    effects: {
      manaRegenMultiplier: 1.4,
    },
  },
  {
    id: 'iron-wall',
    name: '철벽',
    description: '받는 피해가 12% 감소한다.',
    effects: {
      damageReduction: 0.12,
    },
  },
  {
    id: 'battle-trance',
    name: '전투 몰입',
    description:
      '공격할 때마다 가속 중첩을 0.04만큼 쌓아 중첩당 공격 간격을 0.05초씩 단축한다.',
    effects: {
      rampingAttackSpeed: 0.04,
    },
  },
  {
    id: 'sunlit-fervor',
    name: '태양 열기',
    description:
      '치명타 확률이 8% 증가하고 공격마다 0.03중첩을 얻어 공격 간격이 중첩당 0.05초 줄어든다.',
    effects: {
      criticalChance: 0.08,
      rampingAttackSpeed: 0.03,
    },
  },
  {
    id: 'stone-bulwark',
    name: '바위 방벽',
    description: '받는 모든 피해를 18% 감소시킨다.',
    effects: {
      damageReduction: 0.18,
    },
  },
  {
    id: 'deep-focus',
    name: '심연 집중',
    description: '마나 재생이 30% 증가하고 초당 체력을 0.5% 회복한다.',
    effects: {
      manaRegenMultiplier: 1.3,
      regenPercentPerSecond: 0.005,
    },
  },
  {
    id: 'phantom-stride',
    name: '환영의 발걸음',
    description:
      '공격마다 0.06중첩을 얻어 중첩당 공격 간격을 0.05초씩 줄여 초반보다 훨씬 빨라진다.',
    effects: {
      rampingAttackSpeed: 0.06,
    },
  },
  {
    id: 'blood-frenzy',
    name: '혈기의 광란',
    description: '가한 피해의 35%를 생명력으로 흡수한다.',
    effects: {
      lifesteal: 0.35,
    },
  },
  {
    id: 'celestial-aegis',
    name: '천상의 방패',
    description: '받는 피해를 8% 줄이고 초당 체력을 1%씩 회복한다.',
    effects: {
      damageReduction: 0.08,
      regenPercentPerSecond: 0.01,
    },
  },
  {
    id: 'ember-heart',
    name: '잿불의 심장',
    description: '치명타 확률이 12% 증가한다.',
    effects: {
      criticalChance: 0.12,
    },
  },
  {
    id: 'frost-vein',
    name: '서릿발 정맥',
    description: '받는 피해를 10% 줄이고 가한 피해의 12%를 흡혈한다.',
    effects: {
      damageReduction: 0.1,
      lifesteal: 0.12,
    },
  },
  {
    id: 'void-channel',
    name: '공허 통로',
    description: '마나 재생이 60% 증가한다.',
    effects: {
      manaRegenMultiplier: 1.6,
    },
  },
  {
    id: 'serene-mind',
    name: '고요한 정신',
    description: '평정심이 몸을 감싸 초당 1.5%의 체력을 회복한다.',
    effects: {
      regenPercentPerSecond: 0.015,
    },
  },
  {
    id: 'storm-dancer',
    name: '폭풍 무희',
    description: '치명타 확률이 6% 증가하고 공격마다 0.05중첩으로 공격 간격을 0.05초씩 줄인다.',
    effects: {
      rampingAttackSpeed: 0.05,
      criticalChance: 0.06,
    },
  },
  {
    id: 'spirit-drawn',
    name: '정령 인도',
    description: '가한 피해의 18%를 흡혈하고 초당 체력을 0.8% 회복한다.',
    effects: {
      lifesteal: 0.18,
      regenPercentPerSecond: 0.008,
    },
  },
  {
    id: 'guardian-pulse',
    name: '수호의 맥동',
    description: '받는 피해를 14% 줄이고 초당 체력을 0.6% 회복한다.',
    effects: {
      damageReduction: 0.14,
      regenPercentPerSecond: 0.006,
    },
  },
  {
    id: 'night-harvest',
    name: '밤의 수확자',
    description: '가한 피해의 28%를 흡혈한다.',
    effects: {
      lifesteal: 0.28,
    },
  },
  {
    id: 'arc-light',
    name: '아크 라이트',
    description: '치명타 확률이 9% 증가하고 마나 재생이 20% 상승한다.',
    effects: {
      criticalChance: 0.09,
      manaRegenMultiplier: 1.2,
    },
  },
  {
    id: 'moon-ward',
    name: '달빛 수호',
    description: '받는 피해를 12% 줄이고 마나 재생을 10% 높인다.',
    effects: {
      damageReduction: 0.12,
      manaRegenMultiplier: 1.1,
    },
  },
  {
    id: 'tide-sage',
    name: '조류 현자',
    description: '바다의 조류를 느끼며 초당 2%의 체력을 재생한다.',
    effects: {
      regenPercentPerSecond: 0.02,
    },
  },
  {
    id: 'howling-gale',
    name: '울부짖는 돌풍',
    description: '공격마다 0.07중첩을 얻어 중첩당 공격 간격을 0.05초씩 줄인다.',
    effects: {
      rampingAttackSpeed: 0.07,
    },
  },
  {
    id: 'obsidian-guard',
    name: '흑요석 수문장',
    description: '받는 모든 피해를 20% 감소시킨다.',
    effects: {
      damageReduction: 0.2,
    },
  },
  {
    id: 'sanguine-surge',
    name: '선혈의 분출',
    description: '치명타 확률이 5% 증가하고 가한 피해의 22%를 흡혈한다.',
    effects: {
      lifesteal: 0.22,
      criticalChance: 0.05,
    },
  },
  {
    id: 'rune-sip',
    name: '룬의 모주',
    description: '마나 재생이 50% 증가하고 초당 체력을 0.4% 회복한다.',
    effects: {
      manaRegenMultiplier: 1.5,
      regenPercentPerSecond: 0.004,
    },
  },
  {
    id: 'ancient-echo',
    name: '고대의 메아리',
    description: '초당 체력을 1.2% 회복하고 받는 피해를 6% 감소시킨다.',
    effects: {
      regenPercentPerSecond: 0.012,
      damageReduction: 0.06,
    },
  },
  {
    id: 'swift-arrows',
    name: '민첩한 화살',
    description: '공격마다 0.05중첩으로 공격 간격을 줄이고 치명타 피해 배율이 170%가 된다.',
    effects: {
      rampingAttackSpeed: 0.05,
      criticalMultiplier: 1.7,
    },
  },
  {
    id: 'radiant-song',
    name: '광휘의 노래',
    description: '마나 재생이 25% 증가하고 초당 체력을 1% 회복한다.',
    effects: {
      manaRegenMultiplier: 1.25,
      regenPercentPerSecond: 0.01,
    },
  },
  {
    id: 'ember-resonance',
    name: '잿불 공명',
    description: '치명타 확률이 5% 올라가고 공격마다 0.04중첩으로 공격 간격을 단축한다.',
    effects: {
      criticalChance: 0.05,
      rampingAttackSpeed: 0.04,
    },
  },
  {
    id: 'guardian-ward',
    name: '수호의 결계',
    description: '받는 피해를 10% 줄이고 초당 체력을 0.6% 회복한다.',
    effects: {
      damageReduction: 0.1,
      regenPercentPerSecond: 0.006,
    },
  },
  {
    id: 'shadow-thread',
    name: '그림자 매듭',
    description:
      '가한 피해의 18%를 흡혈하고 공격마다 0.03중첩으로 공격 간격을 0.05초 줄인다.',
    effects: {
      lifesteal: 0.18,
      rampingAttackSpeed: 0.03,
    },
  },
  {
    id: 'glacial-focus',
    name: '빙결의 집중',
    description: '마나 재생이 30% 증가하고 받는 피해가 5% 감소한다.',
    effects: {
      manaRegenMultiplier: 1.3,
      damageReduction: 0.05,
    },
  },
  {
    id: 'spirit-surge',
    name: '정령의 분출',
    description: '초당 체력을 1.5% 회복하고 가한 피해의 10%를 흡혈한다.',
    effects: {
      regenPercentPerSecond: 0.015,
      lifesteal: 0.1,
    },
  },
  {
    id: 'storm-ritual',
    name: '폭풍의 의식',
    description: '치명타 확률이 4% 증가하고 마나 재생이 20% 상승한다.',
    effects: {
      criticalChance: 0.04,
      manaRegenMultiplier: 1.2,
    },
  },
  {
    id: 'stoneheart',
    name: '돌심장',
    description: '받는 피해를 16% 줄이고 초당 체력을 0.4% 회복한다.',
    effects: {
      damageReduction: 0.16,
      regenPercentPerSecond: 0.004,
    },
  },
  {
    id: 'night-temper',
    name: '밤의 단련',
    description: '치명타 확률이 7% 증가하고 가한 피해의 15%를 흡혈한다.',
    effects: {
      criticalChance: 0.07,
      lifesteal: 0.15,
    },
  },
  {
    id: 'celestial-tide',
    name: '천상의 흐름',
    description: '마나 재생이 35% 증가하고 공격마다 0.025중첩으로 공격 간격을 줄인다.',
    effects: {
      manaRegenMultiplier: 1.35,
      rampingAttackSpeed: 0.025,
    },
  },
];

export function getTraitById(traitId) {
  return TRAITS.find((trait) => trait.id === traitId) || null;
}
