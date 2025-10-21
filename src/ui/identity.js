import { el } from './dom.js';

const RARITY_COLORS = {
  common: '#a4b0c2',
  uncommon: '#60c18d',
  rare: '#9b59ff',
  unique: '#f0a05a',
  epic: '#d4af37',
};

const JOB_EMOJI = {
  swordsman: '⚔️',
  knight: '🛡️',
  warrior: '🪓',
  archer: '🏹',
  mage: '🔮',
  healer: '✨',
  consecrator: '🛐',
  warlock: '☠️',
};

const ROLE_DEFAULT_EMOJI = {
  frontline: '🛡️',
  midline: '🎯',
  backline: '🌟',
};

export function getShortName(name) {
  if (typeof name !== 'string') {
    return '';
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return '';
  }
  const first = trimmed.split(/\s+/)[0];
  return first || trimmed;
}

export function getRarityColor(rarity) {
  if (!rarity) {
    return RARITY_COLORS.common;
  }
  return RARITY_COLORS[rarity] || RARITY_COLORS.common;
}

export function getJobEmoji(job) {
  if (!job) {
    return '❔';
  }
  if (typeof job === 'string') {
    return JOB_EMOJI[job] || ROLE_DEFAULT_EMOJI[job] || '❔';
  }
  return (
    JOB_EMOJI[job.id] ||
    ROLE_DEFAULT_EMOJI[job.role] ||
    '❔'
  );
}

export function getJobLabel(job, { includeRole = false } = {}) {
  if (!job) {
    return '❔ 미확인';
  }
  if (typeof job === 'string') {
    const emoji = JOB_EMOJI[job] || ROLE_DEFAULT_EMOJI[job] || '❔';
    return `${emoji} ${job}`;
  }
  const emoji = JOB_EMOJI[job.id] || ROLE_DEFAULT_EMOJI[job.role] || '❔';
  const parts = [job?.name || '미확인'];
  if (includeRole && job?.role) {
    parts.push(job.role);
  }
  return `${emoji} ${parts.join(' · ')}`.trim();
}

export function createNameplate({
  name,
  rarity = 'common',
  short = false,
  tag = 'span',
  className = '',
}) {
  const display = short ? getShortName(name) : name || '???';
  const element = el(tag, {
    className: `rarity-nameplate${className ? ` ${className}` : ''}`,
  });
  element.dataset.rarity = rarity || 'common';
  const swatch = el('span', { className: 'rarity-nameplate-swatch' });
  const text = el('span', { className: 'rarity-nameplate-text', text: display });
  element.appendChild(swatch);
  element.appendChild(text);
  return { element, text, swatch };
}

export { RARITY_COLORS, JOB_EMOJI };

export function formatLevelBadge(level) {
  const numeric = Math.max(1, Math.floor(Number(level) || 1));
  const isMax = numeric >= 4;
  const label = isMax ? '★MAX' : `★${numeric}`;
  const title = isMax ? '최대 등급' : `레벨 ${numeric}`;
  return { label, title, isMax, value: numeric };
}
