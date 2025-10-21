import { UNITS } from './units.js';

function randomReward() {
  const sample = UNITS.slice().sort(() => Math.random() - 0.5).slice(0, 2);
  return {
    gold: 5,
    experience: 3,
    offeredUnits: sample,
  };
}

export function distributeRewards(run, outcome) {
  if (!outcome.victorious) {
    return run;
  }

  const rewards = randomReward();
  return {
    ...run,
    gold: run.gold + rewards.gold,
  };
}

export function previewRewards() {
  return randomReward();
}
