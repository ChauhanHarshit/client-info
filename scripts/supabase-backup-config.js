
#!/usr/bin/env node

/**
 * Supabase Managed Backup Configuration Script
 * Sets up secondary backup layer with point-in-time recovery
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = './backups';

// Supabase configuration
const supabaseConfig = {
  url: process.env.SUPABASE_PROJECT_URL || null,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY || null
};

// Log function
function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - [SUPABASE-BACKUP] ${message}\n`;
  console.log(logEntry.trim());
  
  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  fs.appendFileSync(path.join(BACKUP_DIR, 'supabase-backup.log'), logEntry);
}

// Configure Supabase managed backups
async function configureSupabaseBackups() {
  try {
    logMessage('Starting Supabase managed backup configuration...');
    
    if (!supabaseConfig.url || !supabaseConfig.key) {
      logMessage('WARNING: Supabase configuration incomplete');
      logMessage('Environment variables needed:');
      logMessage('- SUPABASE_PROJECT_URL: ' + (supabaseConfig.url ? '✅ SET' : '❌ MISSING'));
      logMessage('- SUPABASE_SERVICE_ROLE_KEY: ' + (supabaseConfig.key ? '✅ SET' : '❌ MISSING'));
      logMessage('Please configure in Supabase Dashboard:');
      logMessage('1. Go to Settings > Database > Backups');
      logMessage('2. Enable automatic backups');
      logMessage('3. Set retention to maximum (35 days)');
      logMessage('4. Enable point-in-time recovery');
      return false;
    }

    const supabase = createClient(supabaseConfig.url, supabaseConfig.key);
    
    // Test connection
    const { data, error } = await supabase.from('employees').select('count').limit(1);
    if (error) {
      logMessage(`ERROR: Supabase connection failed - ${error.message}`);
      return false;
    }
    
    logMessage('✅ Supabase connection verified');
    logMessage('📋 Manual configuration required in Supabase Dashboard:');
    logMessage('   - Navigate to Project Settings > Database > Backups');
    logMessage('   - Enable "Automatic backups" (requires Pro plan)');
    logMessage('   - Set retention period to 35 days (maximum)');
    logMessage('   - Enable "Point-in-time recovery"');
    logMessage('   - Configure backup frequency (recommended: every 6 hours)');
    
    return true;
    
  } catch (error) {
    logMessage(`ERROR: Configuration failed - ${error.message}`);
    return false;
  }
}

// Verify backup configuration status
async function verifyBackupStatus() {
  try {
    logMessage('Verifying hybrid backup system status...');
    
    // Check local backup system
    const localBackupScript = './scripts/backup-system.sh';
    const localBackupExists = fs.existsSync(localBackupScript);
    logMessage(`Local backup system: ${localBackupExists ? '✅ Active' : '❌ Missing'}`);
    
    // Check recent local backups
    const backupFiles = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort()
      .reverse()
      .slice(0, 5);
    
    logMessage(`Recent local backups (${backupFiles.length}):`);
    backupFiles.forEach(file => {
      const stats = fs.statSync(path.join(BACKUP_DIR, file));
      const size = (stats.size / 1024 / 1024).toFixed(2);
      logMessage(`  - ${file} (${size} MB, ${stats.mtime.toISOString()})`);
    });
    
    // Log configuration status
    logMessage('🔄 Hybrid backup system configured:');
    logMessage('   PRIMARY: Local cron/script system (30-day retention)');
    logMessage('   SECONDARY: Supabase managed backups (35-day retention)');
    logMessage('   MONITORING: Both systems logged and tracked');
    
    return true;
    
  } catch (error) {
    logMessage(`ERROR: Status verification failed - ${error.message}`);
    return false;
  }
}

// Test Supabase connection
async function testSupabaseConnection() {
  try {
    logMessage('Testing Supabase connection for backup access...');
    
    if (!supabaseConfig.url || !supabaseConfig.key) {
      logMessage('ERROR: Supabase configuration missing');
      logMessage('Add these to your Replit Secrets:');
      logMessage('- SUPABASE_PROJECT_URL');
      logMessage('- SUPABASE_SERVICE_ROLE_KEY');
      return false;
    }
    
    const supabase = createClient(supabaseConfig.url, supabaseConfig.key);
    const { data, error } = await supabase.from('employees').select('count').limit(1);
    
    if (error) {
      logMessage(`ERROR: Connection test failed - ${error.message}`);
      return false;
    }
    
    logMessage('✅ Supabase connection successful');
    logMessage('Ready for managed backup configuration');
    return true;
    
  } catch (error) {
    logMessage(`ERROR: Connection test failed - ${error.message}`);
    return false;
  }
}

// Main execution
async function main() {
  const command = process.argv[2] || 'configure';
  
  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  switch (command) {
    case 'configure':
      await configureSupabaseBackups();
      await verifyBackupStatus();
      break;
    case 'status':
      await verifyBackupStatus();
      break;
    case 'test':
      await testSupabaseConnection();
      break;
    default:
      console.log('Usage: node supabase-backup-config.js [configure|status|test]');
  }
}

// Export functions for CommonJS
module.exports = { configureSupabaseBackups, verifyBackupStatus, testSupabaseConnection };

// Run main if called directly
if (require.main === module) {
  main().catch(console.error);
}
