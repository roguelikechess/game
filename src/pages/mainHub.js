import { el } from '../ui/dom.js';
import { createPartyView } from '../ui/partyView.js';
import { createPlacementBoard } from '../ui/placementBoard.js';
import { createUnitCard } from '../ui/unitCard.js';
import { createItemChip } from '../ui/itemChip.js';
import { purchaseUnit, rerollShop, getUnitSellValue } from '../game/shop.js';
import { getShortName } from '../ui/identity.js';
import { attachTooltip } from '../ui/tooltipHelpers.js';
import { findUpgradeCombos } from '../game/party.js';

function cloneUnit(unit) {
  if (!unit) {
    return null;
  }
  return {
    ...unit,
    items: Array.isArray(unit.items) ? unit.items.map((item) => ({ ...item })) : [],
  };
}

function cloneLineSlots(line = []) {
  return line.map((slot, index) => {
    const normalized = slot || { slot: index + 1, unit: null };
    return {
      slot: normalized.slot ?? index + 1,
      unit: cloneUnit(normalized.unit),
    };
  });
}

function clonePartyForSimulation(party) {
  return {
    frontline: cloneLineSlots(party.frontline),
    midline: cloneLineSlots(party.midline),
    backline: cloneLineSlots(party.backline),
    bench: (party.bench || []).map((unit) => cloneUnit(unit)),
  };
}

function simulatePurchaseForUpgrade(party, definitionId) {
  const cloned = clonePartyForSimulation(party);
  cloned.bench.push({
    instanceId: `preview-${definitionId}`,
    definitionId,
    level: 1,
  });
  return cloned;
}

function isUnitOwned(party, definitionId) {
  if (!party || !definitionId) {
    return false;
  }

  const frontlineMatch = ['frontline', 'midline', 'backline'].some((lineKey) =>
    Array.isArray(party[lineKey])
      ? party[lineKey].some((slot) => slot?.unit?.definitionId === definitionId)
      : false
  );

  if (frontlineMatch) {
    return true;
  }

  if (!party?.bench?.length) {
    return false;
  }
  return party.bench.some((unit) => unit?.definitionId === definitionId);
}

function shouldHighlightOffering(party, offering) {
  if (!party || !offering?.unit) {
    return false;
  }
  const definitionId = offering.unit.id;
  const beforeCombos = new Set(
    findUpgradeCombos(party)
      .filter((combo) => combo.definitionId === definitionId)
      .map((combo) => `${combo.definitionId}|${combo.level}`)
  );
  const simulated = simulatePurchaseForUpgrade(party, definitionId);
  const afterCombos = findUpgradeCombos(simulated).filter(
    (combo) => combo.definitionId === definitionId
  );
  return afterCombos.some((combo) => !beforeCombos.has(`${combo.definitionId}|${combo.level}`));
}

function countDeployedUnits(party) {
  return ['frontline', 'midline', 'backline']
    .map((line) => party[line].filter((slot) => slot.unit).length)
    .reduce((sum, count) => sum + count, 0);
}

function renderLootSummary(loot) {
  const hasPrimary = !!loot?.item;
  const hasExtras = Array.isArray(loot?.extras) && loot.extras.length > 0;
  if (!hasPrimary && !hasExtras) {
    return null;
  }

  const wrapper = el('div', { className: 'loot-summary' });
  wrapper.appendChild(el('h3', { className: 'loot-title', text: '이번 전리품' }));

  if (hasPrimary) {
    const primaryLine = el('div', { className: 'loot-chip-line' });
    primaryLine.appendChild(
      el('span', {
        className: 'loot-chip-caption',
        text: loot.overflow ? '보관함으로' : '장비 획득',
      })
    );
    primaryLine.appendChild(createItemChip(loot.item));
    wrapper.appendChild(primaryLine);
  }

  if (Array.isArray(loot.merges) && loot.merges.length) {
    const mergeLine = el('div', { className: 'loot-chip-line' });
    mergeLine.appendChild(el('span', { className: 'loot-chip-caption', text: '합성 결과' }));
    loot.merges.forEach((entry) => {
      mergeLine.appendChild(createItemChip({ blueprintId: entry.blueprintId, rarity: entry.rarity }));
    });
    wrapper.appendChild(mergeLine);
  }

  if (hasExtras) {
    const bonusLine = el('div', { className: 'loot-chip-line' });
    bonusLine.appendChild(el('span', { className: 'loot-chip-caption', text: '보스 보상' }));
    loot.extras.forEach((item) => {
      bonusLine.appendChild(createItemChip(item));
    });
    wrapper.appendChild(bonusLine);
  }

  if (Array.isArray(loot.messages) && loot.messages.length) {
    const list = el('ul', { className: 'loot-message-list' });
    loot.messages.forEach((message) => {
      list.appendChild(el('li', { text: message }));
    });
    wrapper.appendChild(list);
  }

  return wrapper;
}

function renderCasualtyList(casualties = []) {
  if (!casualties.length) {
    return null;
  }
  const wrapper = el('div', { className: 'casualty-summary' });
  wrapper.appendChild(el('h3', { className: 'casualty-title', text: '전투 손실' }));
  const list = el('ul', { className: 'casualty-list' });
  casualties.forEach((entry) => {
    const shortName = getShortName(entry.name) || '이름 없는 전투원';
    list.appendChild(el('li', { text: shortName }));
  });
  wrapper.appendChild(list);
  return wrapper;
}

function renderPerformanceTable(performance = []) {
  if (!performance.length) {
    return null;
  }
  const wrapper = el('div', { className: 'performance-summary' });
  wrapper.appendChild(el('h3', { text: '전투 기여도' }));
  const table = el('table', { className: 'performance-table' });
  const thead = el('thead');
  const headRow = el('tr');
  ['전투원', '가한 피해', '받은 피해', '회복량', '받은 회복'].forEach((label) => {
    headRow.appendChild(el('th', { text: label }));
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = el('tbody');
  performance.forEach((entry) => {
    const row = el('tr');
    const shortName = getShortName(entry.name) || '전투원';
    row.appendChild(el('td', { text: shortName }));
    row.appendChild(el('td', { text: `${Math.round(entry.damageDealt || 0)}` }));
    row.appendChild(el('td', { text: `${Math.round(entry.damageTaken || 0)}` }));
    row.appendChild(el('td', { text: `${Math.round(entry.healingDone || 0)}` }));
    row.appendChild(el('td', { text: `${Math.round(entry.healingReceived || 0)}` }));
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper;
}

function renderExperienceSummary(experience) {
  if (!experience?.gained) {
    return null;
  }
  const wrapper = el('div', { className: 'experience-summary' });
  wrapper.appendChild(
    el('h3', { text: '용병단 보상' })
  );
  wrapper.appendChild(
    el('p', {
      className: 'experience-line',
      text: `경험치 ${experience.gained} 획득 — 현재 Lv.${experience.level} (${experience.progress}/${experience.toNext})`,
    })
  );
  if (experience.levelsGained > 0) {
    wrapper.appendChild(
      el('p', {
        className: 'experience-note',
        text: `용병단 레벨이 ${experience.level - experience.levelsGained}에서 ${experience.level}로 상승했습니다!`,
      })
    );
  }
  return wrapper;
}

function renderOutcomeOverlay(lastOutcome, onDismiss) {
  if (!lastOutcome) {
    return null;
  }
  const overlay = el('div', { className: 'battle-summary-overlay' });
  const card = el('div', {
    className: `card battle-summary-card ${lastOutcome.victorious ? 'victory' : 'defeat'}`,
  });
  card.appendChild(
    el('h2', {
      className: 'section-title',
      text: lastOutcome.victorious ? '승리 요약' : '전투 결과',
    })
  );
  if (lastOutcome.summary) {
    card.appendChild(el('p', { className: 'summary-line', text: lastOutcome.summary }));
  }
  if (lastOutcome.goldEarned) {
    card.appendChild(
      el('p', { className: 'summary-line', text: `획득 골드: ${lastOutcome.goldEarned}` })
    );
  }
  if (lastOutcome.experience?.gained) {
    card.appendChild(
      el('p', {
        className: 'summary-line',
        text: `용병단 경험치 +${lastOutcome.experience.gained} (Lv.${lastOutcome.experience.level} / ${lastOutcome.experience.progress}/${lastOutcome.experience.toNext})`,
      })
    );
  }

  const lootBlock = renderLootSummary(lastOutcome.loot);
  if (lootBlock) {
    card.appendChild(lootBlock);
  }

  const experienceBlock = renderExperienceSummary(lastOutcome.experience);
  if (experienceBlock) {
    card.appendChild(experienceBlock);
  }

  const casualtiesBlock = renderCasualtyList(lastOutcome.casualties);
  if (casualtiesBlock) {
    card.appendChild(casualtiesBlock);
  }

  const performanceBlock = renderPerformanceTable(lastOutcome.performance);
  if (performanceBlock) {
    card.appendChild(performanceBlock);
  }

  const buttonRow = el('div', { className: 'summary-actions' });
  const closeButton = el('button', {
    className: 'nav-button primary',
    text: lastOutcome.victorious ? '보상 확인' : '닫기',
  });
  if (typeof onDismiss === 'function') {
    closeButton.addEventListener('click', () => onDismiss());
  }
  buttonRow.appendChild(closeButton);
  card.appendChild(buttonRow);
  overlay.appendChild(card);
  return overlay;
}

export function createMainHubPage({
  runState,
  offerings,
  onRunStateChange,
  onOfferingsChange,
  onSwapUnits,
  onSellUnit,
  onStartBattle,
  onPlacementChange,
  onToggleShop,
  onAutoCloseShop,
  shopVisible,
  shopReady,
  shopLocked,
  summaryVisible,
  onShowOutcome,
  lastOutcome,
  upcomingEncounter,
  onDismissOutcome,
  onToggleShopLock,
}) {
  const deployedCount = countDeployedUnits(runState.activeParty);
  const page = el('div', { className: 'main-hub-page page' });
  const layout = el('div', { className: 'main-hub-grid' });
  page.appendChild(layout);

  const battleCard = el('div', { className: 'card battle-panel' });
  const controlsRow = el('div', { className: 'battle-controls-row' });
  controlsRow.appendChild(el('span', { text: `배치 인원: ${deployedCount}/5` }));
  controlsRow.appendChild(el('span', { text: `골드: ${runState.gold}` }));
  battleCard.appendChild(controlsRow);

  const controlButtons = el('div', { className: 'battle-button-row' });
  const startBattleButton = el('button', { className: 'nav-button primary', text: '전투 시작' });
  startBattleButton.disabled = runState.gameOver || deployedCount === 0 || deployedCount > 5;
  startBattleButton.addEventListener('click', () => {
    if (!startBattleButton.disabled) {
      onStartBattle();
    }
  });
  controlButtons.appendChild(startBattleButton);

  if (deployedCount > 5) {
    controlButtons.appendChild(
      el('span', {
        className: 'limit-warning',
        text: '엔트리는 최대 5명까지 배치할 수 있습니다.',
      })
    );
  }

  const shopToggleButton = el('button', {
    className: 'nav-button secondary',
    text: shopVisible ? '상점 닫기' : '상점 열기',
  });
  shopToggleButton.disabled = !shopReady || runState.gameOver;
  shopToggleButton.addEventListener('click', () => {
    if (!shopToggleButton.disabled) {
      onToggleShop();
    }
  });
  controlButtons.appendChild(shopToggleButton);
  if (lastOutcome && !summaryVisible && typeof onShowOutcome === 'function') {
    const summaryButton = el('button', {
      className: 'nav-button secondary',
      text: '전투 요약 보기',
    });
    summaryButton.addEventListener('click', () => onShowOutcome());
    controlButtons.appendChild(summaryButton);
  }
  battleCard.appendChild(controlButtons);

  if (lastOutcome) {
    const banner = el('div', {
      className: `status-banner compact ${lastOutcome.victorious ? 'success' : 'failure'}`,
    });
    banner.appendChild(el('span', { text: lastOutcome.summary }));
    if (lastOutcome.goldEarned) {
      banner.appendChild(el('span', { text: `+${lastOutcome.goldEarned} 골드` }));
    }
    if (lastOutcome.experience?.gained) {
      banner.appendChild(
        el('span', { text: `경험치 +${lastOutcome.experience.gained}` })
      );
    }
    battleCard.appendChild(banner);
  } else {
    battleCard.appendChild(
      el('div', {
        className: 'status-banner neutral',
        text: '용병을 영입해 첫 전투를 준비하세요.',
      })
    );
  }

  if (!shopReady) {
    battleCard.appendChild(
      el('p', {
        className: 'shop-locked-text',
        text: '전투를 마치면 상점을 이용할 수 있습니다.',
      })
    );
  }

  const placementCard = createPlacementBoard({
    party: runState.activeParty,
    placements: runState.placements,
    onChange: onPlacementChange,
    encounter: upcomingEncounter,
  });
  placementCard.classList.add('battle-placement');
  battleCard.appendChild(placementCard);

  const shopOverlay = el('div', {
    className: `shop-overlay${shopVisible && shopReady ? ' open' : ''}`,
  });
  const shopInner = el('div', { className: 'card shop-card' });
  const shopTitle = el('h2', { className: 'section-title', text: '전초기지 상점' });
  attachTooltip(
    shopTitle,
    () => '전투 후 새 용병을 모집하거나 상점 리롤을 사용할 수 있습니다.',
    { anchor: 'element' }
  );
  shopInner.appendChild(shopTitle);
  if (shopLocked) {
    shopInner.appendChild(
      el('div', {
        className: 'shop-lock-banner',
        text: '상점이 잠겨 있어 전투 후 상품이 유지됩니다.',
      })
    );
  }

  const offeringList = el('div', { className: 'unit-grid shop-grid' });
  offerings.forEach((offering, index) => {
    const card = createUnitCard({ definitionId: offering.unit.id, mode: 'shop' });
    if (isUnitOwned(runState.activeParty, offering.unit.id)) {
      card.classList.add('bench-duplicate');
      card.appendChild(
        el('div', {
          className: 'bench-note',
          text: '벤치에 있음',
        })
      );
    }
    if (shouldHighlightOffering(runState.activeParty, offering)) {
      card.classList.add('upgrade-ready');
      card.appendChild(
        el('div', {
          className: 'upgrade-hint',
          text: '구매 시 합성 가능!',
        })
      );
    }
    const info = card.querySelector('.unit-info');
    if (info) {
      info.appendChild(el('div', { className: 'cost-line', text: `가격: ${offering.cost} 골드` }));
    }
    const recruitButton = el('button', { className: 'nav-button', text: '영입' });
    recruitButton.disabled =
      runState.gold < offering.cost || runState.gameOver || !shopReady;
    recruitButton.addEventListener('click', () => {
      if (recruitButton.disabled) {
        return;
      }
      const beforeKeys = new Set(
        findUpgradeCombos(runState.activeParty).map(
          (combo) => `${combo.definitionId}|${combo.level}`
        )
      );
      const updatedRun = purchaseUnit(runState, offering);
      if (updatedRun !== runState) {
        const afterKeys = new Set(
          findUpgradeCombos(updatedRun.activeParty).map(
            (combo) => `${combo.definitionId}|${combo.level}`
          )
        );
        const triggered = Array.from(afterKeys).some((key) => !beforeKeys.has(key));
        onRunStateChange(updatedRun);
        const nextOfferings = offerings.filter((_, idx) => idx !== index);
        onOfferingsChange(nextOfferings);
        if (triggered && typeof onAutoCloseShop === 'function') {
          onAutoCloseShop();
        }
      }
    });
    card.appendChild(recruitButton);
    offeringList.appendChild(card);
  });
  if (offeringList.childElementCount === 0) {
    const emptyText = shopLocked
      ? '상점이 잠겨 있어 현재 상품이 유지됩니다.'
      : '상점이 비어 있습니다. 리롤하여 새 용병을 찾아보세요.';
    offeringList.appendChild(el('div', { className: 'empty-state', text: emptyText }));
  }
  shopInner.appendChild(offeringList);

  const shopButtons = el('div', { className: 'shop-button-row' });
  const lockButton = el('button', {
    className: `nav-button secondary${shopLocked ? ' active' : ''}`,
    text: shopLocked ? '잠금 해제' : '상점 잠금',
  });
  lockButton.addEventListener('click', () => {
    if (typeof onToggleShopLock === 'function') {
      onToggleShopLock();
    }
  });
  shopButtons.appendChild(lockButton);
  const rerollButton = el('button', { className: 'nav-button', text: '리롤 (-1 골드)' });
  rerollButton.disabled = runState.gold < 1 || runState.gameOver || !shopReady;
  rerollButton.addEventListener('click', () => {
    if (rerollButton.disabled) {
      return;
    }
    const { offerings: nextOfferings, gold } = rerollShop(runState, runState.gold);
    onOfferingsChange(nextOfferings);
    if (gold !== runState.gold) {
      onRunStateChange({ ...runState, gold });
    }
  });
  shopButtons.appendChild(rerollButton);

  const closeButton = el('button', { className: 'nav-button secondary', text: '닫기' });
  closeButton.addEventListener('click', () => onToggleShop());
  shopButtons.appendChild(closeButton);

  shopInner.appendChild(shopButtons);
  shopOverlay.appendChild(shopInner);
  battleCard.appendChild(shopOverlay);

  layout.appendChild(battleCard);

  const partyPanels = createPartyView(runState.activeParty, '엔트리', {
    enableInteractions: true,
    onSwap: onSwapUnits,
    allowSelling: true,
    onSell: onSellUnit,
    getSellValue: getUnitSellValue,
    splitLayout: true,
  });

  partyPanels.entryCard.classList.add('entry-panel');
  partyPanels.benchCard.classList.add('bench-panel');

  const partyColumn = el('div', { className: 'party-column' });
  partyColumn.appendChild(partyPanels.entryCard);
  partyColumn.appendChild(partyPanels.benchCard);
  layout.appendChild(partyColumn);

  if (summaryVisible && lastOutcome) {
    const overlay = renderOutcomeOverlay(lastOutcome, onDismissOutcome);
    if (overlay) {
      page.appendChild(overlay);
    }
  }

  return page;
}
