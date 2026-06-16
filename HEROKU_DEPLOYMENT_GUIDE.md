# RediForge Heroku Deployment Guide

## Complete End-to-End Deployment Workflow

This guide provides all commands and instructions to deploy RediForge to Heroku.

---

## PHASE 1: GIT SETUP & VERIFICATION

### Step 1.1: Verify Git Status

```bash
cd /Users/wescollins/Documents/RediForge\ -\ Plan/app
git status
```

**Expected Output**: Shows tracked/untracked files

### Step 1.2: Add All Files

```bash
git add .
```

### Step 1.3: Verify .gitignore is Correct

Ensure the `.gitignore` file includes:
- ✅ node_modules/
- ✅ dist/ (client/dist, server/dist)
- ✅ .env
- ✅ .DS_Store
- ✅ logs/

**Status**: Already correct in the project

### Step 1.4: Commit Initial Code

```bash
git commit -m "Initial RediForge deployment to Heroku"
```

**Output**: Should show files committed

---

## PHASE 2: HEROKU APP CREATION

### Step 2.1: Install Heroku CLI (if not already installed)

```bash
# macOS using Homebrew
brew tap heroku/brew && brew install heroku

# Or download from: https://devcenter.heroku.com/articles/heroku-cli
```

### Step 2.2: Login to Heroku

```bash
heroku login
```

**Action**: Opens browser to authenticate

### Step 2.3: Create Heroku App

```bash
heroku create rediforge-plan --region us
```

**Expected Output**:
```
Creating ⬢ rediforge-plan... done
https://rediforge-plan.herokuapp.com/ | https://git.heroku.com/rediforge-plan.git
```

### Step 2.4: Verify Remote Added

```bash
git remote -v
```

**Expected Output**:
```
heroku  https://git.heroku.com/rediforge-plan.git (fetch)
heroku  https://git.heroku.com/rediforge-plan.git (push)
origin  <your-github-repo> (fetch)
origin  <your-github-repo> (push)
```

### Step 2.5: Verify App URL

Open in browser: https://rediforge-plan.herokuapp.com/

(May show error at this point - this is expected before deployment)

---

## PHASE 3: DATABASE SETUP

### Step 3.1: Add Heroku Postgres

```bash
heroku addons:create heroku-postgresql:standard-0 --app rediforge-plan
```

**Expected Output**:
```
Creating heroku-postgresql:standard-0 on ⬢ rediforge-plan... done
Database has been created and is available
 ! This database will be available in 3 seconds...
 ! It has not been shared with other apps.

The database URL is being set as the DATABASE_URL config var.
```

### Step 3.2: Retrieve Database URL

```bash
heroku config:get DATABASE_URL --app rediforge-plan
```

**Output**: Long PostgreSQL connection string
```
postgres://user:password@host:port/dbname
```

### Step 3.3: Verify Database Connection

```bash
heroku pg:info --app rediforge-plan
```

**Expected Output**: Shows database plan, followers, data size, etc.

---

## PHASE 4: ENVIRONMENT VARIABLES

### Step 4.1: Generate Required Keys

```bash
# Generate JWT_SECRET (32-character random string)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate MFA_ENCRYPTION_KEY (32-byte = 64 hex characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_IV (16-byte = 32 hex characters)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

Save these values for the next step.

### Step 4.2: Set Environment Variables on Heroku

```bash
# Core Environment
heroku config:set NODE_ENV=production --app rediforge-plan

# Database (automatically set by addon, verify)
# DATABASE_URL is set automatically

# JWT and Encryption Keys
heroku config:set JWT_SECRET="<your-generated-jwt-secret>" --app rediforge-plan
heroku config:set MFA_ENCRYPTION_KEY="<your-generated-mfa-key>" --app rediforge-plan
heroku config:set ENCRYPTION_IV="<your-generated-iv>" --app rediforge-plan

# API Configuration
heroku config:set API_BASE_URL="https://rediforge-plan.herokuapp.com/api" --app rediforge-plan
heroku config:set FRONTEND_URL="https://rediforge-plan.herokuapp.com" --app rediforge-plan

# Optional: Sentry/Logging
# heroku config:set SENTRY_DSN="<your-sentry-dsn>" --app rediforge-plan
```

### Step 4.3: Verify Environment Variables

```bash
heroku config --app rediforge-plan
```

**Expected Output**: Shows all set environment variables

---

## PHASE 5: BUILD PROCESS CONFIGURATION

### Step 5.1: Verify Root package.json Build Scripts

Check that `/app/package.json` has these scripts:

```json
{
  "scripts": {
    "start": "npm run start --prefix server",
    "heroku-postbuild": "npm run build --prefix client && npm run build --prefix server",
    "build": "npm run build --prefix client && npm run build --prefix server"
  }
}
```

**Status**: Already configured ✅

### Step 5.2: Verify Procfile

Check that `/app/Procfile` contains:

```
web: npm run start --prefix server
```

**Status**: Already configured ✅

### Step 5.3: Verify Server Frontend Serving

Check that `server/src/server.ts` has:

```typescript
// Serve static files from React build in production
if (NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientBuildPath));

  // React router fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}
```

**Status**: Already configured ✅

---

## PHASE 6: VERIFY LOCAL BUILD

### Step 6.1: Build Locally

```bash
cd /Users/wescollins/Documents/RediForge\ -\ Plan/app

# Clean build
rm -rf client/dist server/dist

# Build both
npm run build
```

**Expected Output**:
- ✅ Client builds to `client/dist`
- ✅ Server builds to `server/dist`
- ✅ No TypeScript errors

### Step 6.2: Verify Built Files Exist

```bash
# Client build
ls -la client/dist/
# Should show: assets, index.html, etc.

# Server build
ls -la server/dist/
# Should show: server.js, middleware, routes, etc.
```

---

## PHASE 7: COMMIT BUILD CONFIGURATION

```bash
cd /Users/wescollins/Documents/RediForge\ -\ Plan/app

# Add build artifacts to staging (if not in .gitignore)
# Note: dist/ is in .gitignore, so they won't be committed

# Verify everything is ready
git status

# Commit
git commit -m "Final: Heroku build and serve configuration ready for deployment"
```

---

## PHASE 8: DEPLOY TO HEROKU

### Step 8.1: Push to Heroku

```bash
cd /Users/wescollins/Documents/RediForge\ -\ Plan/app

git push heroku main
# or if on master branch:
# git push heroku master
```

**Expected Output**:
```
Counting objects: XXX, done.
Compressing objects: 100% (XXX/XXX), done.
Writing objects: 100% (XXX/XXX), done.

remote: Compiling...
remote: 
remote: -----> Building on the Heroku-20 stack
remote: -----> Using buildpack: heroku/nodejs
remote: -----> Node.js app detected
remote: -----> Creating runtime environment
...
remote: -----> Compressing...
remote: -----> Launching...
remote:  ✓ Deployed to Heroku
```

### Step 8.2: Watch Build Logs (Real-time)

```bash
heroku logs --tail --app rediforge-plan
```

**Exit**: Press `Ctrl+C` when deployment is complete

### Step 8.3: Get Full Build Log

```bash
heroku logs --app rediforge-plan
```

### Step 8.4: Verify Application Started

```bash
heroku ps --app rediforge-plan
```

**Expected Output**:
```
=== web (Free): `npm run start --prefix server` (1)
web.1: up 2024/06/15 12:34:56 +0000 (~ 2m ago)
```

### Step 8.5: Test Application

```bash
# Open in browser
open https://rediforge-plan.herokuapp.com/

# Or test via curl
curl -I https://rediforge-plan.herokuapp.com/
# Should return: HTTP/2 200
```

---

## PHASE 9: DATABASE MIGRATION (If Needed)

### Step 9.1: Run Migrations on Heroku

```bash
heroku run npm run db:migrate --app rediforge-plan
```

**Expected Output**: Migration results

### Step 9.2: Seed Database (Optional)

```bash
heroku run npm run db:seed --app rediforge-plan
```

**Expected Output**: Seed results

### Step 9.3: Verify Database Connection from App

```bash
heroku run "psql $DATABASE_URL -c 'SELECT version();'" --app rediforge-plan
```

---

## PHASE 10: CUSTOM DOMAIN SETUP

### Step 10.1: Add Custom Domain to Heroku App

```bash
heroku domains:add plan.rediforge.com --app rediforge-plan
```

**Expected Output**:
```
Adding plan.rediforge.com to ⬢ rediforge-plan... done
 ▸ Configure your DNS provider to point to the DNS target below.
 ▸ DNS target: rediforge-plan.herokuapp.com or <exact-dns-target>
```

### Step 10.2: Get DNS Target

```bash
heroku domains --app rediforge-plan
```

**Expected Output**:
```
Domain Name                 Status      SSL Cert Status
──────────────────────────  ──────────  ─────────────────
plan.rediforge.com          pending     Pending Certificate
rediforge-plan.herokuapp.com ok          Cert issued
```

**Save the DNS target**: `rediforge-plan.herokuapp.com` or the exact CNAME shown

---

## PHASE 11: DNS CONFIGURATION

### DNS Provider: GoDaddy / Namecheap / Route53 / Cloudflare

Configure your DNS provider with these settings:

#### For CNAME Record (Recommended for subdomains):

```
Type:   CNAME
Host:   plan
Value:  rediforge-plan.herokuapp.com
TTL:    300 (or 3600)
```

#### For Apex Domain (root domain - if needed):

Use ALIAS or ANAME record (depending on provider):
```
Type:   ALIAS (or ANAME)
Host:   @
Value:  rediforge-plan.herokuapp.com
TTL:    300
```

#### DNS Provider-Specific Instructions:

**GoDaddy:**
1. Go to DNS Zone Editor
2. Click Add for new record
3. Select CNAME for Type
4. Enter: Host = "plan", Points to = "rediforge-plan.herokuapp.com"
5. Save

**Namecheap:**
1. Go to Advanced DNS
2. Click Add New Record
3. Select CNAME for Type
4. Host = "plan", Value = "rediforge-plan.herokuapp.com"
5. Save

**Route53:**
1. Go to Hosted Zone
2. Create record set
3. Name: plan.rediforge.com
4. Type: CNAME
5. Value: rediforge-plan.herokuapp.com
6. Save

**Cloudflare:**
1. Go to DNS records
2. Add CNAME record
3. Name: plan, Content: rediforge-plan.herokuapp.com
4. Proxy: DNS only (or Proxied)
5. Save

### Step 11.1: Verify DNS Propagation

```bash
# Check DNS resolution (may take 15-30 minutes)
nslookup plan.rediforge.com

# Or use dig
dig plan.rediforge.com
```

**Expected Output**:
```
plan.rediforge.com canonical name = rediforge-plan.herokuapp.com
rediforge-plan.herokuapp.com canonical name = ...
```

---

## PHASE 12: SSL/TLS CERTIFICATE

### Step 12.1: Enable Automatic Certificate Management

```bash
heroku certs:auto:enable --app rediforge-plan
```

**Expected Output**:
```
Enabling Automatic Certificate Management for ⬢ rediforge-plan... done
 ▸ Your certificate will be provided once the domain is configured.
```

### Step 12.2: Check Certificate Status

```bash
heroku certs --app rediforge-plan
```

**Expected Output** (initial):
```
Endpoint                              Common Name(s)              Expires              Trusted  Type
────────────────────────────────────  ────────────────────────  ──────────────────  ──────  ──────
rediforge-plan.herokuapp.com         rediforge-plan.herokuapp.com  2024/09/15 06:12  True    ACM
```

**Expected Output** (after DNS propagation):
```
Endpoint                              Common Name(s)              Expires              Trusted  Type
────────────────────────────────────  ────────────────────────  ──────────────────  ──────  ──────
rediforge-plan.herokuapp.com         plan.rediforge.com         2024/09/15 06:12  True    ACM
```

### Step 12.3: Verify SSL Certificate

```bash
# Test HTTPS on Heroku domain
curl -I https://rediforge-plan.herokuapp.com/
# Should return: HTTP/2 200

# Test HTTPS on custom domain (after DNS propagates)
curl -I https://plan.rediforge.com/
# Should return: HTTP/2 200
```

---

## PHASE 13: VERIFICATION & TESTING

### Step 13.1: Test Heroku Domain

```bash
# HTTPS endpoint
curl -I https://rediforge-plan.herokuapp.com/
# Expected: HTTP/2 200

# Check response headers
curl -i https://rediforge-plan.herokuapp.com/ | head -20
```

### Step 13.2: Test Custom Domain (After DNS Propagation - 15-30 min)

```bash
# HTTPS endpoint
curl -I https://plan.rediforge.com/
# Expected: HTTP/2 200

# Verify SSL certificate
openssl s_client -connect plan.rediforge.com:443
```

### Step 13.3: Smoke Tests

#### Test Frontend Loading:

```bash
# Open in browser and verify:
https://rediforge-plan.herokuapp.com/

# Should show:
- React app loads
- No console errors
- All assets load (CSS, JS)
- Images display
```

#### Test API Endpoints:

```bash
# Test health check
curl https://rediforge-plan.herokuapp.com/api/health

# Test authentication endpoint
curl -X POST https://rediforge-plan.herokuapp.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

#### Test Database Connection:

```bash
# Run a test query
heroku run "psql $DATABASE_URL -c 'SELECT COUNT(*) FROM users;'" --app rediforge-plan
```

#### Test Environment Variables:

```bash
# Verify all vars are set
heroku config --app rediforge-plan
```

### Step 13.4: Monitor Application Health

```bash
# View logs for any errors
heroku logs --tail --app rediforge-plan

# View dyno status
heroku ps --app rediforge-plan

# View metrics
heroku metrics --app rediforge-plan
```

---

## PHASE 14: POST-DEPLOYMENT CHECKLIST

- [ ] Git repository initialized and all files committed
- [ ] Heroku app created: `rediforge-plan`
- [ ] Heroku Postgres database added (standard-0)
- [ ] Environment variables set (JWT_SECRET, MFA_ENCRYPTION_KEY, etc.)
- [ ] Root package.json build scripts verified
- [ ] Procfile configured correctly
- [ ] Server frontend serving logic in place
- [ ] Local build successful (client/dist + server/dist created)
- [ ] Deployment successful (git push heroku main)
- [ ] Application running on Heroku dyno
- [ ] Database migrations run (if needed)
- [ ] Custom domain added (plan.rediforge.com)
- [ ] DNS records configured (CNAME)
- [ ] SSL certificate provisioned (ACM enabled)
- [ ] HTTPS working on both domains
- [ ] Frontend loads without errors
- [ ] API endpoints responding
- [ ] Database queries working
- [ ] Logs monitored for errors

---

## TROUBLESHOOTING GUIDE

### Issue: Build fails with "npm ERR! code E403"

**Solution**:
```bash
# Clear npm cache
heroku run "npm cache clean --force" --app rediforge-plan

# Or rebuild
heroku rebuild --app rediforge-plan
```

### Issue: "Cannot find module" error at runtime

**Solution**:
```bash
# Ensure dependencies installed
heroku run "npm install" --app rediforge-plan

# Check logs
heroku logs --tail --app rediforge-plan
```

### Issue: Database connection failing

**Solution**:
```bash
# Verify DATABASE_URL is set
heroku config:get DATABASE_URL --app rediforge-plan

# Test connection
heroku run "psql $DATABASE_URL -c 'SELECT 1;'" --app rediforge-plan

# Run migrations
heroku run npm run db:migrate --app rediforge-plan
```

### Issue: SSL certificate not issued

**Solution**:
```bash
# Verify DNS is configured
nslookup plan.rediforge.com

# Check certificate status
heroku certs --app rediforge-plan

# Refresh certificate
heroku certs:auto:refresh --app rediforge-plan
```

### Issue: Custom domain returns 404

**Solution**:
```bash
# Verify domain added to app
heroku domains --app rediforge-plan

# Verify DNS CNAME
dig plan.rediforge.com +short

# Wait for DNS propagation (up to 48 hours, usually 15-30 min)
```

### Issue: Environment variables not accessible in app

**Solution**:
```bash
# Verify vars set
heroku config --app rediforge-plan

# Restart dyno
heroku restart --app rediforge-plan

# Check if vars are being read
heroku run "echo $JWT_SECRET" --app rediforge-plan
```

---

## USEFUL HEROKU COMMANDS

```bash
# View logs (real-time)
heroku logs --tail --app rediforge-plan

# View logs (last 100 lines)
heroku logs --app rediforge-plan

# View dyno status
heroku ps --app rediforge-plan

# View config vars
heroku config --app rediforge-plan

# Set env var
heroku config:set KEY=VALUE --app rediforge-plan

# Unset env var
heroku config:unset KEY --app rediforge-plan

# Run one-off command
heroku run "npm run db:migrate" --app rediforge-plan

# Restart app
heroku restart --app rediforge-plan

# View app info
heroku info --app rediforge-plan

# View database info
heroku pg:info --app rediforge-plan

# Open app in browser
heroku open --app rediforge-plan

# View releases
heroku releases --app rediforge-plan

# Rollback to previous release
heroku releases:rollback --app rediforge-plan

# Monitor metrics
heroku metrics --app rediforge-plan
```

---

## PRODUCTION BEST PRACTICES

1. **Monitor Logs Regularly**
   ```bash
   heroku logs --tail --app rediforge-plan
   ```

2. **Set Up Error Tracking** (Optional)
   ```bash
   # Add Sentry for error tracking
   heroku config:set SENTRY_DSN="your-sentry-dsn" --app rediforge-plan
   ```

3. **Enable Metrics**
   ```bash
   heroku metrics --app rediforge-plan
   ```

4. **Schedule Database Backups**
   ```bash
   # Automatic backups are enabled by default for Postgres
   # View backups
   heroku pg:backups --app rediforge-plan
   ```

5. **Monitor Dyno Performance**
   ```bash
   # View resource usage
   heroku ps --app rediforge-plan
   ```

6. **Keep Dependencies Updated**
   ```bash
   # Regularly check for updates
   npm outdated --prefix client
   npm outdated --prefix server
   ```

7. **Enable Rate Limiting** (Optional)
   - Configure in server middleware

8. **Use Environment Variables for Secrets**
   - Never commit .env files
   - Use `heroku config:set` for all secrets

---

## DEPLOYMENT SUMMARY

Your RediForge application is now deployed to Heroku with:

✅ **Frontend**: React + TypeScript (Vite) - Served from Express backend
✅ **Backend**: Express + TypeScript - Running on Heroku dyno
✅ **Database**: PostgreSQL on Heroku (standard-0 tier)
✅ **Domain**: plan.rediforge.com with SSL/TLS
✅ **Security**: Environment variables for all secrets
✅ **Performance**: Optimistic updates, caching, CDN-ready

---

**Deployment Date**: 2024-06-15
**Status**: ✅ Ready for Production
