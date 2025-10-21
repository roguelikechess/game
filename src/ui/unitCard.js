import { el } from './dom.js';
import { getUnitDefinition, getUnitSkill } from '../game/units.js';
import { getJobById } from '../game/jobs.js';
import { getTraitById } from '../game/traits.js';
import { getTooltip } from './tooltip.js';
import { attachTooltip, buildUnitTooltip } from './tooltipHelpers.js';
import { applyItemBonuses } from '../game/items.js';
import { createItemChip } from './itemChip.js';
import { createPortraitVisual } from './portraitVisual.js';
import { summarizeUnitItems } from '../game/party.js';
import { buildBaseStats } from '../game/units.js';
import { createNameplate, getJobEmoji, getJobLabel, formatLevelBadge } from './identity.js';

function renderTraits(container, traitIds) {
  const list = el('div', { className: 'tag-list' });
  const tooltip = getTooltip();
  traitIds.forEach((traitId) => {
    const trait = getTraitById(traitId);
    if (trait) {
      const tag = el('span', { className: 'tag', text: trait.name });
      tag.addEventListener('mouseenter', (event) => {
        const position = { x: event.clientX, y: event.clientY };
        tooltip.show(trait.description, position);
      });
      tag.addEventListener('mousemove', (event) => {
        tooltip.position({ x: event.clientX, y: event.clientY });
      });
      tag.addEventListener('mouseleave', () => {
        tooltip.hide();
      });
      list.appendChild(tag);
    }
  });
  if (list.childElementCount > 0) {
    container.appendChild(list);
  }
}

const STAT_CONFIG = [
  { key: 'maxHealth', label: '체력', icon: '❤️' },
  { key: 'maxMana', label: '마나', icon: '🔷' },
  { key: 'attack', label: '공격력', icon: '🗡️' },
  { key: 'defense', label: '방어력', icon: '🛡️' },
  { key: 'magicDefense', label: '마법 방어력', icon: '🔮' },
  { key: 'spellPower', label: '주문력', icon: '✨' },
  {
    key: 'attackInterval',
    label: '공격 간격',
    icon: '⏱️',
    formatter: (value) => formatDecimalValue(value),
    suffix: 's',
  },
  {
    key: 'speed',
    label: '이동 속도',
    icon: '💨',
    formatter: (value) => formatDecimalValue(value),
  },
  { key: 'range', label: '사거리', icon: '🎯' },
];

function formatDecimalValue(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return null;
  }
  return parseFloat(Number(value).toFixed(2)).toString();
}

function renderStats(container, stats) {
  const statsList = el('div', { className: 'stat-grid' });
  STAT_CONFIG.forEach(({ key, label, icon, suffix = '', formatter }) => {
    const value = stats?.[key];
    if (value == null) {
      return;
    }
    const formatted = formatter ? formatter(value) : value;
    if (formatted == null) {
      return;
    }
    const row = el('small', { className: 'stat-line' });
    const iconSpan = el('span', { className: 'stat-icon', text: icon });
    const labelSpan = el('span', { className: 'stat-label', text: label });
    const valueSpan = el('span', {
      className: 'stat-value',
      text: suffix ? `${formatted}${suffix}` : `${formatted}`,
    });
    row.appendChild(iconSpan);
    row.appendChild(labelSpan);
    row.appendChild(valueSpan);
    statsList.appendChild(row);
  });
  if (statsList.childElementCount > 0) {
    container.appendChild(statsList);
  }
}

export function createUnitCard({
  unit,
  definitionId,
  action,
  showTraits = true,
  mode = 'full',
  extraTooltipLines = [],
}) {
  const targetDefinitionId = unit ? unit.definitionId : definitionId;
  const definition = targetDefinitionId ? getUnitDefinition(targetDefinitionId) : null;
  if (!definition) {
    const card = el('div', { className: 'unit-card', text: 'Unknown unit' });
    return card;
  }

  const job = getJobById(definition.jobId);
  const roleClass = job ? job.role : '';
  const card = el('div', {
    className: `unit-card ${roleClass}`.trim(),
  });

  const isShopMode = mode === 'shop';
  const isMinimalMode = mode === 'minimal';

  const portraitVisual = createPortraitVisual({
    definition,
    level: unit?.level || 1,
    job,
    jobName: job?.name,
    rarity: definition?.rarity,
    className: 'unit-portrait',
    markerSize: isShopMode || isMinimalMode ? 'mini' : 'small',
  });
  card.appendChild(portraitVisual.element);

  const info = el('div', {
    className: `unit-info${isShopMode || isMinimalMode ? ' compact' : ''}`,
  });

  const nameRow = el('div', { className: 'unit-name-row' });
  const nameplate = createNameplate({
    name: definition.name,
    rarity: definition?.rarity,
    short: true,
    tag: 'strong',
    className: 'unit-name',
  });
  nameRow.appendChild(nameplate.element);
  if (unit && !isMinimalMode) {
    const levelInfo = formatLevelBadge(unit.level);
    const badge = el('span', { className: 'unit-level-badge', text: levelInfo.label });
    badge.title = levelInfo.title;
    nameRow.appendChild(badge);
  }
  info.appendChild(nameRow);

  if (showTraits) {
    const displayedTraits = unit?.traitIds?.length
      ? unit.traitIds
      : [definition.signatureTraitId, ...(definition.traitPool || []).slice(0, 1)].filter(Boolean);
    renderTraits(info, displayedTraits);
  }

  if (!isShopMode && !isMinimalMode) {
    if (job) {
      const jobLine = el('div', { className: 'job-emoji-line', text: getJobLabel(job) });
      jobLine.title = `${getJobEmoji(job)} ${job.name} (${job.role})`;
      info.appendChild(jobLine);
    }

    if (unit && unit.currentStats) {
      const displayStats = applyItemBonuses(unit.currentStats, unit.items || []).stats;
      renderStats(info, displayStats);
    }

    if (unit?.items?.length) {
      const itemList = el('div', { className: 'item-chip-row' });
      unit.items.forEach((item) => {
        itemList.appendChild(createItemChip(item));
      });
      info.appendChild(itemList);
    }

    const skill = getUnitSkill(definition.id);
    if (skill) {
      const skillBlock = el('div', { className: 'skill-block' });
      const skillTitle = el('div', { className: 'skill-name', text: `스킬: ${skill.name}` });
      const skillDesc = el('small', { className: 'skill-desc', text: skill.description });
      skillBlock.appendChild(skillTitle);
      skillBlock.appendChild(skillDesc);
      info.appendChild(skillBlock);
    }
  }

  card.appendChild(info);

  if (action) {
    const button = el('button', {
      className: 'nav-button',
      text: action.label,
    });
    button.disabled = !!action.disabled;
    button.addEventListener('click', action.onClick);
    card.appendChild(button);
  }

  if (isShopMode || isMinimalMode) {
    card.classList.add('compact');
  }

  const baseStats = unit?.currentStats || buildBaseStats(definition);
  const tooltipStats = unit ? applyItemBonuses(baseStats, unit.items || []).stats : baseStats;
  const items = unit ? summarizeUnitItems(unit) : [];

  const tooltipExtra = definition.description ? [definition.description] : [];
  if (extraTooltipLines.length) {
    tooltipExtra.push(...extraTooltipLines);
  }

  attachTooltip(
    card,
    () =>
      buildUnitTooltip({
        name: definition.name,
        jobName: job?.name,
        role: job?.role,
        rarity: definition?.rarity,
        level: unit?.level || 1,
        stats: tooltipStats,
        baseStats,
        skill: getUnitSkill(definition.id),
        items,
        extraLines: tooltipExtra,
      }),
    { anchor: isShopMode || isMinimalMode ? 'element' : 'cursor' }
  );

  return card;
}
