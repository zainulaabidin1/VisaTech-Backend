const { User } = require('../models');
const { generateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    console.log('📥 Login attempt received:', { email, phone });
    console.log('🔍 Looking for user with:', email ? `email: ${email}` : `phone: ${phone}`);

    // Validate input
    if ((!email && !phone) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/phone and password are required'
      });
    }

    // Find user by email or phone
    const whereCondition = email ? { email } : { phone };
    console.log('🔍 Database query condition:', whereCondition);

    const user = await User.findOne({ where: whereCondition });

    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({
        success: false,
        message: 'Invalid email/phone or password'
      });
    }

    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      phone: user.phone,
      is_verified: user.is_verified,
      is_active: user.is_active
    });

    // Check if user is active
    if (!user.is_active) {
      console.log('❌ User account is inactive');
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check if email is verified
    if (!user.is_verified) {
      console.log('❌ User email is not verified');
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }

    console.log('🔐 Checking password...');
    console.log('Input password:', password);
    console.log('Stored hash:', user.password_hash ? 'Exists' : 'Missing');

    // Verify password using the model method
    let isPasswordValid = false;
    try {
      if (user.checkPassword) {
        isPasswordValid = await user.checkPassword(password);
      } else {
        // Fallback to direct bcrypt comparison
        isPasswordValid = await bcrypt.compare(password, user.password_hash);
      }
    } catch (bcryptError) {
      console.error('❌ Password comparison error:', bcryptError);
      isPasswordValid = false;
    }

    console.log('🔐 Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/phone or password'
      });
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Update last login timestamp
    await User.update(
      { last_login_at: new Date() },
      { where: { id: user.id } }
    );

    console.log('✅ Login successful for user:', user.email);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          firstName: user.first_name,
          lastName: user.last_name,
          isVerified: user.is_verified
        }
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
};

module.exports = { login };