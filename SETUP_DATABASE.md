# Database Setup Guide

## Current Status
❌ **PostgreSQL is NOT connected** - This is why you're getting 503 errors.

## Quick Setup Options

### Option 1: Docker (Recommended - Easiest)

1. **Install Docker Desktop:**
   - Download: https://www.docker.com/products/docker-desktop/
   - Install and start Docker Desktop
   - Wait for it to fully start (whale icon in system tray)

2. **Start PostgreSQL:**
   ```powershell
   cd C:\Dev\quoteportal2
   docker compose up -d db
   ```

3. **Verify it's running:**
   ```powershell
   docker compose ps
   ```
   You should see the `db` service as "Up"

4. **Wait 5 seconds**, then try logging in again

---

### Option 2: Local PostgreSQL Installation

1. **Download PostgreSQL:**
   - Go to: https://www.postgresql.org/download/windows/
   - Download the installer (latest version)

2. **Install PostgreSQL:**
   - Run the installer
   - **Important settings:**
     - Port: `5432` (default)
     - Password: Remember this password!
     - Components: Install everything (default)

3. **Create the database:**
   - Open "pgAdmin" (installed with PostgreSQL)
   - OR use Command Line:
     ```powershell
     # Set PostgreSQL bin path (adjust version number)
     $env:Path += ";C:\Program Files\PostgreSQL\16\bin"
     
     # Connect and create database
     psql -U postgres
     # Then in psql prompt:
     CREATE DATABASE quoteportal;
     \q
     ```

4. **Set environment variables:**
   ```powershell
   $env:PGHOST="localhost"
   $env:PGPORT="5432"
   $env:PGUSER="postgres"
   $env:PGPASSWORD="your_postgres_password_here"
   $env:PGDATABASE="quoteportal"
   ```

5. **Restart the backend server:**
   - Stop current server (Ctrl+C or close terminal)
   - Start again: `npm run dev`

6. **Try logging in**

---

### Option 3: Use Railway/Cloud Database (Advanced)

If you have a Railway account or other cloud PostgreSQL:

1. Get your connection string (looks like: `postgres://user:pass@host:port/db`)

2. Set environment variable:
   ```powershell
   $env:DATABASE_URL="your_connection_string_here"
   $env:PGSSL="true"
   ```

3. Restart backend server

---

## Verification

After setting up PostgreSQL, check the backend console. You should see:
- ✅ `[db] Database initialized successfully`
- ✅ `[db] Default admin user created (username: admin, password: admin123)`

If you see errors, check:
- Is PostgreSQL service running? (Windows Services)
- Are the connection settings correct?
- Is the database `quoteportal` created?

---

## Default Login Credentials

Once database is connected:
- **Username:** `admin`
- **Password:** `admin123`
