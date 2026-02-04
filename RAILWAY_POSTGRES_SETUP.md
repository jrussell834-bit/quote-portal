# Railway PostgreSQL Setup - Quick Guide

## The Problem
You're seeing: "Database not connected. PostgreSQL is required..."

This means Railway doesn't have a PostgreSQL database service connected to your backend.

## Solution: Add PostgreSQL to Railway

### Step-by-Step Instructions

1. **Go to your Railway project dashboard**
   - Visit: https://railway.app
   - Click on your project (quote-portal)

2. **Add PostgreSQL Database**
   - Click the **"+ New"** button (top right)
   - Select **"Database"**
   - Choose **"Add PostgreSQL"**
   - Railway will automatically create a PostgreSQL database

3. **Verify DATABASE_URL is Set**
   - Railway automatically sets `DATABASE_URL` environment variable
   - Go to your **backend service** → **"Variables"** tab
   - You should see `DATABASE_URL` listed (it's automatically added)
   - If you don't see it, click **"Generate Domain"** on the PostgreSQL service

4. **Set Required Environment Variables**
   - In your **backend service** → **"Variables"** tab
   - Add these variables:
     ```
     PGSSL=true
     JWT_SECRET=your-secure-random-string-here
     NODE_ENV=production
     ```
   - Generate a secure JWT_SECRET (you can use: `openssl rand -base64 32` or any random string)

5. **Redeploy**
   - Railway should auto-redeploy when you add the database
   - Or manually trigger: Go to **"Deployments"** → Click **"Redeploy"**

6. **Check Logs**
   - Go to your backend service → **"Deployments"** → Latest deployment → **"View Logs"**
   - You should see: `[db] Database initialized successfully`
   - You should see: `[db] Default admin user created`

## Verification

After setup, your Railway project should have:
- ✅ **Backend Service** (your Node.js app)
- ✅ **PostgreSQL Service** (database)
- ✅ `DATABASE_URL` environment variable (auto-set by Railway)
- ✅ `PGSSL=true` environment variable

## Troubleshooting

### Still seeing database errors?

1. **Check if PostgreSQL service is running**
   - In Railway dashboard, PostgreSQL service should show "Running"
   - If not, click on it and check for errors

2. **Verify DATABASE_URL exists**
   - Backend service → Variables tab
   - Should see `DATABASE_URL` with a value like: `postgres://user:pass@host:port/db`

3. **Check backend logs**
   - Look for connection errors
   - Should see database initialization messages

4. **Ensure PGSSL is set**
   - Railway PostgreSQL requires SSL
   - Make sure `PGSSL=true` is set in backend service variables

## Quick Checklist

- [ ] PostgreSQL service added to Railway project
- [ ] `DATABASE_URL` visible in backend service variables
- [ ] `PGSSL=true` set in backend service variables
- [ ] `JWT_SECRET` set in backend service variables
- [ ] `NODE_ENV=production` set (optional but recommended)
- [ ] Backend service redeployed after adding database
- [ ] Logs show "Database initialized successfully"

## Need Help?

If you're still having issues:
1. Check Railway logs for specific error messages
2. Verify all environment variables are set correctly
3. Make sure the PostgreSQL service is in the same Railway project as your backend
