const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
require('dotenv').config();

async function run() {
  const schemaSql = fs.readFileSync(path.join(__dirname, '../database_schema.sql'), 'utf8');

  console.log('Applying schema...');
  await pool.query(schemaSql);

  console.log('Done. Schema applied. No default admin was seeded - create one manually or use your existing admin account.');
  await pool.end();
}

run().catch((err) => {
  console.error('DB init failed:', err);
  process.exit(1);
});