require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool   = require('../config/db');

async function seed() {
  const hash = await bcrypt.hash('admin123', 10);
  await pool.query(
    `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')
     ON DUPLICATE KEY UPDATE password = VALUES(password)`,
    ['Super Admin', 'admin@phonezone.com', hash]
  );
  console.log('✅ Admin seeded — email: admin@phonezone.com  password: admin123');
  process.exit(0);
}
seed().catch(err => { console.error(err); process.exit(1); });
