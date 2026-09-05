'use strict';

const PRESENTATION_VERSION = 'release-3d-v1';

const TIERS = Object.freeze([
  { name: 'Initiation', minimumLevel: 1, maximumLevel: 10 },
  { name: 'Established', minimumLevel: 11, maximumLevel: 25 },
  { name: 'Influential', minimumLevel: 26, maximumLevel: 50 },
  { name: 'Elite', minimumLevel: 51, maximumLevel: 75 },
  { name: 'Legendary', minimumLevel: 76, maximumLevel: 99 },
  { name: 'Apex', minimumLevel: 100, maximumLevel: 100 }
]);

// Release 3A's level formula is floor(sqrt(contribution / 8)) + 1.
// This table makes that existing contract explicit for product presentation.
const LEVEL_THRESHOLDS = Object.freeze(Array.from({ length: 100 }, (_, index) => ({
  level: index + 1,
  minimumContribution: 8 * index * index
})));

const DIMENSIONS = Object.freeze([
  ['creation', 'Creation'], ['social', 'Social'], ['influence', 'Influence'],
  ['community', 'Community'], ['exploration', 'Exploration'], ['creator', 'Creator'],
  ['economy', 'Support'], ['builder_ai', 'Builder + AI']
]);

const UNLOCKS = Object.freeze([
  { id: 'signal_mark', level: 1, type: 'badge', name: 'Signal Mark', description: 'Your progression signal is online.' },
  { id: 'profile_accent', level: 11, type: 'profile_cosmetic', name: 'Profile Accent', description: 'A progression accent for future profile themes.' },
  { id: 'dimension_spotlight', level: 26, type: 'profile_module', name: 'Dimension Spotlight', description: 'Highlight a progression dimension on your profile.' },
  { id: 'signal_aura', level: 51, type: 'visual_effect', name: 'Signal Aura', description: 'A future high-signal profile effect.' },
  { id: 'legend_mark', level: 76, type: 'badge', name: 'Legend Mark', description: 'A future milestone badge for legendary contributors.' },
  { id: 'apex_signature', level: 100, type: 'profile_cosmetic', name: 'Apex Signature', description: 'The final 1–100 progression milestone.' }
]);

module.exports = Object.freeze({ PRESENTATION_VERSION, TIERS, LEVEL_THRESHOLDS, DIMENSIONS, UNLOCKS });
