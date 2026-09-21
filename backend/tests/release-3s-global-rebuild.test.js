'use strict';

const crypto = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const User = require('../models/User');
const Decision = require('../models/ProgressionQualificationDecision');
const Contribution = require('../models/ProgressionContributionResult');
const Operation = require('../models/ProgressionOperation');
const Projection = require('../models/ProgressionProjection');
const { canonicalEvent, stableJson } = require('../progression/contracts');
const { buildScenarioBundle } = require('../progression/simulator/scenarios');
const policy = require('../progression/policies/simulation-v1');
const persistence = require('../progression/persistence/service');
const repository = require('../progression/persistence/repository');
const rebuild = require('../progression/operations/rebuild');
const release3b = require('../migrations/004-release-3b-shadow-foundation');
const release3e = require('../migrations/006-release-3e-rollout-operations');

let mongo; let identity; let users;

test.before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '7.0.14' } });
  await mongoose.connect(mongo.getUri(), { autoIndex: false, autoCreate: false });
  await release3b.applyMigration();
  await release3e.applyMigration();
  await User.createCollection();
  identity = { policyId: policy.artifact.policyId, version: policy.artifact.version, artifactDigest: policy.artifact.artifactDigest };
  await persistence.appendPolicy(policy.artifact);
  users = await User.create([
    { username: 'gate6s_same_a', email: 'gate6s-a@example.com', password: 'test-hash' },
    { username: 'gate6s_same_b', email: 'gate6s-b@example.com', password: 'test-hash' },
    { username: 'gate6s_other', email: 'gate6s-other@example.com', password: 'test-hash' },
    { username: 'gate6s_unaffiliated', email: 'gate6s-none@example.com', password: 'test-hash' }
  ]);
  const bundle = buildScenarioBundle();
  const bases = [
    bundle.events.find(value => value.beneficiaryId === 'cross_faction_viral'),
    bundle.events.find(value => value.beneficiaryId === 'viral_creator'),
    bundle.events.find(value => value.beneficiaryId === 'faction_oriented'),
    bundle.events.find(value => value.beneficiaryId === 'unaffiliated_power')
  ];
  const factions = ['Neon', 'Neon', 'Chrome', null];
  for (let index = 0; index < users.length; index += 1) {
    const base = bases[index];
    for (const ref of base.evidenceRefs) await persistence.appendEvidence(bundle.evidenceByRef[ref]);
    const beneficiaryId = String(users[index]._id);
    const affiliation = factions[index]
      ? { state: 'affiliated', factionId: factions[index], membershipRef: `gate6s:${index}`, effectiveAt: base.occurredAt, source: 'gate6s-test' }
      : { state: 'unaffiliated', effectiveAt: base.occurredAt, source: 'gate6s-test' };
    await persistence.appendEvent(canonicalEvent({
      ...base,
      eventId: undefined,
      idempotencyKey: `gate6s:event:${index}`,
      beneficiaryId,
      affiliations: { ...base.affiliations, beneficiary: affiliation }
    }));
  }
});

test.after(async () => { await mongoose.disconnect(); await mongo.stop(); });

async function runToCompletion(options) {
  let result;
  do { result = await rebuild.runGlobalBatch({ policyIdentity: identity, batchSize: 2, ...options }); } while (!result.complete);
  return result;
}

async function factionState() {
  const values = await Projection.find({ scope: 'faction' }).select('+checkpoint').sort({ subjectId: 1 }).lean();
  return values.map(value => ({ subjectId: value.subjectId, context: value.projectionContextId, checkpoint: value.checkpoint }));
}

test('plan is a genuine non-persisting complete-ledger calculation', async () => {
  const before = {
    decisions: await Decision.countDocuments(), contributions: await Contribution.countDocuments(),
    projections: await Projection.countDocuments(), operations: await Operation.countDocuments()
  };
  const plan = await persistence.planProjection({ policyIdentity: identity });
  const repeatedPlan = await persistence.planProjection({ policyIdentity: identity });
  assert.equal(plan.mode, 'plan');
  assert.deepEqual(repeatedPlan, plan);
  const { planDigest, ...digestInput } = plan;
  assert.equal(planDigest, `sha256:${crypto.createHash('sha256').update(stableJson(digestInput)).digest('hex')}`);
  assert.deepEqual(plan.counts, {
    usersScanned: 4, subjectsWithActivity: 4, activityEvents: 4, canonicalQualifications: 4, decisions: 4, qualified: 4, rejected: 0, contributions: 4,
    personalContributions: 4, factionContributions: 3, personalProjections: 4, factionProjections: 2
  });
  assert.equal(Object.keys(plan.faction.Neon.contributors).length, 2);
  assert.equal(Object.keys(plan.faction.Chrome.contributors).length, 1);
  assert.equal(plan.faction.Neon.contributors[String(users[3]._id)], undefined);
  assert.deepEqual({
    decisions: await Decision.countDocuments(), contributions: await Contribution.countDocuments(),
    projections: await Projection.countDocuments(), operations: await Operation.countDocuments()
  }, before);
});

test('global finalization aggregates same and different factions and excludes Unaffiliated', async () => {
  const result = await runToCompletion({ operationKey: 'gate6s-serial', concurrency: 1 });
  assert.equal(result.succeeded, true);
  assert.equal(result.operation.checkpoint.factionFinalized, true);
  const plan = await persistence.planProjection({ policyIdentity: identity });
  const stored = await factionState();
  assert.deepEqual(Object.fromEntries(stored.map(value => [value.subjectId, value.checkpoint])), plan.faction);
  assert.equal(Object.keys(plan.faction.Neon.contributors).length, 2);
  assert.equal(Object.keys(plan.faction.Chrome.contributors).length, 1);
  assert.equal(await Projection.countDocuments({ scope: 'personal' }), 4);
  assert.equal(await Decision.countDocuments(), 4);
  assert.equal(await Contribution.countDocuments(), 4);
});

test('repeat, batching, and concurrency preserve canonical outputs without duplicates', async () => {
  const baseline = await factionState();
  const result = await runToCompletion({ operationKey: 'gate6s-concurrent', batchSize: 1, concurrency: 4 });
  assert.equal(result.succeeded, true);
  assert.deepEqual(await factionState(), baseline);
  assert.equal(await Decision.countDocuments(), 4);
  assert.equal(await Contribution.countDocuments(), 4);
  assert.equal(await Projection.countDocuments({ scope: 'personal' }), 4);
  assert.equal(await Projection.countDocuments({ scope: 'faction' }), 2);
});

test('faction finalization is independent of subject processing order', async () => {
  const baseline = await factionState();
  for (const user of [...users].reverse()) await persistence.rebuildSubjectProjection({ userId: String(user._id), policyIdentity: identity });
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => persistence.rebuildFactionProjections({ policyIdentity: identity, session }));
  } finally { await session.endSession(); }
  assert.deepEqual(await factionState(), baseline);
});

test('subject failure resumes to the same canonical faction result as a clean run', async () => {
  const baseline = await factionState();
  const original = repository.getOrderedReplayInputs;
  let failed = false;
  try {
    repository.getOrderedReplayInputs = async options => {
      if (!failed && options.beneficiaryId === String(users[1]._id)) { failed = true; throw new Error('gate6s injected subject failure'); }
      return original(options);
    };
    let result = await rebuild.runGlobalBatch({ operationKey: 'gate6s-resume', policyIdentity: identity, batchSize: 4, concurrency: 3 });
    assert.equal(result.complete, false);
    assert.ok(result.operation.checkpoint.failedSubjectIds.includes(String(users[1]._id)));
    result = await runToCompletion({ operationKey: 'gate6s-resume', concurrency: 3 });
    assert.equal(result.succeeded, true);
  } finally { repository.getOrderedReplayInputs = original; }
  assert.deepEqual(await factionState(), baseline);
});

test('faction publication and successful operation completion roll back together', async () => {
  const baseline = await factionState();
  await Projection.deleteMany({ scope: 'faction' });
  const original = repository.storeProjection;
  try {
    repository.storeProjection = async (value, options) => {
      if (value.scope === 'faction' && value.subjectId === 'Chrome') throw new Error('gate6s injected faction publication failure');
      return original(value, options);
    };
    await assert.rejects(runToCompletion({ operationKey: 'gate6s-transaction-failure', concurrency: 2 }), /injected faction publication failure/);
  } finally { repository.storeProjection = original; }
  assert.equal(await Projection.countDocuments({ scope: 'faction' }), 0);
  const failedOperation = await Operation.findOne({ operationKey: 'gate6s-transaction-failure' }).lean();
  assert.equal(failedOperation.status, 'pending');
  assert.equal(failedOperation.checkpoint.factionFinalized, false);
  const resumed = await runToCompletion({ operationKey: 'gate6s-transaction-failure', concurrency: 2 });
  assert.equal(resumed.succeeded, true);
  assert.deepEqual(await factionState(), baseline);
});
