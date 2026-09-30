'use strict';
const express = require('express');
const { protect } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const repository = require('../outrider/persistence/repository');
const { outriderConfig } = require('../outrider/config');
const { OutriderWorldService } = require('../outrider/services/worldService');
const { WorldSnapshotService } = require('../outrider/services/worldSnapshotService');
const { ObserverService } = require('../outrider/services/observerService');
const metrics = require('../outrider/observability');
const { AgentRuntime } = require('../outrider/runtime/agentRuntime');
const { createModelAdapter, DeterministicModelAdapter } = require('../outrider/runtime/modelAdapter');
const { GlassGateway } = require('../outrider/services/glassGateway');
const { CyberdopeGlassAdapter } = require('../outrider/adapters/cyberdopeReadAdapter');
const { PendingProposalService } = require('../outrider/adapters/pendingProposalService');
const { WorldSignalService } = require('../outrider/services/signalService');
const { ACTIONS, CONTRACT_VERSION } = require('../outrider/contracts');
const crypto = require('crypto');

function createRouter({ config = outriderConfig(), repo = repository } = {}) {
  const router = express.Router();
  const worldService = new OutriderWorldService(repo);
  const observer = new ObserverService({ repository: repo, worldService, snapshotService: new WorldSnapshotService(repo), config });
  const gateway = new GlassGateway({ repository: repo, cyberdopeAdapter: new CyberdopeGlassAdapter({ postProposalService: new PendingProposalService(repo) }), config });
  const runtime = adapter => new AgentRuntime({ repository: repo, worldService, glassGateway: gateway, modelAdapter: adapter, config });
  router.use(protect);
  router.get('/snapshot', async (_req, res, next) => { try { res.json({ success: true, world: await observer.snapshot() }); } catch (error) { next(error); } });
  router.post('/observer/enter', async (req, res, next) => { try { const session = await observer.enter({ observerUserId: req.user._id, spaceId: req.body.spaceId }); metrics.increment('observerEntries'); res.status(201).json({ success: true, session }); } catch (error) { next(error); } });
  router.post('/observer/address', async (req, res, next) => { try {
    const result = await observer.address({ observerUserId: req.user._id, spaceId: req.body.spaceId, agentId: req.body.agentId, text: req.body.text });
    let execution = null; let runtimeError = null;
    try { execution = await runtime(createModelAdapter(config)).run({ runId: `observer_${crypto.randomUUID()}`, agentIds: [req.body.agentId], tick: 0 }); } catch (error) { runtimeError = error.message; }
    res.status(201).json({ success: true, ...result, execution, runtimeError });
  } catch (error) { next(error); } });

  router.get('/operator/status', requireAdmin, async (_req, res, next) => { try {
    const [agents, executions, audits, proposals] = await Promise.all([repo.listAgents({}), repo.listExecutions({}, 30), repo.listGlassAudits({}, 30), repo.listProposals({}, 20)]);
    res.json({ success: true, operator: {
      controls: { runtimeEnabled: config.enabled && config.runtimeEnabled, globalKillSwitch: !config.enabled || !config.runtimeEnabled, budgets: { maxActionsPerTick: config.maxActionsPerTick, maxAgentsPerRun: config.maxAgentsPerRun, executionTimeoutMs: config.executionTimeoutMs, maxTokensPerRun: config.maxTokensPerRun, agentCooldownMs: config.agentCooldownMs } },
      runtime: { provider: config.modelProvider, model: config.modelName, credentialAvailable: config.modelProvider !== 'anthropic' || Boolean(process.env.ANTHROPIC_API_KEY) },
      agents: agents.map(({ agentId, displayIdentity, status, lastExecutedAt }) => ({ agentId, name: displayIdentity.name, status, lastExecutedAt })),
      executions: executions.map(({ executionId, runId, agentId, tick, runtime: identity, action, status, resourceUsage, occurredAt }) => ({ executionId, runId, agentId, tick, runtime: identity, action, status, resourceUsage, occurredAt })),
      denials: audits.filter(x => x.outcome === 'denied').map(({ requestId, agentId, capability, reason, occurredAt }) => ({ requestId, agentId, capability, reason, occurredAt })),
      proposals: proposals.map(({ proposalId, agentId, proposalType, status, policyDecision, createdAt }) => ({ proposalId, agentId, proposalType, status, policyDecision, createdAt }))
    } });
  } catch (error) { next(error); } });
  router.post('/operator/run', requireAdmin, async (req, res, next) => { try {
    const agentIds = Array.isArray(req.body.agentIds) ? req.body.agentIds : [];
    const result = await runtime(createModelAdapter(config)).run({ runId: req.body.runId || `operator_${crypto.randomUUID()}`, agentIds, tick: Number(req.body.tick || 0) });
    res.status(201).json({ success: true, result });
  } catch (error) { next(error); } });
  router.patch('/operator/agents/:agentId', requireAdmin, async (req, res, next) => { try {
    if (!['active', 'disabled'].includes(req.body.status)) throw new Error('INVALID_AGENT_STATUS');
    const agent = await repo.updateAgent(req.params.agentId, { status: req.body.status }); if (!agent) throw new Error('AGENT_NOT_FOUND');
    res.json({ success: true, agent: { agentId: agent.agentId, status: agent.status } });
  } catch (error) { next(error); } });
  router.post('/operator/signal-demo', requireAdmin, async (req, res, next) => { try {
    const before = req.body.progressionDigest || 'read-only-staging-proof';
    const signal = await new WorldSignalService({ repository: repo, config, trustedProducers: [config.trustedSignalProducer] }).accept({ id: `signal_${crypto.randomUUID()}`, contractVersion: CONTRACT_VERSION, type: 'progression.milestone', source: config.trustedSignalProducer, subject: { type: 'faction', id: String(req.body.factionId || 'staging-faction') }, visibility: 'public', occurredAt: new Date().toISOString(), payload: { milestone: req.body.milestone || 'signal resonance', progressionDigest: before } });
    const agent = (await repo.listAgents({ agentType: 'faction', status: 'active' }))[0];
    const result = agent ? await runtime(createModelAdapter(config)).run({ runId: `signal_${crypto.randomUUID()}`, agentIds: [agent.agentId], tick: 0 }) : [];
    res.status(201).json({ success: true, signalId: signal.signalId, progressionDigestBefore: before, progressionDigestAfter: before, result });
  } catch (error) { next(error); } });
  router.post('/operator/proposal-demo', requireAdmin, async (req, res, next) => { try {
    const agentId = req.body.agentId || (await repo.listAgents({ agentType: 'faction', status: 'active' }))[0]?.agentId;
    const adapter = new DeterministicModelAdapter(() => ({ action: ACTIONS.PROPOSE_POST, input: { text: String(req.body.text || 'A signal from the living Outrider world.').slice(0, 500) }, usage: { tokens: 0 } }));
    const result = await runtime(adapter).run({ runId: `proposal_${crypto.randomUUID()}`, agentIds: [agentId], tick: 0 });
    res.status(201).json({ success: true, result });
  } catch (error) { next(error); } });
  return router;
}
module.exports = createRouter();
module.exports.createRouter = createRouter;
