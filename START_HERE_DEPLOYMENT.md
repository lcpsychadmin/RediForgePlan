# 🚀 RediForge Heroku Deployment - Start Here

## Welcome to Production Deployment!

This document will guide you through deploying RediForge to Heroku in less than 30 minutes.

---

## 📚 Documentation Files (Use in This Order)

### 1. **THIS FILE** (Read First - 5 min)
   - Overview and quick start
   - Checklist for first-time deployment

### 2. **DEPLOYMENT_CHECKLIST.md** (Primary Reference - 30 min)
   - Step-by-step with checkboxes
   - Verification tests for each phase
   - Most detailed deployment guide

### 3. **HEROKU_DEPLOYMENT_GUIDE.md** (Deep Dive - Reference)
   - Complete explanations
   - Troubleshooting section
   - Best practices

### 4. **HEROKU_QUICK_COMMANDS.sh** (Copy-Paste Reference)
   - All commands organized by phase
   - Quick reference during deployment

### 5. **ENVIRONMENT_VARIABLES.md** (Reference)
   - Detailed info about each environment variable
   - Key generation instructions
   - Security best practices

### 6. **DNS_CONFIGURATION_GUIDE.md** (DNS Setup - Reference)
   - Provider-specific DNS instructions
   - CNAME configuration

---

## ⚡ 5-Minute Quick Start

**If you're experienced with Heroku and just want the essentials:**

```bash
# 1. Git commit
cd /Users/wescollins/Documents/RediForge\ -\ Plan/app
git add .
git commit -m "Initial RediForge deployment to Heroku"

# 2. Create app & DB
heroku login
heroku create rediforge-plan --region us
heroku addons:create heroku-postgresql:standard-0 --app rediforge-plan

# 3. Generate keys and set env vars
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
MFA_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
IV=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")

heroku config:set NODE_ENV=production JWT_SECRET="$JWT_SECRET" MFA_ENCRYPTION_KEY="$MFA_KEY" ENCRYPTION_IV="$IV" API_BASE_URL="https://rediforge-plan.herokuapp.com/api" FRONTEND_URL="https://rediforge-plan.herokuapp.com" --app rediforge-plan

# 4. Deploy
git push heroku main

# 5. Monitor
heroku logs --tail --app rediforge-plan

# 6. Verify
curl -I https://rediforge-plan.herokuapp.com/

# Done! ✅
```

---

## 📋 First-Time Deployment Checklist

### Pre-Deployment (5 min)
- [ ] Heroku CLI installed (`heroku --version`)
- [ ] Logged into Heroku (`heroku auth:login`)
- [ ] All code committed to Git
- [ ] Local build works (`npm run build`)
- [ ] Read this file completely

### Main Deployment (15 min)
- [ ] Completed Git setup phase
- [ ] Created Heroku app
- [ ] Added PostgreSQL database
- [ ] Generated and set all environment variables
- [ ] Verified local build
- [ ] Pushed to Heroku
- [ ] Monitored deployment logs
- [ ] Verified app is running

### Post-Deployment (5 min)
- [ ] Tested app loads in browser
- [ ] Tested API endpoints
- [ ] Tested database connection
- [ ] Enabled SSL certificate
- [ ] Configured custom domain (optional)

**Total Time**: ~25-30 minutes

---

## 🎯 What You're Deploying

```
RediForge Full-Stack Application
├── Frontend: React + TypeScript (Vite)
├── Backend: Express + TypeScript
├── Database: PostgreSQL
├── Hosting: Heroku
└── Domain: plan.rediforge.com (with SSL)
```

### What Heroku Will Do Automatically
✅ Build your client (Vite)
✅ Build your server (TypeScript → JavaScript)
✅ Create the database
✅ Issue SSL certificate
✅ Run your app on public internet
✅ Keep it running 24/7

---

## 🔑 Key Concepts

### 1. Monorepo Structure
Your app has a root `package.json` that orchestrates both client and server builds.

**Build Flow**:
```
git push → Heroku detects Node.js app
         → Runs heroku-postbuild script
         → Builds client to client/dist
         → Builds server to server/dist
         → Starts app with: npm start
```

### 2. Server Serves Frontend
Express server doesn't just provide APIs. It also serves your React app:
- Static files: `express.static(client/dist)`
- React routing: Wildcard route returns index.html

### 3. Environment Variables
All secrets and configuration stored in Heroku config vars (not in code).

**Why?**
- Never committed to Git
- Can be changed without redeploying
- Secure and follows best practices
- Different values per environment

---

## 📊 Deployment Phases (14 Total)

| Phase | Duration | Task |
|-------|----------|------|
| 1 | 2 min | Git setup & commit |
| 2 | 1 min | Create Heroku app |
| 3 | 2 min | Add PostgreSQL database |
| 4 | 3 min | Set environment variables |
| 5 | 1 min | Verify build configuration |
| 6 | 2 min | Test local build |
| 7 | 1 min | Git commit config |
| 8 | 5 min | Deploy to Heroku |
| 9 | 2 min | Run database migrations |
| 10 | 1 min | Configure custom domain |
| 11 | 1 min | Add DNS records (manual) |
| 12 | 2 min | Enable SSL certificate |
| 13 | 2 min | Verify & test |
| 14 | 1 min | Post-deployment tasks |

**Total**: ~25-30 minutes

---

## 🚨 Common Mistakes to Avoid

❌ **DON'T**: Commit .env files
✅ **DO**: Use `heroku config:set` for secrets

❌ **DON'T**: Use weak keys/secrets
✅ **DO**: Generate cryptographically secure keys

❌ **DON'T**: Skip database migrations
✅ **DO**: Run `heroku run npm run db:migrate`

❌ **DON'T**: Use http:// in API_BASE_URL
✅ **DO**: Use https://

❌ **DON'T**: Deploy without testing locally
✅ **DO**: Test local build first

---

## ✨ Success Indicators

After deployment, you should see:

✅ **Application Running**
```bash
$ heroku ps --app rediforge-plan
=== web (Free): `npm run start --prefix server` (1)
web.1: up 2024/06/15 12:34:56
```

✅ **API Responding**
```bash
$ curl -I https://rediforge-plan.herokuapp.com/
HTTP/2 200
content-type: text/html; charset=utf-8
```

✅ **Database Connected**
```bash
$ heroku run "psql $DATABASE_URL -c 'SELECT 1;'" --app rediforge-plan
 ?column? 
----------
        1
(1 row)
```

✅ **App Loads in Browser**
- Opens https://rediforge-plan.herokuapp.com/
- React app renders
- No console errors
- All assets load

---

## 📞 Need Help?

### Quick Lookup

**Something went wrong?**
→ See **HEROKU_DEPLOYMENT_GUIDE.md** → Troubleshooting Section

**Need command reference?**
→ See **HEROKU_QUICK_COMMANDS.sh**

**Setting environment variables?**
→ See **ENVIRONMENT_VARIABLES.md**

**Configuring DNS?**
→ See **DNS_CONFIGURATION_GUIDE.md**

**Step-by-step walkthrough?**
→ See **DEPLOYMENT_CHECKLIST.md** (recommended for first-time)

---

## 🎓 Learning Paths

### Path 1: Just Deploy It (Recommended for first-time)
1. Read this file
2. Follow **DEPLOYMENT_CHECKLIST.md** step by step
3. Copy commands from **HEROKU_QUICK_COMMANDS.sh**
4. Reference other docs as needed

### Path 2: Understand Everything
1. Read **HEROKU_DEPLOYMENT_GUIDE.md** completely
2. Follow **DEPLOYMENT_CHECKLIST.md**
3. Reference other docs as needed
4. Now you understand the full picture

### Path 3: Already Know Heroku
1. Read this file
2. Copy commands from **HEROKU_QUICK_COMMANDS.sh**
3. Deploy!
4. Reference docs only if issues arise

---

## 🔄 Important Files Already Set Up

These are already configured correctly in your project:

✅ **package.json** - Has correct build scripts
✅ **Procfile** - Tells Heroku how to start app
✅ **server/src/server.ts** - Serves frontend in production
✅ **client/package.json** - Has build script
✅ **.gitignore** - Excludes node_modules, dist, .env

**You don't need to modify these - they're ready to go!**

---

## 📝 Quick Reference

### Commands You'll Need

```bash
# Heroku login
heroku login

# Create app
heroku create rediforge-plan --region us

# Add database
heroku addons:create heroku-postgresql:standard-0 --app rediforge-plan

# Set environment variable
heroku config:set KEY=VALUE --app rediforge-plan

# Deploy
git push heroku main

# View logs
heroku logs --tail --app rediforge-plan

# Open app
heroku open --app rediforge-plan

# Run migrations
heroku run npm run db:migrate --app rediforge-plan

# View config
heroku config --app rediforge-plan
```

---

## 🎯 Ready to Deploy?

### Step 1: Choose Your Path
- **First time with Heroku?** → Follow DEPLOYMENT_CHECKLIST.md
- **Experienced?** → Copy commands from HEROKU_QUICK_COMMANDS.sh
- **Want to learn?** → Read HEROKU_DEPLOYMENT_GUIDE.md first

### Step 2: Generate Your Secrets
```bash
# These will be unique to your deployment
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
MFA_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
IV=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")

# Save these somewhere temporarily (you'll need them in next step)
echo "JWT_SECRET: $JWT_SECRET"
echo "MFA_KEY: $MFA_KEY"
echo "IV: $IV"
```

### Step 3: Start Deployment
Pick your guide and follow it!

---

## 🎉 You've Got This!

RediForge deployment is straightforward:
1. **Create Heroku app** (1 command)
2. **Add database** (1 command)
3. **Set environment variables** (1 command)
4. **Deploy** (1 git push)
5. **Done!** ✅

The hardest part is probably DNS configuration (Phase 11), but we have a detailed guide for that.

---

## 📞 Support Resources

- **Heroku Docs**: https://devcenter.heroku.com/
- **Node.js on Heroku**: https://devcenter.heroku.com/articles/nodejs-support
- **Heroku PostgreSQL**: https://devcenter.heroku.com/articles/heroku-postgresql
- **SSL/TLS**: https://devcenter.heroku.com/articles/ssl
- **Custom Domains**: https://devcenter.heroku.com/articles/custom-domains

---

## 📋 Next Steps

**Ready to begin?**

→ Open **DEPLOYMENT_CHECKLIST.md** and follow Phase 1

---

**Status**: 🟢 Ready to Deploy
**Estimated Time**: 25-30 minutes
**Difficulty**: ⭐⭐ (Beginner-friendly)

**Good luck! You've got this! 🚀**
