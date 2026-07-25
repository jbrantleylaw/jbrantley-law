const pool = require('../config/db');

async function log({ event_type, description, matter_id, contact_id, user_id, meta = {} }) {
  try {
    await pool.query(
      `INSERT INTO activity_log (event_type, description, matter_id, contact_id, user_id, meta)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [event_type, description || null, matter_id || null, contact_id || null, user_id || null, JSON.stringify(meta)]
    );
  } catch {}
}

module.exports = { log };
