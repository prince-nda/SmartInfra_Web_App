const { Pool } = require('pg');
require('dotenv').config();


const useSsl = !!process.env.DATABASE_URL || process.env.NODE_ENV === 'production';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    })
  : new Pool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    });

pool.connect()
  .then((client) => {
    console.log('PostgreSQL connected successfully');
    client.release();
  })
  .catch((err) => console.error('Database connection error:', err));

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error on idle client:', err);
});

module.exports = pool;