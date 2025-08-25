#!/usr/bin/env node
import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

// Configure WebSocket
neonConfig.webSocketConstructor = ws;

async function createProductionUser() {
  try {
    console.log('🔐 Creating carter@tastyyyy.com in production database...');
    
    const databaseUrl = process.argv[2] || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL must be provided as argument or environment variable');
    }

    const pool = new Pool({ connectionString: databaseUrl });

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['carter@tastyyyy.com']
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️  User carter@tastyyyy.com already exists, updating password...');
      
      // Update existing user
      const hashedPassword = await bcrypt.hash('TastyAdmin123!', 10);
      await pool.query(
        'UPDATE users SET password = $1 WHERE email = $2',
        [hashedPassword, 'carter@tastyyyy.com']
      );
      
    } else {
      console.log('✨ Creating new user carter@tastyyyy.com...');
      
      // Create new user
      const hashedPassword = await bcrypt.hash('TastyAdmin123!', 10);
      
      await pool.query(`
        INSERT INTO users (
          id, 
          email, 
          password, 
          first_name, 
          last_name, 
          role_id, 
          mass_access,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
        )
      `, [
        '9ca0121c-207e-49b2-98c3-01aa5c1375c0', // Same ID as dev
        'carter@tastyyyy.com',
        hashedPassword,
        'Carter',
        'Jamison',
        1, // Admin role
        true // Mass access
      ]);
    }

    console.log(`✅ Success! Login credentials:`);
    console.log(`   Email: carter@tastyyyy.com`);
    console.log(`   Password: TastyAdmin123!`);
    
    // Verify the user was created
    const verifyResult = await pool.query(
      'SELECT email, first_name, last_name, role_id, mass_access FROM users WHERE email = $1',
      ['carter@tastyyyy.com']
    );
    
    if (verifyResult.rows.length > 0) {
      const user = verifyResult.rows[0];
      console.log(`\n📝 User details:`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Role ID: ${user.role_id}`);
      console.log(`   Mass Access: ${user.mass_access}`);
    }

    await pool.end();
    
  } catch (error) {
    console.error('❌ Failed to create user:', error);
    process.exit(1);
  }
}

// Run the script
createProductionUser();