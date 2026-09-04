const { Pool } = require('pg');

// Funciona com qualquer Postgres gerenciado (Neon, Supabase, Render, etc.)
// desde que DATABASE_URL esteja configurada no .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
});

module.exports = pool;
