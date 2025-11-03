const express = require('express');
const router = express.Router();
const { createOrUpdatePassport, getPassport } = require('../controllers/passportController');
const { validatePassport } = require('../middleware/validation');

// Temporary: Remove authentication for testing
// router.use(authenticate);

router.post('/', validatePassport, createOrUpdatePassport);
router.get('/', getPassport);

module.exports = router;