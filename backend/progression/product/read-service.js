'use strict';

const mongoose = require('mongoose');
const ProgressionProjection = require('../../models/ProgressionProjection');
const User = require('../../models/User');
const FactionMembership = require('../../models/FactionMembership');
const Creator = require('../../models/Creator');
const { PRESENTATION_VERSION, TIERS, LEVEL_THRESHOLDS, DIMENSIONS, UNLOCKS } = require('./config');

function userFacingProgressionEnabled(env = process.env) {
  return env.USER_FACING_PROGRESSION_ENABLED === 'true';
}

function resolveLevel(contribution) {
  const safe = Math.max(0, Number.isFinite(Number(contribution)) ? Number(contribution) : 0);
  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (safe < threshold.minimumContribution) break;
    level = threshold.level;
  }
  const current = LEVEL_THRESHOLDS[level - 1].minimumContribution;
  const next = level < 100 ? LEVEL_THRESHOLDS[level].minimumContribution : current;
  const progress = level === 100 ? 1 : Math.min(1, Math.max(0, (safe - current) / (next - current)));
  return {
    level,
    tier: TIERS.find(item => level >= item.minimumLevel && level <= item.maximumLevel).name,
    contribution: Math.round(safe * 100) / 100,
    progress: Math.round(progress * 10000) / 10000,
    currentLevelMinimum: current,
    nextLevelMinimum: level === 100 ? null : next,
    contributionToNextLevel: level === 100 ? 0 : Math.round(Math.max(0, next - safe) * 100) / 100
  };
}

function resolveUnlocks(level) {
  return {
    unlocked: UNLOCKS.filter(item => item.level <= level).map(publicUnlock),
    next: UNLOCKS.filter(item => item.level > level).slice(0, 2).map(publicUnlock)
  };
}

function publicUnlock(item) {
  return { id: item.id, level: item.level, type: item.type, name: item.name, description: item.description };
}

function publicDimensions(specialties = {}, creatorMode = false) {
  return DIMENSIONS
    .filter(([key]) => key !== 'creator' || creatorMode || Number(specialties[key]) > 0)
    .map(([key, label]) => ({ key, label, contribution: Math.round((Number(specialties[key]) || 0) * 100) / 100 }));
}

async function latestProjection(scope, subjectId) {
  return ProgressionProjection.findOne({ scope, subjectId: String(subjectId) })
    .select('+checkpoint').sort({ rebuiltAt: -1, projectionContextId: -1 }).lean();
}

async function getUserProgression(userId) {
  if (!mongoose.isValidObjectId(userId)) return null;
  const user = await User.findById(userId).select('_id isCreator').lean();
  if (!user) return null;
  const [personalProjection, membership, creator] = await Promise.all([
    latestProjection('personal', userId),
    FactionMembership.findOne({ user: userId, status: 'active' }).populate('faction', 'key name color').lean(),
    Creator.findOne({ user: userId, state: 'active' }).select('_id').lean()
  ]);
  const checkpoint = personalProjection?.checkpoint || {};
  const level = resolveLevel(checkpoint.contribution || 0);
  const creatorMode = Boolean(creator || user.isCreator);
  let faction = { state: 'unaffiliated' };
  if (membership?.faction?.key) {
    const factionProjection = await latestProjection('faction', membership.faction.key);
    faction = {
      state: 'affiliated',
      name: membership.faction.name,
      color: membership.faction.color,
      contribution: Math.round((Number(factionProjection?.checkpoint?.contributors?.[String(userId)]) || 0) * 100) / 100
    };
  }
  return {
    presentationVersion: PRESENTATION_VERSION,
    ...level,
    dimensions: publicDimensions(checkpoint.specialties, creatorMode),
    faction,
    creatorMode,
    unlocks: resolveUnlocks(level.level),
    updatedAt: personalProjection?.rebuiltAt?.toISOString?.() || null
  };
}

module.exports = Object.freeze({ userFacingProgressionEnabled, resolveLevel, resolveUnlocks, publicDimensions, getUserProgression });
