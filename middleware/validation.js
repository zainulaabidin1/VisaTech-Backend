const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

const validatePassport = [
  body('firstName').notEmpty().trim().withMessage('First name is required'),
  body('lastName').notEmpty().trim().withMessage('Last name is required'),
  body('country').notEmpty().trim().withMessage('Country is required'),
  body('passportNo').notEmpty().trim().withMessage('Passport number is required'),
  body('nationality').notEmpty().trim().withMessage('Nationality is required'),
  body('sex').isIn(['male', 'female']).withMessage('Sex must be male or female'),
  body('dob').isDate().withMessage('Valid date of birth is required'),
  body('expiryDate').isDate().withMessage('Valid expiry date is required'),
  handleValidationErrors
];

const validatePersonalInfo = [
  body('nationalId').notEmpty().trim().withMessage('National ID is required'),
  body('education').notEmpty().trim().withMessage('Education level is required'),
  body('experience').notEmpty().trim().withMessage('Experience level is required'),
  body('certification').notEmpty().trim().withMessage('Certification is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors
];

const validateContactInfo = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').isLength({ min: 10 }).withMessage('Phone number must be at least 10 digits'),
  body('countryCode').notEmpty().withMessage('Country code is required'),
  handleValidationErrors
];

const validateLogin = [
  body('password').isLength({ min: 1 }).withMessage('Password is required'),
  // Custom validation for email/phone
  (req, res, next) => {
    const { email, phone } = req.body;
    
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone is required'
      });
    }
    
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }
    
    next();
  },
  handleValidationErrors
];

module.exports = {
  validatePassport,
  validatePersonalInfo,
  validateContactInfo,
  handleValidationErrors,
  validateLogin
};