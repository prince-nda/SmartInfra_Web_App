const express = require('express');
const router = express.Router();
const { createReport, getMyReports, getReportById } = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/jwt_auth');
const { handleImageUpload } = require('../middleware/multer_image');

// All report routes require a logged-in user
router.use(authenticate);

router.post('/', authorize('citizen'), handleImageUpload, createReport);
router.get('/mine', authorize('citizen'), getMyReports);
router.get('/:id', getReportById); // ownership/role check happens inside the controller

module.exports = router;