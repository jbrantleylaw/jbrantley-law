require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./config/db');

async function seed() {
  console.log('Seeding database...');

  const tempHash  = await bcrypt.hash('Welcome1!', 10);
  const staffHash = await bcrypt.hash('JBLaw2024!', 10);

  await pool.query(`
    INSERT INTO users (name, email, password_hash, role, must_change_password)
    VALUES
      ('Jennifer Brantley', 'jbrantley@jenniferbrantleylaw.com', $1, 'attorney', TRUE),
      ('Staff User',        'staff@jbrantleylaw.com',            $2, 'staff',    FALSE)
    ON CONFLICT (email) DO NOTHING
  `, [tempHash, staffHash]);

  console.log('Seed complete.');
  console.log('  Attorney : jbrantley@jenniferbrantleylaw.com / Welcome1!  (must set password on first login)');
  console.log('  Staff    : staff@jbrantleylaw.com            / JBLaw2024!');
  await pool.end();
}

seed().catch((err) => { console.error(err); process.exit(1); });
