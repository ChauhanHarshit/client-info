#!/usr/bin/env node
import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

// Configure WebSocket
neonConfig.webSocketConstructor = ws;

async function seedProductionData() {
  try {
    console.log('🌱 Seeding production database...');
    
    const databaseUrl = process.argv[2] || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL must be provided');
    }

    const pool = new Pool({ connectionString: databaseUrl });

    // Check what columns exist in roles table
    const rolesCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'roles'
    `);
    console.log('Roles table columns:', rolesCheck.rows.map(r => r.column_name));

    // Insert minimal roles data
    await pool.query(`
      INSERT INTO roles (id, name) 
      VALUES 
        (1, 'admin'),
        (2, 'manager'),
        (3, 'team_lead'),
        (4, 'employee')
      ON CONFLICT (id) DO NOTHING
    `);
    
    console.log('✅ Roles created');

    // Insert default team with required color
    await pool.query(`
      INSERT INTO teams (id, name, color)
      VALUES (1, 'Default Team', '#4B5563')
      ON CONFLICT (id) DO NOTHING
    `);
    
    console.log('✅ Default team created');

    // Create carter@tastyyyy.com
    console.log('Creating user carter@tastyyyy.com...');
    
    const hashedPassword = await bcrypt.hash('TastyAdmin123!', 10);
    
    // First delete if exists to avoid conflicts
    await pool.query(`DELETE FROM users WHERE email = $1`, ['carter@tastyyyy.com']);
    
    // Insert the user
    await pool.query(`
      INSERT INTO users (
        id, 
        email, 
        password, 
        first_name, 
        last_name, 
        role_id, 
        team_id,
        mass_access
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      )
    `, [
      '9ca0121c-207e-49b2-98c3-01aa5c1375c0',
      'carter@tastyyyy.com',
      hashedPassword,
      'Carter',
      'Jamison',
      1, // Admin role
      1, // Default team
      true // Mass access
    ]);

    console.log(`✅ User created successfully!`);
    console.log(`\n📝 Login credentials for production:`);
    console.log(`   URL: https://tastyyyy.com`);
    console.log(`   Email: carter@tastyyyy.com`);
    console.log(`   Password: TastyAdmin123!`);
    
    // Verify the user was created
    const verifyResult = await pool.query(
      'SELECT email, first_name, last_name FROM users WHERE email = $1',
      ['carter@tastyyyy.com']
    );
    
    console.log(`\n✅ Verified: User exists in production database`);

    await pool.end();
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the script
seedProductionData();