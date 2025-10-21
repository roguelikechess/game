import { el } from './dom.js';
import { describeItem, ITEM_BLUEPRINTS } from '../game/items.js';
import { attachTooltip, buildItemTooltip } from './tooltipHelpers.js';
import { getItemIconById } from '../data/assets.js';

function getCompactLabel(item) {
  const blueprint = ITEM_BLUEPRINTS[item.blueprintId];
  if (blueprint?.name) {
    return blueprint.name.length > 4 ? blueprint.name.slice(0, 4) : blueprint.name;
  }
  const described = describeItem(item);
  return described.length > 4 ? described.slice(0, 4) : described;
}

export function createItemChip(item, options = {}) {
  const { compact = false, onClick, selected = false, interactive = false } = options;
  if (!item) {
    const emptyChip = el('span', {
      className: `item-chip empty${compact ? ' compact' : ''}`,
    });
    const emptyIcon = el('span', { className: 'item-icon placeholder', text: '-' });
    emptyChip.appendChild(emptyIcon);
    if (!compact) {
      emptyChip.appendChild(el('span', { className: 'item-label', text: '빈 슬롯' }));
    }
    return emptyChip;
  }
  const rarity = item.rarity || 'common';
  const label = compact ? getCompactLabel(item) : describeItem(item);
  const chip = el('span', {
    className: `item-chip ${rarity}${compact ? ' compact' : ''}${interactive ? ' interactive' : ''}`,
  });
  chip.dataset.itemId = item.id;
  if (selected) {
    chip.classList.add('selected');
  }
  const blueprint = ITEM_BLUEPRINTS[item.blueprintId];
  const iconAsset = getItemIconById(item.blueprintId);
  const icon = el('span', { className: 'item-icon' });
  if (iconAsset?.src) {
    icon.style.backgroundImage = `url(${iconAsset.src})`;
    icon.classList.add('has-image');
  } else if (iconAsset?.fallback?.color) {
    icon.style.backgroundColor = iconAsset.fallback.color;
  } else if (blueprint?.name) {
    icon.classList.add('placeholder');
    icon.textContent = blueprint.name.charAt(0);
  } else {
    icon.classList.add('placeholder');
    icon.textContent = '?';
  }
  chip.appendChild(icon);

  if (!compact) {
    chip.appendChild(el('span', { className: 'item-label', text: label }));
  }
  const upgradeLevel = Number(item.upgradeLevel) || 0;
  if (upgradeLevel > 0) {
    const upgradeBadge = el('span', { className: 'item-upgrade-badge', text: `+${upgradeLevel}` });
    chip.appendChild(upgradeBadge);
  }
  if (typeof onClick === 'function') {
    chip.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick(event);
    });
    chip.classList.add('clickable');
  }
  attachTooltip(chip, () => buildItemTooltip(item));
  return chip;
}
