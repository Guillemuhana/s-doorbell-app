// routes/timbres.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getTimbre,
  updateTimbre,
  deleteTimbre,
  getQR,
  regenerarQR,
} = require('../controllers/timbreController');

router.use(protect);

router.get('/:id', getTimbre);
router.put('/:id', updateTimbre);
router.delete('/:id', deleteTimbre);
router.get('/:id/qr', getQR);
router.post('/:id/regenerar-qr', regenerarQR);

module.exports = router;
