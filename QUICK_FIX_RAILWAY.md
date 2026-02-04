# Quick Fix: Add PostgreSQL to Railway

## You're seeing: "Request failed with status code 503"

This means **PostgreSQL database is not connected** on Railway.

## ⚡ Quick Fix (2 minutes)

### Step 1: Add PostgreSQL Database
1. Go to https://railway.app
2. Click on your project
3. Click **"+ New"** button (top right)
4. Select **"Database"**
5. Click **"Add PostgreSQL"**
6. Wait 10-20 seconds for Railway to create the database

### Step 2: Verify Connection
1. Go to your **backend service** → **"Variables"** tab
2. Look for `DATABASE_URL` - it should be there automatically
3. If you don't see it:
   - Click on the **PostgreSQL service**
   - Click **"Connect"** or **"Generate Domain"**
   - Railway will automatically link it

### Step 3: Set Environment Variables
In your **backend service** → **"Variables"** tab, add:

```
PGSSL=true
JWT_SECRET=any-random-secure-string-here
NODE_ENV=production
```

### Step 4: Redeploy
- Railway should auto-redeploy
- Or: Go to **"Deployments"** → Click **"Redeploy"**

### Step 5: Check Logs
- Backend service → **"Deployments"** → Latest → **"View Logs"**
- Look for: `[db] Database initialized successfully` ✅

## ✅ Success Indicators

After adding PostgreSQL, you should see in logs:
- ✅ `[db] Database initialized successfully`
- ✅ `[db] Default admin user created (username: admin, password: admin123)`

Then you can login with:
- **Username:** `admin`
- **Password:** `admin123`

## ❌ Still Not Working?

1. **Check Railway dashboard:**
   - Is PostgreSQL service showing as "Running"?
   - Is `DATABASE_URL` in backend service variables?

2. **Check backend logs:**
   - Look for database connection errors
   - Check if `DATABASE_URL` is set

3. **Verify services are linked:**
   - Both services should be in the same Railway project
   - PostgreSQL service should be visible in the project

## Need More Help?

See `RAILWAY_POSTGRES_SETUP.md` for detailed instructions.
