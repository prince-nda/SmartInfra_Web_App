-- =========================================================
-- SmartInfra: Smart Infrastructure Reporting System
-- PostgreSQL Schema
-- =========================================================

-- Clean (re)start in dev environments
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS report_notes CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS report_images CASCADE;
DROP TABLE IF EXISTS issue_reports CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS email_verification_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS report_category CASCADE;
DROP TYPE IF EXISTS report_status CASCADE;

-- =========================================================
-- Enumerations
-- =========================================================
CREATE TYPE user_role AS ENUM ('citizen', 'admin');

CREATE TYPE report_category AS ENUM (
  'pothole',
  'broken_streetlight',
  'water_leak',
  'damaged_road',
  'illegal_waste_dumping',
  'other'
);

CREATE TYPE report_status AS ENUM (
  'submitted',
  'in_progress',
  'resolved',
  'rejected'
);

-- =========================================================
-- USERS  (single-table inheritance for Citizen / Administrator)
-- Shared attrs: userId, fullName, email, phone, passwordHash
-- Citizen-only: nationalIdNo, district
-- Administrator-only: staffId, department
-- =========================================================
CREATE TABLE users (
  user_id           SERIAL PRIMARY KEY,
  full_name         VARCHAR(150) NOT NULL,
  email             VARCHAR(150) NOT NULL UNIQUE,
  phone             VARCHAR(30),
  password_hash     TEXT NOT NULL,
  role              user_role NOT NULL DEFAULT 'citizen',

  -- Citizen-specific
  national_id_no    VARCHAR(30),
  district          VARCHAR(100),

  -- Administrator-specific
  staff_id          VARCHAR(30),
  department        VARCHAR(100),

  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  is_super_admin    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =========================================================
-- EMAIL VERIFICATION TOKENS
-- =========================================================
CREATE TABLE email_verification_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evt_user ON email_verification_tokens(user_id);

-- =========================================================
-- PASSWORD RESET TOKENS
-- =========================================================
CREATE TABLE password_reset_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens(user_id);

-- =========================================================
-- ISSUE REPORTS
-- Central entity: reportId, category, description, gpsLat, gpsLong,
-- status, dateSubmitted
-- =========================================================
CREATE TABLE issue_reports (
  report_id         SERIAL PRIMARY KEY,
  citizen_id        INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  category          report_category NOT NULL,
  description       TEXT NOT NULL,
  gps_lat           DOUBLE PRECISION,
  gps_long          DOUBLE PRECISION,
  location_text     VARCHAR(255),
  status            report_status NOT NULL DEFAULT 'submitted',
  assigned_staff_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  date_submitted    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_citizen ON issue_reports(citizen_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON issue_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON issue_reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_assigned ON issue_reports(assigned_staff_id);

-- =========================================================
-- REPORT IMAGES  (composition, max 3 per report enforced in app layer)
-- =========================================================
CREATE TABLE report_images (
  image_id     SERIAL PRIMARY KEY,
  report_id    INTEGER NOT NULL REFERENCES issue_reports(report_id) ON DELETE CASCADE,
  file_url     TEXT NOT NULL,
  cloudinary_public_id TEXT,
  upload_date  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_images_report ON report_images(report_id);

-- =========================================================
-- REPORT NOTES (FR5.3 - admin internal notes documenting actions taken;
-- append-only history, never shown to citizens)
-- =========================================================
CREATE TABLE report_notes (
  note_id    SERIAL PRIMARY KEY,
  report_id  INTEGER NOT NULL REFERENCES issue_reports(report_id) ON DELETE CASCADE,
  admin_id   INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  note       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_report ON report_notes(report_id);

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
CREATE TABLE notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  report_id       INTEGER REFERENCES issue_reports(report_id) ON DELETE CASCADE,
  message         TEXT NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  date_sent       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- =========================================================
-- AUDIT LOGS (component diagram: DB stores users, reports, audit logs)
-- =========================================================
CREATE TABLE audit_logs (
  log_id      SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   INTEGER,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- =========================================================
-- Trigger: keep updated_at fresh on users / issue_reports
-- =========================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_reports_updated_at ON issue_reports;
CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON issue_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

