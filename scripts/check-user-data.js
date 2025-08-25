#!/usr/bin/env node
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

// Configure WebSocket
neonConfig.webSocketConstructor = ws;

async function checkUserData() {
  try {
    console.log('🔍 Checking user data in production database...\n');
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    // Check users table
    console.log('📊 USERS TABLE DATA:');
    console.log('─'.repeat(60));
    const usersResult = await pool.query(`
      SELECT id, email, first_name, last_name, role_id, team_id, mass_access 
      FROM users 
      ORDER BY id 
      LIMIT 20
    `);
    
    for (const user of usersResult.rows) {
      console.log(`ID: ${user.id} | Email: ${user.email} | Name: ${user.first_name} ${user.last_name || ''} | Role: ${user.role_id || 'N/A'} | Team: ${user.team_id || 'N/A'}`);
    }
    console.log(`\nTotal users: ${usersResult.rowCount} (showing first 20)`);

    // Check creators table
    console.log('\n📊 CREATORS TABLE DATA:');
    console.log('─'.repeat(60));
    const creatorsResult = await pool.query(`
      SELECT id, username, created_at 
      FROM creators 
      ORDER BY id 
      LIMIT 20
    `);
    
    for (const creator of creatorsResult.rows) {
      console.log(`ID: ${creator.id} | Username: ${creator.username} | Created: ${new Date(creator.created_at).toLocaleDateString()}`);
    }
    console.log(`\nTotal creators: ${creatorsResult.rowCount} (showing first 20)`);

    // Check creator_logins table
    console.log('\n📊 CREATOR LOGINS TABLE:');
    console.log('─'.repeat(60));
    const loginsResult = await pool.query(`
      SELECT cl.id, cl.username, cl.creator_id, c.username as creator_username
      FROM creator_logins cl
      LEFT JOIN creators c ON cl.creator_id = c.id
      ORDER BY cl.id
      LIMIT 20
    `);
    
    for (const login of loginsResult.rows) {
      console.log(`Login: ${login.username} | Creator: ${login.creator_username || 'N/A'}`);
    }
    console.log(`\nTotal creator logins: ${loginsResult.rowCount} (showing first 20)`);

    // Check for specific test users
    console.log('\n🔍 Checking for common test accounts:');
    console.log('─'.repeat(60));
    
    // Check for carter@tastyyyy.com
    const carterResult = await pool.query(`
      SELECT email, first_name, last_name 
      FROM users 
      WHERE email = 'carter@tastyyyy.com'
    `);
    if (carterResult.rows.length > 0) {
      console.log(`✅ Found user: carter@tastyyyy.com (${carterResult.rows[0].first_name} ${carterResult.rows[0].last_name})`);
    } else {
      console.log(`❌ User carter@tastyyyy.com not found`);
    }

    // Check content data
    console.log('\n📊 CONTENT DATA SUMMARY:');
    console.log('─'.repeat(60));
    const contentStats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM content_inspiration_pages) as pages,
        (SELECT COUNT(*) FROM content_inspiration_items) as items,
        (SELECT COUNT(*) FROM group_chats) as chats,
        (SELECT COUNT(*) FROM calendar_events) as events,
        (SELECT COUNT(*) FROM priority_content) as priority_content,
        (SELECT COUNT(*) FROM content_trips) as trips
    `);
    
    const stats = contentStats.rows[0];
    console.log(`Content Pages: ${stats.pages}`);
    console.log(`Content Items: ${stats.items}`);
    console.log(`Group Chats: ${stats.chats}`);
    console.log(`Calendar Events: ${stats.events}`);
    console.log(`Priority Content: ${stats.priority_content}`);
    console.log(`Content Trips: ${stats.trips}`);

    await pool.end();
    console.log('\n🎉 Data check complete!');
    
  } catch (error) {
    console.error('❌ Data check failed:', error);
    process.exit(1);
  }
}

// Run the check
checkUserData();