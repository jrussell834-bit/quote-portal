const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const {
  initDb,
  getAllQuotes,
  insertQuote,
  updateQuote,
  updateQuotePositions,
  getQuoteById,
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
  getTasksByCustomerId,
  getAllTasks,
  getTasksByUserId,
  createTask,
  updateTask
} = require('./db');
const { startReminderScheduler } = require('./reminderService');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-secret-change-me') {
    console.error('[SECURITY] WARNING: JWT_SECRET must be set to a secure random string in production!');
  }
  if (!process.env.DATABASE_URL) {
    console.error('[SECURITY] ERROR: DATABASE_URL is required in production!');
    process.exit(1);
  }
}

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Vite in dev
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false, // Allow iframe for PDF preview
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? false : true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api', apiLimiter);

// Static serving for uploaded quote files
const uploadsDir = path.join(__dirname, 'uploads');
const upload = multer({ 
  dest: uploadsDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only PDF files
    const allowedMimes = ['application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});
app.use('/uploads', express.static(uploadsDir));

// Simple health check (before DB init, so it works even if DB fails)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth helpers
function generateToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = header.slice('Bearer '.length);
  
  // Validate token format
  if (!token || token.length < 10) {
    return res.status(401).json({ message: 'Invalid token format' });
  }
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Password validation helper
function validatePassword(password) {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
}

// Input sanitization helper
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
}

// Register
app.post('/api/auth/register', authLimiter, [
  body('username').trim().isLength({ min: 3, max: 50 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Username must be 3-50 characters and contain only letters, numbers, and underscores'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const { username, password } = req.body || {};
  const sanitizedUsername = sanitizeInput(username);
  
  // Additional password strength validation
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ message: passwordValidation.message });
  }

  try {
    // Use username as the email identifier in the database
    const email = sanitizedUsername.toLowerCase();
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Username already in use' });
    }
    // Increase bcrypt rounds for better security
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser({ email, passwordHash });
    const token = generateToken(user);
    res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('[register] Error:', err);
    const message = err.code === '23505' 
      ? 'Username already in use' 
      : 'Error registering user';
    res.status(500).json({ message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  console.log('[login] Attempt:', { username: username ? 'provided' : 'missing', hasPassword: !!password });
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  try {
    // Use username as the email identifier in the database
    const email = username.toLowerCase().trim();
    console.log('[login] Looking up user:', email);
    const user = await findUserByEmail(email);
    if (!user) {
      console.log('[login] User not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    console.log('[login] User found, checking password');
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      console.log('[login] Password mismatch');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    console.log('[login] Success for:', email);
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('[login] Error:', err);
    const errorMsg = err?.message || err?.toString() || 'Unknown error';
    const isDbError = errorMsg.includes('Database connection') || 
                      errorMsg.includes('connect ECONNREFUSED') ||
                      err?.code === 'ECONNREFUSED' ||
                      err?.code === 'ENOTFOUND';
    
    console.error('[login] Error details:', { 
      message: errorMsg, 
      code: err?.code, 
      isDbError
    });
    
    if (isDbError) {
      const isRailway = !!process.env.DATABASE_URL || !!process.env.RAILWAY_ENVIRONMENT;
      const hint = isRailway 
        ? 'On Railway: Add PostgreSQL service from dashboard → "+ New" → "Database" → "Add PostgreSQL"'
        : 'Please ensure PostgreSQL is running. See server console for details.';
      
      res.status(503).json({ 
        message: 'Database connection failed', 
        error: 'Cannot connect to PostgreSQL database',
        hint: hint,
        isRailway: isRailway
      });
    } else {
      res.status(500).json({ 
        message: 'Error logging in', 
        error: errorMsg
      });
    }
  }
});

// Quote model helper
function createQuote(payload) {
  const now = new Date().toISOString();
  return {
    id: payload.id || `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: payload.title ?? 'Untitled quote',
    clientName: payload.clientName ?? 'Unknown client',
    customerId: payload.customerId ?? null,
    createdBy: payload.createdBy ?? null,
    value: payload.value ?? null,
    stage: payload.stage ?? 'new',
    soNumber: payload.soNumber ?? null,
    lastChasedAt: payload.lastChasedAt ?? null,
    nextChaseAt: payload.nextChaseAt ?? null,
    reminderEmail: payload.reminderEmail ?? null,
    attachmentUrl: payload.attachmentUrl ?? null,
    status: payload.status ?? null,
    notes: payload.notes ?? null,
    createdAt: payload.createdAt || now,
    updatedAt: payload.updatedAt || now
  };
}

// Get all quotes (requires auth)
app.get('/api/quotes', authMiddleware, async (_req, res) => {
  try {
    const quotes = await getAllQuotes();
    res.json(quotes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error loading quotes' });
  }
});

// Create new quote
app.post('/api/quotes', authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    let customerId = body.customerId;
    
    // Get user ID from JWT token (req.user.sub is the user ID)
    const userId = req.user?.sub || null;
    
    // If customer name is provided but no customerId, find or create customer
    if (body.customerName && !customerId) {
      const customer = await findOrCreateCustomer(body.customerName);
      customerId = customer.id;
    }
    
    const quote = createQuote({ ...body, customerId, createdBy: userId });
    await insertQuote(quote);
    
    // Fetch the full quote with customer info
    const fullQuote = await getQuoteById(quote.id);
    res.status(201).json(fullQuote || quote);
  } catch (err) {
    console.error('[create quote] Error:', err);
    console.error('[create quote] Error details:', {
      message: err?.message,
      code: err?.code,
      detail: err?.detail,
      constraint: err?.constraint,
      stack: err?.stack
    });
    const errorMessage = err?.message || 'Error creating quote';
    res.status(500).json({ 
      message: 'Error creating quote',
      error: errorMessage,
      details: err?.detail || err?.code
    });
  }
});

// Update quote
app.put('/api/quotes/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await updateQuote(id, req.body || {});
    if (!updated) {
      return res.status(404).json({ message: 'Quote not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating quote' });
  }
});

// Update stage only (for drag and drop)
app.patch('/api/quotes/:id/stage', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { stage } = req.body;
  if (!stage) {
    return res.status(400).json({ message: 'Stage is required' });
  }
  try {
    const updated = await updateQuote(id, { stage });
    if (!updated) {
      return res.status(404).json({ message: 'Quote not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating stage' });
  }
});

// Update multiple quote positions (for reordering within/between columns)
app.patch('/api/quotes/positions', authMiddleware, async (req, res) => {
  const { updates } = req.body;
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ message: 'Updates array is required' });
  }
  try {
    await updateQuotePositions(updates);
    // Fetch updated quotes
    const allQuotes = await getAllQuotes();
    res.json(allQuotes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating positions' });
  }
});

// Upload quote attachment (PDF etc.)
app.post('/api/quotes/:id/attachment', authMiddleware, upload.single('file'), async (req, res) => {
  const { id } = req.params;
  if (!req.file) {
    return res.status(400).json({ message: 'File is required' });
  }
  
  // Validate file type
  if (req.file.mimetype !== 'application/pdf') {
    // Delete the uploaded file if it's not a PDF
    const fs = require('fs');
    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.error('[upload] Error deleting invalid file:', err);
    }
    return res.status(400).json({ message: 'Only PDF files are allowed' });
  }
  
  try {
    const quote = await getQuoteById(id);
    if (!quote) {
      // Delete uploaded file if quote not found
      const fs = require('fs');
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('[upload] Error deleting file:', err);
      }
      return res.status(404).json({ message: 'Quote not found' });
    }
    const attachmentUrl = `/uploads/${req.file.filename}`;
    const updated = await updateQuote(id, { attachmentUrl });
    res.json(updated);
  } catch (err) {
    console.error(err);
    // Delete uploaded file on error
    const fs = require('fs');
    try {
      if (req.file) fs.unlinkSync(req.file.path);
    } catch (unlinkErr) {
      console.error('[upload] Error deleting file on error:', unlinkErr);
    }
    res.status(500).json({ message: 'Error saving attachment' });
  }
});

// Get all customers
app.get('/api/customers', authMiddleware, async (_req, res) => {
  try {
    const customers = await getAllCustomers();
    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error loading customers' });
  }
});

// Get customer by ID with all quotes
app.get('/api/customers/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await getCustomerById(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    const quotes = await getQuotesByCustomerId(id);
    res.json({ ...customer, quotes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error loading customer' });
  }
});

// Create or find customer
app.post('/api/customers', authMiddleware, async (req, res) => {
  const { name, email, phone, website, address, industry, notes } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Customer name is required' });
  }
  try {
    const customer = await findOrCreateCustomer(name.trim());
    // Update customer with additional CRM fields if provided
    if (email || phone || website || address || industry || notes) {
      const updated = await updateCustomer(customer.id, {
        email, phone, website, address, industry, notes
      });
      return res.status(201).json(updated);
    }
    res.status(201).json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating customer' });
  }
});

// Update customer
app.put('/api/customers/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await updateCustomer(id, req.body);
    if (!updated) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating customer' });
  }
});

// Contacts endpoints
app.get('/api/customers/:id/contacts', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const contacts = await getContactsByCustomerId(id);
    res.json(contacts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error loading contacts' });
  }
});

app.post('/api/customers/:id/contacts', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, phone, jobTitle, notes } = req.body || {};
  if (!firstName || !lastName) {
    return res.status(400).json({ message: 'First name and last name are required' });
  }
  try {
    const contact = await createContact({
      customerId: id,
      firstName,
      lastName,
      email,
      phone,
      jobTitle,
      notes
    });
    res.status(201).json(contact);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating contact' });
  }
});

app.put('/api/contacts/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await updateContact(id, req.body);
    if (!updated) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating contact' });
  }
});

app.delete('/api/contacts/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await deleteContact(id);
    res.json({ message: 'Contact deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting contact' });
  }
});

// Activities endpoints
app.get('/api/customers/:id/activities', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const activities = await getActivitiesByCustomerId(id);
    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error loading activities' });
  }
});

app.post('/api/customers/:id/activities', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { contactId, quoteId, type, subject, description, activityDate } = req.body || {};
  if (!type) {
    return res.status(400).json({ message: 'Activity type is required' });
  }
  try {
    const activity = await createActivity({
      customerId: id,
      contactId,
      quoteId,
      type,
      subject,
      description,
      activityDate
    });
    res.status(201).json(activity);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating activity' });
  }
});

// Tasks endpoints
app.get('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const tasks = await getAllTasks();
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error loading tasks' });
  }
});

// Get tasks for current user
app.get('/api/tasks/my', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.sub || null;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    const tasks = await getTasksByUserId(userId);
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error loading tasks' });
  }
});

app.get('/api/customers/:id/tasks', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const tasks = await getTasksByCustomerId(id);
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error loading tasks' });
  }
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
  const { customerId, contactId, quoteId, assignedTo, title, description, dueDate, priority } = req.body || {};
  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }
  try {
    // If assignedTo is not provided, default to current user
    const userId = req.user?.sub || null;
    const task = await createTask({
      customerId: customerId || null,
      contactId: contactId || null,
      quoteId: quoteId || null,
      assignedTo: assignedTo || userId,
      title,
      description,
      dueDate,
      priority
    });
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating task' });
  }
});

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await updateTask(id, req.body);
    if (!updated) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating task' });
  }
});

// Root route - API info in development, frontend in production
// Check for production environment (Railway sets RAILWAY_ENVIRONMENT or NODE_ENV)
const isProduction = process.env.NODE_ENV === 'production' || 
                     process.env.RAILWAY_ENVIRONMENT || 
                     !process.env.NODE_ENV || 
                     process.env.NODE_ENV !== 'development';

app.get('/', (req, res) => {
  if (isProduction) {
    // In production, serve the frontend
    const frontendDist = path.join(__dirname, 'frontend', 'dist');
    const indexPath = path.join(frontendDist, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('[server] Error serving frontend:', err);
        // Fallback to API info if frontend not found
        res.json({ 
          message: 'Quote Portal API',
          version: '1.0.0',
          note: 'Frontend not found. Please ensure frontend/dist is built.',
          endpoints: {
            health: '/api/health',
            auth: {
              register: 'POST /api/auth/register',
              login: 'POST /api/auth/login'
            }
          }
        });
      }
    });
  } else {
    // In development, show API info
    res.json({ 
      message: 'Quote Portal API',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        auth: {
          register: 'POST /api/auth/register',
          login: 'POST /api/auth/login'
        },
        quotes: {
          list: 'GET /api/quotes',
          create: 'POST /api/quotes',
          update: 'PUT /api/quotes/:id',
          updateStage: 'PATCH /api/quotes/:id/stage',
          uploadAttachment: 'POST /api/quotes/:id/attachment'
        },
        customers: {
          list: 'GET /api/customers',
          getById: 'GET /api/customers/:id',
          create: 'POST /api/customers'
        }
      }
    });
  }
});

// Serve static files from frontend/dist in production (must be after ALL API routes)
if (isProduction) {
  const frontendDist = path.join(__dirname, 'frontend', 'dist');
  app.use(express.static(frontendDist));
  
  // Handle React Router - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    // Skip API routes and static file routes
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return res.status(404).json({ 
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`
      });
    }
    // Serve index.html for all other routes (React Router)
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  // 404 handler for unknown routes (development only)
  app.use((req, res) => {
    // Handle malformed URLs (like just "?")
    const path = req.path || req.url;
    if (path === '?' || path === '/?' || path.trim() === '') {
      return res.redirect('/');
    }

    res.status(404).json({
      error: 'Not Found',
      message: `Cannot ${req.method} ${path || req.url}`,
      availableEndpoints: {
        root: 'GET /',
        health: 'GET /api/health',
        auth: 'POST /api/auth/login, POST /api/auth/register',
        quotes: 'GET /api/quotes, POST /api/quotes, PUT /api/quotes/:id, PATCH /api/quotes/:id/stage',
        customers: 'GET /api/customers, GET /api/customers/:id, POST /api/customers'
      }
    });
  });
}

// Start server immediately, then initialize DB
app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
  console.log(`API available at: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  
  // Initialize database in background
  initDb()
    .then(() => ensureAdminUser())
    .then(() => {
      console.log('[db] Database initialized successfully');
      startReminderScheduler();
    })
    .catch((err) => {
      console.error('[db] Failed to initialise database:', err);
      console.error('[db] Server is running but database operations will fail');
      
      if (process.env.DATABASE_URL) {
        console.error('[db] DATABASE_URL is set but connection failed');
        console.error('[db] On Railway: Make sure PostgreSQL service is added and running');
        console.error('[db] Check Railway dashboard → Your project → PostgreSQL service');
      } else {
        console.error('[db] DATABASE_URL not set - using individual connection parameters');
        console.error('[db] Make sure Postgres is running and connection settings are correct');
        console.error('[db] Connection details:', {
          host: process.env.PGHOST || 'localhost',
          port: process.env.PGPORT || 5432,
          database: process.env.PGDATABASE || 'quoteportal',
          hasUrl: !!process.env.DATABASE_URL
        });
        console.error('[db] To start Postgres with Docker: docker compose up -d db');
        console.error('[db] On Railway: Add PostgreSQL service from Railway dashboard');
      }
    });
});


