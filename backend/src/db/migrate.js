require('dotenv').config();
const pool = require('./pool');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS agency_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name VARCHAR(255) NOT NULL DEFAULT 'Health Scale Digital',
        logo_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT,
        google_id VARCHAR(255),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin','manager','worker','client')),
        photo_url TEXT,
        is_active BOOLEAN DEFAULT true,
        invite_token TEXT,
        invite_token_expires TIMESTAMPTZ,
        reset_token_hash TEXT,
        reset_token_expires TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        logo_url TEXT,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS client_managers (
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        manager_id UUID REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (client_id, manager_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS websites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
        url VARCHAR(500) NOT NULL,
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        channel_category VARCHAR(100),
        platform VARCHAR(100),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS campaign_workers (
        campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
        worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (campaign_id, worker_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        hours NUMERIC(5,2) NOT NULL CHECK (hours >= 0.25 AND hours <= 24),
        description TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS change_log_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('website','campaign')),
        entity_id UUID NOT NULL,
        entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('system','manual')),
        author_id UUID REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(200) NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        body TEXT,
        entity_type VARCHAR(50),
        entity_id UUID,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed agency settings
    await client.query(`
      INSERT INTO agency_settings (company_name)
      SELECT 'Health Scale Digital' WHERE NOT EXISTS (SELECT 1 FROM agency_settings);
    `);

    // Seed super admin
    const { rows } = await client.query(`SELECT id FROM users WHERE role='super_admin' LIMIT 1`);
    if (rows.length === 0) {
      const hash = await bcrypt.hash('Admin@123456', 12);
      await client.query(
        `INSERT INTO users (id,email,password_hash,first_name,last_name,role)
         VALUES ($1,'admin@agency.com',$2,'Super','Admin','super_admin')`,
        [uuidv4(), hash]
      );
      console.log('✅ Seeded super admin: admin@agency.com / Admin@123456');
    }

    await client.query('COMMIT');
    console.log('✅ Migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
