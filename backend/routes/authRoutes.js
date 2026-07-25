const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getCurrentUser,
  updateProfile,
  deleteMyAccount,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  changePassword,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/jwt_auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getCurrentUser);
router.patch('/me', authenticate, updateProfile);
router.delete('/me', authenticate, deleteMyAccount);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', authenticate, changePassword);

module.exports = router;