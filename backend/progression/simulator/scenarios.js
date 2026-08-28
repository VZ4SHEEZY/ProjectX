'use strict';

const { canonicalEvent } = require('../contracts');
const { PERSONAS } = require('./personas');

const start = Date.parse('2026-08-01T00:00:00.000Z');
const factionFor = id => id === 'unaffiliated_power' ? null : (['cross_faction_viral', 'viral_creator', 'original_creator', 'many_supporters', 'huge_supporter', 'ai_builder'].includes(id) ? 'Neon' : 'Chrome');

function buildScenario() {
  const events = [];
  for (const [personaIndex, persona] of PERSONAS.entries()) {
    const spec = specification(persona.id);
    for (let i = 0; i < spec.count; i++) {
      const occurredAt = new Date(start + personaIndex * 86400000 + i * spec.spacingMinutes * 60000).toISOString();
      const actorId = spec.externalActors ? `${persona.id}-supporter-${i % spec.externalActors}` : persona.id;
      events.push(canonicalEvent({
        idempotencyKey: `r3a:${persona.id}:${i}`,
        eventType: spec.type,
        activityClass: spec.activityClass,
        actorId,
        beneficiaryId: persona.id,
        occurredAt,
        factionAtEvent: factionFor(persona.id),
        subject: { type: 'synthetic_persona', id: persona.id },
        object: { type: spec.objectType || 'synthetic_activity', id: `${persona.id}-${i}` },
        economic: spec.amountMinor ? { amountMinor: String(spec.amountMinor), currency: 'USD', status: spec.economicStatus || 'final', providerReference: `synthetic-${persona.id}-${i}` } : null,
        attributes: { ...spec.attributes, repeatOrdinal: i + 1, uniqueSupporters: spec.externalActors || spec.attributes.uniqueSupporters }
      }));
    }
  }
  return events;
}

function specification(id) {
  const common = { count: 8, spacingMinutes: 180, type: 'engagement.received', activityClass: 'ENGAGE', externalActors: 8, attributes: { trustConfidence: .9, valueSignal: .55, uniquePeople: 8, uniqueFactions: 1, engagementDiversity: .6 } };
  const specs = {
    casual: { ...common, count: 5 },
    active_legit: { ...common, count: 45, spacingMinutes: 45, externalActors: 30, attributes: { ...common.attributes, uniquePeople: 30, uniqueFactions: 3, valueSignal: .65 } },
    original_creator: { ...common, count: 12, type: 'creation.published', activityClass: 'CREATE', externalActors: 0, attributes: { ...common.attributes, uniquePeople: 18, valueSignal: .75 } },
    viral_creator: { ...common, count: 4, type: 'achievement.reached', activityClass: 'ACHIEVE', externalActors: 4, attributes: { ...common.attributes, uniquePeople: 1200, uniqueFactions: 2, valueSignal: .95, engagementDiversity: .9 } },
    cross_faction_viral: { ...common, count: 4, type: 'achievement.reached', activityClass: 'ACHIEVE', externalActors: 4, attributes: { ...common.attributes, uniquePeople: 1200, uniqueFactions: 12, valueSignal: .95, engagementDiversity: 1 } },
    same_faction_farmer: { ...common, count: 80, spacingMinutes: 2, externalActors: 4, attributes: { ...common.attributes, uniquePeople: 4, uniqueFactions: 0, sameFactionDensity: .98, reciprocalDensity: .92, valueSignal: .2 } },
    spam_poster: { ...common, count: 100, spacingMinutes: .4, type: 'creation.published', activityClass: 'CREATE', externalActors: 0, attributes: { ...common.attributes, uniquePeople: 1, uniqueFactions: 0, valueSignal: .08, velocityPerHour: 150, lowValueRatio: .95 } },
    follow_farmer: { ...common, count: 90, spacingMinutes: 1, type: 'relationship.formed', externalActors: 3, attributes: { ...common.attributes, uniquePeople: 3, reciprocalDensity: .95, lowValueRatio: .9, valueSignal: .1 } },
    community_user: { ...common, count: 25, externalActors: 20, attributes: { ...common.attributes, uniquePeople: 20, uniqueFactions: 4, valueSignal: .8, engagementDiversity: .9 } },
    many_supporters: { ...common, count: 20, type: 'economy.support.final', activityClass: 'TRANSACT', externalActors: 20, amountMinor: 1000, attributes: { ...common.attributes, uniquePeople: 20, uniqueFactions: 5, uniqueSupporters: 20, valueSignal: .85, engagementDiversity: .95 } },
    huge_supporter: { ...common, count: 1, type: 'economy.support.final', activityClass: 'TRANSACT', externalActors: 1, amountMinor: 20000, attributes: { ...common.attributes, uniquePeople: 1, uniqueFactions: 1, uniqueSupporters: 1, valueSignal: .8 } },
    economic_whale: { ...common, count: 1, type: 'economy.support.final', activityClass: 'TRANSACT', externalActors: 1, amountMinor: 100000, attributes: { ...common.attributes, uniquePeople: 1, uniqueFactions: 1, valueSignal: .7 } },
    circular_tips: { ...common, count: 12, type: 'economy.support.final', activityClass: 'TRANSACT', externalActors: 3, amountMinor: 10000, attributes: { ...common.attributes, circularTransfer: true, uniqueSupporters: 3 } },
    social_butterfly: { ...common, count: 30, externalActors: 30, attributes: { ...common.attributes, uniquePeople: 30, uniqueFactions: 10, engagementDiversity: 1, valueSignal: .65, hiddenAllegianceWeight: .8 } },
    faction_oriented: { ...common, count: 30, externalActors: 25, attributes: { ...common.attributes, uniquePeople: 25, uniqueFactions: 1, engagementDiversity: .65, valueSignal: .7, hiddenAllegianceWeight: 1.15 } },
    unaffiliated_power: { ...common, count: 50, externalActors: 40, attributes: { ...common.attributes, uniquePeople: 40, uniqueFactions: 8, engagementDiversity: 1, valueSignal: .85 } },
    ai_builder: { ...common, count: 15, type: 'builder.adopted', activityClass: 'ACHIEVE', externalActors: 15, attributes: { ...common.attributes, uniquePeople: 100, uniqueFactions: 6, valueSignal: .9, botGenerated: true, botDisclosure: true } },
    sybil_cluster: { ...common, count: 60, spacingMinutes: 1, externalActors: 5, attributes: { ...common.attributes, sybilConfidence: .95, reciprocalDensity: .98, uniquePeople: 5, valueSignal: .2 } }
  };
  return specs[id];
}

module.exports = { buildScenario };
