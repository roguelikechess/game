import { SKILLS as DATA_SKILLS, getSkillById as lookupSkill } from '../data/skills.js';

export const SKILLS = DATA_SKILLS;

export function getSkillById(skillId) {
  return lookupSkill(skillId);
}
