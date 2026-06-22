// routes/visitor.js
const express = require('express');
const router = express.Router();
const {
  getVisitorInfo,
  ringDoorbell,
} = require('../controllers/visitorController');

// Public routes - no auth required
router.get('/:qrId', getVisitorInfo);
router.post('/:qrId/ring', ringDoorbell);

module.exports = router;
