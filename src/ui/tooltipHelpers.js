import { getTooltip } from './tooltip.js';
import { formatLevelBadge } from './identity.js';
import { el } from './dom.js';
import {
  ITEM_BLUEPRINTS,
  computeItemEffectValues,
  getItemEnhanceCost,
  getItemSellValue,
} from '../game/items.js';
import { getSkillLevelModifiers } from '../game/skills.js';
import { getPortraitById } from '../data/assets.js';

const ROLE_LABELS = {
  frontline: '전열',
  midline: '중열',
  backline: '후열',
};

const RARITY_LABELS = {
  common: '커먼',
  uncommon: '언커먼',
  rare: '레어',
  unique: '유니크',
  epic: '에픽',
};

const ITEM_TYPE_LABELS = {
  weapon: '무기',
  armor: '방어구',
  accessory: '장신구',
};

const ITEM_SLOT_LABELS = {
  hand: '손',
  body: '몸통',
  trinket: '장신구',
};

const STAT_LABELS = {
  attack: '공격력',
  defense: '방어력',
  magicDefense: '마법 방어력',
  spellPower: '주문력',
  maxHealth: '최대 체력',
  maxMana: '마나',
  mana: '마나',
  range: '사거리',
  speed: '이동 속도',
  attackInterval: '공격 간격',
  manaRegen: '마나 회복',
};

const STAT_ICONS = {
  maxHealth: '❤️',
  health: '❤️',
  attack: '🗡️',
  defense: '🛡️',
  magicDefense: '🔮',
  spellPower: '✨',
  maxMana: '🔷',
  mana: '🔷',
  speed: '💨',
  attackInterval: '⏱️',
  range: '🎯',
  manaRegen: '🔁',
};

const MODIFIER_LABELS = {
  attackIntervalMultiplier: '공격 속도 배율',
  speed: '이동 속도',
  manaRegen: '마나 회복',
  cooldownReduction: '쿨타임 감소',
  lifesteal: '생명력 흡수',
  regenPercentPerSecond: '초당 체력 재생',
  debuffDurationReduction: '디버프 지속 시간 감소',
  shieldShredOnHit: '공격 시 보호막 약화',
};

function createTooltipPortraitElement(asset, root) {
  if (!asset?.splashSources?.length) {
    return null;
  }
  const sources = Array.from(new Set(asset.splashSources.filter(Boolean)));
  if (!sources.length) {
    return null;
  }
  const frame = el('div', { className: 'unit-tooltip-portrait loading' });
  if (asset.fallback?.color) {
    frame.style.backgroundColor = asset.fallback.color;
  }
  const image = new Image();
  image.decoding = 'async';
  image.loading = 'lazy';
  let index = 0;
  const tryNext = () => {
    if (index >= sources.length) {
      frame.remove();
      if (root) {
        root.classList.remove('has-portrait');
      }
      return;
    }
    const src = sources[index];
    index += 1;
    image.onload = () => {
      frame.style.backgroundImage = `url(${image.src})`;
      frame.classList.remove('loading');
      if (root) {
        root.classList.add('has-portrait');
      }
    };
    image.onerror = () => {
      tryNext();
    };
    image.src = src;
  };
  tryNext();
  return frame;
}

function formatStat(value) {
  if (value === undefined || value === null) {
    return null;
  }
  return typeof value === 'number' ? Math.round(value) : value;
}

function formatDecimal(value) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return value;
  }
  return value.toFixed(2);
}

function pickStatValue(source, key, fallback = []) {
  if (!source) {
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(source, key) && source[key] != null) {
    return source[key];
  }
  for (const altKey of fallback) {
    if (Object.prototype.hasOwnProperty.call(source, altKey) && source[altKey] != null) {
      return source[altKey];
    }
  }
  return null;
}

function formatValueByType(value, type = 'int') {
  if (value == null || Number.isNaN(Number(value))) {
    return null;
  }
  if (type === 'decimal') {
    const raw = formatDecimal(Number(value));
    if (raw == null) {
      return null;
    }
    return String(raw).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  }
  const rounded = formatStat(Number(value));
  return rounded == null ? null : String(rounded);
}

function formatSignedDifference(diff, type = 'int') {
  if (diff == null || Number.isNaN(Number(diff))) {
    return null;
  }
  const magnitude = formatValueByType(Math.abs(diff), type);
  if (!magnitude) {
    return null;
  }
  return `${diff >= 0 ? '+' : '-'}${magnitude}`;
}

function formatScalingPercent(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  const percent = value * 100;
  const abs = Math.abs(percent);
  let decimals = 0;
  if (abs < 1) {
    decimals = 2;
  } else if (abs < 10) {
    decimals = 1;
  }
  return `${percent.toFixed(decimals).replace(/\.0+$/, '')}%`;
}

function describeSpellScaling(scaling) {
  if (!scaling || typeof scaling !== 'object') {
    return [];
  }
  const lines = [];
  if (scaling.damage) {
    const percent = formatScalingPercent(scaling.damage);
    if (percent) {
      lines.push(`피해: 주문력 × ${percent} 추가`);
    }
  }
  if (scaling.heal) {
    const percent = formatScalingPercent(scaling.heal);
    if (percent) {
      lines.push(`회복: 주문력 × ${percent} 추가`);
    }
  }
  if (scaling.shield) {
    const percent = formatScalingPercent(scaling.shield);
    if (percent) {
      lines.push(`보호막: 주문력 × ${percent} 추가`);
    }
  }
  if (scaling.mana) {
    const percent = formatScalingPercent(scaling.mana);
    if (percent) {
      lines.push(`마나 효과: 주문력 × ${percent} 추가`);
    }
  }
  if (scaling.effect) {
    const percent = formatScalingPercent(scaling.effect);
    if (percent) {
      lines.push(`효과 배율: 주문력 1당 ${percent} 증가`);
    }
  }
  if (scaling.duration) {
    const percent = formatScalingPercent(scaling.duration);
    if (percent) {
      lines.push(`지속시간: 주문력 1당 ${percent} 증가`);
    }
  }
  return lines;
}

function formatBreakdownValue(total, base, bonus, type = 'int', suffix = '') {
  const totalText = formatValueByType(total, type);
  const baseText = formatValueByType(base, type);
  const bonusText = formatValueByType(Math.abs(bonus), type);
  if (!totalText || !baseText || !bonusText) {
    return null;
  }
  const bonusSign = bonus >= 0 ? '+' : '-';
  return `${totalText}${suffix}(${baseText}${suffix}${bonusSign}${bonusText}${suffix})`;
}

function collectSpellPowerBreakdowns(skill, stats = {}) {
  if (!skill || !skill.spellPowerScaling) {
    return [];
  }
  const spellPower = Number(stats.spellPower) || 0;
  const scaling = skill.spellPowerScaling;
  const effect = skill.effect || {};
  const descriptors = [
    { scalingKey: 'damage', key: 'damage', label: '피해', type: 'int' },
    { scalingKey: 'damage', key: 'tickDamage', label: '초당 피해', type: 'int' },
    { scalingKey: 'damage', key: 'dotDamage', label: '지속 피해', type: 'int' },
    { scalingKey: 'damage', key: 'pulseDamage', label: '폭발 피해', type: 'int' },
    { scalingKey: 'heal', key: 'healAmount', label: '즉시 회복', type: 'int' },
    { scalingKey: 'heal', key: 'flatHeal', label: '추가 회복', type: 'int' },
    {
      scalingKey: 'heal',
      keys: ['tickHeal', 'healPerSecond', 'regen'],
      label: '초당 회복',
      type: 'int',
    },
    { scalingKey: 'shield', key: 'shieldValue', label: '보호막', type: 'int' },
    { scalingKey: 'shield', key: 'primaryShield', label: '대상 보호막', type: 'int' },
    { scalingKey: 'shield', key: 'allyShield', label: '주변 보호막', type: 'int' },
    { scalingKey: 'shield', key: 'shield', label: '보호막', type: 'int' },
    {
      scalingKey: 'mana',
      keys: ['manaPerSecond'],
      label: '초당 마나',
      type: 'decimal',
      suffix: '/s',
    },
    {
      scalingKey: 'mana',
      keys: ['manaGift', 'manaGain'],
      label: '마나 회복',
      type: 'int',
    },
    {
      scalingKey: 'effect',
      key: 'attackBonus',
      label: '공격력 보너스',
      type: 'int',
      mode: 'multiplier',
    },
    {
      scalingKey: 'effect',
      key: 'defenseBonus',
      label: '방어력 보너스',
      type: 'int',
      mode: 'multiplier',
    },
    {
      scalingKey: 'effect',
      key: 'magicDefenseBonus',
      label: '마법 방어력 보너스',
      type: 'int',
      mode: 'multiplier',
    },
    {
      scalingKey: 'effect',
      key: 'spellPowerBonus',
      label: '주문력 보너스',
      type: 'int',
      mode: 'multiplier',
    },
  ];
  const lines = [];
  const seen = new Set();

  descriptors.forEach((descriptor) => {
    const ratio = Number(scaling[descriptor.scalingKey]);
    if (!ratio) {
      return;
    }
    const keys = descriptor.keys || [descriptor.key];
    keys
      .map((key) => ({ key, value: effect ? effect[key] : null }))
      .filter(({ key }) => key && !seen.has(`${descriptor.scalingKey}:${key}`))
      .forEach(({ key, value }) => {
        if (!Number.isFinite(value)) {
          return;
        }
        const total = descriptor.mode === 'multiplier'
          ? value * (1 + spellPower * ratio)
          : value + spellPower * ratio;
        const bonus = total - value;
        const formatted = formatBreakdownValue(total, value, bonus, descriptor.type, descriptor.suffix || '');
        if (!formatted) {
          return;
        }
        const label = descriptor.label || key;
        lines.push(`${label}: ${formatted}`);
        seen.add(`${descriptor.scalingKey}:${key}`);
      });
  });
  return lines;
}

function formatLevelDelta(factor) {
  if (!Number.isFinite(factor)) {
    return '+0%';
  }
  const delta = (factor - 1) * 100;
  let decimals = 0;
  const abs = Math.abs(delta);
  if (abs > 0 && abs < 10) {
    decimals = 1;
  }
  let text = delta.toFixed(decimals);
  if (text === '-0.0' || text === '0.0') {
    text = '0';
  }
  if (text.endsWith('.0')) {
    text = text.slice(0, -2);
  }
  const sign = delta >= 0 && !text.startsWith('-') ? '+' : '';
  return `${sign}${text}%`;
}

function summarizeLevelScaling(level) {
  const modifiers = getSkillLevelModifiers(level);
  if (!modifiers) {
    return null;
  }
  const parts = [
    `고정 ${formatLevelDelta(modifiers.flat)}`,
    `계수 ${formatLevelDelta(modifiers.ratio)}`,
    `반경 ${formatLevelDelta(modifiers.radius)}`,
    `주문계수 ${formatLevelDelta(modifiers.spell)}`,
  ];
  return `레벨 보정: ${parts.join(' · ')}`;
}

function formatComparison(entry, baseValue, totalValue) {
  const { type = 'int', suffix = '' } = entry;
  const baseText = formatValueByType(baseValue, type);
  const totalText = formatValueByType(totalValue, type);

  if (baseText == null && totalText == null) {
    return null;
  }

  if (baseText != null && totalText != null) {
    const baseLabel = `${baseText}${suffix} (기본)`;
    const totalLabel = `${totalText}${suffix} (강화)`;
    const baseNumber = Number(baseValue);
    const totalNumber = Number(totalValue);
    const diff = formatSignedDifference(totalNumber - baseNumber, type);
    const epsilon = type === 'decimal' ? 0.005 : 0.5;
    if (!diff || Math.abs(totalNumber - baseNumber) < epsilon) {
      return `${totalText}${suffix} (기본=강화)`;
    }
    return `${baseLabel} → ${totalLabel} (${diff})`;
  }

  const text = totalText ?? baseText;
  return text ? `${text}${suffix}` : null;
}

export function attachTooltip(element, getContent, options = {}) {
  const tooltip = getTooltip();
  if (!tooltip || !element) {
    return;
  }

  const { anchor = 'cursor' } = options;

  function getAnchorPosition() {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height,
    };
  }

  element.addEventListener('mouseenter', (event) => {
    const content = typeof getContent === 'function' ? getContent() : null;
    if (!content) {
      return;
    }
    if (anchor === 'element') {
      tooltip.show(content, getAnchorPosition());
      return;
    }
    tooltip.show(content, { x: event.clientX, y: event.clientY });
  });

  element.addEventListener('mousemove', (event) => {
    if (anchor === 'element') {
      tooltip.position(getAnchorPosition());
      return;
    }
    tooltip.position({ x: event.clientX, y: event.clientY });
  });

  element.addEventListener('mouseleave', () => {
    tooltip.hide();
  });
}

export function buildUnitTooltip({
  name,
  jobName,
  role,
  rarity,
  level,
  stats = {},
  baseStats = null,
  skill,
  items = [],
  extraLines = [],
  portraitId = null,
}) {
  const lines = [];
  if (name) {
    lines.push(name);
  }
  if (jobName || role || rarity) {
    const parts = [];
    if (jobName) {
      parts.push(jobName);
    }
    if (role) {
      parts.push(ROLE_LABELS[role] || role);
    }
    if (rarity) {
      parts.push(`희귀도: ${RARITY_LABELS[rarity] || rarity}`);
    }
    if (parts.length) {
      lines.push(parts.join(' · '));
    }
  }
  if (level != null) {
    const levelInfo = formatLevelBadge(level);
    lines.push(`레벨: ${levelInfo.label}`);
  }
  const STAT_DETAILS = [
    { key: 'maxHealth', fallback: ['health'], label: '체력', type: 'int' },
    { key: 'attack', label: '공격력', type: 'int' },
    { key: 'defense', label: '방어력', type: 'int' },
    { key: 'magicDefense', label: '마법 방어력', type: 'int' },
    { key: 'spellPower', label: '주문력', type: 'int' },
    { key: 'maxMana', fallback: ['mana'], label: '마나', type: 'int' },
    { key: 'attackInterval', label: '공격 간격', type: 'decimal', suffix: 's' },
    { key: 'speed', label: '이동 속도', type: 'decimal' },
    { key: 'range', label: '사거리', type: 'int' },
    { key: 'manaRegen', label: '마나 회복', type: 'decimal' },
  ];

  const statLines = STAT_DETAILS.map((entry) => {
    const baseValue = pickStatValue(baseStats, entry.key, entry.fallback);
    const totalValue = pickStatValue(stats, entry.key, entry.fallback);
    if (baseValue == null && totalValue == null) {
      return null;
    }
    const emoji = STAT_ICONS[entry.key] || STAT_ICONS[entry.fallback?.[0]] || '';
    const formatted = formatComparison(entry, baseValue, totalValue);
    if (!formatted) {
      return null;
    }
    const label = entry.label || STAT_LABELS[entry.key] || entry.key;
    return `${emoji ? `${emoji} ` : ''}${label}: ${formatted}`;
  }).filter(Boolean);

  lines.push(...statLines);
  if (skill?.name) {
    lines.push(`스킬: ${skill.name}`);
    if (skill.description) {
      lines.push(skill.description);
    }
    if (level != null) {
      const scalingSummary = summarizeLevelScaling(level);
      if (scalingSummary) {
        lines.push(scalingSummary);
      }
    }
    const spellBreakdowns = collectSpellPowerBreakdowns(skill, stats);
    if (spellBreakdowns.length) {
      lines.push('주요 수치:');
      spellBreakdowns.forEach((entry) => {
        lines.push(` - ${entry}`);
      });
    }
    const scalingDetails = describeSpellScaling(skill.spellPowerScaling);
    if (scalingDetails.length) {
      lines.push('주문력 계수:');
      scalingDetails.forEach((entry) => {
        lines.push(` - ${entry}`);
      });
    }
    const cooldownText = formatDecimal(skill.cooldown);
    if (cooldownText != null) {
      const trimmed = typeof cooldownText === 'string'
        ? cooldownText.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
        : cooldownText;
      lines.push(`스킬 쿨타임: ${trimmed}초`);
    }
    const manaCost = skill.manaCost ?? skill.effect?.manaCost ?? null;
    if (manaCost != null) {
      const numericCost = Number(manaCost);
      lines.push(`소모 마나: ${numericCost > 0 ? Math.round(numericCost) : '없음'}`);
    }
  }
  if (Array.isArray(items) && items.length) {
    lines.push(`장비: ${items.join(', ')}`);
  }
  if (extraLines.length) {
    lines.push(...extraLines);
  }
  const root = el('div', { className: 'unit-tooltip' });
  const portraitAsset = portraitId ? getPortraitById(portraitId) : null;
  const portraitElement = createTooltipPortraitElement(portraitAsset, root);
  if (portraitElement) {
    root.appendChild(portraitElement);
  }
  const body = el('div', { className: 'unit-tooltip-body' });
  body.textContent = lines.join('\n');
  root.appendChild(body);
  return root;
}

export function buildItemTooltip(item) {
  if (!item) {
    return null;
  }
  const blueprint = ITEM_BLUEPRINTS[item.blueprintId];
  const rarity = item.rarity || 'common';
  const rarityLabel = RARITY_LABELS[rarity] || rarity;
  const upgradeLevel = Number(item.upgradeLevel) || 0;
  const lines = [];

  const itemName = blueprint?.name || '알 수 없는 장비';
  lines.push(`${rarityLabel} ${itemName}`);

  if (upgradeLevel > 0) {
    lines.push(`강화 단계: +${upgradeLevel}`);
  }

  if (blueprint?.type) {
    const typeLabel = ITEM_TYPE_LABELS[blueprint.type] || blueprint.type;
    lines.push(`종류: ${typeLabel}`);
  }

  if (blueprint?.slot) {
    const slotLabel = ITEM_SLOT_LABELS[blueprint.slot] || blueprint.slot;
    lines.push(`슬롯: ${slotLabel}`);
  }

  const { stats, modifiers } = computeItemEffectValues(item.blueprintId, rarity, upgradeLevel);

  Object.entries(stats).forEach(([statKey, value]) => {
    if (value == null) {
      return;
    }
    const label = STAT_LABELS[statKey] || statKey;
    const prefix = value >= 0 ? '+' : '';
    const formatted = Number.isInteger(value) ? value : value.toFixed(1);
    lines.push(`${label}: ${prefix}${formatted}`);
  });

  Object.entries(modifiers).forEach(([modifierKey, value]) => {
    if (value == null) {
      return;
    }
    const label = MODIFIER_LABELS[modifierKey] || modifierKey;
    if (modifierKey === 'attackIntervalMultiplier') {
      lines.push(`${label}: ×${value.toFixed(2)}`);
    } else if (modifierKey === 'cooldownReduction') {
      lines.push(`${label}: ${Math.round(value * 100)}%`);
    } else if (
      ['lifesteal', 'regenPercentPerSecond', 'debuffDurationReduction', 'shieldShredOnHit', 'speed'].includes(
        modifierKey,
      )
    ) {
      const percent = value * 100;
      let decimals = 0;
      const absPercent = Math.abs(percent);
      if (absPercent > 0 && absPercent < 10) {
        decimals = 1;
      }
      const formattedPercent = percent.toFixed(decimals).replace(/\.0$/, '');
      const sign = percent >= 0 ? '+' : '';
      lines.push(`${label}: ${sign}${formattedPercent}%`);
    } else {
      const prefix = value >= 0 ? '+' : '';
      const formatted = typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2) : value;
      lines.push(`${label}: ${prefix}${formatted}`);
    }
  });

  lines.push(`판매 가치: ${getItemSellValue(item)} 골드`);
  lines.push(`다음 강화 비용: ${getItemEnhanceCost(item)} 골드`);

  return lines.join('\n');
}
