'use strict';
class WorldSnapshotService {
  constructor(repository, clock = () => new Date()) { this.repository = repository; this.clock = clock; }
  async read({ authenticated = false } = {}) {
    const visibility = authenticated ? { $in: ['public', 'authenticated'] } : 'public';
    const [spaces, agents, events, conversations, artifacts] = await Promise.all([
      this.repository.listSpaces({ visibility }), this.repository.listAgents({ status: 'active' }),
      this.repository.listRecentEvents({ visibility }, 100), this.repository.listConversations({ visibility: authenticated ? { $in: ['public', 'participants'] } : 'public', status: 'active' }, 50),
      this.repository.listArtifacts({ visibility, status: 'published' }, 50)
    ]);
    return {
      generatedAt: this.clock().toISOString(), status: agents.length ? 'living' : 'quiet',
      spaces: spaces.map(({ spaceId, name, description, kind, factionId, visibility: v, state, presentAgentIds }) => ({ spaceId, name, description, kind, factionId, visibility: v, publicState: state?.public || {}, presentAgentIds })),
      agents: agents.map(({ agentId, displayIdentity, agentType, factionId, currentSpaceId, status }) => ({ agentId, displayIdentity, agentType, factionId, currentSpaceId, status })),
      events: events.map(({ eventId, eventType, spaceId, actorAgentIds, observerUserId, visibility: v, occurredAt, payload }) => ({ eventId, eventType, spaceId, actorAgentIds, observerUserId, visibility: v, occurredAt, payload })),
      conversations: conversations.map(({ conversationId, spaceId, kind, agentIds, observerUserId, visibility: v, status }) => ({ conversationId, spaceId, kind, agentIds, observerUserId, visibility: v, status })),
      artifacts: artifacts.map(({ artifactId, creatorAgentId, spaceId, kind, title, contentRef, visibility: v, status }) => ({ artifactId, creatorAgentId, spaceId, kind, title, contentRef, visibility: v, status }))
    };
  }
}
module.exports = { WorldSnapshotService };
