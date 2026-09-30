'use strict';

const { CAPABILITIES, CROSS_GLASS, capabilityRequest } = require('../contracts');
const metrics = require('../observability');

const HANDLERS = Object.freeze({
  [CAPABILITIES.READ_PUBLIC_PROFILE]: 'readPublicProfile',
  [CAPABILITIES.READ_PUBLIC_POST]: 'readPublicPost',
  [CAPABILITIES.READ_PROGRESSION]: 'readApprovedProgression',
  [CAPABILITIES.READ_FACTION_WORLD]: 'readFactionWorldState',
  [CAPABILITIES.PROPOSE_POST]: 'submitPostProposal',
  [CAPABILITIES.PROPOSE_FACTION_EVENT]: 'submitFactionEventProposal'
});

class GlassGateway {
  constructor({ repository, cyberdopeAdapter, config, clock = () => new Date() }) {
    if (!repository || !cyberdopeAdapter || !config) throw new TypeError('GLASS_DEPENDENCIES_REQUIRED');
    this.repository = repository; this.cyberdopeAdapter = cyberdopeAdapter; this.config = config; this.clock = clock;
  }
  async execute(raw) {
    metrics.increment('requests');
    let request;
    try { request = capabilityRequest(raw); }
    catch (error) { await this.audit(raw, 'denied', error.message); metrics.increment('denied'); throw error; }
    try {
      if (!this.config.enabled || !this.config.glassEnabled) throw new Error('OUTRIDER_GLASS_DISABLED');
      if (!CROSS_GLASS.has(request.type) || !HANDLERS[request.type]) throw new Error('CAPABILITY_NOT_EXPOSED_ACROSS_GLASS');
      const agent = await this.repository.findAgent(request.agentId);
      if (!agent || agent.status !== 'active') throw new Error('AGENT_AUTHENTICATION_FAILED');
      const grant = await this.repository.findActiveGrant(request.agentId, request.type, this.clock());
      if (!grant) throw new Error('CAPABILITY_NOT_GRANTED');
      if (request.type.endsWith('.propose') && !this.config.proposalSubmissionEnabled) throw new Error('OUTRIDER_PROPOSALS_DISABLED');
      this.enforceConstraints(grant.constraints || {}, request.payload);
      const handler = this.cyberdopeAdapter[HANDLERS[request.type]];
      if (typeof handler !== 'function') throw new Error('CAPABILITY_ADAPTER_UNAVAILABLE');
      // Persist the authorization decision before any read or proposal crosses
      // the boundary. An audit outage therefore prevents the operation.
      await this.audit(request, 'allowed');
      const result = await handler.call(this.cyberdopeAdapter, request.payload, { agent, grant, request });
      if (request.type.endsWith('.propose')) metrics.increment('proposalsSubmitted');
      return result;
    } catch (error) {
      metrics.increment('denied'); await this.audit(request, 'denied', error.message); throw error;
    }
  }
  enforceConstraints(constraints, payload) {
    const checks = [['allowedSubjectIds', 'subjectId'], ['allowedFactionIds', 'factionId'], ['allowedProfileIds', 'profileId']];
    for (const [constraint, field] of checks) {
      if (constraints[constraint] && (!Array.isArray(constraints[constraint]) || !constraints[constraint].includes(payload[field]))) throw new Error('CAPABILITY_CONSTRAINT_DENIED');
    }
    if (constraints.allowedVisibility && (!Array.isArray(constraints.allowedVisibility) || !constraints.allowedVisibility.includes(payload.visibility))) throw new Error('CAPABILITY_CONSTRAINT_DENIED');
  }
  async audit(request = {}, outcome, reason = null) {
    if (typeof this.repository.appendGlassAudit !== 'function') throw new Error('GLASS_AUDIT_UNAVAILABLE');
    return this.repository.appendGlassAudit({ requestId: request.id || 'invalid', agentId: request.agentId || null, capability: request.type || 'invalid', contractVersion: request.contractVersion || null, correlationId: request.correlationId || null, outcome, reason, occurredAt: this.clock() });
  }
}

module.exports = { GlassGateway, HANDLERS };
