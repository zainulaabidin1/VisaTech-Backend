const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { 
  updatePersonalInfo, 
  updateContactInfo, 
  getProfile,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser 
} = require('../controllers/userController');
const { validatePersonalInfo } = require('../middleware/validation');
const { validateContactInfo } = require('../middleware/validation');

// ====================
// MULTER CONFIGURATION FOR PERSONAL PHOTOS
// ====================
// Create personal-photos directory
const personalPhotosDir = path.join(__dirname, '../uploads/personal-photos');
if (!fs.existsSync(personalPhotosDir)) {
  fs.mkdirSync(personalPhotosDir, { recursive: true });
  console.log('📁 Created personal photos directory:', personalPhotosDir);
}

// Configure storage for personal photos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, personalPhotosDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'personal-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for personal photos
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG and PNG files are allowed'));
    }
  }
});

// ====================
// ROUTES
// ====================

// POST /api/users/upload-photo - Upload personal photo
router.post('/upload-photo', upload.single('personalPhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('📁 Personal photo uploaded:', {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    const filePath = `/uploads/personal-photos/${req.file.filename}`;
    const fileUrl = `http://localhost:5000${filePath}`;

    res.json({
      success: true,
      message: 'Personal photo uploaded successfully',
      data: {
        fileName: req.file.filename,
        filePath: filePath,
        fileUrl: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Photo upload failed',
      error: error.message
    });
  }
});

// PUT /api/users/personal-info - Save personal info
router.put('/personal-info', validatePersonalInfo, updatePersonalInfo);

// PUT /api/users/contact-info - Save contact info
router.put('/contact-info', validateContactInfo, updateContactInfo);

// GET /api/users/profile - Get user profile
router.get('/profile', getProfile);

// GET /api/users/all - Get all users (for testing)
router.get('/all', getAllUsers);

// GET /api/users/:id - Get user by ID
router.get('/:id', getUserById);

// PUT /api/users/:id - Update user
router.put('/:id', updateUser);

// DELETE /api/users/:id - Delete user
router.delete('/:id', deleteUser);

module.exports = router;