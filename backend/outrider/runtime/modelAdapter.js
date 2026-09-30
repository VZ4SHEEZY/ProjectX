'use strict';

class OutriderModelAdapter {
  constructor(identity) { this.identity = Object.freeze({ ...identity }); }
  async decide() { throw new Error('MODEL_ADAPTER_NOT_IMPLEMENTED'); }
}

class DeterministicModelAdapter extends OutriderModelAdapter {
  constructor(decider) { super({ provider: 'deterministic', model: 'phase-1-rule-runtime', version: '1.0.0', deterministic: true }); this.decider = decider; }
  async decide(context) {
    if (typeof this.decider === 'function') return this.decider(context);
    const latest = context.events[0];
    if (latest?.eventType === 'observer.addressed') return { action: 'respond_to_observer', input: { observerUserId: latest.observerUserId, conversationId: latest.payload.conversationId, text: `${context.agent.displayIdentity.name} acknowledges the observer.` } };
    if (latest) return { action: 'speak_to_agent', input: { targetAgentId: latest.actorAgentIds[0], text: `${context.agent.displayIdentity.name} noticed ${latest.eventType}.` } };
    return { action: 'noop', input: {} };
  }
}

module.exports = { OutriderModelAdapter, DeterministicModelAdapter };
