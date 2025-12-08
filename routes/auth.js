const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');
const { validateLogin } = require('../middleware/validation');
const { EmailVerification, User } = require('../models');
const { Op } = require('sequelize');
const { generateVerificationCode, sendVerificationEmail } = require('../utils/emailService');
const { authenticate, generateToken } = require('../middleware/auth');

// Login route
router.post('/login', validateLogin, login);

// Email verification route
router.post('/verify-email', async (req, res) => {
  try {
    const { email, verification_code } = req.body;

    console.log('📧 Verifying email OTP:', { 
      email, 
      verification_code,
      code_length: verification_code ? verification_code.length : 0
    });

    if (!email || !verification_code) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
      });
    }

    // Clean the verification code
    const cleanVerificationCode = verification_code.toString().trim();

    // Find the latest verification code for this email
    const verification = await EmailVerification.findOne({
      where: {
        email: email,
        verification_code: cleanVerificationCode,
        expires_at: {
          [Op.gt]: new Date()
        },
        is_used: false
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

    // Mark verification as used
    await verification.update({ is_used: true });

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
    res.status(500).json({
      success: false,
      message: 'Internal server error during verification'
    });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    console.log('📨 Resend OTP request for:', email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

    // Save verification code to database
    await EmailVerification.create({
      email: email.trim(),
      verification_code: verificationCode.toString().trim(),
      expires_at: expiresAt,
      verification_type: 'signup',
      is_used: false
    });

    // Send verification email
    await sendVerificationEmail(email, verificationCode);

    console.log('✅ New OTP sent to:', email);

    res.json({
      success: true,
      message: 'New verification code sent to your email'
    });

  } catch (error) {
    console.error('❌ Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification code'
    });
  }
});

// Verify token route (for frontend to check token validity)
router.post('/verify-token', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
});

// Get current user profile (Protected)
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
});

// Update user profile (Protected)
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { first_name, last_name, phone } = req.body;
    const user = req.user;

    // Update user fields
    if (first_name) user.first_name = first_name;
    if (last_name) user.last_name = last_name;
    if (phone) user.phone = phone;

    await user.save();

    // Exclude password from response
    const userResponse = user.toJSON();
    delete userResponse.password;
    delete userResponse.password_hash;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Change password (Protected)
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Check if user model has checkPassword method
    if (typeof user.checkPassword === 'function') {
      const isValidPassword = await user.checkPassword(currentPassword);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
    } else {
      // Fallback to bcrypt comparison
      const bcrypt = require('bcryptjs');
      const isValidPassword = await bcrypt.compare(currentPassword, user.password || user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
    }

    // Hash new password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    user.password_hash = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

// Logout (Client-side, but mark last logout)
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Update last logout timestamp if you have that field
    const user = req.user;
    user.last_logout_at = new Date();
    await user.save();

    console.log('👋 User logged out:', user.email);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// Forgot password - Request reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ 
      where: { email: email.toLowerCase().trim() } 
    });
    
    if (!user) {
      // For security, don't reveal if user exists
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link'
      });
    }

    // Generate reset token (different from auth token)
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Save reset token to user
    user.reset_password_token = resetToken;
    user.reset_password_expires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // Send reset email (implement this in emailService)
    // await sendPasswordResetEmail(email, resetToken);

    console.log('📧 Password reset requested for:', email);

    res.json({
      success: true,
      message: 'Password reset link sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    const user = await User.findOne({
      where: {
        id: decoded.userId,
        reset_password_token: token,
        reset_password_expires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.password_hash = hashedPassword;
    user.reset_password_token = null;
    user.reset_password_expires = null;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

// DEBUG endpoint
router.get('/debug/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const decodedEmail = decodeURIComponent(email);
    
    console.log('🔍 Debug request for:', decodedEmail);
    
    const verifications = await EmailVerification.findAll({
      where: { email: decodedEmail },
      order: [['created_at', 'DESC']],
      raw: true
    });
    
    const user = await User.findOne({
      where: { email: decodedEmail },
      raw: true,
      attributes: { exclude: ['password', 'password_hash'] }
    });
    
    const result = {
      success: true,
      currentTime: new Date().toISOString(),
      user: user,
      verificationCount: verifications.length,
      verifications: verifications
    };
    
    res.json(result);
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug: Check user by email
router.post('/debug-user', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔍 Debug user lookup:', { email, password });
    
    // Find user
    const user = await User.findOne({
      where: { 
        email: email.toLowerCase().trim() 
      },
      raw: true
    });
    
    console.log('🔍 User found in database:', user);
    
    if (user) {
      console.log('🔐 User password field:', {
        hasPasswordField: !!user.password,
        hasPasswordHashField: !!user.password_hash,
        passwordLength: user.password ? user.password.length : 'N/A',
        passwordHashLength: user.password_hash ? user.password_hash.length : 'N/A'
      });
      
      // Test password comparison
      const bcrypt = require('bcryptjs');
      let passwordValid = false;
      
      if (user.password) {
        passwordValid = await bcrypt.compare(password, user.password);
        console.log('🔐 Password check with "password" field:', passwordValid);
      }
      
      if (user.password_hash && !passwordValid) {
        passwordValid = await bcrypt.compare(password, user.password_hash);
        console.log('🔐 Password check with "password_hash" field:', passwordValid);
      }
    }
    
    res.json({
      success: true,
      userExists: !!user,
      user: user ? {
        id: user.id,
        email: user.email,
        phone: user.phone,
        is_verified: user.is_verified,
        is_active: user.is_active,
        hasPassword: !!user.password,
        hasPasswordHash: !!user.password_hash
      } : null
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;