import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

async function checkAutumnPassword() {
  try {
    const result = await pool.query(
      'SELECT username, password, plain_password FROM creator_logins WHERE username = $1',
      ['autumn']
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('Username:', user.username);
      console.log('Password hash exists:', !!user.password);
      console.log('Plain password:', user.plain_password || '[NOT STORED]');
    } else {
      console.log('No creator login found for username: autumn');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAutumnPassword();