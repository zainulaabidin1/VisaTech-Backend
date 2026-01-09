const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createOrUpdatePassport, getPassport } = require('../controllers/passportController');
const { validatePassport } = require('../middleware/validation');
const { Passport, User } = require('../models');

// ====================
// MULTER CONFIGURATION
// ====================
// Create passport-photos subdirectory
const passportPhotosDir = path.join(__dirname, '../uploads/passport-photos');
if (!fs.existsSync(passportPhotosDir)) {
  fs.mkdirSync(passportPhotosDir, { recursive: true });
  console.log('✅ Created passport photos directory:', passportPhotosDir);
}

// Configure storage - SAVE TO PASSPORT-PHOTOS SUBDIRECTORY
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, passportPhotosDir); // Save to subdirectory
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'passport-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, PNG, JPG) and PDF files are allowed'));
  }
};

// Create upload instance for passports
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: fileFilter
});

// ====================
// PAYMENT SCREENSHOTS CONFIG
// ====================
const paymentScreenshotsDir = path.join(__dirname, '../uploads/payment-screenshots');
if (!fs.existsSync(paymentScreenshotsDir)) {
  fs.mkdirSync(paymentScreenshotsDir, { recursive: true });
  console.log('✅ Created payment screenshots directory:', paymentScreenshotsDir);
}

const paymentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, paymentScreenshotsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'payment-' + uniqueSuffix + ext);
  }
});

const paymentUpload = multer({
  storage: paymentStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: fileFilter
});

// ====================
// ROUTES
// ====================

// POST /api/passports/upload - Upload passport image
router.post('/upload', upload.single('passportImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // IMPORTANT: Use the subdirectory path
    const filePath = `/uploads/passport-photos/${req.file.filename}`;
    const fileUrl = `${req.protocol}://${req.get('host')}${filePath}`;

    // Log file details for debugging
    console.log('📁 Passport file uploaded:', {
      filename: req.file.filename,
      path: req.file.path,
      destination: req.file.destination,
      filePath: filePath,
      fileUrl: fileUrl
    });

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileName: req.file.filename,
        filePath: filePath, // Store this in your form
        fileUrl: fileUrl, // Use this for preview
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error.message
    });
  }
});

// POST /api/passports/upload-payment-screenshot - Upload payment screenshot
router.post('/upload-payment-screenshot', paymentUpload.single('screenshot'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const filePath = `/uploads/payment-screenshots/${req.file.filename}`;
    const fileUrl = `${req.protocol}://${req.get('host')}${filePath}`;

    console.log('💳 Payment screenshot uploaded:', {
      filename: req.file.filename,
      path: req.file.path,
      filePath: filePath
    });

    res.json({
      success: true,
      message: 'Payment screenshot uploaded successfully',
      data: {
        fileName: req.file.filename,
        filePath: filePath,
        fileUrl: fileUrl,
        url: filePath // For compatibility with frontend
      }
    });

  } catch (error) {
    console.error('❌ Payment screenshot upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error.message
    });
  }
});

// POST /api/passports - Create/update passport (your existing route)
router.post('/', validatePassport, createOrUpdatePassport);

// GET /api/passports - Get passport info (your existing route)
router.get('/', getPassport);

// POST /api/passports/verify - Verify passport (your existing route)
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

// POST /api/passports/verify-labor - Verify labor result (your existing route)
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

// DELETE /api/passports/upload/:filename - Delete uploaded file (optional)
router.delete('/upload/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(passportPhotosDir, filename); // Updated path

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
      console.log('🗑️ Passport file deleted:', filename);
    } else {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file'
    });
  }
});

// GET /api/passports/uploads/list - List uploaded passport files (for debugging)
router.get('/uploads/list', async (req, res) => {
  try {
    const files = fs.readdirSync(passportPhotosDir);
    res.json({
      success: true,
      message: 'Passport uploads list',
      data: {
        directory: passportPhotosDir,
        fileCount: files.length,
        files: files
      }
    });
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list files'
    });
  }
});

module.exports = router;