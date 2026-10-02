'use strict';

class OutriderWorldService {
  constructor(repository) { if (!repository) throw new TypeError('OUTRIDER_REPOSITORY_REQUIRED'); this.repository = repository; }
  createSpace(value, options) { return this.repository.createSpace(value, options); }
  recordEvent(value, options) { return this.repository.appendWorldEvent(value, options); }
  createArtifact(value, options) { return this.repository.createArtifact(value, options); }
  createConversation(value, options) { return this.repository.createConversation(value, options); }
  relateAgents(value, options) {
    if (value.sourceAgentId === value.targetAgentId) throw new TypeError('SELF_RELATIONSHIP_NOT_ALLOWED');
    return this.repository.upsertRelationship(value, options);
  }
  beginObserverSession(value, options) {
    if (!value.observerUserId) throw new TypeError('CANONICAL_OBSERVER_USER_REQUIRED');
    return this.repository.createObserverSession(value, options);
  }
}
module.exports = { OutriderWorldService };
