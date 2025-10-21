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
    description: '전투가 길어질수록 공격 속도가 점점 빨라진다.',
    effects: {
      rampingAttackSpeed: 0.04,
    },
  },
  {
    id: 'sunlit-fervor',
    name: '태양 열기',
    description: '열정이 솟구쳐 치명타 확률과 공격 가속이 모두 증가한다.',
    effects: {
      criticalChance: 0.08,
      rampingAttackSpeed: 0.03,
    },
  },
  {
    id: 'stone-bulwark',
    name: '바위 방벽',
    description: '대지의 힘이 몸을 감싸 받아내는 피해를 크게 줄인다.',
    effects: {
      damageReduction: 0.18,
    },
  },
  {
    id: 'deep-focus',
    name: '심연 집중',
    description: '깊은 호흡으로 마나 재생이 빨라지고 체력이 서서히 회복된다.',
    effects: {
      manaRegenMultiplier: 1.3,
      regenPercentPerSecond: 0.005,
    },
  },
  {
    id: 'phantom-stride',
    name: '환영의 발걸음',
    description: '움직임이 환영처럼 빨라져 공격 가속이 크게 오른다.',
    effects: {
      rampingAttackSpeed: 0.06,
    },
  },
  {
    id: 'blood-frenzy',
    name: '혈기의 광란',
    description: '흘린 피를 에너지로 삼아 더 많은 체력을 흡수한다.',
    effects: {
      lifesteal: 0.35,
    },
  },
  {
    id: 'celestial-aegis',
    name: '천상의 방패',
    description: '빛의 보호막이 피해를 막아내고 체력을 조금씩 회복시킨다.',
    effects: {
      damageReduction: 0.08,
      regenPercentPerSecond: 0.01,
    },
  },
  {
    id: 'ember-heart',
    name: '잿불의 심장',
    description: '타오르는 심장이 치명타 확률을 크게 끌어올린다.',
    effects: {
      criticalChance: 0.12,
    },
  },
  {
    id: 'frost-vein',
    name: '서릿발 정맥',
    description: '냉기의 흐름이 몸을 단단하게 하고 적의 생명을 흡수한다.',
    effects: {
      damageReduction: 0.1,
      lifesteal: 0.12,
    },
  },
  {
    id: 'void-channel',
    name: '공허 통로',
    description: '공허의 흐름을 받아들여 마나 재생이 크게 향상된다.',
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
    description: '폭풍과 함께 춤추어 치명타 확률과 공격 속도가 모두 상승한다.',
    effects: {
      rampingAttackSpeed: 0.05,
      criticalChance: 0.06,
    },
  },
  {
    id: 'spirit-drawn',
    name: '정령 인도',
    description: '정령의 축복으로 흡혈과 재생이 동시에 이루어진다.',
    effects: {
      lifesteal: 0.18,
      regenPercentPerSecond: 0.008,
    },
  },
  {
    id: 'guardian-pulse',
    name: '수호의 맥동',
    description: '수호의 파동이 전해져 피해를 줄이고 체력을 서서히 회복한다.',
    effects: {
      damageReduction: 0.14,
      regenPercentPerSecond: 0.006,
    },
  },
  {
    id: 'night-harvest',
    name: '밤의 수확자',
    description: '어둠 속에서 전투할 때 더 많은 생명을 흡수한다.',
    effects: {
      lifesteal: 0.28,
    },
  },
  {
    id: 'arc-light',
    name: '아크 라이트',
    description: '비전의 번개가 치명타 확률과 마나 재생을 모두 향상한다.',
    effects: {
      criticalChance: 0.09,
      manaRegenMultiplier: 1.2,
    },
  },
  {
    id: 'moon-ward',
    name: '달빛 수호',
    description: '달빛이 내려와 받는 피해를 줄이고 마나 회복을 돕는다.',
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
    description: '거센 돌풍이 움직임을 재촉해 공격 속도가 빠르게 증가한다.',
    effects: {
      rampingAttackSpeed: 0.07,
    },
  },
  {
    id: 'obsidian-guard',
    name: '흑요석 수문장',
    description: '흑요석 장벽이 몸을 감싸 받는 피해를 크게 감소시킨다.',
    effects: {
      damageReduction: 0.2,
    },
  },
  {
    id: 'sanguine-surge',
    name: '선혈의 분출',
    description: '피의 열기가 치명타와 흡혈 모두를 강화한다.',
    effects: {
      lifesteal: 0.22,
      criticalChance: 0.05,
    },
  },
  {
    id: 'rune-sip',
    name: '룬의 모주',
    description: '고대 룬 주스를 마셔 마나 재생과 재생력을 동시에 올린다.',
    effects: {
      manaRegenMultiplier: 1.5,
      regenPercentPerSecond: 0.004,
    },
  },
  {
    id: 'ancient-echo',
    name: '고대의 메아리',
    description: '고대의 메아리가 몸을 감싸 체력을 회복하고 피해를 줄인다.',
    effects: {
      regenPercentPerSecond: 0.012,
      damageReduction: 0.06,
    },
  },
  {
    id: 'swift-arrows',
    name: '민첩한 화살',
    description: '민첩한 손놀림으로 공격 가속이 늘어나고 치명타 피해가 상승한다.',
    effects: {
      rampingAttackSpeed: 0.05,
      criticalMultiplier: 1.7,
    },
  },
  {
    id: 'radiant-song',
    name: '광휘의 노래',
    description: '찬란한 선율이 마나 재생과 체력 회복을 모두 돕는다.',
    effects: {
      manaRegenMultiplier: 1.25,
      regenPercentPerSecond: 0.01,
    },
  },
  {
    id: 'ember-resonance',
    name: '잿불 공명',
    description: '타오르는 공명이 치명타 확률과 공격 속도를 동시에 끌어올립니다.',
    effects: {
      criticalChance: 0.05,
      rampingAttackSpeed: 0.04,
    },
  },
  {
    id: 'guardian-ward',
    name: '수호의 결계',
    description: '수호 결계가 피해를 줄이고 체력을 서서히 회복시켜 줍니다.',
    effects: {
      damageReduction: 0.1,
      regenPercentPerSecond: 0.006,
    },
  },
  {
    id: 'shadow-thread',
    name: '그림자 매듭',
    description: '그림자 매듭이 전투에 집중할수록 공격 속도를 높이고 생명을 흡수합니다.',
    effects: {
      lifesteal: 0.18,
      rampingAttackSpeed: 0.03,
    },
  },
  {
    id: 'glacial-focus',
    name: '빙결의 집중',
    description: '차가운 집중이 마나 회복과 방어력을 모두 강화합니다.',
    effects: {
      manaRegenMultiplier: 1.3,
      damageReduction: 0.05,
    },
  },
  {
    id: 'spirit-surge',
    name: '정령의 분출',
    description: '정령의 힘이 체력 재생과 흡혈을 동시에 끌어올립니다.',
    effects: {
      regenPercentPerSecond: 0.015,
      lifesteal: 0.1,
    },
  },
  {
    id: 'storm-ritual',
    name: '폭풍의 의식',
    description: '폭풍 의식이 치명타와 마나 회복을 가속합니다.',
    effects: {
      criticalChance: 0.04,
      manaRegenMultiplier: 1.2,
    },
  },
  {
    id: 'stoneheart',
    name: '돌심장',
    description: '돌처럼 단단한 심장이 피해를 덜 받고 조금씩 회복하게 합니다.',
    effects: {
      damageReduction: 0.16,
      regenPercentPerSecond: 0.004,
    },
  },
  {
    id: 'night-temper',
    name: '밤의 단련',
    description: '밤의 단련으로 치명타 확률과 생명흡수가 크게 향상됩니다.',
    effects: {
      criticalChance: 0.07,
      lifesteal: 0.15,
    },
  },
  {
    id: 'celestial-tide',
    name: '천상의 흐름',
    description: '천상의 흐름이 마나 재생과 공격 가속을 서서히 높입니다.',
    effects: {
      manaRegenMultiplier: 1.35,
      rampingAttackSpeed: 0.025,
    },
  },
];

export function getTraitById(traitId) {
  return TRAITS.find((trait) => trait.id === traitId) || null;
}
