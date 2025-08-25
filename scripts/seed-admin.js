// Direct database seeding script to create admin user
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function seedAdmin() {
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionLimit: 1
  });

  try {
    const email = 'carter@tastyyyy.com';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log(`Creating admin user: ${email}`);
    
    // First, let's check the table structure
    console.log('Checking table structure...');
    const [tableInfo] = await pool.execute('DESCRIBE users');
    console.log('Users table structure:', tableInfo);
    
    // Check if user already exists
    const [existingUsers] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    
    if (existingUsers.length > 0) {
      console.log('Admin user already exists');
      return;
    }
    
    // Insert admin user with minimal required fields
    console.log('Inserting admin user...');
    await pool.execute(`
      INSERT INTO users (email, password) 
      VALUES (?, ?)
    `, [email, hashedPassword]);
    
    console.log('Admin user created successfully');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    
  } catch (error) {
    console.error('Failed to create admin user:', error);
  } finally {
    await pool.end();
  }
}

seedAdmin();