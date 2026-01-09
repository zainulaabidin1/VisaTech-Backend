const { User } = require('../models');
const { generateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    console.log('📥 Login attempt received:', {
      email: email || 'not provided',
      phone: phone || 'not provided'
    });

    // Validate input
    if ((!email && !phone) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/phone and password are required'
      });
    }

    // Find user by email or phone
    const whereCondition = email
      ? { email: email.trim().toLowerCase() }
      : { phone: phone.replace(/\D/g, '') };

    console.log('🔍 Database query condition:', whereCondition);

    const user = await User.findOne({
      where: whereCondition
    });

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
      is_verified: user.is_verified,
      is_active: user.is_active,
      hasPassword: !!(user.password || user.password_hash)  // Check both fields
    });

    // Check if user is active
    if (user.is_active === false) {
      console.log('❌ User account is inactive');
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check if email is verified
    if (user.is_verified === false) {
      console.log('❌ User email is not verified');
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }

    console.log('🔐 Checking password...');
    console.log('Input password length:', password.length);
    console.log('Stored password field:', user.password ? 'exists' : 'null/undefined');
    console.log('Stored password_hash field:', user.password_hash ? 'exists' : 'null/undefined');

    // NEW: Check if user has a password at all
    const hasPassword = !!(user.password || user.password_hash);
    if (!hasPassword) {
      console.log('❌ User has no password set');
      return res.status(401).json({
        success: false,
        message: 'No password set for this account. Please use "Forgot Password" to set one.'
      });
    }

    let isPasswordValid = false;

    // Try password field first
    if (user.password) {
      if (user.password.startsWith('$2')) {
        // It's a bcrypt hash
        try {
          isPasswordValid = await bcrypt.compare(password, user.password);
          console.log('🔐 Bcrypt comparison result for password field:', isPasswordValid);
        } catch (bcryptError) {
          console.error('❌ Bcrypt compare error:', bcryptError.message);
        }
      } else {
        // Password is plain text (for existing users before hashing)
        isPasswordValid = password === user.password;
        console.log('🔐 Plain text comparison result for password field:', isPasswordValid);

        // If valid, hash the password for future use
        if (isPasswordValid) {
          console.log('⚠️ Password is stored as plain text! Hashing it now...');
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          await user.update({ password: hashedPassword, password_hash: hashedPassword });
          console.log('✅ Password hashed and updated in database');
        }
      }
    }

    // If password field didn't work, try password_hash field
    if (!isPasswordValid && user.password_hash) {
      if (user.password_hash.startsWith('$2')) {
        // It's a bcrypt hash
        try {
          isPasswordValid = await bcrypt.compare(password, user.password_hash);
          console.log('🔐 Bcrypt comparison result for password_hash field:', isPasswordValid);
        } catch (bcryptError) {
          console.error('❌ Bcrypt compare error:', bcryptError.message);
        }
      } else {
        // password_hash is plain text
        isPasswordValid = password === user.password_hash;
        console.log('🔐 Plain text comparison result for password_hash field:', isPasswordValid);

        // If valid, hash the password for future use
        if (isPasswordValid) {
          console.log('⚠️ password_hash is stored as plain text! Hashing it now...');
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          await user.update({ password: hashedPassword, password_hash: hashedPassword });
          console.log('✅ Password hashed and updated in database');
        }
      }
    }

    console.log('🔐 Final password validation:', isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/phone or password'
      });
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Update last login timestamp
    await user.update({ last_login_at: new Date() });

    console.log('✅ Login successful for user:', user.email);

    // Prepare user data for response
    const userResponse = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: `${user.first_name} ${user.last_name}`.trim(),
      isVerified: user.is_verified,
      isActive: user.is_active,
      role: user.role || 'user',
      createdAt: user.created_at
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: userResponse
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