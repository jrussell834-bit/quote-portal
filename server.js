const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
  initDb,
  getAllQuotes,
  insertQuote,
  updateQuote,
  getQuoteById,
  createUser,
  findUserByEmail,
  ensureAdminUser
} = require('./db');
const { startReminderScheduler } = require('./reminderService');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

app.use(cors());
app.use(express.json());

// Static serving for uploaded quote files
const uploadsDir = path.join(__dirname, 'uploads');
const upload = multer({ dest: uploadsDir });
app.use('/uploads', express.static(uploadsDir));

// Serve static files from frontend/dist in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, 'frontend', 'dist');
  app.use(express.static(frontendDist));
  
  // Handle React Router - serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    // Skip API routes and static file routes
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    // Serve index.html for all other routes (React Router)
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Root route
app.get('/', (_req, res) => {
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
      }
    }
  });
});

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
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password || password.length < 6) {
    return res
      .status(400)
      .json({ message: 'Username and password (min 6 chars) are required' });
  }
  try {
    // Use username as the email identifier in the database
    const email = username.toLowerCase().trim();
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Username already in use' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ email, passwordHash });
    const token = generateToken(user);
    res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('[register] Error:', err);
    const message = err.code === '23505' 
      ? 'Username already in use' 
      : err.message || 'Error registering user';
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
      res.status(503).json({ 
        message: 'Database connection failed', 
        error: 'Cannot connect to PostgreSQL database',
        hint: 'Please ensure PostgreSQL is running. See server console for details.'
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
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: payload.title ?? 'Untitled quote',
    clientName: payload.clientName ?? 'Unknown client',
    value: payload.value ?? null,
    stage: payload.stage ?? 'new',
    lastChasedAt: payload.lastChasedAt ?? null,
    nextChaseAt: payload.nextChaseAt ?? null,
    reminderEmail: payload.reminderEmail ?? null,
    attachmentUrl: payload.attachmentUrl ?? null,
    status: payload.status ?? null,
    createdAt: now,
    updatedAt: now
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
    const quote = createQuote(req.body || {});
    await insertQuote(quote);
    res.status(201).json(quote);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating quote' });
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

// Upload quote attachment (PDF etc.)
app.post('/api/quotes/:id/attachment', authMiddleware, upload.single('file'), async (req, res) => {
  const { id } = req.params;
  if (!req.file) {
    return res.status(400).json({ message: 'File is required' });
  }
  try {
    const quote = await getQuoteById(id);
    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }
    const attachmentUrl = `/uploads/${req.file.filename}`;
    const updated = await updateQuote(id, { attachmentUrl });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error saving attachment' });
  }
});

// Serve static files from frontend/dist in production (must be after API routes)
if (process.env.NODE_ENV === 'production') {
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
        quotes: 'GET /api/quotes, POST /api/quotes, PUT /api/quotes/:id, PATCH /api/quotes/:id/stage'
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
      console.error('[db] Make sure Postgres is running and connection settings are correct');
      console.error('[db] Connection details:', {
        host: process.env.PGHOST || 'localhost',
        port: process.env.PGPORT || 5432,
        database: process.env.PGDATABASE || 'quoteportal',
        hasUrl: !!process.env.DATABASE_URL
      });
      console.error('[db] To start Postgres with Docker: docker compose up -d db');
    });
});


