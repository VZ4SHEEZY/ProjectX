'use strict';

require('dotenv').config();
require('../models/Faction');
const mongoose = require('mongoose');
const remediation = require('../progression/operations/outbox-remediation');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  const apply = process.argv.includes('--apply');
  if (apply && process.env.CONFIRM_PROGRESSION_OUTBOX_REMEDIATION !== 'REPLACE_EXACT_11') throw new Error('Set CONFIRM_PROGRESSION_OUTBOX_REMEDIATION=REPLACE_EXACT_11 to apply');
  const operationKey = argument('--operation');
  const expectedDigest = argument('--candidate-digest');
  if (!expectedDigest) throw new Error('--candidate-digest is required');
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    if (!(hello.setName || hello.msg === 'isdbgrid')) throw new Error('Remediation requires transaction-capable MongoDB');
    const result = apply
      ? await remediation.apply({ operationKey, expectedDigest })
      : { outcome: 'audit-only', audit: await remediation.audit({ expectedDigest }) };
    const { audit } = result;
    console.log(JSON.stringify({ outcome: result.outcome, operationKey: result.operation?.operationKey || null,
      candidateDigest: audit.candidateDigest, candidates: audit.generated.length, matchingRows: audit.rows.length,
      valid: audit.valid.length, malformed: audit.malformed.length, unrelatedMalformed: audit.unrelatedMalformed.length,
      unaffiliated: audit.unaffiliated, status: audit.status, downstream: audit.downstream }, null, 2));
  } finally { await mongoose.disconnect(); }
}

function argument(name) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
