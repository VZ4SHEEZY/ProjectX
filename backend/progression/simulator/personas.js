'use strict';

const PERSONAS = Object.freeze([
  ['casual', 'normal casual user'], ['active_legit', 'highly active legitimate user'], ['original_creator', 'original creator'],
  ['viral_creator', 'viral creator'], ['cross_faction_viral', 'viral cross-faction creator'], ['same_faction_farmer', 'same-faction engagement farmer'],
  ['spam_poster', 'spam poster'], ['follow_farmer', 'follow/unfollow farmer'], ['community_user', 'social/community-focused user'],
  ['many_supporters', 'creator with many independent legitimate supporters'], ['one_large_supporter', 'creator with one very large legitimate supporter'], ['wealthy_spender', 'wealthy spender attempting to purchase personal progression'],
  ['circular_tips', 'suspected circular tip network'], ['social_butterfly', 'cross-faction social butterfly'], ['faction_oriented', 'strongly faction-oriented user'],
  ['unaffiliated_power', 'Unaffiliated power user'], ['ai_builder', 'future AI/bot builder persona'], ['sybil_cluster', 'suspicious Sybil/engagement-ring cluster']
].map(([id, label]) => ({ id, label })));

module.exports = { PERSONAS };
