const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const bcrypt = require('bcrypt');

async function initDatabase() {
  try {
    console.log('Initializing database...');
    
    // Read and execute schema
    const schema = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
    await pool.query(schema);
    
    // Create default admin with hashed password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (username, password, full_name, email, role) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (username) DO NOTHING`,
      ['admin', hashedPassword, 'System Admin', 'admin@ticketing.local', 'admin']
    );
    
    console.log('Database initialized successfully!');
    console.log('Default admin credentials:');
    console.log('Username: admin');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  }
}

initDatabase();
