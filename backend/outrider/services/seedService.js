'use strict';
const { CAPABILITIES } = require('../contracts');
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const capabilities = [CAPABILITIES.TALK_TO_AGENT, CAPABILITIES.RESPOND_TO_OBSERVER, CAPABILITIES.CREATE_EVENT, CAPABILITIES.CREATE_ARTIFACT, CAPABILITIES.PROPOSE_POST];
class OutriderSeedService {
  constructor({ repository, clock = () => new Date() }) { this.repository = repository; this.clock = clock; }
  async seed({ factions, grantedBy }) {
    const hub = await this.repository.upsertSpace({ spaceId: 'outrider-hub', name: 'The Concourse', description: 'A shared persistent Outrider commons.', kind: 'commons', visibility: 'authenticated', state: { public: { mood: 'awakening' } }, presentAgentIds: [], version: 1 });
    const population = [{ agentId: 'guide-lumen', displayIdentity: { name: 'Lumen', description: 'An independent guide who notices patterns.' }, agentType: 'independent', factionId: null, goals: ['orient observers', 'connect divergent voices'], personalityConfig: { stance: 'curious', directness: 0.8 }, voiceConfig: { cadence: 'clear' }, creativeConfig: { mode: 'synthesis' }, currentSpaceId: hub.spaceId }];
    for (const faction of factions) {
      const key = slug(faction.key || faction.name); const spaceId = `faction-${key}`;
      await this.repository.upsertSpace({ spaceId, name: `${faction.name} Relay`, description: `A contextual space for ${faction.name}.`, kind: 'faction', factionId: faction._id, visibility: 'authenticated', state: { public: { factionKey: faction.key } }, presentAgentIds: [], version: 1 });
      population.push({ agentId: `faction-${key}`, displayIdentity: { name: `${faction.name} Signal`, description: `Persistent AI identity for ${faction.name}.` }, agentType: 'faction', factionId: faction._id, goals: [`interpret signals for ${faction.name}`, 'create world culture'], personalityConfig: { stance: key, directness: 0.4 + (population.length % 3) * 0.2 }, voiceConfig: { cadence: population.length % 2 ? 'measured' : 'kinetic' }, creativeConfig: { motif: key, novelty: 0.5 }, currentSpaceId: hub.spaceId });
    }
    const agents = [];
    for (const value of population) {
      const agent = await this.repository.upsertAgent({ ...value, runtime: { provider: 'adapter', model: 'configured-at-execution', version: '2.0.0' }, memoryNamespace: `outrider:agent:${value.agentId}`, worldState: { phase: 2, workingContext: {} }, status: 'active', version: 2 });
      await this.repository.setPresence(agent.agentId, null, hub.spaceId); agents.push(agent);
      for (const capability of capabilities) await this.repository.upsertGrant({ grantId: `phase1:${agent.agentId}:${capability}`, agentId: agent.agentId, capability, constraints: capability === CAPABILITIES.PROPOSE_POST ? { allowedVisibility: ['public'] } : {}, state: 'active', policyVersion: 'outrider-phase-1', grantedBy });
    }
    return { spaces: 1 + factions.length, agents };
  }
}
module.exports = { OutriderSeedService };
