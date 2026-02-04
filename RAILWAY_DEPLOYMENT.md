# Railway Deployment Guide

## Quick Setup

### 1. Backend Deployment

1. **Create a new Railway project**
   - Go to https://railway.app
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your `quote-portal` repository

2. **Add PostgreSQL Service**
   - Click "+ New" → "Database" → "Add PostgreSQL"
   - Railway will automatically set `DATABASE_URL` environment variable

3. **Configure Environment Variables**
   - Go to your backend service → "Variables"
   - Add these variables:
     ```
     JWT_SECRET=your-secure-random-string-here
     PGSSL=true
     PORT=4000
     ```
   - `DATABASE_URL` is automatically set by Railway PostgreSQL service

4. **Deploy**
   - Railway will automatically detect `package.json` and deploy
   - The backend will be available at: `https://your-backend.up.railway.app`

### 2. Frontend Deployment

**Option A: Separate Static Service (Recommended)**

1. **Create a new service for frontend**
   - In your Railway project, click "+ New" → "Empty Service"
   - Name it "frontend" or "web"

2. **Configure the service**
   - Go to Settings → "Source"
   - Set "Root Directory" to: `frontend`
   - Set "Build Command" to: `npm install && npm run build`
   - Set "Start Command" to: `npx serve -s dist -l 3000`
   - Or use Railway's static file serving

3. **Set Environment Variables**
   - Add: `VITE_API_URL=https://your-backend.up.railway.app/api`
   - Replace `your-backend` with your actual backend service URL

4. **Deploy**
   - Railway will build and serve the frontend

**Option B: Serve Frontend from Backend (Simpler)**

1. **Update server.js to serve static files**
   - The backend can serve the built frontend from `frontend/dist`
   - Add this to your backend service:
     - Root Directory: `.` (project root)
     - Build Command: `cd frontend && npm install && npm run build`
     - Start Command: `node server.js`
   - Set environment variable: `VITE_API_URL=/api` (relative path)

2. **Update server.js** (already done if you have the latest version)
   - The server should serve static files from `frontend/dist` for production

### 3. Update server.js for Static File Serving

Make sure your `server.js` includes:

```javascript
// Serve static files from frontend/dist in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, 'frontend', 'dist');
  app.use(express.static(frontendDist));
  
  // Handle React Router - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
}
```

## Troubleshooting

### "Cannot GET ?" Error

This usually means:
1. **Frontend API URL not set correctly**
   - Check `VITE_API_URL` environment variable
   - Should be: `https://your-backend.up.railway.app/api`

2. **Backend not serving static files**
   - Make sure `server.js` serves `frontend/dist` in production
   - Check that frontend is built before deployment

3. **CORS issues**
   - Backend should have `app.use(cors())` enabled (already done)

### Database Connection Issues

- Check that PostgreSQL service is running
- Verify `DATABASE_URL` is set automatically by Railway
- Check backend logs for connection errors

### Frontend Not Loading

- Verify `VITE_API_URL` is set in Railway environment variables
- Rebuild frontend after setting environment variable
- Check Railway build logs for errors

## Environment Variables Summary

### Backend Service:
```
DATABASE_URL=<auto-set by Railway PostgreSQL>
JWT_SECRET=<your-secret-key>
PGSSL=true
PORT=4000
NODE_ENV=production
```

### Frontend Service (if separate):
```
VITE_API_URL=https://your-backend.up.railway.app/api
```

## Getting Your Service URLs

1. Go to your Railway project dashboard
2. Click on each service
3. Copy the "Public Domain" URL
4. Use these URLs for:
   - Backend API: `https://your-backend.up.railway.app`
   - Frontend: `https://your-frontend.up.railway.app` (if separate service)

## Testing After Deployment

1. **Test Backend:**
   - Visit: `https://your-backend.up.railway.app/api/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **Test Frontend:**
   - Visit: `https://your-frontend.up.railway.app`
   - Should show login page
   - Try logging in with: `admin` / `admin123`

3. **Check Logs:**
   - Go to Railway dashboard → Your service → "Deployments" → Click latest deployment → "View Logs"
   - Look for any errors or warnings
