import { el } from './dom.js';
import { createUnitCard } from './unitCard.js';

const LINE_LABELS = {
  frontline: '전열',
  midline: '중열',
  backline: '후열',
};

function describeLocation(location) {
  if (!location) {
    return null;
  }
  if (location.type === 'bench') {
    return `벤치 ${location.index + 1}번`;
  }
  const label = LINE_LABELS[location.line] || location.line;
  return `${label} ${location.index + 1}번 위치`;
}

export function createUpgradeOverlay({ combo, onUpgrade }) {
  const overlay = el('div', { className: 'upgrade-overlay' });
  const dialog = el('div', { className: 'upgrade-dialog card compact' });

  const heading = el('h2', {
    className: 'section-title',
    text: '합성할 전투원 선택',
  });
  dialog.appendChild(heading);

  const note = el('p', {
    className: 'upgrade-note',
    text: '초상화를 눌러 강화할 전투원을 결정하세요. 세부 능력치는 툴팁에서 확인할 수 있습니다.',
  });
  dialog.appendChild(note);

  const unitList = el('div', { className: 'unit-grid upgrade-grid compact' });
  combo.units.forEach((entry) => {
    const locationText = describeLocation(entry.location);
    const card = createUnitCard({
      unit: entry.unit,
      mode: 'minimal',
      action: {
        label: '강화',
        onClick: () => onUpgrade(entry.unit.instanceId),
      },
      extraTooltipLines: locationText ? [locationText] : [],
    });
    if (locationText) {
      const pill = el('div', { className: 'unit-location-pill', text: locationText });
      const actionButton = card.querySelector('button');
      if (actionButton) {
        card.insertBefore(pill, actionButton);
      } else {
        card.appendChild(pill);
      }
    }
    unitList.appendChild(card);
  });
  dialog.appendChild(unitList);

  overlay.appendChild(dialog);
  return overlay;
}
