import { el } from '../ui/dom.js';
import { listUnitsWithLocation, summarizeUnitItems } from '../game/party.js';
import { getUnitDefinition, getUnitSkill, buildBaseStats } from '../game/units.js';
import { getJobById } from '../game/jobs.js';
import { getPortraitById } from '../data/assets.js';
import {
  getItemCapacityForUnit,
  applyItemBonuses,
  getItemEnhanceCost,
  getItemSellValue,
} from '../game/items.js';
import { createItemChip } from '../ui/itemChip.js';
import { attachTooltip, buildUnitTooltip } from '../ui/tooltipHelpers.js';
import { applyPortraitAsset } from '../ui/portraitVisual.js';
import { createNameplate, getJobEmoji, getJobLabel } from '../ui/identity.js';

function createUnitPanel(unit, options) {
  const { onEquip, onUnequip, trackPanel } = options;
  const definition = getUnitDefinition(unit.definitionId);
  const job = definition?.jobId ? getJobById(definition.jobId) : null;
  const capacity = getItemCapacityForUnit(definition);

  const card = el('div', { className: 'inventory-unit-card' });
  card.dataset.instanceId = unit.instanceId;

  const header = el('div', { className: 'inventory-unit-header' });
  const portraitAsset = definition?.portraitId ? getPortraitById(definition.portraitId) : null;
  const portrait = el('div', { className: 'inventory-portrait' });
  const placeholder = (definition?.name || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  applyPortraitAsset(portrait, portraitAsset, { placeholder });
  header.appendChild(portrait);

  const meta = el('div', { className: 'inventory-unit-meta' });
  const nameplate = createNameplate({
    name: definition?.name || '이름 없는 용병',
    rarity: definition?.rarity,
    short: true,
    tag: 'strong',
    className: 'inventory-unit-name',
  });
  meta.appendChild(nameplate.element);
  if (job) {
    const jobBadge = el('small', { className: 'inventory-job-emoji', text: getJobLabel(job) });
    jobBadge.title = `${getJobEmoji(job)} ${job.name} (${job.role})`;
    meta.appendChild(jobBadge);
  }
  meta.appendChild(el('small', { text: `장착: ${(unit.items || []).length}/${capacity}` }));
  header.appendChild(meta);
  card.appendChild(header);

  const itemsRow = el('div', { className: 'inventory-unit-items' });
  if (unit.items?.length) {
    unit.items.forEach((item) => {
      const chip = createItemChip(item, { compact: true, interactive: true });
      chip.addEventListener('click', (event) => {
        event.stopPropagation();
        if (typeof onUnequip === 'function') {
          onUnequip(unit.instanceId, item.id);
        }
      });
      itemsRow.appendChild(chip);
    });
  } else {
    const empty = el('span', { className: 'inventory-unit-empty', text: '장착된 장비 없음' });
    itemsRow.appendChild(empty);
  }
  card.appendChild(itemsRow);

  attachTooltip(card, () => {
    const base = unit.currentStats || buildBaseStats(definition);
    const applied = applyItemBonuses(base, unit.items || []);
    const stats = applied.stats;
    return buildUnitTooltip({
      name: definition?.name,
      jobName: job?.name,
      role: job?.role,
      rarity: definition?.rarity,
      stats,
      baseStats: base,
      skill: definition ? getUnitSkill(definition.id) : null,
      level: unit.level,
      items: summarizeUnitItems(unit),
    });
  });

  if (typeof onEquip === 'function') {
    card.addEventListener('click', () => {
      const equipped = onEquip(unit.instanceId);
      if (equipped) {
        card.classList.remove('eligible');
      }
    });
  }

  if (typeof trackPanel === 'function') {
    trackPanel({ element: card, unit, capacity });
  }

  return card;
}

export function createInventoryPage({
  party,
  inventory = [],
  onEquip,
  onUnequip,
  onMerge,
  onEnhance,
  onSell,
  onPurchase,
  onToggleLock,
  onReroll,
  gold = 0,
  itemShop,
  shopRerollCost = 3,
}) {
  const page = el('div', { className: 'inventory-page page' });
  const layout = el('div', { className: 'inventory-layout' });
  page.appendChild(layout);

  const stashCard = el('div', { className: 'card inventory-card inventory-stash-card' });
  const stashTitle = el('h2', { className: 'section-title', text: '보관 중인 장비' });
  attachTooltip(
    stashTitle,
    () =>
      inventory.length
        ? '장비를 클릭하여 선택하고 전투원 카드에 적용하거나 합성하세요.'
        : '전투에서 승리하면 새로운 장비를 획득할 수 있습니다.',
    { anchor: 'element' }
  );
  stashCard.appendChild(stashTitle);

  const stashGrid = el('div', { className: 'inventory-stash-grid' });
  const sortControls = el('div', { className: 'inventory-sort-controls' });
  const itemElements = new Map();
  let selectedItemId = null;
  const inventoryDetails = new Map(inventory.map((item) => [item.id, item]));
  const arrivalIndex = new Map(inventory.map((item, index) => [item.id, index]));
  let sortMode = 'arrival';

  const rarityRank = {
    common: 0,
    uncommon: 1,
    rare: 2,
    unique: 3,
    epic: 4,
  };

  function updateSortButtons() {
    [arrivalButton, rarityButton].forEach((button) => {
      button.classList.toggle('active', button.dataset.mode === sortMode);
    });
  }

  function getSortedInventory() {
    if (sortMode === 'rarity') {
      return [...inventory].sort((a, b) => {
        const rarityDiff = (rarityRank[a.rarity] || 0) - (rarityRank[b.rarity] || 0);
        if (rarityDiff !== 0) {
          return rarityDiff;
        }
        return (arrivalIndex.get(a.id) || 0) - (arrivalIndex.get(b.id) || 0);
      });
    }
    return [...inventory].sort(
      (a, b) => (arrivalIndex.get(a.id) || 0) - (arrivalIndex.get(b.id) || 0)
    );
  }

  function renderInventoryGrid() {
    stashGrid.innerHTML = '';
    itemElements.clear();
    const sorted = getSortedInventory();
    if (!sorted.length) {
      stashGrid.appendChild(
        el('div', { className: 'empty-state small', text: '보관 중인 장비가 없습니다.' })
      );
      return;
    }
    sorted.forEach((item) => {
      const cell = el('div', { className: 'inventory-item-cell' });
      const chip = createItemChip(item, { interactive: true });
      chip.addEventListener('click', (event) => {
        event.stopPropagation();
        selectItem(item.id);
      });
      cell.appendChild(chip);
      stashGrid.appendChild(cell);
      itemElements.set(item.id, chip);
    });
  }

  const arrivalButton = el('button', {
    className: 'nav-button secondary',
    text: '획득 순',
  });
  arrivalButton.dataset.mode = 'arrival';
  arrivalButton.addEventListener('click', () => {
    if (sortMode !== 'arrival') {
      sortMode = 'arrival';
      renderInventoryGrid();
      refreshSelection();
      updateSortButtons();
    }
  });
  const rarityButton = el('button', {
    className: 'nav-button secondary',
    text: '희귀도 순',
  });
  rarityButton.dataset.mode = 'rarity';
  rarityButton.addEventListener('click', () => {
    if (sortMode !== 'rarity') {
      sortMode = 'rarity';
      renderInventoryGrid();
      refreshSelection();
      updateSortButtons();
    }
  });

  sortControls.appendChild(arrivalButton);
  sortControls.appendChild(rarityButton);
  stashCard.appendChild(sortControls);
  stashCard.appendChild(stashGrid);
  layout.appendChild(stashCard);

  const shopState = itemShop && typeof itemShop === 'object' ? itemShop : { offerings: [], locked: false };

  const unitCard = el('div', { className: 'card inventory-card inventory-party-card' });
  const unitTitle = el('h2', { className: 'section-title', text: '전투원 장비 관리' });
  attachTooltip(
    unitTitle,
    () => '장비를 선택한 후 전투원 카드를 클릭하면 장착하거나 회수할 수 있습니다.',
    { anchor: 'element' }
  );
  unitCard.appendChild(unitTitle);
  const unitGrid = el('div', { className: 'inventory-unit-grid' });
  unitCard.appendChild(unitGrid);
  layout.appendChild(unitCard);

  const actionsCard = el('div', { className: 'card inventory-card inventory-actions-card' });
  const actionsTitle = el('h2', { className: 'section-title', text: '장비 조작' });
  attachTooltip(
    actionsTitle,
    () => '장비를 선택하면 강화와 판매 옵션이 활성화됩니다.',
    { anchor: 'element' }
  );
  actionsCard.appendChild(actionsTitle);
  const goldLine = el('p', { className: 'inventory-gold-line', text: `보유 골드: ${gold}` });
  actionsCard.appendChild(goldLine);
  const actionButtons = el('div', { className: 'inventory-actions-buttons' });
  const enhanceButton = el('button', { className: 'nav-button', text: '강화', disabled: true });
  const sellButton = el('button', { className: 'nav-button secondary', text: '판매', disabled: true });
  actionButtons.appendChild(enhanceButton);
  actionButtons.appendChild(sellButton);
  actionsCard.appendChild(actionButtons);
  const actionInfo = el('p', { className: 'inventory-action-info', text: '' });
  actionsCard.appendChild(actionInfo);
  const selectionHint = el('p', {
    className: 'inventory-selection-hint',
    text: '장비를 선택하여 강화 단계와 판매 가격을 확인하세요.',
  });
  actionsCard.appendChild(selectionHint);
  layout.appendChild(actionsCard);

  enhanceButton.addEventListener('click', () => {
    if (selectedItemId && typeof onEnhance === 'function') {
      onEnhance(selectedItemId);
    }
  });
  sellButton.addEventListener('click', () => {
    if (selectedItemId && typeof onSell === 'function') {
      onSell(selectedItemId);
    }
  });

  const shopCard = el('div', { className: 'card inventory-card inventory-shop-card' });
  const shopTitle = el('h2', { className: 'section-title', text: '장비 상점' });
  attachTooltip(
    shopTitle,
    () => '새 장비를 구매하거나 상점을 잠가 다음 전투까지 상품을 유지하세요.',
    { anchor: 'element' }
  );
  shopCard.appendChild(shopTitle);
  const shopControls = el('div', { className: 'inventory-shop-controls' });
  const lockButton = el('button', {
    className: `nav-button secondary${shopState.locked ? ' active' : ''}`,
    text: shopState.locked ? '상점 잠금 해제' : '상점 잠금',
    disabled: typeof onToggleLock !== 'function',
  });
  lockButton.addEventListener('click', () => {
    if (typeof onToggleLock === 'function') {
      onToggleLock();
    }
  });
  const rerollButton = el('button', {
    className: 'nav-button',
    text: `새 상품 (-${shopRerollCost} 골드)`,
    disabled: typeof onReroll !== 'function' || gold < shopRerollCost,
  });
  rerollButton.addEventListener('click', () => {
    if (!rerollButton.disabled && typeof onReroll === 'function') {
      onReroll();
    }
  });
  shopControls.appendChild(lockButton);
  shopControls.appendChild(rerollButton);
  shopCard.appendChild(shopControls);
  const shopList = el('div', { className: 'inventory-shop-grid' });
  if (shopState.offerings && shopState.offerings.length) {
    shopState.offerings.forEach((offer) => {
      const offerRow = el('div', { className: 'inventory-shop-offer' });
      const previewItem = {
        id: offer.id,
        blueprintId: offer.blueprintId,
        rarity: offer.rarity,
        upgradeLevel: 0,
      };
      const chip = createItemChip(previewItem, { interactive: false });
      offerRow.appendChild(chip);
      const offerMeta = el('div', { className: 'inventory-shop-offer-meta' });
      offerMeta.appendChild(el('span', { text: `가격: ${offer.cost} 골드` }));
      offerRow.appendChild(offerMeta);
      const buyButton = el('button', {
        className: 'nav-button primary',
        text: '구매',
        disabled: typeof onPurchase !== 'function' || gold < offer.cost,
      });
      buyButton.addEventListener('click', () => {
        if (!buyButton.disabled && typeof onPurchase === 'function') {
          onPurchase(offer.id);
        }
      });
      offerRow.appendChild(buyButton);
      shopList.appendChild(offerRow);
    });
  } else {
    const emptyText = shopState.locked
      ? '상점이 잠겨 현재 상품이 유지됩니다.'
      : '판매 중인 장비가 없습니다. 새 상품을 불러오세요.';
    shopList.appendChild(el('div', { className: 'empty-state small', text: emptyText }));
  }
  shopCard.appendChild(shopList);
  layout.appendChild(shopCard);

  const panels = [];

  function updateUnitHighlights() {
    const hasSelection = !!selectedItemId;
    panels.forEach((panel) => {
      const filled = panel.unit.items ? panel.unit.items.length : 0;
      const available = filled < panel.capacity;
      panel.element.classList.toggle('eligible', hasSelection && available);
      panel.element.classList.toggle('blocked', hasSelection && !available);
      if (!hasSelection) {
        panel.element.classList.remove('eligible');
        panel.element.classList.remove('blocked');
      }
    });
  }

  function refreshSelection() {
    const selectedItem = selectedItemId ? inventoryDetails.get(selectedItemId) : null;
    itemElements.forEach((chip, id) => {
      const item = inventoryDetails.get(id);
      const isSelected = id === selectedItemId;
      const mergeCandidate =
        !!selectedItem &&
        !isSelected &&
        item &&
        item.blueprintId === selectedItem.blueprintId &&
        item.rarity === selectedItem.rarity;
      chip.classList.toggle('selected', isSelected);
      chip.classList.toggle('merge-ready', mergeCandidate);
    });
    updateUnitHighlights();
    let actionSummary = '장비를 선택하여 강화 단계와 판매 가격을 확인하세요.';
    if (selectedItem && typeof onEnhance === 'function') {
      const cost = getItemEnhanceCost(selectedItem);
      enhanceButton.disabled = gold < cost;
      enhanceButton.textContent = `강화 (-${cost} 골드)`;
    } else {
      enhanceButton.disabled = true;
      enhanceButton.textContent = '강화';
    }
    if (selectedItem && typeof onSell === 'function') {
      const value = getItemSellValue(selectedItem);
      sellButton.disabled = false;
      sellButton.textContent = `판매 (+${value} 골드)`;
      actionSummary = `강화 단계: +${selectedItem.upgradeLevel || 0} · 판매 가치: ${value} 골드`;
    } else {
      sellButton.disabled = true;
      sellButton.textContent = '판매';
      if (!selectedItem) {
        actionSummary = '장비를 선택하여 강화 단계와 판매 가격을 확인하세요.';
      }
    }
    actionInfo.textContent = actionSummary;
    if (!inventory.length) {
      selectionHint.textContent = '획득한 장비가 아직 없습니다. 전투를 승리하면 전리품을 얻을 수 있습니다.';
    } else if (selectedItemId) {
      selectionHint.textContent =
        '같은 장비를 다시 선택하면 합성되고, 강화·판매 버튼을 사용해 장비를 강화하거나 처분할 수 있습니다.';
    } else {
      selectionHint.textContent =
        '장비를 선택하면 장착 및 강화·판매 옵션이 활성화됩니다. 같은 장비를 연속으로 선택하면 합성됩니다.';
    }
  }

  function selectItem(itemId) {
    if (selectedItemId && selectedItemId !== itemId) {
      const firstItem = inventoryDetails.get(selectedItemId);
      const secondItem = inventoryDetails.get(itemId);
      if (
        firstItem &&
        secondItem &&
        firstItem.blueprintId === secondItem.blueprintId &&
        firstItem.rarity === secondItem.rarity &&
        typeof onMerge === 'function'
      ) {
        const merged = onMerge(selectedItemId, itemId);
        if (merged) {
          selectedItemId = null;
          return;
        }
      }
    }
    selectedItemId = selectedItemId === itemId ? null : itemId;
    refreshSelection();
  }

  renderInventoryGrid();
  updateSortButtons();

  const equipHandler = typeof onEquip === 'function'
    ? (targetId) => {
        if (!selectedItemId) {
          return false;
        }
        const panel = panels.find((entry) => entry.unit.instanceId === targetId);
        if (panel && panel.unit.items && panel.unit.items.length >= panel.capacity) {
          window.alert('해당 전투원은 장착 공간이 가득 찼습니다.');
          return false;
        }
        const equipped = onEquip(selectedItemId, targetId);
        if (equipped) {
          selectedItemId = null;
          refreshSelection();
        }
        return equipped;
      }
    : () => false;

  const entries = listUnitsWithLocation(party);
  if (!entries.length) {
    unitGrid.appendChild(el('div', { className: 'empty-state small', text: '아직 영입한 전투원이 없습니다.' }));
  } else {
    entries.forEach((entry) => {
      const card = createUnitPanel(entry.unit, {
        onEquip: (targetId) => equipHandler(targetId),
        onUnequip,
        trackPanel: (panel) => panels.push(panel),
      });
      unitGrid.appendChild(card);
    });
  }

  refreshSelection();
  return page;
}
