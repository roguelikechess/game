import { createInitialParty } from './party.js';
import { createInitialItemShop } from './itemShop.js';

const BASE_EXP_TO_NEXT = 10;
const LINEAR_EXP_GROWTH = 6;
const EXTRA_EXP_GROWTH = 3;

export function experienceForLevel(level = 1) {
  const clamped = Math.max(1, Number(level) || 1);
  const offset = clamped - 1;
  const quadraticBonus = (offset * (offset + 1)) / 2;
  return Math.round(
    BASE_EXP_TO_NEXT + offset * LINEAR_EXP_GROWTH + quadraticBonus * EXTRA_EXP_GROWTH,
  );
}

export function createInitialRunState() {
  const startingLevel = 1;
  return {
    gold: 20,
    round: 1,
    activeParty: createInitialParty(),
    placements: {},
    graveyard: [],
    inventory: [],
    companyLevel: startingLevel,
    companyExperience: 0,
    companyExpToNext: experienceForLevel(startingLevel),
    gameOver: false,
    augments: [],
    itemShop: createInitialItemShop({ companyLevel: startingLevel }),
  };
}

export function addCompanyExperience(run, amount = 0) {
  if (!run || !Number.isFinite(amount) || amount <= 0) {
    return { run, gained: 0, levelsGained: 0 };
  }
  let level = Number(run.companyLevel) || 1;
  let exp = Number(run.companyExperience) || 0;
  let toNext = Number(run.companyExpToNext) || experienceForLevel(level);
  let remaining = Math.max(0, Math.round(amount));
  let levelsGained = 0;

  exp += remaining;
  while (exp >= toNext) {
    exp -= toNext;
    level += 1;
    levelsGained += 1;
    toNext = experienceForLevel(level);
  }

  const updated = {
    ...run,
    companyLevel: level,
    companyExperience: exp,
    companyExpToNext: toNext,
  };

  return { run: updated, gained: amount, levelsGained };
}

export function getExperiencePurchaseOffer(run) {
  const cost = 8;
  const experience = 6;
  return { cost, experience };
}
