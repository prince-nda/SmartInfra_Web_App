const pool = require('../config/db');
require('dotenv').config();

const MIGRATION_SQL = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS report_notes (
  note_id    SERIAL PRIMARY KEY,
  report_id  INTEGER NOT NULL REFERENCES issue_reports(report_id) ON DELETE CASCADE,
  admin_id   INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  note       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_report ON report_notes(report_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
`;

async function run() {
  console.log('Applying non-destructive migration (no tables dropped)...');
  await pool.query(MIGRATION_SQL);
  console.log('Migration applied successfully.');
  console.log('');
  await pool.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});