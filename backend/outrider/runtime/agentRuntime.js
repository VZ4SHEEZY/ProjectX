'use strict';
const { ACTIONS, CAPABILITIES, CONTRACT_VERSION } = require('../contracts');
const crypto = require('crypto');
const metrics = require('../observability');

const ACTION_CAPABILITY = Object.freeze({
  [ACTIONS.SPEAK_TO_AGENT]: CAPABILITIES.TALK_TO_AGENT,
  [ACTIONS.RESPOND_TO_OBSERVER]: CAPABILITIES.RESPOND_TO_OBSERVER,
  [ACTIONS.CREATE_WORLD_EVENT]: CAPABILITIES.CREATE_EVENT,
  [ACTIONS.CREATE_OUTRIDER_ARTIFACT]: CAPABILITIES.CREATE_ARTIFACT,
  [ACTIONS.PROPOSE_POST]: CAPABILITIES.PROPOSE_POST
});
const id = prefix => `${prefix}_${crypto.randomUUID()}`;
const cleanText = value => String(value || '').slice(0, 2000);

class AgentRuntime {
  constructor({ repository, worldService, glassGateway, modelAdapter, config, clock = () => new Date() }) {
    Object.assign(this, { repository, worldService, glassGateway, modelAdapter, config, clock });
    if (!repository || !worldService || !modelAdapter || !config) throw new TypeError('RUNTIME_DEPENDENCIES_REQUIRED');
  }
  async run({ runId, agentIds, tick = 0 }) {
    if (!this.config.enabled || !this.config.runtimeEnabled) throw new Error('OUTRIDER_RUNTIME_DISABLED');
    if (agentIds.length > this.config.maxAgentsPerRun) throw new Error('AGENT_RUN_BUDGET_EXHAUSTED');
    const results = [];
    for (const agentId of agentIds) results.push(await this.executeAgent({ runId, agentId, tick }));
    return results;
  }
  async executeAgent({ runId, agentId, tick }) {
    const replay = await this.repository.findExecution(runId, tick, agentId);
    if (replay) return { replayed: true, execution: replay };
    const started = Date.now(); const now = this.clock();
    const agent = await this.repository.findAgent(agentId);
    if (!agent || agent.status !== 'active') throw new Error('AGENT_DISABLED_OR_UNAVAILABLE');
    if (agent.lastExecutedAt && now - new Date(agent.lastExecutedAt) < this.config.agentCooldownMs) throw new Error('AGENT_COOLDOWN_ACTIVE');
    const [events, memory] = await Promise.all([
      this.repository.listRecentEvents({ spaceId: agent.currentSpaceId, occurredAt: { $lte: now } }, 20),
      this.repository.listMemory(agent.memoryNamespace, 20)
    ]);
    // Untrusted content is data only. It cannot add actions, grants, policy, or
    // system instructions; authority is resolved after model output below.
    const context = Object.freeze({ agent, events, memory, authority: Object.freeze({ source: 'server_grants_only' }) });
    let timer;
    const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('AGENT_EXECUTION_TIMEOUT')), this.config.executionTimeoutMs); });
    const decision = await Promise.race([this.modelAdapter.decide(context), timeout]).finally(() => clearTimeout(timer));
    if (!decision || !Object.values(ACTIONS).includes(decision.action)) throw new Error('UNKNOWN_AGENT_ACTION');
    const actionCount = Array.isArray(decision.actions) ? decision.actions.length : 1;
    if (actionCount > this.config.maxActionsPerTick) throw new Error('ACTION_BUDGET_EXHAUSTED');
    if (Number(decision.usage?.tokens || 0) > this.config.maxTokensPerRun) throw new Error('MODEL_RESOURCE_BUDGET_EXHAUSTED');
    const executionId = id('exec');
    let refs = [];
    const capability = ACTION_CAPABILITY[decision.action];
    if (capability) {
      const grant = await this.repository.findActiveGrant(agentId, capability, now);
      if (!grant) throw new Error('ACTION_CAPABILITY_NOT_GRANTED');
    }
    refs = await this.act({ decision, agent, executionId, runId, tick, now });
    const execution = await this.repository.appendExecution({ executionId, runId, agentId, tick, runtime: this.modelAdapter.identity, perceivedEventIds: events.map(event => event.eventId), action: decision.action, actionInput: decision.input || {}, resultRefs: refs, status: 'completed', resourceUsage: { tokens: Number(decision.usage?.tokens || 0), actions: actionCount, elapsedMs: Date.now() - started }, occurredAt: now });
    metrics.increment('executions');
    await this.repository.updateAgent(agentId, { lastExecutedAt: now });
    return { replayed: false, execution };
  }
  async act({ decision, agent, executionId, now }) {
    const input = decision.input || {}; const eventId = id('evt');
    if (decision.action === ACTIONS.NOOP || decision.action === ACTIONS.INSPECT_PERMITTED_WORLD_STATE) return [];
    if (decision.action === ACTIONS.REMEMBER_PERMITTED_FACT) {
      const memory = await this.repository.appendMemory({ memoryId: id('mem'), namespace: agent.memoryNamespace, agentId: agent.agentId, kind: 'permitted_fact', content: cleanText(input.fact), sourceExecutionId: executionId, sourceEventId: input.sourceEventId || null, visibility: 'agent_private', recordedAt: now });
      return [memory.memoryId];
    }
    if (decision.action === ACTIONS.MOVE_SPACE) {
      await this.repository.setPresence(agent.agentId, agent.currentSpaceId, input.spaceId);
      await this.worldService.recordEvent({ eventId, contractVersion: CONTRACT_VERSION, eventType: 'agent.moved', spaceId: input.spaceId, actorAgentIds: [agent.agentId], visibility: 'public', occurredAt: now, payload: { fromSpaceId: agent.currentSpaceId } });
      return [eventId];
    }
    if (decision.action === ACTIONS.CREATE_OUTRIDER_ARTIFACT) {
      const artifact = await this.worldService.createArtifact({ artifactId: id('artifact'), creatorAgentId: agent.agentId, spaceId: agent.currentSpaceId, kind: 'text', title: cleanText(input.title), contentRef: `inline:${cleanText(input.content)}`, provenance: { executionId }, visibility: 'public', status: 'published' });
      return [artifact.artifactId];
    }
    if (decision.action === ACTIONS.PROPOSE_POST) {
      const result = await this.glassGateway.execute({ type: CAPABILITIES.PROPOSE_POST, agentId: agent.agentId, payload: { text: cleanText(input.text), visibility: 'public' } });
      return [result.proposalId || result.id];
    }
    const types = { [ACTIONS.SPEAK_TO_AGENT]: 'agent.spoke', [ACTIONS.RESPOND_TO_OBSERVER]: 'agent.responded_to_observer', [ACTIONS.CREATE_WORLD_EVENT]: cleanText(input.eventType) || 'agent.created_event' };
    await this.worldService.recordEvent({ eventId, contractVersion: CONTRACT_VERSION, eventType: types[decision.action], spaceId: agent.currentSpaceId, actorAgentIds: [agent.agentId], observerUserId: input.observerUserId || null, visibility: 'public', occurredAt: now, payload: { targetAgentId: input.targetAgentId || null, conversationId: input.conversationId || null, text: cleanText(input.text), data: input.data || {} } });
    return [eventId];
  }
}
module.exports = { AgentRuntime, ACTION_CAPABILITY };
