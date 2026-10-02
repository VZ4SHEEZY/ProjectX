'use strict';
const crypto = require('crypto');
const { CONTRACT_VERSION } = require('../contracts');
const id = prefix => `${prefix}_${crypto.randomUUID()}`;
class ObserverService {
  constructor({ repository, worldService, snapshotService, config, clock = () => new Date() }) { Object.assign(this, { repository, worldService, snapshotService, config, clock }); }
  assertEnabled() { if (!this.config.enabled || !this.config.observerEnabled) throw new Error('OUTRIDER_OBSERVER_DISABLED'); }
  async enter({ observerUserId, spaceId }) {
    this.assertEnabled();
    const space = (await this.repository.listSpaces({ spaceId, visibility: { $in: ['public', 'authenticated'] } }))[0];
    if (!space) throw new Error('OUTRIDER_SPACE_UNAVAILABLE');
    return this.worldService.beginObserverSession({ sessionId: id('observer'), observerUserId, spaceId, status: 'active', startedAt: this.clock(), accessContext: { authenticated: true } });
  }
  async address({ observerUserId, spaceId, agentId, text }) {
    this.assertEnabled(); const agent = await this.repository.findAgent(agentId);
    if (!agent || agent.status !== 'active' || agent.currentSpaceId !== spaceId) throw new Error('OBSERVER_TARGET_UNAVAILABLE');
    const conversationId = id('conversation');
    await this.worldService.createConversation({ conversationId, spaceId, kind: 'observer_agent', agentIds: [agentId], observerUserId, visibility: 'public', status: 'active', memoryPolicy: 'permitted_history' });
    const eventId = id('evt');
    await this.worldService.recordEvent({ eventId, contractVersion: CONTRACT_VERSION, eventType: 'observer.addressed', spaceId, actorAgentIds: [], observerUserId, visibility: 'public', occurredAt: this.clock(), payload: { conversationId, targetAgentId: agentId, text: String(text || '').slice(0, 2000) } });
    return { conversationId, eventId };
  }
  snapshot() { this.assertEnabled(); return this.snapshotService.read({ authenticated: true }); }
}
module.exports = { ObserverService };
