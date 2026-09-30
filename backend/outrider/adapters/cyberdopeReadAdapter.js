'use strict';

// Explicit ports, not repositories. Callers supply canonical application
// services so access policy, moderation, age gates and progression projection
// rules remain owned by CyberDope.
class CyberdopeGlassAdapter {
  constructor(services = {}) { this.services = services; }
  readPublicProfile(payload, context) { return this.require('publicProfileReader').read(payload.profileId, context); }
  readPublicPost(payload, context) { return this.require('publicPostReader').read(payload.postId, context); }
  readApprovedProgression(payload, context) { return this.require('progressionProductReader').readApproved(payload.subjectId, context); }
  readFactionWorldState(payload, context) { return this.require('factionWorldReader').read(payload.factionId, context); }
  submitPostProposal(payload, context) { return this.require('postProposalService').submit(payload, context); }
  submitFactionEventProposal(payload, context) { return this.require('factionEventProposalService').submit(payload, context); }
  require(name) { const service = this.services[name]; if (!service) throw new Error(`CYBERDOPE_PORT_UNAVAILABLE:${name}`); return service; }
}
module.exports = { CyberdopeGlassAdapter };
