const express = require('express');
const router = express.Router();
const {
  getAllReports,
  exportReports,
  assignReport,
  updateReportStatus,
  addReportNote,
  getAnalytics,
  getStaffList,
  createStaff,
  deactivateStaff,
  reactivateStaff,
  deleteStaff,
  updateStaffPermissions,
  getAuditLogs,
  exportAuditLogs,
} = require('../controllers/adminController');
const { authenticate, authorize, requireSuperAdmin, blockIfMustChangePassword } = require('../middleware/jwt_auth');

// Every route below requires an authenticated admin (regular or super) with no pending forced password change
router.use(authenticate, authorize('admin'), blockIfMustChangePassword);

router.get('/reports', getAllReports);
router.get('/reports/export', exportReports);
router.patch('/reports/:id/status', updateReportStatus);
router.post('/reports/:id/notes', addReportNote);
router.get('/analytics', getAnalytics);
router.get('/staff', getStaffList);

// Super-admin only (FR7.1): creating, deactivating, deleting administrator
// accounts, changing permissions, viewing/exporting the audit trail, and
// assigning reports to staff (centralizes workload dispatch).
router.patch('/reports/:id/assign', requireSuperAdmin, assignReport);
router.post('/create-staff', requireSuperAdmin, createStaff);
router.patch('/staff/:id/deactivate', requireSuperAdmin, deactivateStaff);
router.patch('/staff/:id/reactivate', requireSuperAdmin, reactivateStaff);
router.delete('/staff/:id', requireSuperAdmin, deleteStaff);
router.patch('/staff/:id/permissions', requireSuperAdmin, updateStaffPermissions);
router.get('/audit-logs', requireSuperAdmin, getAuditLogs);
router.get('/audit-logs/export', requireSuperAdmin, exportAuditLogs);

module.exports = router;