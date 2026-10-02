'use strict';
const crypto = require('crypto');
class PendingProposalService {
  constructor(repository) { this.repository = repository; }
  async submit(payload, context) {
    const proposalId = `proposal_${crypto.randomUUID()}`;
    await this.repository.appendProposal({ proposalId, requestId: context.request.id, agentId: context.agent.agentId, proposalType: 'post', contractVersion: context.request.contractVersion, payload: { text: String(payload.text || '').slice(0, 2000), visibility: payload.visibility || 'public' }, status: 'pending_moderation', policyDecision: { result: 'requires_approval', reason: 'phase_1_no_autopublish' } });
    return { proposalId, status: 'pending_moderation', result: 'requires_approval' };
  }
}
module.exports = { PendingProposalService };
