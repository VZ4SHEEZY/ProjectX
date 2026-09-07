'use strict';

const STAGES = Object.freeze({ DISABLED: 0, INTERNAL: 1, SMALL_COHORT: 2, LARGE_COHORT: 3, GENERAL_AVAILABILITY: 4 });

function parseList(value) {
  return new Set(String(value || '').split(',').map(item => item.trim()).filter(Boolean));
}

function rolloutConfig(env = process.env) {
  const stage = Number.parseInt(env.PROGRESSION_ROLLOUT_STAGE || '0', 10);
  return Object.freeze({
    stage: Number.isInteger(stage) && stage >= 0 && stage <= 4 ? stage : 0,
    smallCohort: parseList(env.PROGRESSION_ROLLOUT_SMALL_COHORT),
    largeCohort: parseList(env.PROGRESSION_ROLLOUT_LARGE_COHORT)
  });
}

function rolloutEnabledFor(user, env = process.env) {
  if (env.USER_FACING_PROGRESSION_ENABLED !== 'true' || env.VITE_USER_FACING_PROGRESSION_ENABLED !== 'true') return false;
  const config = rolloutConfig(env);
  if (!user || config.stage === STAGES.DISABLED) return false;
  if (config.stage === STAGES.GENERAL_AVAILABILITY) return true;
  const identities = [user._id, user.id, user.username].filter(Boolean).map(String);
  if (config.stage === STAGES.INTERNAL) return user.isAdmin === true || user.platformRole === 'platform_owner';
  const cohort = config.stage === STAGES.SMALL_COHORT ? config.smallCohort : config.largeCohort;
  return identities.some(identity => cohort.has(identity));
}

module.exports = Object.freeze({ STAGES, rolloutConfig, rolloutEnabledFor });
