const pool = require('../config/db');
const { sendReportSubmittedEmail, sendStatusUpdateEmail } = require('../utils/email');
const { sendReportSubmittedSms, sendStatusUpdateSms } = require('../utils/sms');

/**
 * Internal helper (not a route): persists an in-app notification row.
 * Called from reportController / adminController whenever a report
 * is created or its status changes.
 */
async function createNotification({ userId, reportId, message }) {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, report_id, message)
     VALUES ($1, $2, $3) RETURNING *`,
    [userId, reportId, message]
  );
  return result.rows[0];
}

/** Fires the in-app notification, confirmation email, and SMS (if a phone is on file) for a new report. */
async function notifyReportSubmitted({ citizenId, citizenEmail, citizenName, citizenPhone, reportId }) {
  const message = `Your report #${reportId} has been received and marked as Submitted.`;
  await createNotification({ userId: citizenId, reportId, message });
  await Promise.all([
    sendReportSubmittedEmail(citizenEmail, citizenName, reportId),
    citizenPhone ? sendReportSubmittedSms(citizenPhone, reportId) : null,
  ]);
}

/** Fires the in-app notification, status-update email, and SMS (if a phone is on file). */
async function notifyStatusUpdate({ citizenId, citizenEmail, citizenName, citizenPhone, reportId, newStatus }) {
  const message = `Your report #${reportId} status changed to "${newStatus}".`;
  await createNotification({ userId: citizenId, reportId, message });
  await Promise.all([
    sendStatusUpdateEmail(citizenEmail, citizenName, reportId, newStatus),
    citizenPhone ? sendStatusUpdateSms(citizenPhone, reportId, newStatus) : null,
  ]);
}

/** GET /api/notifications/mine */
async function getMyNotifications(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY date_sent DESC LIMIT 100`,
      [req.user.userId]
    );
    return res.json({ notifications: result.rows });
  } catch (err) {
    console.error('Get notifications error:', err);
    return res.status(500).json({ message: 'Could not fetch notifications' });
  }
}

/** PATCH /api/notifications/:id/read */
async function markAsRead(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE notification_id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    return res.json({ notification: result.rows[0] });
  } catch (err) {
    console.error('Mark notification read error:', err);
    return res.status(500).json({ message: 'Could not update notification' });
  }
}

/** PATCH /api/notifications/read-all */
async function markAllAsRead(req, res) {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.userId]);
    return res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Mark all notifications read error:', err);
    return res.status(500).json({ message: 'Could not update notifications' });
  }
}

module.exports = {
  createNotification,
  notifyReportSubmitted,
  notifyStatusUpdate,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};