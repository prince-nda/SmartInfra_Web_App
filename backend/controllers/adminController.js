const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { notifyStatusUpdate } = require('./notificationController');
const { logAction } = require('../utils/auditLog');
const { toCsv } = require('../utils/csv');
const { streamReportsPdf } = require('../utils/pdfExport');
const { generateTempPassword } = require('../utils/tokenUtils');
const { sendStaffWelcomeEmail } = require('../utils/email');

const VALID_STATUSES = ['submitted', 'in_progress', 'resolved', 'rejected'];
const SALT_ROUNDS = 10;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Builds the shared WHERE clause + params used by list/export endpoints, so the three stay in sync. */
function buildReportFilters(query) {
  const { status, category, search, dateFrom, dateTo, assignedStaffId, district } = query;
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`r.status = $${params.length}`);
  }
  if (category) {
    params.push(category);
    conditions.push(`r.category = $${params.length}`);
  }
  if (district) {
    params.push(district);
    conditions.push(`u.district = $${params.length}`);
  }
  if (assignedStaffId) {
    params.push(assignedStaffId);
    conditions.push(`r.assigned_staff_id = $${params.length}`);
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`r.date_submitted >= $${params.length}`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`r.date_submitted <= $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    // Also match a bare report ID search (e.g. "42") against r.report_id, per FR5.2
    const asNumber = Number(search);
    if (Number.isInteger(asNumber)) {
      params.push(asNumber);
      conditions.push(`(r.description ILIKE $${params.length - 1} OR r.location_text ILIKE $${params.length - 1} OR r.report_id = $${params.length})`);
    } else {
      conditions.push(`(r.description ILIKE $${params.length} OR r.location_text ILIKE $${params.length})`);
    }
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params };
}

const REPORTS_SELECT = `
  SELECT r.*, u.full_name AS citizen_name, u.email AS citizen_email,
         staff.full_name AS assigned_staff_name,
         COALESCE((SELECT json_agg(i.*) FROM report_images i WHERE i.report_id = r.report_id), '[]') AS images
  FROM issue_reports r
  JOIN users u ON u.user_id = r.citizen_id
  LEFT JOIN users staff ON staff.user_id = r.assigned_staff_id
`;

/**
 * GET /api/admin/reports
 * Search & filter across all reports: category, status, district/location,
 * date range, report ID, and free-text search over description (FR5.1/5.2).
 */
async function getAllReports(req, res) {
  const { whereClause, params } = buildReportFilters(req.query);

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM issue_reports r JOIN users u ON u.user_id = r.citizen_id ${whereClause}`,
      params
    );
    const total = countResult.rows[0].total;

    const pagedParams = [...params, pageSize, offset];
    const result = await pool.query(
      `${REPORTS_SELECT} ${whereClause} ORDER BY r.date_submitted DESC LIMIT $${pagedParams.length - 1} OFFSET $${pagedParams.length}`,
      pagedParams
    );

    return res.json({
      reports: result.rows,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  } catch (err) {
    console.error('Get all reports error:', err);
    return res.status(500).json({ message: 'Could not fetch reports' });
  }
}

/**
 * GET /api/admin/reports/export?format=csv|pdf
 * FR6.2 - exports every report matching the current filters (no pagination cap).
 */
async function exportReports(req, res) {
  const { whereClause, params } = buildReportFilters(req.query);
  const format = (req.query.format || 'csv').toLowerCase();

  try {
    const result = await pool.query(`${REPORTS_SELECT} ${whereClause} ORDER BY r.date_submitted DESC`, params);

    await logAction({
      userId: req.user.userId,
      action: 'export_reports',
      entityType: 'report',
      details: { format, filters: req.query, count: result.rows.length },
    });

    if (format === 'pdf') {
      return streamReportsPdf(res, result.rows);
    }

    const csv = toCsv(result.rows, [
      { label: 'Report ID', value: 'report_id' },
      { label: 'Category', value: 'category' },
      { label: 'Description', value: 'description' },
      { label: 'Citizen', value: 'citizen_name' },
      { label: 'Citizen Email', value: 'citizen_email' },
      { label: 'Status', value: 'status' },
      { label: 'Location', value: 'location_text' },
      { label: 'GPS Lat', value: 'gps_lat' },
      { label: 'GPS Long', value: 'gps_long' },
      { label: 'Date Submitted', value: (r) => new Date(r.date_submitted).toISOString() },
      { label: 'Resolved At', value: (r) => (r.resolved_at ? new Date(r.resolved_at).toISOString() : '') },
      { label: 'Assigned Staff', value: (r) => r.assigned_staff_name || '' },
    ]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="smartinfra-reports.csv"');
    return res.send(csv);
  } catch (err) {
    console.error('Export reports error:', err);
    return res.status(500).json({ message: 'Could not export reports' });
  }
}

/** PATCH /api/admin/reports/:id/assign  { staffId } */
async function assignReport(req, res) {
  const { id } = req.params;
  const { staffId } = req.body;

  if (!staffId) return res.status(400).json({ message: 'staffId is required' });

  try {
    const staffCheck = await pool.query(`SELECT user_id FROM users WHERE user_id = $1 AND role = 'admin'`, [staffId]);
    if (staffCheck.rows.length === 0) {
      return res.status(400).json({ message: 'staffId must reference a valid administrator account' });
    }

    const result = await pool.query(`UPDATE issue_reports SET assigned_staff_id = $1 WHERE report_id = $2 RETURNING *`, [staffId, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Report not found' });
    }

    await logAction({
      userId: req.user.userId,
      action: 'assign_report',
      entityType: 'report',
      entityId: Number(id),
      details: { assignedStaffId: staffId },
    });

    return res.json({ message: 'Report assigned successfully', report: result.rows[0] });
  } catch (err) {
    console.error('Assign report error:', err);
    return res.status(500).json({ message: 'Could not assign report' });
  }
}

/**
 * PATCH /api/admin/reports/:id/status  { status }
 * Updating status always sends a notification to the citizen
 * (mandatory "include" relationship in the use-case diagram), and is
 * recorded to the audit log (NFR12).
 */
async function updateReportStatus(req, res) {
  const { id } = req.params;
  const { status, message } = req.body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ message: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    const previous = await pool.query('SELECT status FROM issue_reports WHERE report_id = $1', [id]);
    if (previous.rows.length === 0) {
      return res.status(404).json({ message: 'Report not found' });
    }
    const previousStatus = previous.rows[0].status;

    const resolvedAt = status === 'resolved' ? new Date() : null;
    const result = await pool.query(
      `UPDATE issue_reports SET status = $1, resolved_at = $2 WHERE report_id = $3 RETURNING *`,
      [status, resolvedAt, id]
    );
    const report = result.rows[0];

    const citizenResult = await pool.query('SELECT full_name, email, phone FROM users WHERE user_id = $1', [report.citizen_id]);
    const citizen = citizenResult.rows[0];

    await notifyStatusUpdate({
      citizenId: report.citizen_id,
      citizenEmail: citizen.email,
      citizenName: citizen.full_name,
      citizenPhone: citizen.phone,
      reportId: report.report_id,
      newStatus: status,
      customMessage: message?.trim() || null,
    });

    await logAction({
      userId: req.user.userId,
      action: 'update_report_status',
      entityType: 'report',
      entityId: Number(id),
      details: { from: previousStatus, to: status, message: message?.trim() || null },
    });

    return res.json({ message: 'Report status updated', report });
  } catch (err) {
    console.error('Update report status error:', err);
    return res.status(500).json({ message: 'Could not update report status' });
  }
}

/**
 * POST /api/admin/reports/:id/notes  { note }
 * FR5.3 - internal notes documenting actions taken on a report. Never
 * exposed to the citizen who filed the report.
 */
async function addReportNote(req, res) {
  const { id } = req.params;
  const { note } = req.body;

  if (!note || !note.trim()) return res.status(400).json({ message: 'Note text is required' });

  try {
    const reportCheck = await pool.query('SELECT report_id FROM issue_reports WHERE report_id = $1', [id]);
    if (reportCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const result = await pool.query(
      `INSERT INTO report_notes (report_id, admin_id, note) VALUES ($1, $2, $3)
       RETURNING note_id, report_id, admin_id, note, created_at`,
      [id, req.user.userId, note.trim()]
    );

    await logAction({
      userId: req.user.userId,
      action: 'add_report_note',
      entityType: 'report',
      entityId: Number(id),
    });

    return res.status(201).json({ message: 'Note added', note: result.rows[0] });
  } catch (err) {
    console.error('Add report note error:', err);
    return res.status(500).json({ message: 'Could not add note' });
  }
}

/**
 * GET /api/admin/analytics
 * Summaries by category, status, district, and average resolution time -
 * directly supports the SRS hypothesis metric (14-day -> 5-day target).
 * Optional dateFrom/dateTo narrows the whole summary to a range (FR6.1).
 */
async function getAnalytics(req, res) {
  const { dateFrom, dateTo } = req.query;
  const dateConditions = [];
  const dateParams = [];
  if (dateFrom) {
    dateParams.push(dateFrom);
    dateConditions.push(`date_submitted >= $${dateParams.length}`);
  }
  if (dateTo) {
    dateParams.push(dateTo);
    dateConditions.push(`date_submitted <= $${dateParams.length}`);
  }
  const dateWhere = dateConditions.length ? `WHERE ${dateConditions.join(' AND ')}` : '';

  try {
    const [byCategory, byStatus, byDistrict, avgResolution, totals] = await Promise.all([
      pool.query(`SELECT category, COUNT(*)::int AS count FROM issue_reports ${dateWhere} GROUP BY category ORDER BY count DESC`, dateParams),
      pool.query(`SELECT status, COUNT(*)::int AS count FROM issue_reports ${dateWhere} GROUP BY status`, dateParams),
      pool.query(
        `SELECT u.district, COUNT(*)::int AS count
         FROM issue_reports r JOIN users u ON u.user_id = r.citizen_id
         ${dateWhere ? dateWhere.replace(/date_submitted/g, 'r.date_submitted') + ' AND' : 'WHERE'} u.district IS NOT NULL
         GROUP BY u.district ORDER BY count DESC`,
        dateParams
      ),
      pool.query(
        `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - date_submitted)) / 86400.0) AS avg_days
         FROM issue_reports ${dateWhere ? dateWhere + ' AND' : 'WHERE'} resolved_at IS NOT NULL`,
        dateParams
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
                COUNT(*) FILTER (WHERE status = 'submitted')::int AS pending
         FROM issue_reports ${dateWhere}`,
        dateParams
      ),
    ]);

    return res.json({
      totals: totals.rows[0],
      byCategory: byCategory.rows,
      byStatus: byStatus.rows,
      byDistrict: byDistrict.rows,
      averageResolutionDays: avgResolution.rows[0].avg_days ? Number(avgResolution.rows[0].avg_days).toFixed(1) : null,
    });
  } catch (err) {
    console.error('Get analytics error:', err);
    return res.status(500).json({ message: 'Could not generate analytics' });
  }
}

/** GET /api/admin/staff  - list admins/staff for the assignment dropdown and staff management page */
async function getStaffList(req, res) {
  try {
    const result = await pool.query(
      `SELECT user_id, full_name, email, department, is_active, is_super_admin, must_change_password, created_at
       FROM users WHERE role = 'admin' ORDER BY is_super_admin DESC, full_name`
    );
    return res.json({ staff: result.rows });
  } catch (err) {
    console.error('Get staff list error:', err);
    return res.status(500).json({ message: 'Could not fetch staff list' });
  }
}

/**
 * POST /api/admin/create-staff
 * FR7.1/FR1.3 - only a super-administrator can create a new administrator
 * account (route-gated by requireSuperAdmin), which is the sole path to
 * the 'admin' role - the public register endpoint can never be used to
 * self-elevate privileges.
 *
 * The system generates a temporary password rather than letting the
 * super-admin choose one - it's returned once in this response so it can
 * be handed to the new staff member, and the account is flagged
 * must_change_password so they're forced to set a real password on their
 * first login before they can access anything else.
 */
async function createStaff(req, res) {
  const { fullName, email, phone, department, isSuperAdmin } = req.body;

  if (!fullName || !email) {
    return res.status(400).json({ message: 'fullName and email are required' });
  }

  try {
    const existing = await pool.query('SELECT user_id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, department, is_email_verified, is_super_admin, must_change_password)
       VALUES ($1, $2, $3, $4, 'admin', $5, TRUE, $6, TRUE)
       RETURNING user_id, full_name, email, phone, role, department, is_super_admin, created_at`,
      [fullName, email.toLowerCase(), phone || null, passwordHash, department || null, !!isSuperAdmin]
    );

    await logAction({
      userId: req.user.userId,
      action: 'create_staff',
      entityType: 'user',
      entityId: result.rows[0].user_id,
      details: { email: result.rows[0].email, isSuperAdmin: !!isSuperAdmin },
    });

    await sendStaffWelcomeEmail(result.rows[0].email, result.rows[0].full_name, tempPassword);

    return res.status(201).json({
      message: `Staff account created. Login credentials were emailed to ${result.rows[0].email}.`,
      user: result.rows[0],
    });
  } catch (err) {
    console.error('Create staff error:', err);
    return res.status(500).json({ message: 'Could not create staff account' });
  }
}

/** PATCH /api/admin/staff/:id/deactivate - super-admin only (FR7.1) */
async function deactivateStaff(req, res) {
  const { id } = req.params;
  if (Number(id) === req.user.userId) {
    return res.status(400).json({ message: 'You cannot deactivate your own account' });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET is_active = FALSE WHERE user_id = $1 AND role = 'admin' RETURNING user_id, full_name, is_active`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Administrator not found' });

    await logAction({ userId: req.user.userId, action: 'deactivate_staff', entityType: 'user', entityId: Number(id) });
    return res.json({ message: 'Administrator deactivated', user: result.rows[0] });
  } catch (err) {
    console.error('Deactivate staff error:', err);
    return res.status(500).json({ message: 'Could not deactivate administrator' });
  }
}

/** PATCH /api/admin/staff/:id/reactivate - super-admin only (FR7.1) */
async function reactivateStaff(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE users SET is_active = TRUE WHERE user_id = $1 AND role = 'admin' RETURNING user_id, full_name, is_active`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Administrator not found' });

    await logAction({ userId: req.user.userId, action: 'reactivate_staff', entityType: 'user', entityId: Number(id) });
    return res.json({ message: 'Administrator reactivated', user: result.rows[0] });
  } catch (err) {
    console.error('Reactivate staff error:', err);
    return res.status(500).json({ message: 'Could not reactivate administrator' });
  }
}

/** DELETE /api/admin/staff/:id - super-admin only (FR7.1) */
async function deleteStaff(req, res) {
  const { id } = req.params;
  if (Number(id) === req.user.userId) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }

  try {
    const result = await pool.query(`DELETE FROM users WHERE user_id = $1 AND role = 'admin' RETURNING user_id, full_name`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Administrator not found' });

    await logAction({ userId: req.user.userId, action: 'delete_staff', entityType: 'user', entityId: Number(id), details: { name: result.rows[0].full_name } });
    return res.json({ message: 'Administrator deleted' });
  } catch (err) {
    console.error('Delete staff error:', err);
    return res.status(500).json({ message: 'Could not delete administrator' });
  }
}

/** PATCH /api/admin/staff/:id/permissions  { isSuperAdmin } - super-admin only (FR7.1 "assign role-based access permissions") */
async function updateStaffPermissions(req, res) {
  const { id } = req.params;
  const { isSuperAdmin } = req.body;

  if (Number(id) === req.user.userId && isSuperAdmin === false) {
    return res.status(400).json({ message: 'You cannot remove your own super-administrator privileges' });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET is_super_admin = $1 WHERE user_id = $2 AND role = 'admin' RETURNING user_id, full_name, is_super_admin`,
      [!!isSuperAdmin, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Administrator not found' });

    await logAction({ userId: req.user.userId, action: 'update_staff_permissions', entityType: 'user', entityId: Number(id), details: { isSuperAdmin: !!isSuperAdmin } });
    return res.json({ message: 'Permissions updated', user: result.rows[0] });
  } catch (err) {
    console.error('Update staff permissions error:', err);
    return res.status(500).json({ message: 'Could not update permissions' });
  }
}

/** GET /api/admin/audit-logs - super-admin only (NFR12) */
async function getAuditLogs(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  try {
    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM audit_logs');
    const total = countResult.rows[0].total;

    const result = await pool.query(
      `SELECT al.*, u.full_name AS user_name
       FROM audit_logs al LEFT JOIN users u ON u.user_id = al.user_id
       ORDER BY al.created_at DESC LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );

    return res.json({
      logs: result.rows,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  } catch (err) {
    console.error('Get audit logs error:', err);
    return res.status(500).json({ message: 'Could not fetch audit logs' });
  }
}

/** GET /api/admin/audit-logs/export - super-admin only (NFR12: "exportable by super-administrators") */
async function exportAuditLogs(req, res) {
  try {
    const result = await pool.query(
      `SELECT al.*, u.full_name AS user_name
       FROM audit_logs al LEFT JOIN users u ON u.user_id = al.user_id
       ORDER BY al.created_at DESC`
    );

    const csv = toCsv(result.rows, [
      { label: 'Log ID', value: 'log_id' },
      { label: 'Timestamp', value: (r) => new Date(r.created_at).toISOString() },
      { label: 'User', value: (r) => r.user_name || `User #${r.user_id || 'unknown'}` },
      { label: 'Action', value: 'action' },
      { label: 'Entity Type', value: 'entity_type' },
      { label: 'Entity ID', value: 'entity_id' },
      { label: 'Details', value: (r) => (r.details ? JSON.stringify(r.details) : '') },
    ]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="smartinfra-audit-log.csv"');
    return res.send(csv);
  } catch (err) {
    console.error('Export audit logs error:', err);
    return res.status(500).json({ message: 'Could not export audit logs' });
  }
}

module.exports = {
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
  VALID_STATUSES,
};