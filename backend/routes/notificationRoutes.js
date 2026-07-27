const express = require('express');
const router = express.Router();
const { getMyNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');
const { authenticate, blockIfMustChangePassword } = require('../middleware/jwt_auth');

router.use(authenticate, blockIfMustChangePassword);

router.get('/mine', getMyNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

module.exports = router;