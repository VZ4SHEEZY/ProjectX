'use strict';
const express = require('express');
const { protect } = require('../middleware/auth');
const repository = require('../outrider/persistence/repository');
const { outriderConfig } = require('../outrider/config');
const { OutriderWorldService } = require('../outrider/services/worldService');
const { WorldSnapshotService } = require('../outrider/services/worldSnapshotService');
const { ObserverService } = require('../outrider/services/observerService');
const metrics = require('../outrider/observability');

function createRouter({ config = outriderConfig(), repo = repository } = {}) {
  const router = express.Router();
  const worldService = new OutriderWorldService(repo);
  const observer = new ObserverService({ repository: repo, worldService, snapshotService: new WorldSnapshotService(repo), config });
  router.use(protect);
  router.get('/snapshot', async (_req, res, next) => { try { res.json({ success: true, world: await observer.snapshot() }); } catch (error) { next(error); } });
  router.post('/observer/enter', async (req, res, next) => { try { const session = await observer.enter({ observerUserId: req.user._id, spaceId: req.body.spaceId }); metrics.increment('observerEntries'); res.status(201).json({ success: true, session }); } catch (error) { next(error); } });
  router.post('/observer/address', async (req, res, next) => { try { const result = await observer.address({ observerUserId: req.user._id, spaceId: req.body.spaceId, agentId: req.body.agentId, text: req.body.text }); res.status(201).json({ success: true, ...result }); } catch (error) { next(error); } });
  return router;
}
module.exports = createRouter();
module.exports.createRouter = createRouter;
