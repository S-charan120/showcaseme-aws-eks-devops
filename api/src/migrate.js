const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool } = require('pg');

async function migrate(pool) {
  const directory = path.join(__dirname, '..', 'migrations');
  const files = (await fs.readdir(directory)).filter(name => name.endsWith('.sql')).sort();
  const client = await pool.connect();
  try {
    // A session-level advisory lock prevents two replicas from applying the same migration concurrently.
    await client.query('SELECT pg_advisory_lock(424242, 1)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
    for (const name of files) {
      const exists = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
      if (exists.rowCount) continue;
      const sql = await fs.readFile(path.join(directory, name), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    try { await client.query('SELECT pg_advisory_unlock(424242, 1)'); } finally { client.release(); }
  }
}

if (require.main === module) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  migrate(pool).then(() => pool.end()).catch(async error => { console.error(error); await pool.end(); process.exit(1); });
}
module.exports = { migrate };
