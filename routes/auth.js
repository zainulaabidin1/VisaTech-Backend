const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');
const { validateLogin } = require('../middleware/validation');
const { EmailVerification, User } = require('../models');
const { Op } = require('sequelize');
const { generateVerificationCode, sendVerificationEmail } = require('../utils/emailService');

// Login route
router.post('/login', validateLogin, login);

// Email verification route
router.post('/verify-email', async (req, res) => {
  try {
    const { email, verification_code } = req.body;

    console.log('📧 Verifying email OTP:', { email, verification_code });

    if (!email || !verification_code) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
      });
    }

    // Find the latest verification code for this email
    // FIX: Use 'is_used' instead of 'used' to match the model
    const verification = await EmailVerification.findOne({
      where: {
        email: email,
        verification_code: verification_code,
        expires_at: {
          [Op.gt]: new Date() // Not expired
        },
        is_used: false // CHANGED: 'is_used' instead of 'used'
      },
      order: [['created_at', 'DESC']]
    });

    if (!verification) {
      console.log('❌ Verification failed - no matching record found');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Mark verification as used - FIX: Use 'is_used' instead of 'used'
    await verification.update({ is_used: true }); // CHANGED: 'is_used' instead of 'used'

    // Update user as verified
    await User.update(
      { is_verified: true },
      { where: { email: email } }
    );

    console.log('✅ Email verified successfully for:', email);

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('❌ Email verification error:', error);
    console.error('❌ Error details:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error during verification'
    });
  }
});

// Resend OTP - FIX: Use correct column names
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

    // Save verification code to database - FIX: Use correct column names
    await EmailVerification.create({
      // Remove user_id since it's not in your model
      email: email,
      verification_code: verificationCode,
      expires_at: expiresAt,
      verification_type: 'signup',
      is_used: false // CHANGED: 'is_used' instead of 'used'
    });

    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationCode);

    console.log('📨 New OTP sent:', { email, code: verificationCode, emailSent });

    res.json({
      success: true,
      message: 'New verification code sent to your email',
      data: {
        emailSent,
        // Only return code in development
        verificationCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined
      }
    });

  } catch (error) {
    console.error('❌ Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification code'
    });
  }
});

module.exports = router;