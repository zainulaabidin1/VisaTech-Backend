const express = require('express');
const router = express.Router();
const { createOrUpdatePassport, getPassport } = require('../controllers/passportController');
const { validatePassport } = require('../middleware/validation');
const { Passport, User } = require('../models');


// Temporary: Remove authentication for testing
// router.use(authenticate);

router.post('/', validatePassport, createOrUpdatePassport);
router.get('/', getPassport);

// Verify passport and check token number
router.post('/verify', async (req, res) => {
  try {
    const { passport_number } = req.body;

    if (!passport_number) {
      return res.status(400).json({
        success: false,
        message: 'Passport number is required'
      });
    }

    const passport = await Passport.findOne({
      where: { passport_number },
      include: [{ model: User, as: 'user' }]
    });

    if (!passport) {
      return res.status(404).json({
        success: false,
        message: 'Passport number not found in our system'
      });
    }

    res.json({
      success: true,
      message: 'Passport verified successfully',
      data: {
        passport_number: passport.passport_number,
        token_number: passport.token_number,
        user: passport.user ? {
          name: `${passport.user.first_name} ${passport.user.last_name}`,
          email: passport.user.email
        } : null
      }
    });

  } catch (error) {
    console.error('Verify passport error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify labor result with passport and nationality
router.post('/verify-labor', async (req, res) => {
  try {
    const { passport_number, nationality } = req.body;

    if (!passport_number || !nationality) {
      return res.status(400).json({
        success: false,
        message: 'Both passport number and nationality are required'
      });
    }

    const passport = await Passport.findOne({
      where: { 
        passport_number,
        nationality 
      },
      include: [{ model: User, as: 'user' }]
    });

    if (!passport) {
      return res.status(404).json({
        success: false,
        message: 'Passport number and nationality combination not found'
      });
    }

    res.json({
      success: true,
      message: 'Labor result verified successfully',
      data: {
        passport_number: passport.passport_number,
        nationality: passport.nationality,
        token_number: passport.token_number,
        user: passport.user ? {
          name: `${passport.user.first_name} ${passport.user.last_name}`,
          email: passport.user.email
        } : null
      }
    });

  } catch (error) {
    console.error('Verify labor result error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;