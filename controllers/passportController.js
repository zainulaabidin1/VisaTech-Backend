const { Passport, User, sequelize } = require('../models');

const createOrUpdatePassport = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      country,
      passportNo,
      nationality,
      sex,
      dob,
      expiryDate,
      passportImage
    } = req.body;

    console.log('📥 Received passport data:', req.body);

    // Use transaction for data consistency
    const result = await sequelize.transaction(async (t) => {
      // First, create or find a user
      let user = await User.findOne({ 
        where: { email: 'temporary@user.com' }, // Temporary email
        transaction: t 
      });

      if (!user) {
        // Create a temporary user (you'll replace this with actual user creation later)
        user = await User.create({
          email: 'temporary@user.com',
          password_hash: 'temporary_password', // You'll replace this
          first_name: firstName,
          last_name: lastName,
          nationality: nationality,
          country_of_residence: country,
          date_of_birth: dob,
          sex: sex
        }, { transaction: t });
        
        console.log('✅ Temporary user created:', user.id);
      }

      // Create or update passport
      const [passport, created] = await Passport.upsert({
        user_id: user.id, // Link to the user
        passport_number: passportNo,
        country: country,
        nationality: nationality,
        date_of_birth: dob,
        expiry_date: expiryDate,
        sex: sex,
        passport_image_url: passportImage || null,
        is_verified: false,
        verification_status: 'pending'
      }, {
        transaction: t,
        returning: true
      });

      return { user, passport, created };
    });

    res.status(201).json({
      success: true,
      message: 'Passport information saved successfully',
      data: {
        passport: result.passport,
        user: {
          id: result.user.id,
          firstName: result.user.first_name,
          lastName: result.user.last_name
        }
      }
    });

  } catch (error) {
    console.error('❌ Passport save error:', error);
    
    // Handle specific errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Passport number already exists in our system'
      });
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed: ' + error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while saving passport information'
    });
  }
};

const getPassport = async (req, res) => {
  try {
    const passport = await Passport.findOne({
      where: { user_id: req.user?.id }, // Will work when auth is added
      include: [{
        model: User,
        as: 'user',
        attributes: ['first_name', 'last_name', 'email']
      }]
    });

    if (!passport) {
      return res.status(404).json({
        success: false,
        message: 'Passport information not found'
      });
    }

    res.json({
      success: true,
      data: { passport }
    });

  } catch (error) {
    console.error('Get passport error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve passport information'
    });
  }
};

module.exports = {
  createOrUpdatePassport,
  getPassport
};