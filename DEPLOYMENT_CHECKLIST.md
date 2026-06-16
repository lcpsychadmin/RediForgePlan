# RediForge Heroku Deployment - Step-by-Step Checklist

## Pre-Deployment Checklist (Before You Start)

- [ ] Have Heroku CLI installed (`heroku --version` to verify)
- [ ] Heroku account created and logged in (`heroku login`)
- [ ] GitHub repo configured (optional but recommended)
- [ ] All code committed to Git
- [ ] Node.js 16+ installed locally
- [ ] Environment variables documented

---

## PHASE 1: GIT SETUP & VERIFICATION

### 1.1 Navigate to Project Root
```bash
cd /Users/wescollins/Documents/RediForge\ -\ Plan/app
pwd  # Verify current directory
```
- [ ] In correct directory

### 1.2 Check Git Status
```bash
git status
```
- [ ] Shows staged/unstaged files
- [ ] No error messages
- [ ] .git directory exists

### 1.3 Add All Files
```bash
git add .
```
- [ ] Files added to staging

### 1.4 Verify .gitignore
Check `.git ignore` contains:
- [ ] node_modules/
- [ ] dist/ (client/dist, server/dist)
- [ ] .env
- [ ] .DS_Store

### 1.5 Initial Commit
```bash
git commit -m "Initial RediForge deployment to Heroku"
```
- [ ] Commit successful
- [ ] Shows files committed

---

## PHASE 2: HEROKU APP CREATION

### 2.1 Verify Heroku CLI
```bash
heroku --version
which heroku
```
- [ ] Heroku CLI installed
- [ ] Version > 7.0

### 2.2 Login to Heroku
```bash
heroku login
```
- [ ] Browser opens to authenticate
- [ ] Login successful
- [ ] Returns to terminal

### 2.3 Create Heroku App
```bash
heroku create rediforge-plan --region us
```
- [ ] App created successfully
- [ ] Output shows: `https://rediforge-plan.herokuapp.com/`
- [ ] Git remote added

### 2.4 Verify Remote Added
```bash
git remote -v
```
- [ ] Shows `heroku` remote
- [ ] URL: `https://git.heroku.com/rediforge-plan.git`

### 2.5 Verify App Exists
```bash
heroku apps --app rediforge-plan
```
- [ ] App listed
- [ ] Region shows as "us"

---

## PHASE 3: DATABASE SETUP

### 3.1 Add PostgreSQL Add-on
```bash
heroku addons:create heroku-postgresql:standard-0 --app rediforge-plan
```
- [ ] Add-on created successfully
- [ ] Shows: "Database has been created and is available"
- [ ] DATABASE_URL automatically set

### 3.2 Verify Database Added
```bash
heroku addons --app rediforge-plan
```
- [ ] Shows `heroku-postgresql:standard-0`
- [ ] Status shows "created"

### 3.3 Get Database URL
```bash
heroku config:get DATABASE_URL --app rediforge-plan
```
- [ ] Long PostgreSQL connection string returned
- [ ] Format: `postgres://user:pass@host:port/dbname`
- [ ] Save this (it's your DATABASE_URL)

### 3.4 Verify Database Info
```bash
heroku pg:info --app rediforge-plan
```
- [ ] Shows plan, followers, data size
- [ ] Status shows "available"

---

## PHASE 4: ENVIRONMENT VARIABLES

### 4.1 Generate Required Keys

**Option A: Generate all at once**
```bash
echo "JWT_SECRET: $(node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
echo "MFA_ENCRYPTION_KEY: $(node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
echo "ENCRYPTION_IV: $(node -e \"console.log(require('crypto').randomBytes(16).toString('hex'))\")"
```

**Option B: Generate individually (then copy/paste)**
```bash
# JWT_SECRET (save the output)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# MFA_ENCRYPTION_KEY (save the output)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ENCRYPTION_IV (save the output)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

- [ ] JWT_SECRET copied
- [ ] MFA_ENCRYPTION_KEY copied
- [ ] ENCRYPTION_IV copied

### 4.2 Set Environment Variables

```bash
# Node environment
heroku config:set NODE_ENV=production --app rediforge-plan

# JWT and encryption keys
heroku config:set JWT_SECRET="<PASTE_YOUR_JWT_SECRET_HERE>" --app rediforge-plan
heroku config:set MFA_ENCRYPTION_KEY="<PASTE_YOUR_MFA_KEY_HERE>" --app rediforge-plan
heroku config:set ENCRYPTION_IV="<PASTE_YOUR_IV_HERE>" --app rediforge-plan

# API URLs
heroku config:set API_BASE_URL="https://rediforge-plan.herokuapp.com/api" --app rediforge-plan
heroku config:set FRONTEND_URL="https://rediforge-plan.herokuapp.com" --app rediforge-plan
```

- [ ] NODE_ENV set to "production"
- [ ] JWT_SECRET set
- [ ] MFA_ENCRYPTION_KEY set
- [ ] ENCRYPTION_IV set
- [ ] API_BASE_URL set
- [ ] FRONTEND_URL set

### 4.3 Verify All Variables
```bash
heroku config --app rediforge-plan
```

- [ ] All 6 variables listed
- [ ] Values not empty
- [ ] DATABASE_URL present (auto-set by add-on)

---

## PHASE 5: BUILD CONFIGURATION VERIFICATION

### 5.1 Verify Root package.json

Check `/app/package.json` has:
```json
"scripts": {
  "start": "npm run start --prefix server",
  "heroku-postbuild": "npm run build --prefix client && npm run build --prefix server"
}
```

- [ ] "start" script present ✅
- [ ] "heroku-postbuild" script present ✅

### 5.2 Verify Procfile

Check `/app/Procfile` contains:
```
web: npm run start --prefix server
```

- [ ] Procfile exists ✅
- [ ] Content correct ✅

### 5.3 Verify Server Frontend Serving

Check `/app/server/src/server.ts` has production serving logic:
```typescript
if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}
```

- [ ] Production check present ✅
- [ ] Static serving configured ✅
- [ ] Wildcard route present ✅

---

## PHASE 6: LOCAL BUILD VERIFICATION

### 6.1 Clean Previous Builds
```bash
cd /Users/wescollins/Documents/RediForge\ -\ Plan/app
rm -rf client/dist server/dist
```

- [ ] Cleaned successfully

### 6.2 Build Both Client and Server
```bash
npm run build
```

**Expected output:**
- Client builds to `client/dist`
- Server builds to `server/dist`
- No TypeScript errors

- [ ] Build completed without errors
- [ ] No TypeScript errors
- [ ] Build time < 2 minutes

### 6.3 Verify Build Outputs

**Client build:**
```bash
ls -la client/dist/
```
- [ ] assets/ directory exists
- [ ] index.html exists
- [ ] Size > 100KB

**Server build:**
```bash
ls -la server/dist/
```
- [ ] server.js exists
- [ ] Routes directory exists
- [ ] middleware directory exists

---

## PHASE 7: GIT COMMIT BUILD CONFIG

```bash
cd /Users/wescollins/Documents/RediForge\ -\ Plan/app
git status
git add .
git commit -m "Final: Heroku build and serve configuration ready for deployment"
```

- [ ] Status clean
- [ ] Commit successful

---

## PHASE 8: DEPLOY TO HEROKU

### 8.1 Initial Deployment Push
```bash
cd /Users/wescollins/Documents/RediForge\ -\ Plan/app
git push heroku main
# Or: git push heroku master
```

- [ ] Pushing to remote...
- [ ] Output shows "Building on the Heroku-20 stack"
- [ ] Node.js app detected
- [ ] Dependencies installed
- [ ] Builds completed

**Expected timeframe**: 3-5 minutes

### 8.2 Monitor Build Process

**Option A: Watch logs in real-time**
```bash
heroku logs --tail --app rediforge-plan
```

- [ ] Build logs showing
- [ ] No critical errors
- [ ] Final message: "Deployed to Heroku"
- [ ] Exit with Ctrl+C when complete

**Option B: View full log after deployment**
```bash
heroku logs --app rediforge-plan
```

- [ ] Shows build process
- [ ] Shows startup
- [ ] "Server running on port 5000" message visible

### 8.3 Verify Application Started

```bash
heroku ps --app rediforge-plan
```

**Expected output:**
```
=== web (Free): `npm run start --prefix server` (1)
web.1: up 2024/06/15 XX:XX:XX +0000
```

- [ ] Dyno is "up"
- [ ] Status shows recent uptime
- [ ] Running the correct command

### 8.4 Check App Health

```bash
curl -I https://rediforge-plan.herokuapp.com/
```

**Expected output:**
```
HTTP/2 200
content-type: text/html; charset=utf-8
```

- [ ] Returns HTTP 200
- [ ] Serves HTML content

### 8.5 Open in Browser

```bash
heroku open --app rediforge-plan
# Or: open https://rediforge-plan.herokuapp.com/
```

- [ ] App loads in browser
- [ ] React app renders
- [ ] No console errors (check DevTools)
- [ ] All assets load (CSS, JS, images)

---

## PHASE 9: DATABASE INITIALIZATION

### 9.1 Run Database Migrations

```bash
heroku run npm run db:migrate --app rediforge-plan
```

- [ ] Migrations run successfully
- [ ] No SQL errors
- [ ] Tables created

### 9.2 Optional: Seed Database

```bash
heroku run npm run db:seed --app rediforge-plan
```

- [ ] Seed data inserted (if needed)
- [ ] No errors

### 9.3 Verify Database Connection

```bash
heroku run "psql $DATABASE_URL -c 'SELECT version();'" --app rediforge-plan
```

- [ ] Returns PostgreSQL version
- [ ] Connection working

---

## PHASE 10: CUSTOM DOMAIN SETUP

### 10.1 Add Domain to Heroku App

```bash
heroku domains:add plan.rediforge.com --app rediforge-plan
```

**Expected output:**
```
Adding plan.rediforge.com to ⬢ rediforge-plan... done
Configure your DNS provider to point to the DNS target below.
DNS target: rediforge-plan.herokuapp.com
```

- [ ] Domain added successfully
- [ ] DNS target shown

### 10.2 Note DNS Target

```bash
heroku domains --app rediforge-plan
```

**Expected output:**
```
Domain Name              Status   SSL Cert Status
─────────────────────────────────────────────────
plan.rediforge.com       pending  Pending Certificate
rediforge-plan.herokuapp.com  ok   Cert issued
```

- [ ] Domain shown as "pending" (will become "ok" after DNS updates)
- [ ] DNS target noted: `rediforge-plan.herokuapp.com`

---

## PHASE 11: DNS CONFIGURATION

### 11.1 Access Your DNS Provider

Login to your DNS provider:
- GoDaddy, Namecheap, Route53, Cloudflare, etc.

### 11.2 Add CNAME Record

**Standard approach (subdomain):**
```
Type:   CNAME
Host:   plan
Value:  rediforge-plan.herokuapp.com
TTL:    300 (or 3600)
```

**For different providers:**

**GoDaddy:**
- Go to DNS Zone Editor
- Click Add for new record
- Type: CNAME
- Name: plan
- Points to: rediforge-plan.herokuapp.com
- Save

**Namecheap:**
- Go to Advanced DNS
- Click Add New Record
- Type: CNAME
- Host: plan
- Value: rediforge-plan.herokuapp.com
- Save

**Route53:**
- Create Record Set
- Name: plan.rediforge.com
- Type: CNAME
- Value: rediforge-plan.herokuapp.com
- Create

**Cloudflare:**
- Add Record
- Type: CNAME
- Name: plan
- Content: rediforge-plan.herokuapp.com
- Save

- [ ] CNAME record added

### 11.3 Verify DNS Propagation

```bash
# Check DNS (may take 15-30 minutes to propagate)
nslookup plan.rediforge.com
# or
dig plan.rediforge.com +short
```

**Expected output:**
```
plan.rediforge.com canonical name = rediforge-plan.herokuapp.com
```

- [ ] DNS resolves to Heroku app
- [ ] Propagation complete (may take up to 48 hours, usually 15-30 min)

---

## PHASE 12: SSL/TLS CERTIFICATE

### 12.1 Enable Automatic Certificate Management

```bash
heroku certs:auto:enable --app rediforge-plan
```

**Expected output:**
```
Enabling Automatic Certificate Management for ⬢ rediforge-plan... done
Your certificate will be provided once the domain is configured.
```

- [ ] ACM enabled successfully

### 12.2 Monitor Certificate Status

```bash
heroku certs --app rediforge-plan
```

**Initial status (DNS pending):**
```
Endpoint                       Common Name(s)              Status
─────────────────────────────────────────────────────────────────
rediforge-plan.herokuapp.com   rediforge-plan.herokuapp.com  ok
```

**After DNS propagates (5-30 minutes):**
```
Endpoint                       Common Name(s)              Status
─────────────────────────────────────────────────────────────────
rediforge-plan.herokuapp.com   plan.rediforge.com          ok
```

- [ ] Certificate issued for plan.rediforge.com

### 12.3 Test HTTPS Endpoints

```bash
# Heroku domain
curl -I https://rediforge-plan.herokuapp.com/
# Expected: HTTP/2 200

# Custom domain (after DNS propagates)
curl -I https://plan.rediforge.com/
# Expected: HTTP/2 200

# Or use openssl to verify certificate
openssl s_client -connect plan.rediforge.com:443
```

- [ ] Heroku domain HTTPS working
- [ ] Custom domain HTTPS working (after DNS propagates)
- [ ] Certificate valid and not self-signed

---

## PHASE 13: FINAL VERIFICATION & TESTING

### 13.1 Test Heroku Domain

```bash
# Open in browser
open https://rediforge-plan.herokuapp.com/
```

**Verify:**
- [ ] App loads
- [ ] No console errors (check DevTools → Console)
- [ ] All assets load (CSS, JS)
- [ ] Images display
- [ ] API calls work (check Network tab)
- [ ] No 404 errors for static assets

### 13.2 Test Custom Domain (After DNS Propagates)

```bash
# Open in browser (wait 15-30 min after DNS change)
open https://plan.rediforge.com/
```

**Verify:**
- [ ] App loads
- [ ] URL shows https://plan.rediforge.com/
- [ ] SSL certificate valid (no warnings)
- [ ] Redirects from http:// to https://

### 13.3 Test API Endpoints

```bash
# Test health check (if available)
curl https://rediforge-plan.herokuapp.com/api/health
# Expected: 200 OK or similar success response

# Test authentication
curl -X POST https://rediforge-plan.herokuapp.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
# Expected: 200, 400, or 401 (depends on credentials)
```

- [ ] API endpoints responding
- [ ] Proper HTTP status codes
- [ ] No CORS errors

### 13.4 Test Database

```bash
heroku run "psql $DATABASE_URL -c 'SELECT COUNT(*) FROM users;'" --app rediforge-plan
```

- [ ] Query returns count
- [ ] No connection errors

### 13.5 Check Application Logs

```bash
heroku logs --app rediforge-plan | head -50
```

- [ ] No critical errors
- [ ] App startup logged correctly
- [ ] No unhandled exceptions

---

## PHASE 14: POST-DEPLOYMENT TASKS

### 14.1 Enable Monitoring

```bash
# View metrics dashboard
heroku metrics --app rediforge-plan

# View performance data
heroku ps --app rediforge-plan

# Enable metrics for 24-hour history
# (usually enabled by default)
```

- [ ] Metrics dashboard accessible
- [ ] Dyno running properly

### 14.2 Configure Backups (Optional)

```bash
# Automatic backups enabled by default, but you can check
heroku pg:backups --app rediforge-plan
```

- [ ] Backup schedule configured

### 14.3 Set Up Alerts (Optional)

```bash
# Add monitoring/alerting service (Sentry, New Relic, etc.)
# Example for Sentry:
heroku config:set SENTRY_DSN="<your-sentry-dsn>" --app rediforge-plan
```

- [ ] Error tracking configured (optional)

### 14.4 Document Deployment Info

Save for your records:
- [ ] App name: `rediforge-plan`
- [ ] Heroku URL: `https://rediforge-plan.herokuapp.com/`
- [ ] Custom domain: `https://plan.rediforge.com/`
- [ ] Database: Heroku PostgreSQL (standard-0)
- [ ] Region: us

### 14.5 Team Communication

- [ ] Notify team of deployment
- [ ] Share production URLs
- [ ] Document any required login credentials
- [ ] Share emergency contacts for production issues

---

## ✅ DEPLOYMENT COMPLETE!

**If you've checked all boxes, your RediForge application is now live in production with:**

✅ Frontend: React + TypeScript deployed and served
✅ Backend: Express API running
✅ Database: PostgreSQL connected
✅ Domain: plan.rediforge.com with SSL/TLS
✅ Monitoring: Logs and metrics accessible
✅ Backups: Database backed up automatically

---

## 🆘 TROUBLESHOOTING

If something goes wrong, check:

1. **Build failed?**
   ```bash
   heroku logs --app rediforge-plan
   ```

2. **App not starting?**
   ```bash
   heroku ps --app rediforge-plan
   heroku logs --tail --app rediforge-plan
   ```

3. **Database not working?**
   ```bash
   heroku config:get DATABASE_URL --app rediforge-plan
   heroku pg:info --app rediforge-plan
   ```

4. **Domain not resolving?**
   ```bash
   nslookup plan.rediforge.com
   dig plan.rediforge.com
   ```

5. **API not responding?**
   ```bash
   curl -I https://rediforge-plan.herokuapp.com/
   heroku logs --tail --app rediforge-plan
   ```

---

**Deployment Date**: [Your Date]
**Deployed By**: [Your Name]
**Status**: ✅ Production Ready
