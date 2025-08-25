import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import ws from 'ws';

// Configure WebSocket for serverless
const { neonConfig } = await import('@neondatabase/serverless');
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

async function resetAutumnPassword() {
  try {
    // First check if autumn exists
    const checkResult = await pool.query(
      'SELECT id, username FROM creator_logins WHERE username = $1',
      ['autumn']
    );
    
    if (checkResult.rows.length === 0) {
      console.log('No creator login found for username: autumn');
      return;
    }
    
    const creatorLogin = checkResult.rows[0];
    console.log('Found creator login:', creatorLogin.username);
    
    // Hash the new password
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password
    await pool.query(
      'UPDATE creator_logins SET password = $1, plain_password = $2 WHERE id = $3',
      [hashedPassword, newPassword, creatorLogin.id]
    );
    
    console.log('✅ Password reset successfully for autumn');
    console.log('New password: password123');
    
  } catch (error) {
    console.error('Error resetting password:', error.message);
  } finally {
    await pool.end();
  }
}

resetAutumnPassword();