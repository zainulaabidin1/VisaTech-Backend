const express = require('express');
const router = express.Router();
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


// Remove authentication temporarily for testing
// router.use(authenticate);

router.put('/personal-info', validatePersonalInfo, updatePersonalInfo);
router.put('/contact-info',validateContactInfo, updateContactInfo);
router.get('/profile', getProfile);
router.get('/all', getAllUsers); // For testing
router.get('/:id', getUserById); // For testing
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.put('/contact-info', validateContactInfo, updateContactInfo);

module.exports = router;