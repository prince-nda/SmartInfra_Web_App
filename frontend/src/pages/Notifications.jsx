import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMyNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications';
import './Dashboard.css';
import './Notifications.css';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyNotifications().then(setNotifications).finally(() => setLoading(false));
  }, []);

  async function handleClick(n) {
    if (!n.is_read) {
      await markNotificationRead(n.notification_id);
      setNotifications((prev) => prev.map((x) => (x.notification_id === n.notification_id ? { ...x, is_read: true } : x)));
    }
    if (n.report_id) navigate(`/reports/${n.report_id}`);
  }

  async function handleMarkAll() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="container page" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>Updates on reports you've submitted.</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-secondary" onClick={handleMarkAll}>Mark all as read</button>
        )}
      </div>

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : notifications.length === 0 ? (
        <div className="page-empty card" style={{ padding: 'var(--space-7)' }}>
          Nothing here yet. You'll hear from us as soon as there's an update.
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map((n) => (
            <div
              key={n.notification_id}
              className={`card notification-item ${n.is_read ? 'read' : 'unread'}`}
              onClick={() => handleClick(n)}
            >
              <span className="notification-dot" />
              <div className="notification-body">
                <p>{n.message}</p>
                <span>{new Date(n.date_sent).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
