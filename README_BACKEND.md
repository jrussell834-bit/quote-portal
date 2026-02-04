# Backend Server Setup

## Quick Start

1. **Start PostgreSQL Database:**
   - Option A (Docker): `docker compose up -d db`
   - Option B: Make sure PostgreSQL is installed and running locally

2. **Start the Backend Server:**
   - Double-click `START_BACKEND.bat` 
   - OR run: `npm run dev`
   - OR run: `node server.js`

3. **Check for Success:**
   - You should see: `API server listening on port 4000`
   - You should see: `[db] Database initialized successfully`
   - If you see database errors, PostgreSQL is not connected

## Common Issues

### "Database connection failed"
- **Solution**: Start PostgreSQL
  - Docker: `docker compose up -d db`
  - Local: Make sure PostgreSQL service is running

### "Cannot connect to server"
- **Solution**: Make sure the backend is running
  - Check if port 4000 is in use: `netstat -ano | findstr :4000`
  - Restart the backend server

### Login fails with 500 error
- **Check backend console** for detailed error messages
- Most likely: Database not connected
- Look for messages starting with `[db]` or `[login]`

## Environment Variables (Optional)

If your PostgreSQL is not on localhost with default settings:

```powershell
$env:PGHOST="localhost"
$env:PGPORT="5432"
$env:PGUSER="postgres"
$env:PGPASSWORD="your_password"
$env:PGDATABASE="quoteportal"
```

Or set `DATABASE_URL`:
```powershell
$env:DATABASE_URL="postgres://user:password@localhost:5432/quoteportal"
```
