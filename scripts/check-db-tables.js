#!/usr/bin/env node
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

// Configure WebSocket
neonConfig.webSocketConstructor = ws;

async function checkDatabaseTables() {
  try {
    console.log('🔍 Checking database tables...\n');
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    // Query to get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('📊 Tables found in database:');
    console.log('─'.repeat(40));
    
    for (const row of tablesResult.rows) {
      // Get row count for each table
      const countResult = await pool.query(`SELECT COUNT(*) FROM ${row.table_name}`);
      const count = countResult.rows[0].count;
      console.log(`✅ ${row.table_name.padEnd(30)} (${count} rows)`);
    }

    console.log('─'.repeat(40));
    console.log(`\n✅ Total tables: ${tablesResult.rows.length}`);

    // Check specific critical tables
    const criticalTables = ['users', 'creators', 'creator_logins'];
    console.log('\n🔍 Checking critical tables:');
    
    for (const tableName of criticalTables) {
      const exists = tablesResult.rows.some(row => row.table_name === tableName);
      if (exists) {
        console.log(`✅ ${tableName} exists`);
      } else {
        console.log(`❌ ${tableName} is MISSING`);
      }
    }

    await pool.end();
    console.log('\n🎉 Database check complete!');
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
    process.exit(1);
  }
}

// Run the check
checkDatabaseTables();