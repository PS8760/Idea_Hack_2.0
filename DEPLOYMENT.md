# Deployment Guide

## Prerequisites
- GitHub account
- Vercel account (for frontend)
- Render account (for backend)
- MongoDB Atlas account (for database)

## Step 1: Prepare MongoDB Atlas

1. Create a free MongoDB Atlas cluster at https://www.mongodb.com/cloud/atlas
2. Create a database user with read/write permissions
3. Whitelist all IPs (0.0.0.0/0) for Render access
4. Get your connection string (format: `mongodb+srv://username:password@cluster.mongodb.net/`)

## Step 2: Deploy Backend to Render

1. Push your code to GitHub (see Step 4 below)
2. Go to https://render.com and create a new Web Service
3. Connect your GitHub repository
4. Render will auto-detect the `render.yaml` configuration
5. Set the following environment variables in Render dashboard:
   - `MONGODB_URL`: Your MongoDB Atlas connection string
   - `DB_NAME`: `smart-resolve`
   - `SECRET_KEY`: Generate a secure random string (e.g., `openssl rand -hex 32`)
   - `GROQ_API_KEY`: Your Groq API key from https://console.groq.com
   - `SMTP_USER`: Your email for sending notifications (optional)
   - `SMTP_PASS`: Your email app password (optional)
   - `FRONTEND_URL`: Your Vercel frontend URL (add after Step 3)
6. Deploy and note your backend URL (e.g., `https://your-app.onrender.com`)

## Step 3: Deploy Frontend to Vercel

1. Go to https://vercel.com and create a new project
2. Import your GitHub repository
3. Set root directory to `frontend`
4. Vercel will auto-detect Vite configuration
5. Add environment variable:
   - `VITE_API_URL`: Your Render backend URL from Step 2
6. Deploy and note your frontend URL

## Step 4: Push to GitHub

```bash
cd Pranav
git add .
git commit -m "Prepare for deployment"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## Step 5: Update Backend with Frontend URL

1. Go back to Render dashboard
2. Update the `FRONTEND_URL` environment variable with your Vercel URL
3. Redeploy the backend service

## Step 6: Configure Google OAuth (Optional)

If using Google Sign-In:
1. Go to https://console.cloud.google.com
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - `https://your-backend.onrender.com/auth/google/callback`
4. Update backend environment variables:
   - `GOOGLE_CLIENT_ID`: Your client ID
   - `GOOGLE_REDIRECT_URI`: Your callback URL

## Environment Variables Summary

### Backend (.env - DO NOT COMMIT)
```
MONGODB_URL=mongodb+srv://...
DB_NAME=smart-resolve
SECRET_KEY=your-secret-key
GROQ_API_KEY=gsk_...
FRONTEND_URL=https://your-app.vercel.app
GOOGLE_CLIENT_ID=...
GOOGLE_REDIRECT_URI=https://your-backend.onrender.com/auth/google/callback
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Frontend (.env - DO NOT COMMIT)
```
VITE_API_URL=https://your-backend.onrender.com
```

## Troubleshooting

- **CORS errors**: Ensure `FRONTEND_URL` is set correctly in backend
- **Database connection**: Check MongoDB Atlas IP whitelist
- **AI features not working**: Verify `GROQ_API_KEY` is valid
- **Build fails**: Check Node.js and Python versions match requirements

## Post-Deployment

- Test all features: registration, login, complaint submission, AI classification
- Monitor logs in Render and Vercel dashboards
- Set up custom domains (optional)
