'use strict';

const { worldSignal } = require('../contracts');
const metrics = require('../observability');

class WorldSignalService {
  constructor({ repository, config, trustedProducers = [] }) { this.repository = repository; this.config = config; this.trustedProducers = new Set(trustedProducers); }
  async accept(raw, options) {
    if (!this.config.enabled || !this.config.signalIngestionEnabled) throw new Error('OUTRIDER_SIGNAL_INGESTION_DISABLED');
    const signal = worldSignal(raw);
    if (!this.trustedProducers.has(signal.source)) throw new Error('UNTRUSTED_WORLD_SIGNAL_PRODUCER');
    const result = await this.repository.appendSignal({ signalId: signal.id, contractVersion: signal.contractVersion, signalType: signal.type, source: signal.source, subject: signal.subject, visibility: signal.visibility, occurredAt: new Date(signal.occurredAt), payload: signal.payload }, options);
    metrics.increment('signalsAccepted');
    return result;
  }
}
module.exports = { WorldSignalService };
