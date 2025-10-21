import { TRAITS as DATA_TRAITS, getTraitById as lookupTrait } from '../data/traits.js';

export const TRAITS = DATA_TRAITS;

export function getTraitById(traitId) {
  return lookupTrait(traitId);
}
