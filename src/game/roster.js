import { UNITS } from './units.js';
import { getJobById } from './jobs.js';

export function buildRoster() {
  return UNITS.map((definition) => ({
    definition,
    job: getJobById(definition.jobId),
  }));
}
