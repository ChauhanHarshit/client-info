#!/usr/bin/env node
import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

// Configure WebSocket
neonConfig.webSocketConstructor = ws;

async function resetPassword() {
  try {
    const email = process.argv[2];
    const newPassword = process.argv[3];
    
    if (!email || !newPassword) {
      console.log('Usage: node scripts/reset-user-password.js <email> <new-password>');
      console.log('Example: node scripts/reset-user-password.js carter@tastyyyy.com newpassword123');
      process.exit(1);
    }

    console.log(`🔐 Resetting password for: ${email}`);
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`✅ Found user: ${user.first_name} ${user.last_name}`);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2',
      [hashedPassword, email]
    );

    console.log(`✅ Password updated successfully!`);
    console.log(`\n📝 New login credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`\n🔐 Remember to keep this password secure!`);

    await pool.end();
    
  } catch (error) {
    console.error('❌ Password reset failed:', error);
    process.exit(1);
  }
}

// Run the reset
resetPassword();