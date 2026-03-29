# Deployment Checklist

## ✅ Completed
- [x] Updated .gitignore to exclude PRESENTATION.md and .env files
- [x] Created frontend/vercel.json for Vercel deployment
- [x] Backend render.yaml already configured
- [x] Created .env.example files for both frontend and backend
- [x] Pushed all essential files to GitHub
- [x] AI Agent Assist now auto-generates on complaint load

## 🚀 Next Steps (Manual)

### 1. MongoDB Atlas Setup
- [ ] Create MongoDB Atlas cluster
- [ ] Create database user
- [ ] Whitelist IPs (0.0.0.0/0)
- [ ] Copy connection string

### 2. Deploy Backend (Render)
- [ ] Go to https://render.com
- [ ] Create new Web Service
- [ ] Connect GitHub repo: PS8760/Idea_Hack_2.0
- [ ] Set environment variables:
  - [ ] MONGODB_URL
  - [ ] DB_NAME = smart-resolve
  - [ ] SECRET_KEY (generate with: `openssl rand -hex 32`)
  - [ ] GROQ_API_KEY (from https://console.groq.com)
  - [ ] SMTP_USER (optional)
  - [ ] SMTP_PASS (optional)
  - [ ] FRONTEND_URL (add after Vercel deployment)
- [ ] Deploy and copy backend URL

### 3. Deploy Frontend (Vercel)
- [ ] Go to https://vercel.com
- [ ] Import GitHub repo: PS8760/Idea_Hack_2.0
- [ ] Set root directory: `frontend`
- [ ] Add environment variable:
  - [ ] VITE_API_URL = (your Render backend URL)
- [ ] Deploy and copy frontend URL

### 4. Update Backend
- [ ] Go back to Render
- [ ] Update FRONTEND_URL with Vercel URL
- [ ] Redeploy backend

### 5. Test Deployment
- [ ] Visit frontend URL
- [ ] Test registration/login
- [ ] Submit a test complaint
- [ ] Verify AI classification works
- [ ] Test agent dashboard
- [ ] Verify AI Agent Assist auto-generates

## 📝 Important Notes

- Never commit .env files (already in .gitignore)
- PRESENTATION.md is excluded from git
- Backend uses Python 3.11.9
- Frontend uses Vite + React
- Free tier limits: Render (750 hours/month), Vercel (unlimited hobby projects)
