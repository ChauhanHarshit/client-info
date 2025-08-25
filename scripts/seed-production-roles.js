#!/usr/bin/env node
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

// Configure WebSocket
neonConfig.webSocketConstructor = ws;

async function seedProductionRoles() {
  try {
    console.log('🌱 Seeding production database with roles...');
    
    const databaseUrl = process.argv[2] || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL must be provided as argument or environment variable');
    }

    const pool = new Pool({ connectionString: databaseUrl });

    // Insert roles
    await pool.query(`
      INSERT INTO roles (id, name, permissions, created_at, updated_at) 
      VALUES 
        (1, 'admin', '{"*": true}', NOW(), NOW()),
        (2, 'manager', '{"clients": {"view": true, "edit": true}, "teams": {"view": true, "edit": true}}', NOW(), NOW()),
        (3, 'team_lead', '{"clients": {"view": true}, "teams": {"view": true}}', NOW(), NOW()),
        (4, 'employee', '{"clients": {"view": true}}', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);
    
    console.log('✅ Roles seeded successfully');

    // Insert default team
    await pool.query(`
      INSERT INTO teams (id, name, created_at, updated_at)
      VALUES (1, 'Default Team', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);
    
    console.log('✅ Default team created');

    // Now create the user
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['carter@tastyyyy.com']
    );

    if (existingUser.rows.length === 0) {
      console.log('✨ Creating carter@tastyyyy.com...');
      
      const bcrypt = (await import('bcrypt')).default;
      const hashedPassword = await bcrypt.hash('TastyAdmin123!', 10);
      
      await pool.query(`
        INSERT INTO users (
          id, 
          email, 
          password, 
          first_name, 
          last_name, 
          role_id, 
          team_id,
          mass_access,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
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
      console.log(`\n📝 Login credentials:`);
      console.log(`   Email: carter@tastyyyy.com`);
      console.log(`   Password: TastyAdmin123!`);
    }

    await pool.end();
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the script
seedProductionRoles();