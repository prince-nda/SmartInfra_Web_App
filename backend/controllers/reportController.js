const pool = require('../config/db');
const { uploadAllToCloudinary, MAX_IMAGES_PER_REPORT } = require('../middleware/multer_image');
const { notifyReportSubmitted } = require('./notificationController');

const VALID_CATEGORIES = [
  'pothole',
  'broken_streetlight',
  'water_leak',
  'damaged_road',
  'illegal_waste_dumping',
  'other',
];

/**
 * POST /api/reports
 * Citizen submits a new issue report. Images are optional but capped at 3
 */
async function createReport(req, res) {
  const { category, description, gpsLat, gpsLong, locationText } = req.body;

  if (!category || !description) {
    return res.status(400).json({ message: 'Category and description are required' });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reportResult = await client.query(
      `INSERT INTO issue_reports (citizen_id, category, description, gps_lat, gps_long, location_text)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.userId, category, description, gpsLat || null, gpsLong || null, locationText || null]
    );
    const report = reportResult.rows[0];

    let images = [];
    if (req.files && req.files.length > 0) {
      const uploaded = await uploadAllToCloudinary(req.files);
      const insertPromises = uploaded.map(({ url, publicId }) =>
        client.query(
          `INSERT INTO report_images (report_id, file_url, cloudinary_public_id)
           VALUES ($1, $2, $3) RETURNING *`,
          [report.report_id, url, publicId]
        )
      );
      const inserted = await Promise.all(insertPromises);
      images = inserted.map((r) => r.rows[0]);
    }

    await client.query('COMMIT');

    // Notification is sent after commit so a failed email/SMS never rolls back the report
    const citizenResult = await pool.query('SELECT full_name, phone FROM users WHERE user_id = $1', [req.user.userId]);
    const citizen = citizenResult.rows[0];

    await notifyReportSubmitted({
      citizenId: req.user.userId,
      citizenEmail: req.user.email,
      citizenName: citizen?.full_name || 'there',
      citizenPhone: citizen?.phone,
      reportId: report.report_id,
    });

    return res.status(201).json({
      message: 'Report submitted successfully',
      report: { ...report, images },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create report error:', err);
    return res.status(500).json({ message: 'Could not submit report' });
  } finally {
    client.release();
  }
}

/** GET /api/reports/mine  - citizen's own reports, with optional filters */
async function getMyReports(req, res) {
  const { status, category } = req.query;
  const conditions = ['citizen_id = $1'];
  const params = [req.user.userId];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (category) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }

  try {
    const result = await pool.query(
      `SELECT r.*, COALESCE(
         (SELECT json_agg(i.*) FROM report_images i WHERE i.report_id = r.report_id), '[]'
       ) AS images
       FROM issue_reports r
       WHERE ${conditions.join(' AND ')}
       ORDER BY r.date_submitted DESC`,
      params
    );
    return res.json({ reports: result.rows });
  } catch (err) {
    console.error('Get my reports error:', err);
    return res.status(500).json({ message: 'Could not fetch your reports' });
  }
}

/** GET /api/reports/:id  - single report; citizen can only view their own, admin can view any */
async function getReportById(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT r.*, COALESCE(
         (SELECT json_agg(i.*) FROM report_images i WHERE i.report_id = r.report_id), '[]'
       ) AS images
       FROM issue_reports r WHERE r.report_id = $1`,
      [id]
    );
    const report = result.rows[0];
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    if (req.user.role !== 'admin' && report.citizen_id !== req.user.userId) {
      return res.status(403).json({ message: 'You do not have access to this report' });
    }

    // Internal notes are an admin-only view (FR5.3) - never sent to citizens
    if (req.user.role === 'admin') {
      const notesResult = await pool.query(
        `SELECT n.*, u.full_name AS admin_name FROM report_notes n
         LEFT JOIN users u ON u.user_id = n.admin_id
         WHERE n.report_id = $1 ORDER BY n.created_at DESC`,
        [id]
      );
      report.notes = notesResult.rows;
    }

    return res.json({ report });
  } catch (err) {
    console.error('Get report by id error:', err);
    return res.status(500).json({ message: 'Could not fetch report' });
  }
}

module.exports = { createReport, getMyReports, getReportById, VALID_CATEGORIES, MAX_IMAGES_PER_REPORT };