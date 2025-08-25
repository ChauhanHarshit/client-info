#!/usr/bin/env node
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

// Configure WebSocket
neonConfig.webSocketConstructor = ws;

async function initDatabase() {
  try {
    console.log('🚀 Initializing production database...');
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    console.log('📦 Creating database schema...');
    
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');
    
    // Create tables using raw SQL since drizzle-kit push is interactive
    const createTablesSQL = `
      -- Create users table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        password VARCHAR(255) NOT NULL,
        role_id INTEGER,
        team_id INTEGER,
        mass_access BOOLEAN DEFAULT false,
        profile_image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create creators table
      CREATE TABLE IF NOT EXISTS creators (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        profile_image_url TEXT,
        bio TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create creator_logins table
      CREATE TABLE IF NOT EXISTS creator_logins (
        id SERIAL PRIMARY KEY,
        creator_id INTEGER REFERENCES creators(id) ON DELETE CASCADE,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        plain_password VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create teams table
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create roles table
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        permissions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create content_inspiration_pages table
      CREATE TABLE IF NOT EXISTS content_inspiration_pages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        platform VARCHAR(255),
        page_type VARCHAR(50) DEFAULT 'feed',
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create content_inspiration_items table
      CREATE TABLE IF NOT EXISTS content_inspiration_items (
        id SERIAL PRIMARY KEY,
        page_id INTEGER REFERENCES content_inspiration_pages(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        instructions TEXT,
        fileUrl TEXT,
        thumbnailUrl TEXT,
        type VARCHAR(50),
        hashtags VARCHAR(255),
        mediaUrls TEXT,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create creator_engagements table
      CREATE TABLE IF NOT EXISTS creator_engagements (
        id SERIAL PRIMARY KEY,
        creator_id INTEGER REFERENCES creators(id) ON DELETE CASCADE,
        content_id INTEGER REFERENCES content_inspiration_items(id) ON DELETE CASCADE,
        is_liked BOOLEAN DEFAULT false,
        is_dismissed BOOLEAN DEFAULT false,
        is_bookmarked BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(creator_id, content_id)
      );

      -- Create group_chats table
      CREATE TABLE IF NOT EXISTS group_chats (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create group_chat_messages table
      CREATE TABLE IF NOT EXISTS group_chat_messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER REFERENCES group_chats(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES creators(id) ON DELETE CASCADE,
        sender_name VARCHAR(255),
        sender_profile_image VARCHAR(255),
        message TEXT,
        messageType VARCHAR(50) DEFAULT 'text',
        mediaUrl TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create group_chat_members table
      CREATE TABLE IF NOT EXISTS group_chat_members (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER REFERENCES group_chats(id) ON DELETE CASCADE,
        creator_id INTEGER REFERENCES creators(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(chat_id, creator_id)
      );

      -- Create calendar_events table
      CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50),
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP,
        all_day BOOLEAN DEFAULT false,
        assigned_creator_ids TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create priority_content table
      CREATE TABLE IF NOT EXISTS priority_content (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        creator_id INTEGER REFERENCES creators(id),
        description TEXT,
        content_type VARCHAR(50),
        file_url TEXT,
        public_token VARCHAR(255) UNIQUE,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create more tables as needed...
      -- Add indexes for performance
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_creators_username ON creators(username);
      CREATE INDEX IF NOT EXISTS idx_creator_logins_username ON creator_logins(username);
      CREATE INDEX IF NOT EXISTS idx_content_items_page_id ON content_inspiration_items(page_id);
      CREATE INDEX IF NOT EXISTS idx_engagements_creator_content ON creator_engagements(creator_id, content_id);
    `;

    // Execute table creation
    await pool.query(createTablesSQL);
    console.log('✅ All tables created successfully');

    // Check if users exist
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`📊 Current user count: ${userCount.rows[0].count}`);

    await pool.end();
    console.log('🎉 Database initialization complete!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run the initialization
initDatabase();