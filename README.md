# Quote Portal - Kanban Pipeline Management

A modern Kanban-style quote pipeline management system similar to Pipedrive, built with React, Node.js, Express, and PostgreSQL.

## Features

- 🎯 **Kanban Board** - Drag and drop quotes between stages (New, Sent, Follow-up, Negotiation, Won, Lost)
- 👥 **User Authentication** - Secure login and registration with JWT
- 📧 **Email Reminders** - Automated email reminders for follow-ups
- 📎 **File Attachments** - Upload and attach quote documents
- 🔍 **Search** - Search quotes by client name or quote title
- 📊 **Lead Management** - Track customer organization, names, emails, values, status, and expected dates

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Authentication**: JWT + bcrypt
- **File Upload**: Multer
- **Email**: Nodemailer + node-cron

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL (via Docker or local installation)
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd quoteportal2
```

### 2. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Set Up Database

**Option A: Using Docker (Recommended)**

```bash
docker compose up -d db
```

**Option B: Local PostgreSQL**

1. Install PostgreSQL from https://www.postgresql.org/download/
2. Create a database named `quoteportal`
3. Set environment variables:
   ```bash
   export PGHOST=localhost
   export PGPORT=5432
   export PGUSER=postgres
   export PGPASSWORD=your_password
   export PGDATABASE=quoteportal
   ```

**Option C: Railway/Cloud Database**

Set `DATABASE_URL` environment variable with your connection string.

### 4. Configure Environment Variables

Create a `.env` file in the root directory (optional, defaults work for local dev):

```env
# Database (optional - defaults to localhost:5432)
DATABASE_URL=postgres://user:password@host:port/database
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=quoteportal
PGSSL=false

# JWT Secret (change in production!)
JWT_SECRET=your-secret-key-here

# Email Configuration (optional - for reminders)
# See SMTP_SETUP.md for detailed setup instructions
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_SECURE=false
SMTP_FROM=noreply@example.com

# Server Port
PORT=4000
```

### 5. Start the Application

**Development Mode:**

```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

**Or use the batch file (Windows):**
- Double-click `START_BACKEND.bat` to start the backend

### 6. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api

### 7. Default Login Credentials

- **Username**: `admin`
- **Password**: `admin123`

The admin user is automatically created on first startup.

## Project Structure

```
quoteportal2/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── ui/        # React components
│   │   ├── api.ts     # API client
│   │   └── main.tsx   # Entry point
│   └── dist/          # Build output
├── server.js          # Express backend server
├── db.js              # Database layer
├── reminderService.js # Email reminder scheduler
├── docker-compose.yml # Docker setup for PostgreSQL
└── uploads/           # Uploaded files storage
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Quotes
- `GET /api/quotes` - Get all quotes (requires auth)
- `POST /api/quotes` - Create new quote (requires auth)
- `PUT /api/quotes/:id` - Update quote (requires auth)
- `PATCH /api/quotes/:id/stage` - Update quote stage (requires auth)
- `POST /api/quotes/:id/attachment` - Upload attachment (requires auth)

### Health
- `GET /api/health` - Health check

## Deployment

### Railway Deployment

1. Connect your GitHub repository to Railway
2. Add a PostgreSQL service in Railway
3. Set environment variables in Railway dashboard:
   - `DATABASE_URL` (automatically set by Railway PostgreSQL)
   - `JWT_SECRET` (generate a secure random string)
   - `PGSSL=true`
   - `SMTP_*` variables (if using email reminders)
4. Deploy!

The backend will automatically:
- Connect to Railway's PostgreSQL
- Create necessary tables
- Create the admin user

### Frontend Deployment

Deploy the `frontend/dist` folder to any static hosting service (Vercel, Netlify, Railway Static, etc.).

Set environment variable:
- `VITE_API_URL` - Your backend API URL (e.g., `https://your-backend.up.railway.app/api`)

## Development

### Running Tests

```bash
# Backend tests (if added)
npm test

# Frontend tests (if added)
cd frontend
npm test
```

### Building for Production

```bash
# Build frontend
cd frontend
npm run build

# The built files will be in frontend/dist/
```

## Troubleshooting

### Database Connection Issues

Run the diagnostic script:
```bash
.\check-database.ps1  # Windows PowerShell
```

Common issues:
- PostgreSQL not running → Start with `docker compose up -d db`
- Wrong credentials → Check environment variables
- Port 5432 blocked → Check firewall settings

### Backend Not Starting

- Check if port 4000 is available: `netstat -ano | findstr :4000`
- Check backend console for error messages
- Verify database connection

### Login Fails

- Check backend console logs for `[login]` messages
- Verify admin user was created (check `[db]` messages)
- Ensure database is connected

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Support

For issues and questions, please open an issue on GitHub.
