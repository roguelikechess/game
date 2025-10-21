import { JOBS as DATA_JOBS, getJobById as lookupJob } from '../data/jobs.js';

export const JOBS = DATA_JOBS;

export function getJobById(jobId) {
  return lookupJob(jobId);
}
