// routes/calls.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/callController');

// ─── Públicas (visitante; el callId secreto autoriza) ───────────────────────
router.get('/config', ctrl.getConfig);
router.post('/start/:qrId', ctrl.startCall);
router.post('/:callId/visitor/signal', ctrl.visitorSignal);
router.get('/:callId/visitor/poll', ctrl.visitorPoll);
router.post('/:callId/visitor/hangup', ctrl.visitorHangup);

// ─── Privadas (residente autenticado) ───────────────────────────────────────
router.get('/incoming', protect, ctrl.listIncoming);
router.post('/:callId/accept', protect, ctrl.acceptCall);
router.post('/:callId/reject', protect, ctrl.rejectCall);
router.post('/:callId/resident/signal', protect, ctrl.residentSignal);
router.get('/:callId/resident/poll', protect, ctrl.residentPoll);
router.post('/:callId/resident/hangup', protect, ctrl.residentHangup);

module.exports = router;
