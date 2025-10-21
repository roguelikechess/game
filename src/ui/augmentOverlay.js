import { el } from './dom.js';
import { getAugmentById, describeAugmentEffect } from '../game/augments.js';

function formatTierLabel(tier) {
  if (!tier || tier <= 1) {
    return '1단계 증강';
  }
  return `${tier}단계 증강`;
}

function buildAugmentOption({ option, tier, onSelect, runState, pendingCount }) {
  const augment = getAugmentById(option.id);
  const optionCard = el('div', { className: 'augment-option-card' });
  const header = el('div', { className: 'augment-option-header' });
  header.appendChild(el('h3', { text: option.name }));
  header.appendChild(el('span', { className: 'augment-tier-pill', text: formatTierLabel(tier) }));
  optionCard.appendChild(header);

  if (option.description) {
    optionCard.appendChild(el('p', { className: 'augment-description', text: option.description }));
  }

  const effect = describeAugmentEffect(augment, tier, runState?.activeParty || null);
  if (effect) {
    optionCard.appendChild(el('p', { className: 'augment-effect', text: effect }));
  }

  const footer = el('div', { className: 'augment-option-footer' });
  const reminder = pendingCount > 1 ? `선택 후 ${pendingCount - 1}회 남음` : '이 선택은 즉시 적용됩니다.';
  footer.appendChild(el('span', { className: 'augment-reminder', text: reminder }));
  const button = el('button', { className: 'nav-button primary', text: '선택' });
  button.addEventListener('click', () => {
    if (typeof onSelect === 'function') {
      onSelect(option.id);
    }
  });
  footer.appendChild(button);
  optionCard.appendChild(footer);
  return optionCard;
}

export function createAugmentOverlay({ choice, pendingCount = 1, onSelect, runState }) {
  const overlay = el('div', { className: 'augment-overlay' });
  const dialog = el('div', { className: 'augment-dialog card compact' });

  const heading = el('h2', { className: 'section-title', text: '용병단 증강 선택' });
  dialog.appendChild(heading);

  const subtitleParts = [];
  if (choice?.level) {
    subtitleParts.push(`용병단 레벨 ${choice.level}`);
  }
  if (choice?.tier) {
    subtitleParts.push(formatTierLabel(choice.tier));
  }
  const subtitleText = subtitleParts.length ? subtitleParts.join(' · ') : '증강을 하나 선택하세요.';
  dialog.appendChild(el('p', { className: 'augment-note', text: subtitleText }));

  const list = el('div', { className: 'augment-option-list' });
  (choice?.options || []).forEach((option) => {
    const card = buildAugmentOption({ option, tier: choice.tier || 1, onSelect, runState, pendingCount });
    list.appendChild(card);
  });
  dialog.appendChild(list);

  overlay.appendChild(dialog);
  return overlay;
}
