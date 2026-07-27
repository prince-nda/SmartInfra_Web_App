/**
 * forced-password-change flow for admin-created staff accounts.
 */
const pool = require('../config/db');
require('dotenv').config();

async function run() {
  console.log('Applying migration (no tables dropped)...');
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;`);
  console.log('Migration applied successfully.');
  await pool.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});