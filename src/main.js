import {
  createInitialRunState,
  addCompanyExperience,
  getExperiencePurchaseOffer,
  experienceForLevel,
} from './game/run.js';
import {
  createInitialRoster,
  findUpgradeCombos,
  upgradePartyUnits,
  removeUnitsByIds,
  healParty,
  listAllUnits,
  swapUnits,
  countDeployedUnits,
  autoAssignItemToParty,
  equipItemToUnit,
  unequipItemFromUnit,
} from './game/party.js';
import { resolveCombat, planEncounter, isBossRound } from './game/combat.js';
import { generateShop, sellUnit } from './game/shop.js';
import { getUnitDefinition } from './game/units.js';
import { el, clearChildren } from './ui/dom.js';
import { createUpgradeOverlay } from './ui/upgradeOverlay.js';
import { createMainHubPage } from './pages/mainHub.js';
import { createRosterPage } from './pages/roster.js';
import { createGraveyardPage } from './pages/graveyard.js';
import { createInventoryPage } from './pages/inventory.js';
import { AudioManager } from './ui/audio.js';
import { LOBBY_BGM, BATTLE_BGM, EFFECT_SETS } from './data/assets.js';
import { createBattleOverlay } from './ui/battleOverlay.js';
import { createAugmentOverlay } from './ui/augmentOverlay.js';
import {
  rollLoot,
  createItemInstance,
  describeItem,
  getNextRarity,
  getItemEnhanceCost,
  getItemSellValue,
} from './game/items.js';
import {
  createInitialItemShop,
  createItemFromOffer,
  rerollItemShop as rerollItemStore,
  restockItemShop,
  ITEM_SHOP_REROLL_COST,
} from './game/itemShop.js';
import {
  rollAugmentOptions,
  getAugmentTierForLevel,
  describeAugmentEffect,
  getAugmentById,
  normalizeAugmentEntry,
} from './game/augments.js';
import { ensureNanoidPrefixAtLeast, parseNanoid, nanoid } from './utils/nanoid.js';
import { getShortName } from './ui/identity.js';
import { attachTooltip } from './ui/tooltipHelpers.js';

const STORAGE_KEY = 'chrono-vanguard-save';

function cleanPlacements(party, placements = {}) {
  const validIds = new Set(listAllUnits(party).map((unit) => unit.instanceId));
  const result = {};
  Object.entries(placements).forEach(([instanceId, position]) => {
    if (validIds.has(instanceId)) {
      result[instanceId] = position;
    }
  });
  return result;
}

function sanitizeItemEntry(item) {
  if (!item) {
    return null;
  }
  const copy = { ...item };
  if (!copy.id) {
    copy.id = nanoid('item');
  }
  registerId(copy.id);
  copy.blueprintId = copy.blueprintId || item.blueprintId || null;
  copy.rarity = copy.rarity || 'common';
  const upgradeLevel = Number(copy.upgradeLevel);
  copy.upgradeLevel = Number.isFinite(upgradeLevel) && upgradeLevel > 0 ? Math.floor(upgradeLevel) : 0;
  return copy;
}

function findUnitByInstance(party, instanceId) {
  if (!instanceId) {
    return null;
  }
  const lines = ['frontline', 'midline', 'backline'];
  for (const lineKey of lines) {
    const line = party[lineKey] || [];
    for (const slot of line) {
      if (slot?.unit?.instanceId === instanceId) {
        return slot.unit;
      }
    }
  }
  for (const unit of party.bench || []) {
    if (unit?.instanceId === instanceId) {
      return unit;
    }
  }
  return null;
}

function cloneStoredUnit(unit) {
  if (!unit) {
    return null;
  }
  return {
    ...unit,
    items: Array.isArray(unit.items) ? unit.items.map((item) => sanitizeItemEntry(item)).filter(Boolean) : [],
  };
}

function sanitizeParty(rawParty = {}) {
  const ensureLine = (lineKey) => {
    const source = Array.isArray(rawParty[lineKey]) ? rawParty[lineKey] : [];
    return source.map((slot, index) => {
      if (!slot) {
        return { slot: index + 1, unit: null };
      }
      const slotNumber = slot.slot || index + 1;
      const unit = cloneStoredUnit(slot.unit);
      return { slot: slotNumber, unit };
    });
  };
  return {
    frontline: ensureLine('frontline'),
    midline: ensureLine('midline'),
    backline: ensureLine('backline'),
    bench: Array.isArray(rawParty.bench) ? rawParty.bench.map((unit) => cloneStoredUnit(unit)) : [],
  };
}

function registerId(id) {
  const parsed = parseNanoid(id);
  if (!parsed) {
    return;
  }
  ensureNanoidPrefixAtLeast(parsed.prefix, parsed.value);
}

function seedItemIdentifiers(item) {
  if (!item) {
    return;
  }
  registerId(item.id);
}

function seedUnitIdentifiers(unit) {
  if (!unit) {
    return;
  }
  registerId(unit.instanceId);
  if (Array.isArray(unit.items)) {
    unit.items.forEach((entry) => seedItemIdentifiers(entry));
  }
}

function seedPartyIdentifiers(party) {
  if (!party) {
    return;
  }
  ['frontline', 'midline', 'backline'].forEach((lineKey) => {
    (party[lineKey] || []).forEach((slot) => {
      if (slot?.unit) {
        seedUnitIdentifiers(slot.unit);
      }
    });
  });
  (party.bench || []).forEach((unit) => seedUnitIdentifiers(unit));
}

function seedGraveyardIdentifiers(graveyard) {
  if (!Array.isArray(graveyard)) {
    return;
  }
  graveyard.forEach((entry) => {
    if (entry?.instanceId) {
      registerId(entry.instanceId);
    }
    if (entry?.unit) {
      seedUnitIdentifiers(entry.unit);
    }
  });
}

function seedInventoryIdentifiers(inventory) {
  if (!Array.isArray(inventory)) {
    return;
  }
  inventory.forEach((item) => seedItemIdentifiers(item));
}

function sanitizeRunState(raw) {
  const base = createInitialRunState();
  if (!raw) {
    seedPartyIdentifiers(base.activeParty);
    seedInventoryIdentifiers(base.inventory);
    seedGraveyardIdentifiers(base.graveyard);
    return base;
  }
  const cloneItem = (item) => sanitizeItemEntry(item);
  const sanitized = {
    ...base,
    ...raw,
    activeParty: sanitizeParty(raw.activeParty || base.activeParty),
    placements: raw.placements || {},
    graveyard: Array.isArray(raw.graveyard) ? raw.graveyard : [],
    inventory: Array.isArray(raw.inventory)
      ? raw.inventory.filter(Boolean).map(cloneItem).filter(Boolean)
      : [],
    gameOver: !!raw.gameOver,
  };
  if (!sanitized.companyLevel) {
    sanitized.companyLevel = base.companyLevel;
  }
  if (sanitized.companyExperience == null) {
    sanitized.companyExperience = 0;
  }
  if (!sanitized.companyExpToNext) {
    sanitized.companyExpToNext = experienceForLevel(sanitized.companyLevel || 1);
  }
  sanitized.augments = Array.isArray(raw.augments)
    ? raw.augments
        .map((entry) => normalizeAugmentEntry(entry))
        .filter(Boolean)
    : [];
  if (raw.itemShop && typeof raw.itemShop === 'object') {
    const offerings = Array.isArray(raw.itemShop.offerings)
      ? raw.itemShop.offerings
          .map((offer) => {
            if (!offer || !offer.blueprintId) {
              return null;
            }
            const cost = Math.max(1, Math.round(Number(offer.cost) || 0));
            return {
              id: offer.id || nanoid('iOffer'),
              blueprintId: offer.blueprintId,
              rarity: offer.rarity || 'uncommon',
              type: offer.type || null,
              cost,
            };
          })
          .filter(Boolean)
      : [];
    sanitized.itemShop = {
      locked: !!raw.itemShop.locked,
      offerings: offerings.length ? offerings : createInitialItemShop(base).offerings,
    };
  } else {
    sanitized.itemShop = createInitialItemShop(base);
  }
  seedPartyIdentifiers(sanitized.activeParty);
  seedInventoryIdentifiers(sanitized.inventory);
  seedGraveyardIdentifiers(sanitized.graveyard);
  return sanitized;
}

function applyAugmentToRun(run, augmentId, tier) {
  if (!run) {
    return run;
  }
  const gain = Math.max(1, Number(tier) || 1);
  const augments = Array.isArray(run.augments) ? [...run.augments] : [];
  const index = augments.findIndex((entry) => entry.id === augmentId);
  if (index >= 0) {
    const existing = normalizeAugmentEntry(augments[index]) || { id: augmentId, levels: [] };
    const levels = Array.isArray(existing.levels) ? existing.levels.slice() : [];
    levels.push(gain);
    const next = normalizeAugmentEntry({ id: augmentId, levels });
    if (next) {
      augments[index] = next;
    } else {
      augments.splice(index, 1);
    }
  } else {
    const next = normalizeAugmentEntry({ id: augmentId, levels: [gain] });
    if (next) {
      augments.push(next);
    }
  }
  return { ...run, augments };
}

function hydratePersistedState(parsed) {
  const runState = sanitizeRunState(parsed?.runState);
  return {
    runState,
    shopOfferings: Array.isArray(parsed?.shopOfferings) ? parsed.shopOfferings : generateShop(runState),
    lastOutcome: parsed?.lastOutcome || null,
    nextEncounter: parsed?.nextEncounter || null,
    shopVisible: parsed?.shopVisible !== undefined ? parsed.shopVisible : true,
    shopReady: parsed?.shopReady !== undefined ? parsed.shopReady : true,
    shopLocked: !!parsed?.shopLocked,
    summaryVisible: parsed?.summaryVisible || false,
    audioSelection: parsed?.audioSelection || {
      lobby: LOBBY_BGM[0]?.id || null,
      battle: BATTLE_BGM[0]?.id || null,
      effects: EFFECT_SETS[0]?.id || null,
    },
    audioSettings: {
      musicVolume: (() => {
        const saved = Number(parsed?.audioSettings?.musicVolume);
        if (!Number.isFinite(saved)) {
          return 0.8;
        }
        return Math.max(0, Math.min(1, saved));
      })(),
      musicMuted: !!parsed?.audioSettings?.musicMuted,
    },
    battleSpeed: parsed?.battleSpeed || 1,
    pendingAugmentChoices: Array.isArray(parsed?.pendingAugmentChoices)
      ? parsed.pendingAugmentChoices
      : [],
    activeAugmentChoice: parsed?.activeAugmentChoice || null,
  };
}

function loadPersistedState() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return null;
  }
  try {
    const parsed = JSON.parse(stored);
    return hydratePersistedState(parsed);
  } catch (error) {
    console.warn('Failed to load saved state', error);
    return null;
  }
}

function createPersistedPayload() {
  return {
    runState: state.runState,
    shopOfferings: state.shopOfferings,
    lastOutcome: state.lastOutcome,
    nextEncounter: state.nextEncounter,
    shopVisible: state.shopVisible,
    shopReady: state.shopReady,
    shopLocked: state.shopLocked,
    summaryVisible: state.summaryVisible,
    audioSelection: state.audioSelection,
    audioSettings: state.audioSettings,
    battleSpeed: state.battleSpeed,
    pendingAugmentChoices: state.pendingAugmentChoices,
    activeAugmentChoice: state.activeAugmentChoice,
  };
}

function persistState() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  const payload = createPersistedPayload();
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to persist state', error);
  }
}

function clearPersistedState() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

function base64EncodeString(input) {
  if (typeof window === 'undefined') {
    return '';
  }
  if (typeof window.TextEncoder === 'function') {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(input);
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return window.btoa(binary);
  }
  // Fallback for older browsers without TextEncoder.
  if (typeof window.encodeURIComponent === 'function' && typeof window.unescape === 'function') {
    return window.btoa(window.unescape(window.encodeURIComponent(input)));
  }
  return window.btoa(input);
}

function base64DecodeString(encoded) {
  if (typeof window === 'undefined') {
    return '';
  }
  const sanitized = (encoded || '').replace(/\s+/g, '');
  const binary = window.atob(sanitized);
  if (typeof window.TextDecoder === 'function') {
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new TextDecoder().decode(bytes);
  }
  const percentEncoded = Array.from(binary)
    .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
    .join('');
  if (typeof decodeURIComponent === 'function') {
    return decodeURIComponent(percentEncoded);
  }
  return binary;
}

function encodePayloadToShareString(payload) {
  const json = JSON.stringify(payload);
  return base64EncodeString(json);
}

function decodeSharedStringToPayload(encoded) {
  const json = base64DecodeString(encoded);
  const parsed = JSON.parse(json);
  return hydratePersistedState(parsed);
}

function ensureNextEncounter(force = false) {
  if (state.runState.gameOver) {
    return;
  }
  if (!force && state.nextEncounter) {
    return;
  }
  const encounter = planEncounter({
    round: state.runState.round,
    allyCount: Math.max(1, countDeployedUnits(state.runState.activeParty) || 1),
  });
  state.nextEncounter = encounter;
  persistState();
}

const audioManager = new AudioManager({
  lobbyTracks: LOBBY_BGM,
  battleTracks: BATTLE_BGM,
  effectTracks: EFFECT_SETS,
});

const initialRun = createInitialRunState();

const state = {
  view: 'main',
  runState: initialRun,
  roster: createInitialRoster(),
  shopOfferings: generateShop(initialRun),
  pendingUpgrades: [],
  activeUpgrade: null,
  lastOutcome: null,
  nextEncounter: null,
  activeBattle: null,
  pendingBattleResult: null,
  shopVisible: true,
  shopReady: true,
  shopLocked: false,
  summaryVisible: false,
  battleSpeed: 1,
  pendingAugmentChoices: [],
  activeAugmentChoice: null,
  audioSelection: {
    lobby: LOBBY_BGM[0]?.id || null,
    battle: BATTLE_BGM[0]?.id || null,
    effects: EFFECT_SETS[0]?.id || null,
  },
  audioSettings: {
    musicVolume: 0.8,
    musicMuted: false,
  },
};

function applyPersistedStateSnapshot(snapshot) {
  if (!snapshot) {
    return;
  }
  state.runState = snapshot.runState;
  state.shopOfferings = snapshot.shopOfferings;
  state.lastOutcome = snapshot.lastOutcome;
  state.nextEncounter = snapshot.nextEncounter;
  state.shopVisible = snapshot.shopVisible;
  state.shopReady = snapshot.shopReady;
  state.shopLocked = !!snapshot.shopLocked;
  state.summaryVisible = !!snapshot.summaryVisible && !!snapshot.lastOutcome;
  state.audioSelection = snapshot.audioSelection;
  state.audioSettings = snapshot.audioSettings;
  state.battleSpeed = snapshot.battleSpeed;
  state.pendingAugmentChoices = Array.isArray(snapshot.pendingAugmentChoices)
    ? snapshot.pendingAugmentChoices
    : [];
  state.activeAugmentChoice = snapshot.activeAugmentChoice || null;
  state.view = 'main';
  state.activeBattle = null;
  state.pendingBattleResult = null;
  state.pendingUpgrades = [];
  state.activeUpgrade = null;
}

const persisted = loadPersistedState();
if (persisted) {
  applyPersistedStateSnapshot(persisted);
}

const root = document.getElementById('root');

function refreshPendingUpgrades() {
  const combos = findUpgradeCombos(state.runState.activeParty);
  state.pendingUpgrades = combos;
  if (combos.length === 0) {
    state.activeUpgrade = null;
    return;
  }
  if (state.activeUpgrade) {
    const match = combos.find(
      (combo) =>
        combo.definitionId === state.activeUpgrade.definitionId &&
        combo.level === state.activeUpgrade.level
    );
    state.activeUpgrade = match || combos[0];
  } else {
    state.activeUpgrade = combos[0];
  }
}

function enqueueAugmentChoices(choices = []) {
  if (!Array.isArray(choices) || !choices.length) {
    return;
  }
  state.pendingAugmentChoices = state.pendingAugmentChoices.concat(choices);
  if (!state.activeAugmentChoice && state.pendingAugmentChoices.length) {
    state.activeAugmentChoice = state.pendingAugmentChoices[0];
  }
}

function updateRunState(nextRun, { augmentChoices = [] } = {}) {
  const placements = cleanPlacements(nextRun.activeParty, nextRun.placements || state.runState.placements);
  state.runState = { ...nextRun, placements };
  ensureNextEncounter(false);
  refreshPendingUpgrades();
  enqueueAugmentChoices(augmentChoices);
  persistState();
  renderApp();
}

function updateOfferings(offerings) {
  state.shopOfferings = offerings;
  persistState();
  renderApp();
}

function setView(view) {
  state.view = view;
  if (view === 'main' && !state.runState.gameOver) {
    audioManager.playLobby();
  }
  renderApp();
}

function describeOutcome(outcome, casualties) {
  if (!outcome) {
    return null;
  }
  const casualtyCount = casualties.length;
  if (outcome.victorious) {
    if (casualtyCount === 0) {
      return '승리! 모든 아군이 생존했습니다.';
    }
    return `승리! ${casualtyCount}명의 아군이 전사했습니다.`;
  }
  if (outcome.timedOut) {
    if (casualtyCount === 0) {
      return '시간 초과! 아군이 전열을 정비하고 재도전을 준비합니다.';
    }
    return `시간 초과! ${casualtyCount}명의 아군이 쓰러졌습니다. 전열을 재정비하세요.`;
  }
  return '패배했습니다. 이번 도전은 여기서 종료됩니다.';
}

function summarizeBattlePerformance(outcome) {
  if (!outcome?.combatants?.allies) {
    return [];
  }
  const stats = new Map();
  outcome.combatants.allies.forEach((unit) => {
    stats.set(unit.id, {
      instanceId: unit.id,
      definitionId: unit.definitionId,
      name: getShortName(unit.name) || unit.name,
      damageDealt: 0,
      damageTaken: 0,
      healingDone: 0,
      healingReceived: 0,
    });
  });

  (outcome.events || []).forEach((event) => {
    if (event.kind === 'attack') {
      if (event.attackerId && stats.has(event.attackerId)) {
        stats.get(event.attackerId).damageDealt += Math.max(0, event.amount || 0);
      }
      (event.targetIds || []).forEach((targetId) => {
        if (stats.has(targetId)) {
          stats.get(targetId).damageTaken += Math.max(0, event.amount || 0);
        }
      });
    } else if (event.kind === 'heal') {
      if (event.attackerId && stats.has(event.attackerId)) {
        stats.get(event.attackerId).healingDone += Math.max(0, event.amount || 0);
      }
      (event.targetIds || []).forEach((targetId) => {
        if (stats.has(targetId)) {
          stats.get(targetId).healingReceived += Math.max(0, event.amount || 0);
        }
      });
    }
  });

  return Array.from(stats.values());
}

function buildAugmentChoices(run, levelsGained) {
  if (!levelsGained || levelsGained <= 0) {
    return [];
  }
  const choices = [];
  const finalLevel = run.companyLevel || 1;
  const startLevel = finalLevel - levelsGained + 1;
  for (let offset = 0; offset < levelsGained; offset += 1) {
    const levelValue = startLevel + offset;
    const tier = getAugmentTierForLevel(levelValue);
    const options = rollAugmentOptions().map((augment) => ({
      id: augment.id,
      name: augment.name,
      description: augment.description,
    }));
    choices.push({ level: levelValue, tier, options });
  }
  return choices;
}

function prepareBattleTransition(outcome, currentRun) {
  const fallenIds = outcome.fallenAllies.map((entry) => entry.instanceId);
  const { party: trimmedParty, removed } = removeUnitsByIds(currentRun.activeParty, fallenIds);
  const healedParty = healParty(trimmedParty);
  const placements = cleanPlacements(healedParty, currentRun.placements);

  const fallenInfoMap = new Map(outcome.fallenAllies.map((entry) => [entry.instanceId, entry]));
  const fallenRecords = removed.map((unit) => {
    const definition = getUnitDefinition(unit.definitionId);
    const info = fallenInfoMap.get(unit.instanceId);
    return {
      instanceId: unit.instanceId,
      definitionId: unit.definitionId,
      name: info?.name || definition?.name || '이름 없는 용병',
      roundFallen: currentRun.round,
      unit: {
        ...unit,
        currentHealth: 0,
        items: Array.isArray(unit.items) ? unit.items.map((item) => ({ ...item })) : [],
      },
    };
  });

  let workingParty = healedParty;
  let lootRecord = null;
  const lootMessages = [];
  const bossRound = isBossRound(currentRun.round);
  const bossExtras = [];
  let nextInventory = Array.isArray(currentRun.inventory)
    ? currentRun.inventory.filter(Boolean).map((item) => ({ ...item }))
    : [];

  if (outcome.victorious) {
    const lootSpec = rollLoot(currentRun.round);
    if (lootSpec) {
      const lootItem = createItemInstance(lootSpec.blueprintId, lootSpec.rarity);
      const assignResult = autoAssignItemToParty(workingParty, lootItem);
      workingParty = assignResult.party;
      const assignedUnit = findUnitByInstance(workingParty, assignResult.assignedTo);
      const assignedDefinition = assignedUnit ? getUnitDefinition(assignedUnit.definitionId) : null;
      const targetName = getShortName(assignedDefinition?.name) || '전투원';
      const itemName = describeItem(lootItem);
      if (assignResult.overflow) {
        nextInventory.push({ ...lootItem });
        lootMessages.push(`${itemName}을(를) 획득하여 보관함에 보관했습니다.`);
      } else {
        lootMessages.push(`${targetName}이(가) ${itemName}을(를) 장착했습니다.`);
      }
      assignResult.merges.forEach((merge) => {
        const mergeName = describeItem({ blueprintId: merge.blueprintId, rarity: merge.rarity });
        const carrier = findUnitByInstance(workingParty, merge.carrier);
        const carrierDefinition = carrier ? getUnitDefinition(carrier.definitionId) : null;
        const carrierName = getShortName(carrierDefinition?.name) || '전투원';
        lootMessages.push(`${carrierName}의 장비가 합성되어 ${mergeName}이(가) 완성되었습니다.`);
      });
      lootRecord = {
        item: lootItem,
        assignedTo: assignResult.assignedTo,
        overflow: assignResult.overflow,
        merges: assignResult.merges,
      };
    }
  }

  if (outcome.victorious && bossRound) {
    const bonusCount = Math.random() < 0.45 ? 2 : 1;
    for (let index = 0; index < bonusCount; index += 1) {
      const bonusSpec = rollLoot(currentRun.round + 1, {
        guaranteed: true,
        type: 'accessory',
        rarityBias: 0.22 + index * 0.12,
      });
      if (!bonusSpec) {
        continue;
      }
      const bonusItem = createItemInstance(bonusSpec.blueprintId, bonusSpec.rarity);
      nextInventory.push({ ...bonusItem });
      bossExtras.push({ ...bonusItem });
      lootMessages.push(`보스 처치 보상으로 ${describeItem(bonusItem)}을(를) 획득했습니다.`);
    }
  }

  if (lootRecord || bossExtras.length) {
    if (!lootRecord) {
      lootRecord = {
        item: null,
        assignedTo: null,
        overflow: true,
        merges: [],
      };
    }
    lootRecord.messages = lootMessages.slice();
    lootRecord.extras = bossExtras.map((item) => ({ ...item }));
  }

  const performance = summarizeBattlePerformance(outcome);
  const enemyCombatants =
    outcome.combatants && Array.isArray(outcome.combatants.enemies)
      ? outcome.combatants.enemies
      : [];
  const livingEnemyCount = enemyCombatants.filter((unit) => unit.health > 0).length;
  const timedOut = !!outcome.timedOut;
  const stalemate =
    timedOut && outcome.survivingAllies.length > 0 && livingEnemyCount > 0;

  let nextRun = {
    ...currentRun,
    activeParty: workingParty,
    placements,
    graveyard: [...currentRun.graveyard, ...fallenRecords],
    inventory: nextInventory,
  };

  let goldEarned = 0;
  let experienceGained = 0;
  let levelsGained = 0;
  let shopReady = false;
  let shopVisible = false;
  let offerings = state.shopOfferings;

  let augmentChoices = [];

  if (outcome.victorious) {
    const baseGold = 10 + Math.ceil(currentRun.round * 1.5);
    goldEarned = bossRound ? Math.round(baseGold * 1.5 + 18) : baseGold;
    experienceGained = Math.max(2, Math.round(2 + currentRun.round * 0.6));
    nextRun = {
      ...nextRun,
      gold: nextRun.gold + goldEarned,
      round: nextRun.round + 1,
    };
    if (experienceGained > 0) {
      const xpResult = addCompanyExperience(nextRun, experienceGained);
      nextRun = xpResult.run;
      levelsGained = xpResult.levelsGained;
      if (levelsGained > 0) {
        augmentChoices = buildAugmentChoices(nextRun, levelsGained);
      }
    }
    if (state.shopLocked) {
      offerings = (state.shopOfferings || []).map((offer) => ({ ...offer }));
    } else {
      offerings = generateShop(nextRun);
    }
    shopReady = true;
    shopVisible = true;
    if (bossRound) {
      lootMessages.push(`보스 라운드 보상으로 ${goldEarned} 골드를 획득했습니다.`);
    }
  } else if (stalemate) {
    offerings = (state.shopOfferings || []).map((offer) => ({ ...offer }));
    shopReady = true;
    shopVisible = true;
  } else {
    nextRun = { ...nextRun, gameOver: true };
  }

  if (lootRecord) {
    lootRecord.messages = lootMessages.slice();
  }

  const currentShop = currentRun.itemShop || createInitialItemShop(currentRun);
  const preservedOfferings = currentShop.offerings ? currentShop.offerings.map((offer) => ({ ...offer })) : [];
  const nextItemShop =
    outcome.victorious && !currentShop.locked
      ? restockItemShop(nextRun, currentShop)
      : { ...currentShop, offerings: preservedOfferings };
  nextRun = { ...nextRun, itemShop: nextItemShop };

  const outcomeLog = outcome.log
    .concat(
      lootMessages.map((message) => ({
        round: currentRun.round,
        actor: '전리품',
        action: message,
      }))
    )
    .concat(
      experienceGained > 0
        ? [
            {
              round: currentRun.round,
              actor: '용병단',
              action: `경험치 ${experienceGained} 획득 (${nextRun.companyExperience}/${nextRun.companyExpToNext})`,
            },
            ...(levelsGained > 0
              ? [
                  {
                    round: currentRun.round,
                    actor: '용병단',
                    action: `레벨 ${nextRun.companyLevel - levelsGained} → ${nextRun.companyLevel}`,
                  },
                ]
              : []),
          ]
        : []
    );

  if (stalemate) {
    outcomeLog.push({
      round: currentRun.round,
      actor: '전투',
      action: '시간 초과로 전투가 중단되었습니다. 전열을 정비하세요.',
    });
  }

  const lastOutcome = {
    victorious: outcome.victorious,
    summary: describeOutcome(outcome, fallenRecords),
    goldEarned: outcome.victorious ? goldEarned : 0,
    experience: outcome.victorious
      ? {
          gained: experienceGained,
          levelsGained,
          level: nextRun.companyLevel,
          progress: nextRun.companyExperience,
          toNext: nextRun.companyExpToNext,
        }
      : null,
    casualties: fallenRecords,
    log: outcomeLog,
    loot: lootRecord,
    performance,
    timedOut,
    stalemate,
  };

  if (lastOutcome.victorious && bossRound) {
    lastOutcome.summary = '보스를 격파했습니다! 장대한 전리품을 회수했습니다.';
  }

  return {
    nextRun,
    lastOutcome,
    goldEarned,
    newOfferings: offerings,
    shopReady,
    shopVisible,
    casualties: fallenRecords,
    augmentChoices,
  };
}

function handleStartBattle() {
  if (state.runState.gameOver) {
    return;
  }
  const deployed = countDeployedUnits(state.runState.activeParty);
  if (deployed === 0) {
    return;
  }
  if (deployed > 5) {
    window.alert('엔트리는 최대 5명까지만 배치할 수 있습니다.');
    return;
  }

  ensureNextEncounter(false);
  state.summaryVisible = false;
  const encounter =
    state.nextEncounter ||
    planEncounter({
      round: state.runState.round,
      allyCount: Math.max(1, deployed),
    });

  state.shopReady = false;
  state.shopVisible = false;
  audioManager.playBattle();

  const outcome = resolveCombat({
    party: state.runState.activeParty,
    round: state.runState.round,
    placements: state.runState.placements,
    encounter,
    augments: state.runState.augments,
  });
  const transition = prepareBattleTransition(outcome, state.runState);

  state.pendingBattleResult = {
    ...transition,
    encounter,
    outcome,
  };

  state.activeBattle = {
    outcome: { ...outcome, round: state.runState.round },
    round: state.runState.round,
  };

  state.nextEncounter = null;
  persistState();
  renderApp();
}

function finalizeBattleResult() {
  if (!state.pendingBattleResult) {
    state.activeBattle = null;
    renderApp();
    return;
  }

  const {
    nextRun,
    lastOutcome,
    newOfferings,
    shopReady,
    shopVisible,
    outcome,
    augmentChoices,
  } = state.pendingBattleResult;

  state.runState = nextRun;
  state.lastOutcome = lastOutcome;
  state.shopOfferings = newOfferings;
  state.shopReady = shopReady;
  state.shopVisible = shopVisible;
  state.summaryVisible = !!lastOutcome;
  state.activeBattle = null;
  state.pendingBattleResult = null;

  const queuedAugments = Array.isArray(augmentChoices) ? augmentChoices : [];
  enqueueAugmentChoices(queuedAugments);

  refreshPendingUpgrades();
  ensureNextEncounter(true);
  persistState();
  renderApp();

  audioManager.playVictory(outcome.victorious);
  if (!state.runState.gameOver) {
    window.setTimeout(() => {
      audioManager.playLobby();
    }, 700);
  }
}

function handleUpgrade(instanceId) {
  if (!state.activeUpgrade) {
    return;
  }
  const { party: nextParty, overflowItems } = upgradePartyUnits(state.runState.activeParty, {
    definitionId: state.activeUpgrade.definitionId,
    level: state.activeUpgrade.level,
    targetInstanceId: instanceId,
  });
  if (nextParty === state.runState.activeParty) {
    return;
  }
  const overflow = Array.isArray(overflowItems) ? overflowItems : [];
  const nextInventory = overflow.length
    ? state.runState.inventory.concat(overflow.map((item) => sanitizeItemEntry(item)).filter(Boolean))
    : state.runState.inventory;
  const nextRun = { ...state.runState, activeParty: nextParty, inventory: nextInventory };
  updateRunState(nextRun);
}

function handleSwapUnits(source, target) {
  const { party: nextParty, error } = swapUnits(state.runState.activeParty, source, target, 5);
  if (error === 'limit') {
    window.alert('엔트리는 최대 5명까지만 배치할 수 있습니다.');
    return;
  }
  if (error || nextParty === state.runState.activeParty) {
    return;
  }
  const nextRun = { ...state.runState, activeParty: nextParty };
  updateRunState(nextRun);
}

function handlePlacementChange(instanceId, position) {
  if (!instanceId) {
    return;
  }
  const placements = {
    ...state.runState.placements,
    [instanceId]: position,
  };
  updateRunState({ ...state.runState, placements });
}

function handleSellUnit(instanceId) {
  const { run: nextRun, removed } = sellUnit(state.runState, instanceId);
  if (!removed) {
    return;
  }
  const placements = { ...state.runState.placements };
  delete placements[instanceId];
  updateRunState({ ...nextRun, placements });
}

function handleUnequipItem(instanceId, itemId) {
  const result = unequipItemFromUnit(state.runState.activeParty, instanceId, itemId);
  if (result.error || !result.item) {
    return false;
  }
  const inventory = [...state.runState.inventory, { ...result.item }];
  const nextRun = {
    ...state.runState,
    activeParty: result.party,
    inventory,
    placements: state.runState.placements,
  };
  updateRunState(nextRun);
  return true;
}

function handleEquipItem(itemId, instanceId) {
  if (!itemId || !instanceId) {
    return false;
  }
  const stashIndex = state.runState.inventory.findIndex((entry) => entry.id === itemId);
  if (stashIndex < 0) {
    return false;
  }
  const stashItem = state.runState.inventory[stashIndex];
  const result = equipItemToUnit(state.runState.activeParty, instanceId, stashItem);
  if (result.error === 'capacity') {
    window.alert('해당 전투원은 더 이상 장비를 장착할 수 없습니다.');
    return false;
  }
  if (result.error) {
    return false;
  }
  const inventory = state.runState.inventory.filter((_, index) => index !== stashIndex);
  const nextRun = {
    ...state.runState,
    activeParty: result.party,
    inventory,
    placements: state.runState.placements,
  };
  updateRunState(nextRun);
  return true;
}

function handleMergeItems(firstId, secondId) {
  if (!firstId || !secondId || firstId === secondId) {
    return false;
  }
  const inventory = [...state.runState.inventory];
  const firstIndex = inventory.findIndex((entry) => entry.id === firstId);
  const secondIndex = inventory.findIndex((entry) => entry.id === secondId);
  if (firstIndex < 0 || secondIndex < 0) {
    return false;
  }
  const firstItem = inventory[firstIndex];
  const secondItem = inventory[secondIndex];
  if (!firstItem || !secondItem) {
    return false;
  }
  if (firstItem.blueprintId !== secondItem.blueprintId || firstItem.rarity !== secondItem.rarity) {
    return false;
  }
  const nextRarity = getNextRarity(firstItem.rarity || 'common');
  if (!nextRarity) {
    window.alert('해당 장비는 더 이상 합성할 수 없습니다.');
    return false;
  }
  const removal = [firstIndex, secondIndex].sort((a, b) => b - a);
  removal.forEach((index) => inventory.splice(index, 1));
  const mergedItem = createItemInstance(firstItem.blueprintId, nextRarity);
  const firstUpgrade = Number(firstItem.upgradeLevel) || 0;
  const secondUpgrade = Number(secondItem.upgradeLevel) || 0;
  const inheritedUpgrade = Math.max(firstUpgrade, secondUpgrade);
  if (inheritedUpgrade > 0) {
    mergedItem.upgradeLevel = inheritedUpgrade;
  }
  inventory.push(mergedItem);
  const nextRun = {
    ...state.runState,
    inventory,
  };
  updateRunState(nextRun);
  return true;
}

function handleEnhanceItem(itemId) {
  if (!itemId) {
    return false;
  }
  const index = state.runState.inventory.findIndex((entry) => entry.id === itemId);
  if (index < 0) {
    return false;
  }
  const item = state.runState.inventory[index];
  const cost = getItemEnhanceCost(item);
  if (state.runState.gold < cost) {
    window.alert('골드가 부족합니다.');
    return false;
  }
  const upgraded = { ...item, upgradeLevel: (item.upgradeLevel || 0) + 1 };
  const inventory = [...state.runState.inventory];
  inventory[index] = upgraded;
  const nextRun = {
    ...state.runState,
    gold: state.runState.gold - cost,
    inventory,
  };
  updateRunState(nextRun);
  return true;
}

function handleSellInventoryItem(itemId) {
  if (!itemId) {
    return false;
  }
  const index = state.runState.inventory.findIndex((entry) => entry.id === itemId);
  if (index < 0) {
    return false;
  }
  const item = state.runState.inventory[index];
  const value = getItemSellValue(item);
  const inventory = state.runState.inventory.filter((_, idx) => idx !== index);
  const nextRun = {
    ...state.runState,
    gold: state.runState.gold + value,
    inventory,
  };
  updateRunState(nextRun);
  return true;
}

function handlePurchaseItemOffer(offerId) {
  const shop = state.runState.itemShop || createInitialItemShop(state.runState);
  const offerings = Array.isArray(shop.offerings) ? [...shop.offerings] : [];
  const index = offerings.findIndex((offer) => offer?.id === offerId);
  if (index < 0) {
    return false;
  }
  const offer = offerings[index];
  if (state.runState.gold < offer.cost) {
    window.alert('골드가 부족합니다.');
    return false;
  }
  const item = sanitizeItemEntry(createItemFromOffer(offer));
  offerings.splice(index, 1);
  const nextRun = {
    ...state.runState,
    gold: state.runState.gold - offer.cost,
    inventory: [...state.runState.inventory, item],
    itemShop: { ...shop, offerings },
  };
  updateRunState(nextRun);
  return true;
}

function handleToggleItemShopLock() {
  const shop = state.runState.itemShop || createInitialItemShop(state.runState);
  const nextShop = { ...shop, locked: !shop.locked };
  const nextRun = { ...state.runState, itemShop: nextShop };
  updateRunState(nextRun);
}

function handleRerollItemShop() {
  const shop = state.runState.itemShop || createInitialItemShop(state.runState);
  if (state.runState.gold < ITEM_SHOP_REROLL_COST) {
    window.alert('골드가 부족합니다.');
    return;
  }
  const { shop: nextShop, gold } = rerollItemStore(state.runState, shop, state.runState.gold);
  const nextRun = { ...state.runState, gold, itemShop: nextShop };
  updateRunState(nextRun);
}

function handleSelectAugment(optionId) {
  if (!state.pendingAugmentChoices.length) {
    return;
  }
  const choice = state.pendingAugmentChoices[0];
  if (!choice || !optionId) {
    return;
  }
  const augment = getAugmentById(optionId);
  if (!augment) {
    window.alert('알 수 없는 증강입니다.');
    return;
  }
  const tier = Math.max(1, Number(choice.tier) || 1);
  const nextRun = applyAugmentToRun(state.runState, optionId, tier);
  state.runState = nextRun;
  state.pendingAugmentChoices = state.pendingAugmentChoices.slice(1);
  state.activeAugmentChoice = state.pendingAugmentChoices[0] || null;
  refreshPendingUpgrades();
  persistState();
  renderApp();
}

function handleBuyExperience() {
  if (state.runState.gameOver) {
    return;
  }
  const offer = getExperiencePurchaseOffer(state.runState);
  if (!offer) {
    return;
  }
  if (state.runState.gold < offer.cost) {
    window.alert('골드가 부족합니다.');
    return;
  }
  const baseRun = {
    ...state.runState,
    gold: state.runState.gold - offer.cost,
  };
  const result = addCompanyExperience(baseRun, offer.experience);
  const augmentChoices = buildAugmentChoices(result.run, result.levelsGained);
  updateRunState(result.run, { augmentChoices });
}

function handleToggleShop() {
  if (!state.shopReady || state.runState.gameOver) {
    return;
  }
  state.shopVisible = !state.shopVisible;
  persistState();
  renderApp();
}

function handleToggleCharacterShopLock() {
  state.shopLocked = !state.shopLocked;
  persistState();
  renderApp();
}

function handleAutoCloseShop() {
  if (!state.shopVisible) {
    return;
  }
  state.shopVisible = false;
  persistState();
  renderApp();
}

function handleDismissOutcome() {
  if (!state.lastOutcome) {
    return;
  }
  state.summaryVisible = false;
  persistState();
  renderApp();
}

function handleShowOutcome() {
  if (!state.lastOutcome) {
    return;
  }
  state.summaryVisible = true;
  persistState();
  renderApp();
}

function clampMusicVolume(value) {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(0, Math.min(1, value));
}

function applyAudioSettings(settings) {
  const volume = clampMusicVolume(settings?.musicVolume ?? state.audioSettings.musicVolume);
  const muted = !!settings?.musicMuted;
  audioManager.setMusicVolume(volume);
  audioManager.setMusicMuted(muted);
}

function applyAudioSelection(selection) {
  if (selection.lobby) {
    audioManager.setLobbyTrack(selection.lobby);
  }
  if (selection.battle) {
    audioManager.setBattleTrack(selection.battle);
  }
  if (selection.effects) {
    audioManager.setEffectSet(selection.effects);
  }
}

function handleAudioChange(kind, value) {
  state.audioSelection = { ...state.audioSelection, [kind]: value };
  applyAudioSelection(state.audioSelection);
  if (kind === 'lobby' && !state.runState.gameOver) {
    audioManager.playLobby();
  }
  persistState();
  renderApp();
}

function handleAudioSettingsChange(changes, options = {}) {
  if (!changes || typeof changes !== 'object') {
    return;
  }
  const next = { ...state.audioSettings };
  if (Object.prototype.hasOwnProperty.call(changes, 'musicVolume')) {
    next.musicVolume = clampMusicVolume(changes.musicVolume);
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'musicMuted')) {
    next.musicMuted = !!changes.musicMuted;
  }
  state.audioSettings = next;
  applyAudioSettings(next);
  if (!state.runState.gameOver && !next.musicMuted && state.view === 'main') {
    audioManager.playLobby();
  }
  if (options.persist !== false) {
    persistState();
  }
  if (options.render !== false) {
    renderApp();
  }
}

function restartRun() {
  clearPersistedState();
  state.runState = createInitialRunState();
  state.shopOfferings = generateShop(state.runState);
  state.pendingUpgrades = [];
  state.activeUpgrade = null;
  state.lastOutcome = null;
  state.nextEncounter = null;
  state.activeBattle = null;
  state.pendingBattleResult = null;
  state.shopVisible = true;
  state.shopReady = true;
  state.shopLocked = false;
  state.summaryVisible = false;
  state.battleSpeed = 1;
  state.pendingAugmentChoices = [];
  state.activeAugmentChoice = null;
  ensureNextEncounter(true);
  refreshPendingUpgrades();
  persistState();
  renderApp();
  audioManager.playLobby();
}

async function handleExportProgress() {
  try {
    if (!state.runState) {
      window.alert('내보낼 진행도가 없습니다.');
      return;
    }
    const payload = createPersistedPayload();
    const shareCode = encodePayloadToShareString(payload);
    let copied = false;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareCode);
        copied = true;
      } catch (clipboardError) {
        console.warn('Failed to copy progress code to clipboard', clipboardError);
      }
    }
    if (copied) {
      window.prompt(
        '진행도 코드가 클립보드에 복사되었습니다. 필요하면 아래 내용을 다시 복사하세요.',
        shareCode
      );
      return;
    }
    window.prompt('아래 진행도 코드를 복사해 보관하세요.', shareCode);
  } catch (error) {
    console.error('Failed to export progress', error);
    window.alert('진행도 내보내기에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
}

function handleImportProgress() {
  const input = window.prompt('불러올 진행도 코드를 붙여넣으세요.');
  if (!input) {
    return;
  }
  try {
    const snapshot = decodeSharedStringToPayload(input.trim());
    applyPersistedStateSnapshot(snapshot);
    refreshPendingUpgrades();
    ensureNextEncounter(false);
    applyAudioSelection(state.audioSelection);
    applyAudioSettings(state.audioSettings);
    persistState();
    renderApp();
    if (!state.audioSettings.musicMuted && !state.runState.gameOver) {
      audioManager.playLobby();
    }
    window.alert('진행도가 성공적으로 불러와졌습니다!');
  } catch (error) {
    console.error('Failed to import progress', error);
    window.alert('진행도 불러오기에 실패했습니다. 코드가 올바른지 확인해주세요.');
  }
}

function handleNewGame() {
  if (window.confirm('새로운 게임을 시작하시겠습니까? 진행 중인 도전이 초기화됩니다.')) {
    restartRun();
  }
}

function renderHeader() {
  const header = el('header', { className: 'app-header' });

  const run = state.runState || {};
  const statusBar = el('div', { className: 'global-status-bar' });
  const roundValue = run.round != null ? run.round : 1;
  const goldValue = run.gold != null ? run.gold : 0;
  statusBar.appendChild(el('span', { className: 'status-pill', text: `라운드 ${roundValue}` }));
  statusBar.appendChild(el('span', { className: 'status-pill', text: `골드 ${goldValue}` }));
  header.appendChild(statusBar);

  const companyRow = el('div', { className: 'header-company-row' });
  const companyLevel = run.companyLevel || 1;
  const companyExp = run.companyExperience || 0;
  const companyToNext = Math.max(1, run.companyExpToNext || 1);
  const companyProgress = Math.max(0, Math.min(1, companyExp / companyToNext));

  const levelBadge = el('div', {
    className: 'company-level-pill',
    text: `용병단 Lv.${companyLevel}`,
  });
  const progressBar = el('div', { className: 'company-progress-bar' });
  const progressFill = el('div', { className: 'company-progress-fill' });
  progressFill.style.width = `${Math.round(companyProgress * 100)}%`;
  progressBar.appendChild(progressFill);
  const progressText = el('span', {
    className: 'company-progress-text',
    text: `${companyExp} / ${companyToNext} EXP`,
  });

  companyRow.appendChild(levelBadge);
  companyRow.appendChild(progressBar);
  companyRow.appendChild(progressText);

  const experienceOffer = getExperiencePurchaseOffer(run);
  if (experienceOffer) {
    const offerButton = el('button', {
      className: 'nav-button small',
      text: `경험치 구매 (-${experienceOffer.cost} 골드 / +${experienceOffer.experience} EXP)`,
      type: 'button',
    });
    offerButton.disabled = run.gameOver || run.gold < experienceOffer.cost;
    offerButton.addEventListener('click', () => {
      if (!offerButton.disabled) {
        handleBuyExperience();
      }
    });
    companyRow.appendChild(offerButton);
  }
  header.appendChild(companyRow);

  const nav = el('nav', { className: 'navbar' });
  const navDescriptions = {
    main: '현재 도전 상황과 전투 준비를 모두 확인할 수 있습니다.',
    inventory: '보유 장비를 관리하고 강화하거나 판매하세요.',
    roster: '모든 영웅의 세부 정보를 살펴볼 수 있는 목록표입니다.',
    graveyard: '전투에서 쓰러진 전투원의 기록과 장비를 확인합니다.',
  };
  [
    { view: 'main', label: '메인' },
    { view: 'inventory', label: '장비 관리' },
    { view: 'roster', label: '캐릭터 목록표' },
    { view: 'graveyard', label: '무덤' },
  ].forEach((item) => {
    const button = el('button', {
      className: `nav-button${state.view === item.view ? ' active' : ''}`,
      text: item.label,
    });
    button.addEventListener('click', () => setView(item.view));
    const description = navDescriptions[item.view];
    if (description) {
      attachTooltip(button, () => description, { anchor: 'element' });
    }
    nav.appendChild(button);
  });

  const audioMenu = (() => {
    const details = el('details', { className: 'nav-audio-menu' });
    const summary = el('summary', { text: '사운드 옵션' });
    details.appendChild(summary);

    const panel = el('div', { className: 'nav-audio-panel' });
    const buildSelect = (labelText, tracks, selected, onChange) => {
      if (!Array.isArray(tracks) || tracks.length === 0) {
        return null;
      }
      const field = el('label', { className: 'nav-audio-field' });
      field.appendChild(el('span', { className: 'nav-audio-label', text: labelText }));
      const select = el('select', { className: 'nav-audio-select' });
      tracks.forEach((track) => {
        const option = el('option', {
          value: track.id,
          text: track.label || track.id,
        });
        if (track.id === selected) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      if (selected && tracks.some((track) => track.id === selected)) {
        select.value = selected;
      }
      select.addEventListener('change', (event) => onChange(event.target.value));
      field.appendChild(select);
      return field;
    };

    const lobbySelect = buildSelect('로비 배경음', LOBBY_BGM, state.audioSelection.lobby, (value) =>
      handleAudioChange('lobby', value)
    );
    if (lobbySelect) {
      panel.appendChild(lobbySelect);
    }

    const battleSelect = buildSelect('전투 배경음', BATTLE_BGM, state.audioSelection.battle, (value) =>
      handleAudioChange('battle', value)
    );
    if (battleSelect) {
      panel.appendChild(battleSelect);
    }

    const effectSelect = buildSelect('효과음', EFFECT_SETS, state.audioSelection.effects, (value) =>
      handleAudioChange('effects', value)
    );
    if (effectSelect) {
      panel.appendChild(effectSelect);
    }

    const musicSettings = {
      volume: Math.round(Math.max(0, Math.min(1, state.audioSettings?.musicVolume ?? 0.8)) * 100),
      muted: !!state.audioSettings?.musicMuted,
    };

    const actions = el('div', { className: 'nav-audio-actions' });
    const muteButton = el('button', {
      className: `nav-button small${musicSettings.muted ? ' secondary' : ''}`,
      text: musicSettings.muted ? 'BGM 켜기' : 'BGM 끄기',
      type: 'button',
    });
    muteButton.addEventListener('click', () => {
      handleAudioSettingsChange({ musicMuted: !musicSettings.muted });
    });
    actions.appendChild(muteButton);

    const volumeField = el('label', { className: 'nav-audio-volume' });
    const volumeLabel = el('span', {
      className: 'nav-audio-volume-label',
      text: `BGM 음량 ${musicSettings.volume}%`,
    });
    volumeField.appendChild(volumeLabel);
    const slider = el('input', {
      type: 'range',
      min: '0',
      max: '100',
      value: `${musicSettings.volume}`,
      step: '1',
    });
    slider.addEventListener('input', (event) => {
      const raw = Number(event.target.value);
      if (!Number.isFinite(raw)) {
        return;
      }
      const scaled = Math.max(0, Math.min(100, raw));
      volumeLabel.textContent = `BGM 음량 ${Math.round(scaled)}%`;
      handleAudioSettingsChange({ musicVolume: scaled / 100 }, { render: false, persist: false });
    });
    slider.addEventListener('change', (event) => {
      const raw = Number(event.target.value);
      if (!Number.isFinite(raw)) {
        return;
      }
      const scaled = Math.max(0, Math.min(100, raw));
      handleAudioSettingsChange({ musicVolume: scaled / 100 });
    });
    volumeField.appendChild(slider);
    actions.appendChild(volumeField);

    if (panel.childElementCount || actions.childElementCount) {
      panel.appendChild(actions);
    }

    details.appendChild(panel);
    return details;
  })();

  nav.appendChild(audioMenu);
  const exportButton = el('button', { className: 'nav-button', text: '진행도 내보내기' });
  exportButton.addEventListener('click', handleExportProgress);
  nav.appendChild(exportButton);
  const importButton = el('button', { className: 'nav-button', text: '진행도 불러오기' });
  importButton.addEventListener('click', handleImportProgress);
  nav.appendChild(importButton);
  const restartButton = el('button', { className: 'nav-button danger', text: '새 게임' });
  restartButton.addEventListener('click', handleNewGame);
  nav.appendChild(restartButton);
  header.appendChild(nav);
  return header;
}

function renderContent() {
  if (state.view === 'roster') {
    return createRosterPage(state.roster, {
      augments: state.runState.augments,
      party: state.runState.activeParty,
    });
  }
  if (state.view === 'graveyard') {
    return createGraveyardPage(state.runState.graveyard);
  }
  if (state.view === 'inventory') {
    return createInventoryPage({
      party: state.runState.activeParty,
      inventory: state.runState.inventory,
      onEquip: handleEquipItem,
      onUnequip: handleUnequipItem,
      onMerge: handleMergeItems,
      onEnhance: handleEnhanceItem,
      onSell: handleSellInventoryItem,
      onPurchase: handlePurchaseItemOffer,
      onToggleLock: handleToggleItemShopLock,
      onReroll: handleRerollItemShop,
      gold: state.runState.gold,
      itemShop: state.runState.itemShop,
      shopRerollCost: ITEM_SHOP_REROLL_COST,
    });
  }
  return createMainHubPage({
    runState: state.runState,
    offerings: state.shopOfferings,
    onRunStateChange: updateRunState,
    onOfferingsChange: updateOfferings,
    onSwapUnits: handleSwapUnits,
    onSellUnit: handleSellUnit,
    onStartBattle: handleStartBattle,
    onPlacementChange: handlePlacementChange,
    onToggleShop: handleToggleShop,
    onAutoCloseShop: handleAutoCloseShop,
    shopVisible: state.shopVisible,
    shopReady: state.shopReady,
    shopLocked: state.shopLocked,
    summaryVisible: state.summaryVisible && !!state.lastOutcome,
    lastOutcome: state.lastOutcome,
    upcomingEncounter: state.nextEncounter,
    onDismissOutcome: handleDismissOutcome,
    onShowOutcome: handleShowOutcome,
    onToggleShopLock: handleToggleCharacterShopLock,
  });
}

function renderApp() {
  if (!root) {
    return;
  }
  clearChildren(root);
  const shell = el('div', { className: 'app-shell' });
  shell.appendChild(renderHeader());
  const main = el('main', { className: 'app-content' });
  const viewport = el('div', { className: 'app-viewport' });
  const content = renderContent();
  if (content) {
    viewport.appendChild(content);
  }
  main.appendChild(viewport);
  shell.appendChild(main);
  if (state.activeUpgrade) {
    const overlay = createUpgradeOverlay({
      combo: state.activeUpgrade,
      onUpgrade: handleUpgrade,
    });
    shell.appendChild(overlay);
  }
  if (state.activeAugmentChoice) {
    const overlay = createAugmentOverlay({
      choice: state.activeAugmentChoice,
      pendingCount: state.pendingAugmentChoices.length,
      onSelect: handleSelectAugment,
      runState: state.runState,
    });
    shell.appendChild(overlay);
  }
  if (state.activeBattle) {
    const overlay = createBattleOverlay({
      outcome: state.activeBattle.outcome,
      round: state.activeBattle.round,
      initialSpeed: state.battleSpeed,
      audioManager,
      onComplete: finalizeBattleResult,
      onSpeedChange: (speed) => {
        state.battleSpeed = speed;
        persistState();
      },
    });
    shell.appendChild(overlay);
  }
  root.appendChild(shell);
}

if (state.nextEncounter) {
  ensureNextEncounter(false);
} else {
  ensureNextEncounter(true);
}
refreshPendingUpgrades();
renderApp();
applyAudioSelection(state.audioSelection);
applyAudioSettings(state.audioSettings);
audioManager.playLobby();
persistState();
