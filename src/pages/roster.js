import { el } from '../ui/dom.js';
import { createPortraitVisual } from '../ui/portraitVisual.js';
import { attachTooltip, buildUnitTooltip } from '../ui/tooltipHelpers.js';
import { buildBaseStats, getUnitSkill } from '../game/units.js';
import { getJobById } from '../game/jobs.js';
import { getAugmentById, describeAugmentEffect, getAugmentPowerSummary } from '../game/augments.js';
import { createNameplate } from '../ui/identity.js';

const LEVEL_MULTIPLIERS = [1, 2, 4, 8];

function buildLevelLines(baseStats) {
  if (!baseStats) {
    return [];
  }
  const entries = [
    { key: 'maxHealth', label: '체력' },
    { key: 'attack', label: '공격력' },
    { key: 'defense', label: '방어력' },
    { key: 'spellPower', label: '주문력' },
  ];
  return entries
    .map(({ key, label }) => {
      const baseValue = baseStats[key];
      if (baseValue == null) {
        return null;
      }
      const values = LEVEL_MULTIPLIERS.map((multiplier) => Math.round(baseValue * multiplier));
      return `${label}: ${values.join('/')}`;
    })
    .filter(Boolean);
}

function buildAugmentSummary(augments = [], party = null) {
  const valid = Array.isArray(augments)
    ? augments
        .map((entry) => {
          if (!entry || !entry.id) {
            return null;
          }
          const augment = getAugmentById(entry.id);
          if (!augment) {
            return null;
          }
          const summary = getAugmentPowerSummary(entry);
          if (!summary.contributions.length) {
            return null;
          }
          return { augment, entry, summary };
        })
        .filter(Boolean)
    : [];

  if (!valid.length) {
    return null;
  }

  const card = el('div', { className: 'card roster-augment-card' });
  card.appendChild(el('h2', { className: 'section-title', text: '선택한 증강' }));
  const list = el('ul', { className: 'augment-summary-list' });
  valid.forEach(({ augment, entry, summary }) => {
    const item = el('li', { className: 'augment-summary-item' });
    const header = el('div', { className: 'augment-summary-header' });
    header.appendChild(el('span', { className: 'augment-name', text: augment.name }));
    const metaParts = [`총 효과 ${formatAugmentPower(summary.totalPower)}`];
    if (summary.stacks > 1) {
      metaParts.push(`선택 ${summary.stacks}회`);
    }
    header.appendChild(el('span', { className: 'augment-meta', text: metaParts.join(' · ') }));
    item.appendChild(header);
    const effectText = describeAugmentEffect(augment, entry, party) || augment.description;
    if (effectText) {
      item.appendChild(el('p', { className: 'augment-summary-effect', text: effectText }));
    }
    list.appendChild(item);
  });
  card.appendChild(list);
  return card;
}

function formatAugmentPower(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0';
  }
  if (value >= 10) {
    return String(Math.round(value));
  }
  if (value >= 1) {
    return value.toFixed(1);
  }
  return value.toFixed(2);
}

export function createRosterPage(roster, { augments = [], party = null } = {}) {
  const page = el('div', { className: 'roster-page page' });
  const content = el('div', { className: 'roster-content-grid' });
  page.appendChild(content);
  const augmentSummary = buildAugmentSummary(augments, party);
  if (augmentSummary) {
    content.appendChild(augmentSummary);
  }

  const layout = el('div', { className: 'layout-grid roster-layout roster-portrait-grid' });
  roster.forEach(({ definition }) => {
    const baseStats = buildBaseStats(definition);
    const job = definition.jobId ? getJobById(definition.jobId) : null;
    const skill = getUnitSkill(definition.id, 1);

    const tile = el('div', { className: 'roster-portrait-card' });
    const portraitVisual = createPortraitVisual({
      definition,
      level: 1,
      job,
      jobName: job?.name,
      rarity: definition?.rarity,
      className: 'portrait-token',
      markerSize: 'small',
    });
    tile.appendChild(portraitVisual.element);
    const nameplate = createNameplate({
      name: definition.name,
      rarity: definition?.rarity,
      short: false,
      className: 'portrait-name',
    });
    tile.appendChild(nameplate.element);

    const extraLines = [...buildLevelLines(baseStats)];
    if (definition.description) {
      extraLines.push(definition.description);
    }

    attachTooltip(tile, () =>
      buildUnitTooltip({
        name: definition.name,
        jobName: job?.name,
        role: job?.role,
        rarity: definition?.rarity,
        level: 1,
        stats: baseStats,
        baseStats,
        skill,
        extraLines,
        portraitId: definition?.portraitId,
        biography: definition?.biography,
      })
    );

    layout.appendChild(tile);
  });

  content.appendChild(layout);
  return page;
}
