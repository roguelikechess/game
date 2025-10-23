import {
  SKILLS as DATA_SKILLS,
  getSkillById as lookupSkill,
  scaleSkillForLevel,
  getSkillLevelModifiers,
} from '../data/skills.js';

export const SKILLS = DATA_SKILLS;

export function getSkillById(skillId, { level = 1 } = {}) {
  const base = lookupSkill(skillId);
  if (!base) {
    return null;
  }
  return scaleSkillForLevel(base, level);
}

export { scaleSkillForLevel, getSkillLevelModifiers };
