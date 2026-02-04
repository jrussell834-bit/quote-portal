const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

// Determine if we're on Railway (has DATABASE_URL) or local
const isRailway = !!process.env.DATABASE_URL || !!process.env.RAILWAY_ENVIRONMENT;
const needsSSL = isRailway || process.env.PGSSL === 'true';

const pool =
  connectionString != null
    ? new Pool({
        connectionString,
        ssl: needsSSL
          ? { rejectUnauthorized: false }
          : undefined
      })
    : new Pool({
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'quoteportal',
        ssl: needsSSL
          ? { rejectUnauthorized: false }
          : undefined
      });

async function initDb() {
  // Create customers table first
  await pool.query(`
    create table if not exists customers (
      id uuid primary key default gen_random_uuid(),
      name text unique not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await pool.query(`
    create table if not exists quotes (
      id text primary key,
      title text not null,
      client_name text not null,
      customer_id uuid references customers(id) on delete set null,
      value numeric,
      stage text not null,
      last_chased_at timestamptz,
      next_chase_at timestamptz,
      reminder_email text,
      attachment_url text,
      status text,
      notes text,
      created_at timestamptz not null,
      updated_at timestamptz not null
    )
  `);

  // In case the table already existed without the status column, try to add it.
  await pool.query(
    'alter table quotes add column if not exists status text'
  );

  // In case the table already existed without the notes column, try to add it.
  await pool.query(
    'alter table quotes add column if not exists notes text'
  );

  // In case the table already existed without the customer_id column, try to add it.
  // First add the column without constraint
  await pool.query(
    'alter table quotes add column if not exists customer_id uuid'
  );
  
  // Then add the foreign key constraint if it doesn't exist
  // We need to check if the constraint exists first to avoid errors
  try {
    await pool.query(`
      do $$
      begin
        if not exists (
          select 1 from pg_constraint 
          where conname = 'quotes_customer_id_fkey'
        ) then
          alter table quotes 
          add constraint quotes_customer_id_fkey 
          foreign key (customer_id) references customers(id) on delete set null;
        end if;
      end $$;
    `);
  } catch (err) {
    // Constraint might already exist or there's another issue
    console.log('[db] Note: Could not add foreign key constraint (may already exist):', err.message);
  }

  // Basic users table for auth
  await pool.query(`
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      email text unique not null,
      password_hash text not null,
      created_at timestamptz not null default now()
    )
  `);
}

async function ensureAdminUser() {
  const bcrypt = require('bcrypt');
  const adminEmail = 'admin';
  const adminPassword = 'admin123';
  
  try {
    const existing = await findUserByEmail(adminEmail);
    
    if (existing) {
      // Admin exists - update password to ensure it's correct
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await pool.query(
        'update users set password_hash = $1 where email = $2',
        [passwordHash, adminEmail]
      );
      console.log('[db] Admin user password reset (username: admin, password: admin123)');
    } else {
      // Admin doesn't exist - create it
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await createUser({ email: adminEmail, passwordHash });
      console.log('[db] Default admin user created (username: admin, password: admin123)');
    }
  } catch (err) {
    console.error('[db] Error ensuring admin user:', err);
    // Don't throw - allow server to start even if admin creation fails
  }
}

async function createUser({ email, passwordHash }) {
  try {
    const { rows } = await pool.query(
      `
        insert into users (email, password_hash)
        values ($1, $2)
        returning id, email, created_at
      `,
      [email.toLowerCase(), passwordHash]
    );
    return rows[0];
  } catch (err) {
    console.error('[db] Error creating user:', err);
    throw new Error(`Database connection error: ${err.message || 'Unable to connect to database'}`);
  }
}

async function findUserByEmail(email) {
  try {
    const { rows } = await pool.query(
      'select * from users where email = $1',
      [email.toLowerCase()]
    );
    return rows[0] || null;
  } catch (err) {
    console.error('[db] Error finding user:', err);
    throw new Error(`Database connection error: ${err.message || 'Unable to connect to database'}`);
  }
}

// Customer functions
async function getAllCustomers() {
  const { rows } = await pool.query('select * from customers order by name asc');
  return rows.map(toCustomerDomain);
}

async function getCustomerById(id) {
  const { rows } = await pool.query('select * from customers where id = $1', [id]);
  if (!rows[0]) return null;
  return toCustomerDomain(rows[0]);
}

async function findOrCreateCustomer(name) {
  try {
    if (!name || !name.trim()) {
      throw new Error('Customer name is required');
    }
    
    // Try to find existing customer
    const { rows: existing } = await pool.query(
      'select * from customers where lower(name) = lower($1)',
      [name.trim()]
    );
    
    if (existing[0]) {
      return toCustomerDomain(existing[0]);
    }
    
    // Create new customer
    const { rows } = await pool.query(
      'insert into customers (name) values ($1) returning *',
      [name.trim()]
    );
    return toCustomerDomain(rows[0]);
  } catch (err) {
    console.error('[db] Error in findOrCreateCustomer:', err);
    console.error('[db] Customer name:', name);
    throw err;
  }
}

async function getQuotesByCustomerId(customerId) {
  const { rows } = await pool.query(
    'select * from quotes where customer_id = $1 order by created_at desc',
    [customerId]
  );
  return rows.map(toQuoteDomain);
}

function toCustomerDomain(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

async function getAllQuotes() {
  const { rows } = await pool.query(`
    select q.*, c.name as customer_name, c.id as customer_id
    from quotes q
    left join customers c on q.customer_id = c.id
    order by q.created_at desc
  `);
  return rows.map(toQuoteDomain);
}

async function insertQuote(quote) {
  try {
    await pool.query(
      `
        insert into quotes (
          id, title, client_name, customer_id, value, stage,
          last_chased_at, next_chase_at, reminder_email,
          attachment_url, status, notes, created_at, updated_at
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      `,
      [
        quote.id,
        quote.title,
        quote.clientName,
        quote.customerId ?? null,
        quote.value,
        quote.stage,
        quote.lastChasedAt ? new Date(quote.lastChasedAt) : null,
        quote.nextChaseAt ? new Date(quote.nextChaseAt) : null,
        quote.reminderEmail,
        quote.attachmentUrl,
        quote.status ?? null,
        quote.notes ?? null,
        new Date(quote.createdAt),
        new Date(quote.updatedAt)
      ]
    );
  } catch (err) {
    console.error('[db] Error inserting quote:', err);
    console.error('[db] Quote data:', {
      id: quote.id,
      title: quote.title,
      clientName: quote.clientName,
      customerId: quote.customerId,
      hasCustomerId: !!quote.customerId
    });
    throw err;
  }
}

async function updateQuote(id, patch) {
  const existing = await getQuoteById(id);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString()
  };

  await pool.query(
    `
      update quotes
      set title = $2,
          client_name = $3,
          customer_id = $4,
          value = $5,
          stage = $6,
          last_chased_at = $7,
          next_chase_at = $8,
          reminder_email = $9,
          attachment_url = $10,
          status = $11,
          notes = $12,
          updated_at = $13
      where id = $1
    `,
    [
      updated.id,
      updated.title,
      updated.clientName,
      updated.customerId ?? null,
      updated.value,
      updated.stage,
      updated.lastChasedAt ? new Date(updated.lastChasedAt) : null,
      updated.nextChaseAt ? new Date(updated.nextChaseAt) : null,
      updated.reminderEmail,
      updated.attachmentUrl,
      updated.status ?? null,
      updated.notes ?? null,
      new Date(updated.updatedAt)
    ]
  );

  return updated;
}

async function getQuoteById(id) {
  const { rows } = await pool.query(`
    select q.*, c.name as customer_name, c.id as customer_id
    from quotes q
    left join customers c on q.customer_id = c.id
    where q.id = $1
  `, [id]);
  if (!rows[0]) return null;
  return toQuoteDomain(rows[0]);
}

async function getDueReminders(now = new Date()) {
  const { rows } = await pool.query(
    `
      select *
      from quotes
      where reminder_email is not null
        and next_chase_at is not null
        and next_chase_at <= $1
    `,
    [now]
  );
  return rows.map(toQuoteDomain);
}

async function markReminderSent(id, at) {
  const updatedAt = new Date();
  await pool.query(
    `
      update quotes
      set last_chased_at = $2,
          next_chase_at = null,
          updated_at = $3
      where id = $1
    `,
    [id, at, updatedAt]
  );
}

function toQuoteDomain(row) {
  return {
    id: row.id,
    title: row.title,
    clientName: row.client_name,
    customerId: row.customer_id || null,
    customerName: row.customer_name || null,
    value: row.value != null ? Number(row.value) : null,
    stage: row.stage,
    lastChasedAt: row.last_chased_at ? row.last_chased_at.toISOString() : null,
    nextChaseAt: row.next_chase_at ? row.next_chase_at.toISOString() : null,
    reminderEmail: row.reminder_email,
    attachmentUrl: row.attachment_url,
    status: row.status || null,
    notes: row.notes || null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

module.exports = {
  pool,
  initDb,
  getAllQuotes,
  insertQuote,
  updateQuote,
  getQuoteById,
  getDueReminders,
  markReminderSent,
  createUser,
  findUserByEmail,
  ensureAdminUser,
  getAllCustomers,
  getCustomerById,
  findOrCreateCustomer,
  getQuotesByCustomerId
};

