const { drizzle } = require('drizzle-orm/neon-serverless');
const { Pool } = require('@neondatabase/serverless');
const { users, roles, userRoles } = require('../shared/schema');
const bcrypt = require('bcryptjs');
const { eq } = require('drizzle-orm');

const productionDbUrl = 'postgresql://neondb_owner:npg_UJ4yZBmTqD8l@ep-blue-pond-adiusq82.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function createAdminAccount() {
  console.log('Connecting to production database...');
  const pool = new Pool({ connectionString: productionDbUrl });
  const db = drizzle(pool);

  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash('TastyAdmin123!', 10);
    
    console.log('Creating admin user carter@tastyyyy.com...');
    const [adminUser] = await db.insert(users).values({
      email: 'carter@tastyyyy.com',
      password: hashedPassword,
      name: 'Carter Admin',
      role: 'admin',
      created_at: new Date(),
      is_mass_access: true,
      is_active: true
    }).returning();

    console.log('Admin user created with ID:', adminUser.id);

    // Check if admin role exists
    const existingRoles = await db.select().from(roles).where(eq(roles.name, 'Admin'));
    
    let adminRole;
    if (existingRoles.length === 0) {
      // Create admin role if it doesn't exist
      console.log('Creating Admin role...');
      [adminRole] = await db.insert(roles).values({
        name: 'Admin',
        description: 'Full system administrator access',
        permissions: {
          all: true,
          crm_access: true,
          employee_management: true,
          content_management: true,
          financial_management: true,
          team_management: true
        },
        created_at: new Date()
      }).returning();
    } else {
      adminRole = existingRoles[0];
    }

    // Assign admin role to user
    console.log('Assigning Admin role to user...');
    await db.insert(userRoles).values({
      user_id: adminUser.id,
      role_id: adminRole.id,
      assigned_at: new Date()
    });

    console.log('✅ Admin account created successfully!');
    console.log('Email: carter@tastyyyy.com');
    console.log('Password: TastyAdmin123!');
    console.log('Role: Admin (with mass access)');
    
    await pool.end();
  } catch (error) {
    console.error('Error creating admin account:', error);
    await pool.end();
    process.exit(1);
  }
}

createAdminAccount();