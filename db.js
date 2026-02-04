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
      email text,
      phone text,
      website text,
      address text,
      industry text,
      notes text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  // Add CRM columns to customers if they don't exist
  await pool.query('alter table customers add column if not exists email text');
  await pool.query('alter table customers add column if not exists phone text');
  await pool.query('alter table customers add column if not exists website text');
  await pool.query('alter table customers add column if not exists address text');
  await pool.query('alter table customers add column if not exists industry text');
  await pool.query('alter table customers add column if not exists notes text');

  // Create contacts table for individual contacts within customers
  await pool.query(`
    create table if not exists contacts (
      id uuid primary key default gen_random_uuid(),
      customer_id uuid references customers(id) on delete cascade,
      first_name text not null,
      last_name text not null,
      email text,
      phone text,
      job_title text,
      notes text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  // Create activities table for tracking interactions
  await pool.query(`
    create table if not exists activities (
      id uuid primary key default gen_random_uuid(),
      customer_id uuid references customers(id) on delete cascade,
      contact_id uuid references contacts(id) on delete set null,
      quote_id text references quotes(id) on delete set null,
      type text not null,
      subject text,
      description text,
      attachment_url text,
      activity_date timestamptz not null default now(),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  // Add attachment_url column if it doesn't exist
  await pool.query(
    'alter table activities add column if not exists attachment_url text'
  );

  // Create tasks table for task management
  await pool.query(`
    create table if not exists tasks (
      id uuid primary key default gen_random_uuid(),
      customer_id uuid references customers(id) on delete cascade,
      contact_id uuid references contacts(id) on delete set null,
      quote_id text references quotes(id) on delete set null,
      assigned_to uuid references users(id) on delete set null,
      title text not null,
      description text,
      due_date timestamptz,
      completed boolean default false,
      priority text default 'medium',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  // Add assigned_to column if it doesn't exist
  await pool.query(
    'alter table tasks add column if not exists assigned_to uuid'
  );

  // Add foreign key constraint for assigned_to if it doesn't exist
  try {
    await pool.query(`
      do $$
      begin
        if not exists (
          select 1 from pg_constraint
          where conname = 'tasks_assigned_to_fkey'
        ) then
          alter table tasks
          add constraint tasks_assigned_to_fkey
          foreign key (assigned_to) references users(id) on delete set null;
        end if;
      end $$;
    `);
  } catch (err) {
    console.log('[db] Note: Could not add assigned_to foreign key constraint (may already exist):', err.message);
  }

  await pool.query(`
    create table if not exists quotes (
      id text primary key,
      title text not null,
      client_name text not null,
      customer_id uuid references customers(id) on delete set null,
      created_by uuid references users(id) on delete set null,
      value numeric,
      stage text not null,
      position integer default 0,
      so_number text,
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

  // In case the table already existed without the position column, try to add it.
  await pool.query(
    'alter table quotes add column if not exists position integer default 0'
  );

  // In case the table already existed without the so_number column, try to add it.
  await pool.query(
    'alter table quotes add column if not exists so_number text'
  );

  // In case the table already existed without the created_by column, try to add it.
  await pool.query(
    'alter table quotes add column if not exists created_by uuid'
  );

  // Add foreign key constraint for created_by if it doesn't exist
  try {
    await pool.query(`
      do $$
      begin
        if not exists (
          select 1 from pg_constraint
          where conname = 'quotes_created_by_fkey'
        ) then
          alter table quotes
          add constraint quotes_created_by_fkey
          foreign key (created_by) references users(id) on delete set null;
        end if;
      end $$;
    `);
  } catch (err) {
    console.log('[db] Note: Could not add created_by foreign key constraint (may already exist):', err.message);
  }

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

  // Migrate old stage values to new ones
  // 'sent' -> 'new' (move to new stage)
  // 'negotiation' -> 'tender'
  try {
    const { rows: sentRows } = await pool.query(`
      update quotes 
      set stage = 'new', updated_at = now()
      where stage = 'sent'
      returning id
    `);
    
    const { rows: negotiationRows } = await pool.query(`
      update quotes 
      set stage = 'tender', updated_at = now()
      where stage = 'negotiation'
      returning id
    `);
    
    if (sentRows.length > 0 || negotiationRows.length > 0) {
      console.log('[db] Migrated stage values:', {
        sent: sentRows.length,
        negotiation: negotiationRows.length
      });
    }
  } catch (err) {
    console.log('[db] Note: Could not migrate stage values (may not be needed):', err.message);
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
  const { rows } = await pool.query(`
    select q.*, u.email as created_by_name
    from quotes q
    left join users u on q.created_by = u.id
    where q.customer_id = $1
    order by q.created_at desc
  `, [customerId]);
  return rows.map(toQuoteDomain);
}

async function updateCustomer(id, patch) {
  const existing = await pool.query('select * from customers where id = $1', [id]);
  if (!existing.rows[0]) return null;

  const updated = {
    ...existing.rows[0],
    ...patch,
    updated_at: new Date()
  };

  await pool.query(
    `update customers
     set name = coalesce($2, name), 
         email = $3, 
         phone = $4, 
         website = $5, 
         address = $6, 
         industry = $7, 
         notes = $8, 
         updated_at = $9
     where id = $1`,
    [
      id,
      updated.name,
      updated.email || null,
      updated.phone || null,
      updated.website || null,
      updated.address || null,
      updated.industry || null,
      updated.notes || null,
      updated.updated_at
    ]
  );
  const { rows } = await pool.query('select * from customers where id = $1', [id]);
  return toCustomerDomain(rows[0]);
}

function toCustomerDomain(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email || null,
    phone: row.phone || null,
    website: row.website || null,
    address: row.address || null,
    industry: row.industry || null,
    notes: row.notes || null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

async function getAllQuotes() {
  const { rows } = await pool.query(`
    select q.*, c.name as customer_name, c.id as customer_id, u.email as created_by_name
    from quotes q
    left join customers c on q.customer_id = c.id
    left join users u on q.created_by = u.id
    order by q.stage, q.position asc, q.next_chase_at nulls last, q.created_at desc
  `);
  return rows.map(toQuoteDomain);
}

async function insertQuote(quote) {
  try {
    // Get the max position for this stage to add new quote at the end
    const { rows: maxPos } = await pool.query(
      'select coalesce(max(position), 0) as max_pos from quotes where stage = $1',
      [quote.stage]
    );
    const newPosition = (maxPos[0]?.max_pos || 0) + 1;

    await pool.query(
      `
        insert into quotes (
          id, title, client_name, customer_id, created_by, value, stage, position, so_number,
          last_chased_at, next_chase_at, reminder_email,
          attachment_url, status, notes, created_at, updated_at
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      `,
      [
        quote.id,
        quote.title,
        quote.clientName,
        quote.customerId ?? null,
        quote.createdBy ?? null,
        quote.value,
        quote.stage,
        newPosition,
        quote.soNumber ?? null,
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
          position = $7,
          so_number = $8,
          last_chased_at = $9,
          next_chase_at = $10,
          reminder_email = $11,
          attachment_url = $12,
          status = $13,
          notes = $14,
          updated_at = $15
      where id = $1
    `,
    [
      updated.id,
      updated.title,
      updated.clientName,
      updated.customerId ?? null,
      updated.value,
      updated.stage,
      updated.position ?? 0,
      updated.soNumber ?? null,
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

async function updateQuotePositions(updates) {
  // updates is an array of { id, position, stage }
  try {
    await pool.query('BEGIN');
    for (const { id, position, stage } of updates) {
      await pool.query(
        'update quotes set position = $1, stage = $2, updated_at = now() where id = $3',
        [position, stage, id]
      );
    }
    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
}

async function getQuoteById(id) {
  const { rows } = await pool.query(`
    select q.*, c.name as customer_name, c.id as customer_id, u.email as created_by_name
    from quotes q
    left join customers c on q.customer_id = c.id
    left join users u on q.created_by = u.id
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
    createdBy: row.created_by || null,
    createdByName: row.created_by_name || null,
    value: row.value != null ? Number(row.value) : null,
    stage: row.stage,
    position: row.position != null ? Number(row.position) : 0,
    soNumber: row.so_number || null,
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

// Contact functions
async function getContactsByCustomerId(customerId) {
  const { rows } = await pool.query(
    'select * from contacts where customer_id = $1 order by last_name, first_name',
    [customerId]
  );
  return rows.map(toContactDomain);
}

async function createContact(contact) {
  const { rows } = await pool.query(
    `insert into contacts (customer_id, first_name, last_name, email, phone, job_title, notes)
     values ($1, $2, $3, $4, $5, $6, $7) returning *`,
    [
      contact.customerId,
      contact.firstName,
      contact.lastName,
      contact.email || null,
      contact.phone || null,
      contact.jobTitle || null,
      contact.notes || null
    ]
  );
  return toContactDomain(rows[0]);
}

async function updateContact(id, patch) {
  const existing = await pool.query('select * from contacts where id = $1', [id]);
  if (!existing.rows[0]) return null;

  const updated = {
    ...existing.rows[0],
    ...patch,
    updated_at: new Date()
  };

  await pool.query(
    `update contacts
     set first_name = $2, last_name = $3, email = $4, phone = $5, job_title = $6, notes = $7, updated_at = $8
     where id = $1`,
    [
      id,
      updated.first_name,
      updated.last_name,
      updated.email || null,
      updated.phone || null,
      updated.job_title || null,
      updated.notes || null,
      updated.updated_at
    ]
  );
  return toContactDomain(updated);
}

async function deleteContact(id) {
  await pool.query('delete from contacts where id = $1', [id]);
}

function toContactDomain(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email || null,
    phone: row.phone || null,
    jobTitle: row.job_title || null,
    notes: row.notes || null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

// Activity functions
async function getActivitiesByCustomerId(customerId) {
  const { rows } = await pool.query(
    `select a.*, c.first_name, c.last_name, q.title as quote_title
     from activities a
     left join contacts c on a.contact_id = c.id
     left join quotes q on a.quote_id = q.id
     where a.customer_id = $1
     order by a.activity_date desc`,
    [customerId]
  );
  return rows.map(toActivityDomain);
}

async function createActivity(activity) {
  const { rows } = await pool.query(
    `insert into activities (customer_id, contact_id, quote_id, type, subject, description, attachment_url, activity_date)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
    [
      activity.customerId,
      activity.contactId || null,
      activity.quoteId || null,
      activity.type,
      activity.subject || null,
      activity.description || null,
      activity.attachmentUrl || null,
      activity.activityDate ? new Date(activity.activityDate) : new Date()
    ]
  );
  return toActivityDomain(rows[0]);
}

function toActivityDomain(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    contactId: row.contact_id || null,
    quoteId: row.quote_id || null,
    type: row.type,
    subject: row.subject || null,
    description: row.description || null,
    attachmentUrl: row.attachment_url || null,
    activityDate: row.activity_date.toISOString(),
    contactName: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : null,
    quoteTitle: row.quote_title || null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

// Task functions
async function getTasksByCustomerId(customerId) {
  const { rows } = await pool.query(
    `select t.*, c.first_name, c.last_name, q.title as quote_title, u.email as assigned_to_name
     from tasks t
     left join contacts c on t.contact_id = c.id
     left join quotes q on t.quote_id = q.id
     left join users u on t.assigned_to = u.id
     where t.customer_id = $1
     order by t.due_date nulls last, t.created_at desc`,
    [customerId]
  );
  return rows.map(toTaskDomain);
}

async function getAllTasks() {
  const { rows } = await pool.query(
    `select t.*, c.first_name, c.last_name, q.title as quote_title, cust.name as customer_name, u.email as assigned_to_name
     from tasks t
     left join contacts c on t.contact_id = c.id
     left join quotes q on t.quote_id = q.id
     left join customers cust on t.customer_id = cust.id
     left join users u on t.assigned_to = u.id
     where t.completed = false
     order by t.due_date nulls last, t.created_at desc`
  );
  return rows.map(toTaskDomain);
}

async function getTasksByUserId(userId) {
  const { rows } = await pool.query(
    `select t.*, c.first_name, c.last_name, q.title as quote_title, q.id as quote_id, cust.name as customer_name, u.email as assigned_to_name
     from tasks t
     left join contacts c on t.contact_id = c.id
     left join quotes q on t.quote_id = q.id
     left join customers cust on t.customer_id = cust.id
     left join users u on t.assigned_to = u.id
     where t.assigned_to = $1 and t.completed = false
     order by t.due_date nulls last, t.created_at desc`,
    [userId]
  );
  return rows.map(toTaskDomain);
}

async function createTask(task) {
  const { rows } = await pool.query(
    `insert into tasks (customer_id, contact_id, quote_id, assigned_to, title, description, due_date, priority)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
    [
      task.customerId || null,
      task.contactId || null,
      task.quoteId || null,
      task.assignedTo || null,
      task.title,
      task.description || null,
      task.dueDate ? new Date(task.dueDate) : null,
      task.priority || 'medium'
    ]
  );
  return toTaskDomain(rows[0]);
}

async function updateTask(id, patch) {
  const existing = await pool.query('select * from tasks where id = $1', [id]);
  if (!existing.rows[0]) return null;

  const updated = {
    ...existing.rows[0],
    ...patch,
    updated_at: new Date()
  };

  await pool.query(
    `update tasks
     set title = $2, description = $3, due_date = $4, completed = $5, priority = $6, updated_at = $7
     where id = $1`,
    [
      id,
      updated.title,
      updated.description || null,
      updated.due_date ? new Date(updated.due_date) : null,
      updated.completed !== undefined ? updated.completed : existing.rows[0].completed,
      updated.priority || 'medium',
      updated.updated_at
    ]
  );
  const { rows } = await pool.query('select * from tasks where id = $1', [id]);
  return toTaskDomain(rows[0]);
}

function toTaskDomain(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    contactId: row.contact_id || null,
    quoteId: row.quote_id || null,
    assignedTo: row.assigned_to || null,
    assignedToName: row.assigned_to_name || null,
    title: row.title,
    description: row.description || null,
    dueDate: row.due_date ? row.due_date.toISOString() : null,
    completed: row.completed || false,
    priority: row.priority || 'medium',
    contactName: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : null,
    quoteTitle: row.quote_title || null,
    customerName: row.customer_name || null,
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
  updateQuotePositions,
  getQuoteById,
  getDueReminders,
  markReminderSent,
  createUser,
  findUserByEmail,
  ensureAdminUser,
  getAllCustomers,
  getCustomerById,
  findOrCreateCustomer,
  updateCustomer,
  getQuotesByCustomerId,
  getContactsByCustomerId,
  createContact,
  updateContact,
  deleteContact,
  getActivitiesByCustomerId,
  createActivity,
  pool,
  getTasksByCustomerId,
  getAllTasks,
  getTasksByUserId,
  createTask,
  updateTask
};
