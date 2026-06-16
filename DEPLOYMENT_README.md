# RediForge Heroku Deployment - Complete Package

## 📋 Documentation Overview

This package contains all the information, commands, and checklists needed to successfully deploy RediForge to Heroku.

### Files Included:

1. **HEROKU_DEPLOYMENT_GUIDE.md** (THIS FILE)
   - Complete end-to-end deployment workflow
   - Detailed explanations for each phase
   - Troubleshooting section
   - Useful commands reference

2. **HEROKU_QUICK_COMMANDS.sh**
   - Quick reference with all commands
   - Organized by deployment phase
   - Copy-paste ready

3. **DEPLOYMENT_CHECKLIST.md**
   - Step-by-step checkklist format
   - Track progress as you go
   - Verification steps for each phase

---

## 🚀 Quick Start (TL;DR)

If you just want to deploy quickly:

1. Read: **DEPLOYMENT_CHECKLIST.md**
2. Copy commands from: **HEROKU_QUICK_COMMANDS.sh**
3. Follow the phases in order

For detailed information about what's happening at each step, refer to: **HEROKU_DEPLOYMENT_GUIDE.md**

---

## 📦 Project Structure

```
/app
├── client/
│   ├── src/          (React + TypeScript)
│   ├── dist/         (Built client - created by `npm run build`)
│   └── package.json  (Client dependencies)
│
├── server/
│   ├── src/          (Express + TypeScript)
│   ├── dist/         (Built server - created by `npm run build`)
│   └── package.json  (Server dependencies)
│
├── db/               (Database scripts)
├── package.json      (Root scripts)
├── Procfile          (Heroku process definition)
└── .gitignore        (Git ignore rules)
```

---

## ✅ Pre-Deployment Verification

Before you start, ensure:

- [ ] Heroku CLI installed (`heroku --version`)
- [ ] Logged into Heroku (`heroku auth:login`)
- [ ] Node.js 16+ installed locally
- [ ] Git initialized and all changes committed
- [ ] All environment variables documented
- [ ] Dependencies installed locally (`npm install`)
- [ ] Local build works (`npm run build`)

---

## 🔑 Key Deployment Concepts

### 1. Monorepo Structure
- Root `package.json` orchestrates builds
- Client (React/Vite) builds to `client/dist`
- Server (Express/TypeScript) builds to `server/dist`
- Heroku runs root build then starts server

### 2. Build Process
```
Git push → Heroku detects Node.js project
         → Runs `npm install` (root + workspaces)
         → Runs `heroku-postbuild` script
         → Client builds: `npm run build --prefix client`
         → Server builds: `npm run build --prefix server`
         → Starts app with: `npm run start --prefix server`
```

### 3. Frontend Serving
```
Express Server (port 5000)
├── Serves API routes: /api/*
├── Serves frontend static files: client/dist/*
└── Wildcard route → serves index.html (React Router)
```

### 4. Environment Variables
- Database connection: `DATABASE_URL` (set by add-on)
- Secrets: `JWT_SECRET`, `MFA_ENCRYPTION_KEY`, `ENCRYPTION_IV`
- API URLs: `API_BASE_URL`, `FRONTEND_URL`
- Mode: `NODE_ENV=production`

---

## 📊 Deployment Phases

### Phase 1: Git Setup
Prepare repository, verify .gitignore, initial commit

### Phase 2: Heroku App Creation
Create app on Heroku infrastructure

### Phase 3: Database Setup
Add PostgreSQL database add-on

### Phase 4: Environment Variables
Set all required environment variables

### Phase 5: Build Configuration Verification
Verify package.json, Procfile, server setup

### Phase 6: Local Build Verification
Test that builds work locally before pushing

### Phase 7: Git Commit
Commit any configuration changes

### Phase 8: Deploy to Heroku
Push code to Heroku Git remote (triggers build)

### Phase 9: Database Initialization
Run migrations and seed data

### Phase 10: Custom Domain Setup
Add custom domain (plan.rediforge.com)

### Phase 11: DNS Configuration
Update DNS provider with CNAME record

### Phase 12: SSL/TLS Certificate
Enable automatic certificate management

### Phase 13: Verification & Testing
Test app works on both URLs

### Phase 14: Post-Deployment Tasks
Setup monitoring, backups, documentation

---

## 🔐 Security Best Practices

### Environment Variables
✅ **DO:**
- Use `heroku config:set` for all secrets
- Generate cryptographically secure keys
- Store in Heroku config (not in code)
- Rotate keys periodically

❌ **DON'T:**
- Commit .env files
- Share credentials in chat
- Use weak/predictable keys
- Store secrets in code

### HTTPS/SSL
✅ **Enabled:**
- Automatic SSL certificate via ACM
- Redirects HTTP → HTTPS
- Valid certificate for custom domain

### Database
✅ **Secured:**
- Connection via DATABASE_URL
- No hardcoded credentials
- Automatic backups enabled
- Standard-0 tier has built-in security

---

## 📈 Performance Considerations

### Dyno Size
- Default: Free dyno (good for testing)
- Production: Hobby or higher recommended
  ```bash
  heroku dyno:type web=hobby-basic --app rediforge-plan
  ```

### Build Size
- Client: ~2-5MB minified
- Server: ~1-3MB minified
- Total: Well within Heroku slug limits (500MB)

### Database
- Standard-0: Good for small-medium apps
- Upgrade if experiencing slowness
  ```bash
  heroku addons:upgrade heroku-postgresql:standard-1 --app rediforge-plan
  ```

### Caching
- Use cache headers for static assets
- Implement API response caching
- Redis add-on (optional): for sessions/cache
  ```bash
  heroku addons:create heroku-redis:premium-0 --app rediforge-plan
  ```

---

## 🔄 Continuous Deployment Workflow

### After Initial Deployment

**For future updates:**
```bash
# Make code changes
git add .
git commit -m "Your commit message"

# Deploy
git push heroku main

# Monitor
heroku logs --tail --app rediforge-plan
```

---

## 📞 Support & Troubleshooting

### Common Issues & Solutions

#### Build Fails
```bash
# Clear cache and retry
heroku rebuild --app rediforge-plan
```

#### App Won't Start
```bash
# Check startup command
heroku ps --app rediforge-plan

# View recent logs
heroku logs --app rediforge-plan

# Restart app
heroku restart --app rediforge-plan
```

#### Database Connection Error
```bash
# Verify DATABASE_URL set
heroku config:get DATABASE_URL --app rediforge-plan

# Test connection
heroku run "psql $DATABASE_URL -c 'SELECT 1;'" --app rediforge-plan
```

#### Domain Not Resolving
```bash
# Check DNS
nslookup plan.rediforge.com

# Check Heroku domains
heroku domains --app rediforge-plan

# Wait for DNS propagation (up to 48 hours)
```

#### SSL Certificate Not Issued
```bash
# Verify ACM enabled
heroku certs --app rediforge-plan

# Wait for DNS propagation first
# Then refresh certificate
heroku certs:auto:refresh --app rediforge-plan
```

---

## 📚 Additional Resources

### Heroku Documentation
- [Heroku Node.js Support](https://devcenter.heroku.com/articles/nodejs-support)
- [Heroku PostgreSQL](https://devcenter.heroku.com/articles/heroku-postgresql)
- [Custom Domains](https://devcenter.heroku.com/articles/custom-domains)
- [SSL/TLS](https://devcenter.heroku.com/articles/ssl)

### Useful Commands Reference
```bash
# App Management
heroku create APPNAME --region us          # Create app
heroku apps                                # List apps
heroku open --app APPNAME                  # Open in browser
heroku info --app APPNAME                  # Get app info
heroku destroy --app APPNAME               # Delete app

# Configuration
heroku config --app APPNAME                # View all vars
heroku config:get KEY --app APPNAME        # Get single var
heroku config:set KEY=VALUE --app APPNAME  # Set var
heroku config:unset KEY --app APPNAME      # Remove var

# Deployment
git push heroku main                       # Deploy
heroku releases --app APPNAME              # View history
heroku releases:rollback --app APPNAME     # Rollback

# Logs & Monitoring
heroku logs --app APPNAME                  # View logs
heroku logs --tail --app APPNAME           # Stream logs
heroku metrics --app APPNAME               # View metrics
heroku ps --app APPNAME                    # View processes

# Database
heroku pg:info --app APPNAME               # Database info
heroku pg:backups --app APPNAME            # Backups
heroku run COMMAND --app APPNAME           # Run one-off command

# Domains
heroku domains --app APPNAME               # View domains
heroku domains:add DOMAIN --app APPNAME    # Add domain
heroku domains:remove DOMAIN --app APPNAME # Remove domain

# SSL
heroku certs --app APPNAME                 # View certificates
heroku certs:auto:enable --app APPNAME     # Enable ACM
heroku certs:auto:disable --app APPNAME    # Disable ACM
```

---

## ✨ Success Indicators

After deployment is complete, you should have:

✅ **Application Running**
- App accessible at https://rediforge-plan.herokuapp.com/
- React frontend renders
- No console errors in browser

✅ **API Working**
- API endpoints responding at /api/*
- Database queries working
- Authentication functional

✅ **Domain Working**
- Custom domain resolves: https://plan.rediforge.com/
- SSL certificate valid (no browser warnings)
- HTTPS enforced (HTTP redirects to HTTPS)

✅ **Database Working**
- Migrations run successfully
- Data persists across restarts
- Backups enabled

✅ **Monitoring Active**
- Logs accessible: `heroku logs --app rediforge-plan`
- Metrics showing: `heroku metrics --app rediforge-plan`
- Alerts configured (if applicable)

---

## 📝 Deployment Record

**Date Deployed**: ________________
**Deployed By**: ________________
**Status**: ✅ Production Ready

**URLs:**
- Heroku: https://rediforge-plan.herokuapp.com/
- Custom: https://plan.rediforge.com/

**Database**: PostgreSQL (standard-0)
**Region**: us
**Node Version**: 16+ (Heroku default)

**Environment Variables Set:**
- [ ] NODE_ENV=production
- [ ] JWT_SECRET
- [ ] MFA_ENCRYPTION_KEY
- [ ] ENCRYPTION_IV
- [ ] API_BASE_URL
- [ ] FRONTEND_URL
- [ ] DATABASE_URL (auto-set)

**Post-Deployment Tasks:**
- [ ] Verified app loads
- [ ] Verified API working
- [ ] Verified database connected
- [ ] Verified SSL certificate
- [ ] Informed team of deployment
- [ ] Documented for future reference

---

## 🎉 Congratulations!

Your RediForge application is now deployed to production on Heroku with:

- ✅ React + TypeScript frontend
- ✅ Express + TypeScript backend
- ✅ PostgreSQL database
- ✅ Custom domain with SSL
- ✅ Automatic backups
- ✅ Production monitoring
- ✅ Scalable infrastructure

**Next Steps:**
1. Monitor logs regularly
2. Set up error tracking (Sentry, etc.)
3. Configure production backups
4. Plan for scaling if needed
5. Maintain security best practices

---

**For questions or issues, refer to:**
- HEROKU_DEPLOYMENT_GUIDE.md (detailed info)
- HEROKU_QUICK_COMMANDS.sh (command reference)
- DEPLOYMENT_CHECKLIST.md (step-by-step guide)
