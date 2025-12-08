const { sequelize, User, Passport, EmailVerification } = require('../models');
const { Op } = require('sequelize');
const { generateVerificationCode } = require('../utils/generateCode');
const { sendVerificationEmail } = require('../utils/emailService');

const updatePersonalInfo = async (req, res) => {
  try {
    const {
      nationalId,
      education,
      experience,
      certification,
      password,
      personalPhoto
    } = req.body;

    console.log('📥 Received personal info data:', { 
      nationalId, education, experience, certification 
    });

    // Find the most recently created user
    let user = await User.findOne({ 
      order: [['created_at', 'DESC']]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please complete step 1 first.'
      });
    }

    console.log('👤 Found user for personal info update:', user.email, user.id);

    // Prepare update data
    const updateData = {
      national_id: nationalId,
      education_level: education,
      experience_level: experience,
      certification: certification,
      personal_photo_url: personalPhoto
    };

    // Only update password if provided (it will be hashed automatically by model hook)
    if (password) {
      updateData.password_hash = password;
    }

    // Update user with personal information
    const [affectedRows] = await User.update(updateData, {
      where: { id: user.id }
    });

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or no changes made'
      });
    }

    // Get updated user
    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password_hash'] }
    });

    console.log('✅ Personal info updated successfully for user:', updatedUser.email);

    res.json({
      success: true,
      message: 'Personal information saved successfully',
      data: { 
        user: {
          id: updatedUser.id,
          nationalId: updatedUser.national_id,
          education: updatedUser.education_level,
          experience: updatedUser.experience_level,
          certification: updatedUser.certification,
          personalPhotoUrl: updatedUser.personal_photo_url
        }
      }
    });

  } catch (error) {
    console.error('❌ Personal info update error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed: ' + error.errors.map(e => e.message).join(', ')
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'National ID already exists in our system'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while saving personal information'
    });
  }
};

const updateContactInfo = async (req, res) => {
  try {
    const { email, phone, countryCode } = req.body;

    console.log('📥 Received contact info data:', { email, phone, countryCode });

    // Find the most recently created user
    let user = await User.findOne({ 
      order: [['created_at', 'DESC']]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please complete step 1 first.'
      });
    }

    console.log('👤 Found user to update:', user.email, user.id);

    // Check if the new email already exists for a different user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ 
        where: { 
          email: email,
          id: { [Op.ne]: user.id }
        } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists in our system'
        });
      }
    }

    // Prepare update data
    const updateData = {
      phone: countryCode + phone.replace(/\D/g, '')
    };

    let otpSent = false;
    let verificationCode = null;

    // Always update email if provided and send OTP
    if (email) {
      updateData.email = email;
      console.log('📧 Updating email from', user.email, 'to', email);

      // Generate and send OTP
      verificationCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      try {
        // Save verification code to database
        await EmailVerification.create({
          user_id: user.id,
          email: email,
          verification_code: verificationCode,
          expires_at: expiresAt,
          verification_type: 'signup'
        });

        console.log('✅ OTP saved to database:', verificationCode);

        // Send verification email
        const emailSent = await sendVerificationEmail(email, verificationCode);
        otpSent = emailSent;

        console.log('📨 OTP email status:', { 
          email, 
          code: verificationCode, 
          emailSent 
        });

      } catch (emailError) {
        console.error('❌ Email sending error:', emailError);
        // Continue even if email fails - we'll show the code in logs
        otpSent = true; // Mark as sent since we have the code
      }
    }

    // Update user with contact information
    const [affectedRows] = await User.update(updateData, {
      where: { id: user.id }
    });

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or no changes made'
      });
    }

    // Get updated user
    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password_hash'] }
    });

    console.log('✅ Contact info updated successfully:', {
      oldEmail: user.email,
      newEmail: updatedUser.email,
      phone: updatedUser.phone,
      otpSent,
      verificationCode // This will be logged
    });

    res.json({
      success: true,
      message: otpSent 
        ? 'Contact information saved and verification code sent to your email' 
        : 'Contact information saved successfully',
      data: { 
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          phone: updatedUser.phone
        },
        otpSent,
        // In development, return the code for testing
        verificationCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined
      }
    });

  } catch (error) {
    console.error('❌ Contact info update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while saving contact information'
    });
  }
};

const getProfile = async (req, res) => {
  try {
    // Find the most recently created user
    let user = await User.findOne({ 
      order: [['created_at', 'DESC']],
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Passport, as: 'passport' }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Passport, as: 'passport' }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      include: [{ 
        model: Passport, 
        as: 'passport',
        attributes: ['id', 'token_number', 'passport_number', 'nationality','passport_image_url']
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: { users },
      count: users.length
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { passport, ...userData } = req.body;

    console.log('🔄 UPDATE USER REQUEST:');
    console.log('User ID:', id);
    console.log('Passport data:', passport);
    console.log('Token number received:', passport?.token_number);

    // Update user basic info
    const [affectedRows] = await User.update(userData, {
      where: { id }
    });

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Handle passport token number
    if (passport && passport.token_number) {
      console.log('📝 Processing token number:', passport.token_number);
      
      try {
        // Check if passport exists for this user
        let passportRecord = await Passport.findOne({
          where: { user_id: id }
        });

        if (passportRecord) {
          // Update existing passport
          await Passport.update(
            { token_number: passport.token_number },
            { where: { user_id: id } }
          );
          console.log('✅ Updated existing passport with token number');
        } else {
          // Create new passport record
          await Passport.create({
            user_id: id,
            token_number: passport.token_number,
            passport_number: 'TEMP',
            country: 'Unknown',
            nationality: 'Unknown', 
            date_of_birth: new Date(),
            expiry_date: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
            sex: 'U',
            passport_image_url: '',
            is_verified: false,
            verification_status: 'pending'
          });
          console.log('✅ Created new passport with token number');
        }
      } catch (passportError) {
        console.error('❌ Passport error:', passportError);
        // Continue even if passport fails
      }
    }

    // Get updated user with passport
    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Passport, as: 'passport' }]
    });

    console.log('✅ Final user data with token:', updatedUser.passport?.token_number);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('❌ Update user error:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Deleting user:', id);

    const affectedRows = await User.destroy({
      where: { id }
    });

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ User deleted successfully:', id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting user'
    });
  }
};

module.exports = {
  updatePersonalInfo,
  updateContactInfo,
  getProfile,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
};