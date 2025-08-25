const fs = require('fs');
const path = require('path');

// Use ES modules for the migration script
async function runMigration() {
  // Import the migration module
  const migration = await import('./migrate-uploads-to-s3.js');
  
  // The migration will process the remaining files including the monopoly GIF
  console.log('Running migration to upload monopoly GIF...');
}

runMigration().catch(console.error);
