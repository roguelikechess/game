import { el } from './dom.js';
import { getUnitDefinition, getUnitSkill, buildBaseStats } from '../game/units.js';
import { getJobById } from '../game/jobs.js';
import { attachTooltip, buildUnitTooltip } from './tooltipHelpers.js';
import { summarizeUnitItems } from '../game/party.js';
import { applyItemBonuses } from '../game/items.js';
import { createItemChip } from './itemChip.js';
import { createPortraitVisual } from './portraitVisual.js';
import { createNameplate, getShortName } from './identity.js';

const LINE_ORDER = ['frontline', 'midline', 'backline'];
const MAX_DEPLOYED = 5;

export function createPartyView(party, title = 'Party Formation', options = {}) {
  const {
    enableInteractions = false,
    onSwap,
    allowSelling = false,
    onSell,
    getSellValue,
    splitLayout = false,
  } = options;

  let selectedLocation = null;
  let selectedElement = null;
  let sellSlotElement = null;
  let sellSlotLabel = null;

  function getUnitAtLocation(location) {
    if (!location) {
      return null;
    }
    if (location.type === 'line') {
      const line = party[location.line] || [];
      return line[location.slotIndex]?.unit || null;
    }
    if (location.type === 'bench') {
      return party.bench[location.index] || null;
    }
    return null;
  }

  function refreshSellSlot() {
    if (!sellSlotElement || !sellSlotLabel) {
      return;
    }
    const unit = getUnitAtLocation(selectedLocation);
    if (unit) {
      const definition = getUnitDefinition(unit.definitionId);
      const value = getSellValue ? getSellValue(unit) : 0;
      const shortName = getShortName(definition?.name) || '전투원';
      sellSlotElement.classList.add('ready');
      sellSlotLabel.textContent = `${shortName} 판매 (+${value} 골드)`;
    } else {
      sellSlotElement.classList.remove('ready');
      sellSlotLabel.textContent = '전투원을 선택한 후 클릭하여 판매';
    }
  }

  function clearSelection() {
    if (selectedElement) {
      selectedElement.classList.remove('selected');
    }
    selectedElement = null;
    selectedLocation = null;
    refreshSellSlot();
  }

  function handleLocationClick(location, element, hasUnit) {
    if (!enableInteractions) {
      return;
    }
    if (!hasUnit && !selectedLocation) {
      return;
    }
    if (
      selectedLocation &&
      location.type === selectedLocation.type &&
      location.line === selectedLocation.line &&
      location.slotIndex === selectedLocation.slotIndex &&
      location.index === selectedLocation.index
    ) {
      clearSelection();
      return;
    }
    if (!selectedLocation && hasUnit) {
      if (selectedElement) {
        selectedElement.classList.remove('selected');
      }
      selectedLocation = location;
      selectedElement = element;
      element.classList.add('selected');
      refreshSellSlot();
      return;
    }
    if (typeof onSwap === 'function') {
      onSwap(selectedLocation, location);
    }
    clearSelection();
    refreshSellSlot();
  }

  function createPortraitTile(slot, location) {
    const hasUnit = !!slot.unit;
    const tile = el('div', {
      className: `portrait-slot${hasUnit ? ' filled' : ' empty'}${enableInteractions ? ' interactive' : ''}`,
    });
    if (enableInteractions) {
      tile.addEventListener('click', () => handleLocationClick(location, tile, hasUnit));
    }

    if (hasUnit) {
      const unit = slot.unit;
      const definition = getUnitDefinition(unit.definitionId);
      const job = definition?.jobId ? getJobById(definition.jobId) : null;
      const portraitVisual = createPortraitVisual({
        definition,
        level: unit.level || 1,
        job,
        jobName: job?.name,
        rarity: definition?.rarity,
        className: 'portrait-token',
        markerSize: 'mini',
      });
      tile.appendChild(portraitVisual.element);

      if (job?.role) {
        tile.dataset.role = job.role;
      }

      attachTooltip(tile, () => {
        const base = unit.currentStats || buildBaseStats(definition);
        const applied = applyItemBonuses(base, unit.items || []);
        const displayStats = applied.stats;
        return buildUnitTooltip({
          name: definition?.name,
          jobName: job?.name,
          role: job?.role,
          rarity: definition?.rarity,
          stats: displayStats,
          baseStats: base,
          skill: definition ? getUnitSkill(definition.id, unit.level || 1) : null,
          level: unit.level,
          items: summarizeUnitItems(unit),
          portraitId: definition?.portraitId,
        });
      });

      if (unit.items?.length) {
        const itemRow = el('div', { className: 'portrait-item-row' });
        unit.items.forEach((item) => {
          const chip = createItemChip(item, { compact: true });
          itemRow.appendChild(chip);
        });
        tile.appendChild(itemRow);
      }

      const nameplate = createNameplate({
        name: definition?.name || '???',
        rarity: definition?.rarity,
        short: true,
        className: 'portrait-name',
      });
      tile.appendChild(nameplate.element);
    } else {
      const placeholder = el('div', { className: 'portrait-token placeholder', text: '+' });
      tile.appendChild(placeholder);
      if (!enableInteractions) {
        tile.classList.add('disabled');
      }
    }

    return tile;
  }

  function renderEntryGrid() {
    const section = el('section', { className: 'party-entry-section' });
    section.appendChild(el('h3', { text: '전투원 (최대 5명)' }));
    const grid = el('div', { className: 'portrait-grid entry-grid' });
    const filledEntries = [];
    const emptyEntries = [];
    LINE_ORDER.forEach((lineKey) => {
      const slots = party[lineKey] || [];
      slots.forEach((slot, index) => {
        const normalized = slot || { slot: index + 1, unit: null };
        if (normalized.unit) {
          filledEntries.push({ slot: normalized, location: { type: 'line', line: lineKey, slotIndex: index } });
        } else {
          emptyEntries.push({ slot: normalized, location: { type: 'line', line: lineKey, slotIndex: index } });
        }
      });
    });

    const sortByLine = (a, b) => {
      const lineDiff = LINE_ORDER.indexOf(a.location.line) - LINE_ORDER.indexOf(b.location.line);
      if (lineDiff !== 0) {
        return lineDiff;
      }
      return a.location.slotIndex - b.location.slotIndex;
    };

    filledEntries.sort(sortByLine).forEach((entry) => {
      grid.appendChild(createPortraitTile(entry.slot, entry.location));
    });

    let remainingSlots = Math.max(0, MAX_DEPLOYED - filledEntries.length);

    if (enableInteractions && remainingSlots > 0) {
      emptyEntries.sort(sortByLine).forEach((entry) => {
        if (remainingSlots <= 0) {
          return;
        }
        grid.appendChild(createPortraitTile(entry.slot, entry.location));
        remainingSlots -= 1;
      });

      const nextSlotIndex = {
        frontline: (party.frontline || []).length,
        midline: (party.midline || []).length,
        backline: (party.backline || []).length,
      };
      let cursor = 0;
      while (remainingSlots > 0) {
        const lineKey = LINE_ORDER[cursor % LINE_ORDER.length];
        const slotIndex = nextSlotIndex[lineKey];
        grid.appendChild(
          createPortraitTile(
            { slot: slotIndex + 1, unit: null },
            { type: 'line', line: lineKey, slotIndex }
          )
        );
        nextSlotIndex[lineKey] += 1;
        remainingSlots -= 1;
        cursor += 1;
      }
    }

    if (grid.childElementCount === 0) {
      grid.appendChild(el('div', { className: 'empty-state small', text: '전투원 없음' }));
    }

    const limitReached = MAX_DEPLOYED - filledEntries.length <= 0;
    section.appendChild(grid);
    if (limitReached) {
      section.appendChild(
        el('p', {
          className: 'limit-note',
          text: '전투원은 최대 5명까지 배치할 수 있습니다.',
        })
      );
    }
    return section;
  }

  function renderBenchSection() {
    const section = el('section', { className: 'party-bench-section compact' });
    section.appendChild(el('h3', { text: '벤치' }));
    const grid = el('div', { className: 'portrait-grid bench-grid' });
    if (party.bench.length === 0) {
      grid.appendChild(el('div', { className: 'empty-state small', text: '벤치가 비어 있습니다.' }));
    }
    party.bench.forEach((unit, index) => {
      const slot = { unit };
      const tile = createPortraitTile(slot, { type: 'bench', index });
      grid.appendChild(tile);
    });
    if (enableInteractions) {
      const dropTarget = el('div', {
        className: 'portrait-slot empty interactive bench-drop',
      });
      dropTarget.appendChild(el('div', { className: 'portrait-token placeholder', text: '↓' }));
      dropTarget.appendChild(el('span', { className: 'role-badge', text: '벤치로' }));
      dropTarget.addEventListener('click', () =>
        handleLocationClick({ type: 'bench', index: party.bench.length }, dropTarget, false)
      );
      grid.appendChild(dropTarget);
    }
    section.appendChild(grid);
    return section;
  }

  function renderSellSection() {
    if (!enableInteractions || !allowSelling || typeof onSell !== 'function') {
      return null;
    }
    const section = el('section', { className: 'party-sell-section compact' });
    const sellTitle = el('h3', { text: '판매 슬롯' });
    attachTooltip(
      sellTitle,
      () => '전투원을 선택한 뒤 이 슬롯을 누르면 판매되며 장비는 자동으로 보관함으로 이동합니다.',
      { anchor: 'element' }
    );
    section.appendChild(sellTitle);
    const slot = el('button', { className: 'sell-slot', type: 'button' });
    sellSlotLabel = el('span', { className: 'sell-slot-label', text: '전투원을 선택한 후 클릭하여 판매' });
    slot.appendChild(sellSlotLabel);
    slot.addEventListener('click', () => {
      const unit = getUnitAtLocation(selectedLocation);
      if (!unit) {
        return;
      }
      onSell(unit.instanceId);
      clearSelection();
    });
    sellSlotElement = slot;
    refreshSellSlot();
    section.appendChild(slot);
    return section;
  }

  const entryCard = el('div', { className: 'card party-entry-card compact' });
  const entryTitle = el('h2', { className: 'section-title', text: title });
  attachTooltip(
    entryTitle,
    () => '전투원은 최대 5명까지 배치할 수 있습니다. 초상화를 클릭해 위치를 교환하세요.',
    { anchor: 'element' }
  );
  entryCard.appendChild(entryTitle);
  entryCard.appendChild(renderEntryGrid());

  const benchCard = el('div', { className: 'card party-bench-card compact' });
  benchCard.appendChild(renderBenchSection());
  const sellSection = renderSellSection();
  if (sellSection) {
    benchCard.appendChild(sellSection);
  }

  if (splitLayout) {
    return { entryCard, benchCard };
  }

  const wrapper = el('div', { className: 'card' });
  wrapper.appendChild(entryCard);
  wrapper.appendChild(benchCard);
  return wrapper;
}
