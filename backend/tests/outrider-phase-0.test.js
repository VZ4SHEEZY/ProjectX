'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { GlassGateway, HANDLERS } = require('../outrider/services/glassGateway');
const { WorldSignalService } = require('../outrider/services/signalService');
const { CyberdopeGlassAdapter } = require('../outrider/adapters/cyberdopeReadAdapter');
const { CAPABILITIES, capabilityRequest } = require('../outrider/contracts');
const { outriderConfig } = require('../outrider/config');
const outriderObservability = require('../outrider/observability');
const Agent = require('../models/OutriderAgent');

function harness({ grant = true, active = true, enabled = true } = {}) {
  const audits = []; const calls = [];
  const repository = {
    findAgent: async id => active ? { agentId: id, status: 'active' } : null,
    findActiveGrant: async () => grant ? { grantId: 'grant_1', state: 'active', constraints: {} } : null,
    appendGlassAudit: async value => { audits.push(value); return value; }
  };
  const cyberdopeAdapter = Object.fromEntries(Object.values(HANDLERS).map(name => [name, async (payload, context) => { calls.push({ name, payload, context }); return { ok: true }; }]));
  const gateway = new GlassGateway({ repository, cyberdopeAdapter, config: { enabled, glassEnabled: enabled, proposalSubmissionEnabled: enabled }, clock: () => new Date('2026-09-29T00:00:00Z') });
  return { gateway, audits, calls };
}

test('Outrider defaults entirely off and readiness rejects runtime activation outside isolation', () => {
  assert.deepEqual(outriderConfig({}), { enabled: false, glassEnabled: false, signalIngestionEnabled: false, proposalSubmissionEnabled: false, runtimeEnabled: false, observerEnabled: false, modelProvider: 'deterministic', modelName: 'claude-haiku-4-5-20251001', trustedSignalProducer: 'cyberdope-staging', maxActionsPerTick: 1, maxAgentsPerRun: 4, executionTimeoutMs: 5000, maxTokensPerRun: 2000, agentCooldownMs: 1000 });
  assert.equal(outriderObservability.readiness({}).status, 'ready');
  assert.equal(outriderObservability.readiness({ OUTRIDER_ENABLED: 'true', OUTRIDER_RUNTIME_ENABLED: 'true' }).status, 'not_ready');
  assert.equal(outriderObservability.readiness({ NODE_ENV: 'development', OUTRIDER_ENV: 'development', OUTRIDER_ENABLED: 'true', OUTRIDER_RUNTIME_ENABLED: 'true' }).status, 'ready');
});

test('capability requests are typed, versioned and reject forbidden authority', () => {
  assert.equal(capabilityRequest({ type: CAPABILITIES.READ_PUBLIC_PROFILE, agentId: 'agent_1', payload: {} }).contractVersion, '1.0.0');
  for (const type of ['cyberdope.progression.write', 'cyberdope.role.assign', 'cyberdope.faction.membership.write', 'cyberdope.post.write', 'cyberdope.user.private.read', 'cyberdope.repository.access']) {
    assert.throws(() => capabilityRequest({ type, agentId: 'agent_1', payload: {} }), /UNKNOWN_OR_FORBIDDEN_CAPABILITY/);
  }
  assert.throws(() => capabilityRequest({ type: CAPABILITIES.READ_PUBLIC_PROFILE, agentId: 'agent_1', contractVersion: '9.0.0', payload: {} }), /UNSUPPORTED|UNKNOWN/);
});

test('The Glass fails closed when disabled, agent authentication fails, or grant is absent', async () => {
  for (const options of [{ enabled: false }, { active: false }, { grant: false }]) {
    const { gateway, audits, calls } = harness(options);
    await assert.rejects(gateway.execute({ type: CAPABILITIES.READ_PUBLIC_PROFILE, agentId: 'agent_1', payload: { profileId: 'public_1' } }), /DISABLED|AUTHENTICATION|GRANTED/);
    assert.equal(calls.length, 0); assert.equal(audits.length, 1); assert.equal(audits[0].outcome, 'denied');
  }
});

test('an authenticated and granted request uses only its explicit adapter and is audited', async () => {
  const { gateway, audits, calls } = harness();
  await gateway.execute({ type: CAPABILITIES.READ_PROGRESSION, agentId: 'agent_1', payload: { subjectId: 'human_1' } });
  assert.equal(calls.length, 1); assert.equal(calls[0].name, 'readApprovedProgression');
  assert.equal(audits.length, 1); assert.equal(audits[0].outcome, 'allowed');
});

test('missing audit persistence fails the request instead of creating unaudited access', async () => {
  const { gateway, calls } = harness(); gateway.repository.appendGlassAudit = undefined;
  await assert.rejects(gateway.execute({ type: CAPABILITIES.READ_PUBLIC_POST, agentId: 'agent_1', payload: { postId: 'post_1' } }), /GLASS_AUDIT_UNAVAILABLE/);
  assert.equal(calls.length, 0);
});

test('grant constraints and the separate proposal kill switch fail closed', async () => {
  const constrained = harness(); constrained.gateway.repository.findActiveGrant = async () => ({ state: 'active', constraints: { allowedSubjectIds: ['allowed'] } });
  await assert.rejects(constrained.gateway.execute({ type: CAPABILITIES.READ_PROGRESSION, agentId: 'agent_1', payload: { subjectId: 'denied' } }), /CONSTRAINT_DENIED/);
  assert.equal(constrained.calls.length, 0);
  const proposalsOff = harness(); proposalsOff.gateway.config.proposalSubmissionEnabled = false;
  await assert.rejects(proposalsOff.gateway.execute({ type: CAPABILITIES.PROPOSE_POST, agentId: 'agent_1', payload: { text: 'hello' } }), /PROPOSALS_DISABLED/);
  assert.equal(proposalsOff.calls.length, 0);
});

test('CyberDope adapter exposes application-service ports, never raw repositories', () => {
  const source = fs.readFileSync(path.join(__dirname, '../outrider/adapters/cyberdopeReadAdapter.js'), 'utf8');
  assert.doesNotMatch(source, /require\(['"]\.\.\/\.\.\/models\//);
  assert.doesNotMatch(source, /mongoose|\.collection\(|findOneAndUpdate|deleteMany/);
  assert.deepEqual(Object.keys(HANDLERS).sort(), [CAPABILITIES.PROPOSE_FACTION_EVENT, CAPABILITIES.PROPOSE_POST, CAPABILITIES.READ_FACTION_WORLD, CAPABILITIES.READ_PROGRESSION, CAPABILITIES.READ_PUBLIC_POST, CAPABILITIES.READ_PUBLIC_PROFILE].sort());
  const adapter = new CyberdopeGlassAdapter({});
  assert.throws(() => adapter.readPublicProfile({ profileId: 'x' }, {}), /PORT_UNAVAILABLE/);
});

test('Outrider persistence boundary imports no canonical CyberDope model', () => {
  const source = fs.readFileSync(path.join(__dirname, '../outrider/persistence/repository.js'), 'utf8');
  for (const forbidden of ['User', 'PlatformRole', 'FactionMembership', 'Post', 'ProgressionProjection', 'ProgressionActivityEvent', 'AccountCapability']) assert.doesNotMatch(source, new RegExp(`models/${forbidden}`));
});

test('world signals require enabled ingestion, versioned shape, visibility, and trusted producer', async () => {
  const stored = [];
  const service = new WorldSignalService({ repository: { appendSignal: async value => { stored.push(value); return value; } }, config: { enabled: true, signalIngestionEnabled: true }, trustedProducers: ['progression-product'] });
  const input = { id: 'sig_1', contractVersion: '1.0.0', type: 'progression.milestone.reached', source: 'progression-product', subject: { type: 'user', id: 'user_1' }, visibility: 'agent_permitted', occurredAt: '2026-09-29T00:00:00Z', payload: { milestone: 'initiation' } };
  await service.accept(input); assert.equal(stored.length, 1);
  await assert.rejects(service.accept({ ...input, id: 'sig_2', source: 'database-change-stream' }), /UNTRUSTED/);
  await assert.rejects(new WorldSignalService({ repository: {}, config: {}, trustedProducers: [] }).accept(input), /DISABLED/);
});

test('agent identity distinguishes faction and independent agents from human users', async () => {
  const independent = new Agent({ agentId: 'agent_independent', displayIdentity: { name: 'Nomad' }, agentType: 'independent', memoryNamespace: 'agent:nomad', status: 'active' });
  await independent.validate(); assert.equal(independent.ownerUserId, null); assert.equal(independent.factionId, null);
  const invalidFaction = new Agent({ agentId: 'agent_faction', displayIdentity: { name: 'Voice' }, agentType: 'faction', memoryNamespace: 'agent:faction' });
  await assert.rejects(invalidFaction.validate(), /FACTION_AGENT_REQUIRES_FACTION/);
});
