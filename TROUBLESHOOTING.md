# Heroku Deployment Troubleshooting Guide

## Quick Diagnosis Tool

Use this to identify your issue:

```bash
# App won't start?
heroku ps --app rediforge-plan
heroku logs --app rediforge-plan | tail -50

# Build failed?
heroku logs --app rediforge-plan | grep -i error

# API not responding?
curl -I https://rediforge-plan.herokuapp.com/

# Database not working?
heroku run "psql $DATABASE_URL -c 'SELECT 1;'" --app rediforge-plan

# All of the above
heroku logs --tail --app rediforge-plan  # Watch live logs
```

---

## Category 1: Deployment Issues

### Build Failed - "npm ERR!"

**Symptoms:**
```
npm ERR! code ENOENT
npm ERR! syscall open
npm ERR! path .../package.json
```

**Diagnosis:**
```bash
heroku logs --app rediforge-plan | grep -i "npm err"
```

**Solutions:**

1. **Missing package.json**
   ```bash
   # Check all package.json files exist
   git status
   # Look for deleted/missing package.json
   
   # If missing, restore it
   git restore package.json
   git restore client/package.json
   git restore server/package.json
   
   # Recommit and redeploy
   git add .
   git commit -m "Fix: restore package.json files"
   git push heroku main
   ```

2. **Dependencies missing**
   ```bash
   # Reinstall locally
   rm -rf node_modules client/node_modules server/node_modules
   npm install
   
   # Test build
   npm run build
   
   # Commit and redeploy
   git add package-lock.json
   git commit -m "Update dependencies"
   git push heroku main
   ```

3. **Build script error**
   ```bash
   # Test locally
   npm run build
   
   # Check for TypeScript errors
   npm run build 2>&1 | grep error
   
   # Fix TypeScript issues
   # Then redeploy
   git push heroku main
   ```

---

### Build Successful but App Won't Start

**Symptoms:**
```
web.1 process crashed with exit code 1
web.1 process exited with code 1
```

**Diagnosis:**
```bash
heroku logs --app rediforge-plan
# Look for error messages in last 50 lines
```

**Solutions:**

1. **Missing environment variable**
   ```bash
   # Check all required variables set
   heroku config --app rediforge-plan
   
   # Should see: NODE_ENV, JWT_SECRET, DATABASE_URL, etc.
   
   # If missing, set it
   heroku config:set JWT_SECRET="your-secret" --app rediforge-plan
   
   # Restart app
   heroku restart --app rediforge-plan
   ```

2. **Database not initialized**
   ```bash
   # Check if database exists
   heroku pg:info --app rediforge-plan
   # Should show database info
   
   # Run migrations
   heroku run npm run db:migrate --app rediforge-plan
   
   # Restart
   heroku restart --app rediforge-plan
   ```

3. **Port not set correctly**
   ```bash
   # Check server.ts uses process.env.PORT
   # Should have: const PORT = process.env.PORT || 5000;
   
   # Verify in logs
   heroku logs --tail --app rediforge-plan | grep "listening\|port"
   ```

4. **Procfile error**
   ```bash
   # Check Procfile content
   cat Procfile
   # Should be: web: npm run start --prefix server
   
   # If wrong, fix it
   echo "web: npm run start --prefix server" > Procfile
   git add Procfile
   git commit -m "Fix Procfile"
   git push heroku main
   ```

---

### Out of Memory / Dyno Crashed

**Symptoms:**
```
R14 Memory quota exceeded
web.1 process crashed
error: undefined method `block' for Unicorn:Module
```

**Solutions:**

1. **Upgrade to larger dyno**
   ```bash
   # Current: Free dyno (512MB)
   # Upgrade to: Hobby Basic (1GB)
   
   heroku dyno:type web=hobby-basic --app rediforge-plan
   # Costs $7/month
   ```

2. **Optimize application memory usage**
   ```bash
   # Check what's using memory
   heroku run "node --max-old-space-size=512 server/dist/server.js" --app rediforge-plan
   
   # Look for memory leaks in server code
   # Check if caching too much data in memory
   ```

---

## Category 2: Database Issues

### Cannot Connect to Database

**Symptoms:**
```
Error: connect ECONNREFUSED
Error: ENOTFOUND
FATAL: remaining connection slots are reserved
```

**Diagnosis:**
```bash
# Check DATABASE_URL set
heroku config:get DATABASE_URL --app rediforge-plan

# Test connection
heroku run "psql $DATABASE_URL -c 'SELECT 1;'" --app rediforge-plan
```

**Solutions:**

1. **DATABASE_URL not set**
   ```bash
   # Check if DATABASE_URL exists
   heroku config:get DATABASE_URL --app rediforge-plan
   # Output: (empty)
   
   # Ensure PostgreSQL add-on created
   heroku addons --app rediforge-plan
   # Should show: heroku-postgresql (standard-0)
   
   # If not, create it
   heroku addons:create heroku-postgresql:standard-0 --app rediforge-plan
   
   # Restart app
   heroku restart --app rediforge-plan
   ```

2. **PostgreSQL add-on failed**
   ```bash
   # Check add-on status
   heroku pg:info --app rediforge-plan
   # Should show: Available
   
   # If not available, remove and recreate
   heroku addons:destroy heroku-postgresql --app rediforge-plan
   heroku addons:create heroku-postgresql:standard-0 --app rediforge-plan
   ```

3. **Connection pool exhausted**
   ```bash
   # Check active connections
   heroku run "psql $DATABASE_URL -c 'SELECT count(*) FROM pg_stat_activity;'" --app rediforge-plan
   
   # Increase connection pool in server code
   # Or restart app to clear connections
   heroku restart --app rediforge-plan
   ```

---

### Migrations Failed

**Symptoms:**
```
Error: relation does not exist
Error: column does not exist
FATAL: no such table
```

**Diagnosis:**
```bash
# Check migration errors
heroku run npm run db:migrate --app rediforge-plan 2>&1 | tail -50
```

**Solutions:**

1. **Migrations not running**
   ```bash
   # Manually run migrations
   heroku run npm run db:migrate --app rediforge-plan
   
   # If error, check migration files
   ls -la db/migrations/
   
   # Verify migration syntax
   # Look for typos in SQL
   ```

2. **Wrong migration order**
   ```bash
   # Check migrations exist
   heroku run "psql $DATABASE_URL -c 'SELECT * FROM migrations;'" --app rediforge-plan
   
   # Reset and rerun (destructive!)
   heroku run "npm run db:reset" --app rediforge-plan
   ```

---

## Category 3: API Issues

### API Returns 404 or 500

**Symptoms:**
```
Failed to fetch /api/endpoint
{"message":"Not Found"}
Internal Server Error
```

**Diagnosis:**
```bash
# Check API logs
heroku logs --tail --app rediforge-plan

# Test API endpoint
curl -I https://rediforge-plan.herokuapp.com/api/
```

**Solutions:**

1. **API_BASE_URL wrong in frontend**
   ```bash
   # Check frontend config
   heroku config:get API_BASE_URL --app rediforge-plan
   
   # Should be: https://rediforge-plan.herokuapp.com/api
   # NOT: https://rediforge-plan.herokuapp.com/api/
   # NOT: http://localhost:5000/api
   
   # Fix if needed
   heroku config:set API_BASE_URL="https://rediforge-plan.herokuapp.com/api" --app rediforge-plan
   ```

2. **Routes not defined**
   ```bash
   # Check server.ts has all routes
   cat server/src/server.ts | grep "app.use\|app.get\|app.post"
   
   # Make sure routes are mounted
   # Example:
   # app.use('/api/projects', projectRoutes);
   # app.use('/api/schedule', scheduleRoutes);
   ```

3. **CORS error blocking requests**
   ```bash
   # Check browser console for CORS errors
   # Check CORS middleware in server.ts
   
   # Fix CORS:
   # 1. Ensure FRONTEND_URL set correctly
   # 2. CORS middleware includes FRONTEND_URL
   # 3. Credentials allowed
   
   # Example:
   app.use(cors({
     origin: process.env.FRONTEND_URL,
     credentials: true,
   }));
   ```

---

### Authentication Not Working

**Symptoms:**
```
401 Unauthorized
JWT malformed
Invalid signature
Token expired
```

**Diagnosis:**
```bash
# Check JWT_SECRET set
heroku config:get JWT_SECRET --app rediforge-plan

# Check token in browser
# Open DevTools → Application → Local Storage
# Look for 'token' or 'jwt'
```

**Solutions:**

1. **JWT_SECRET not set**
   ```bash
   # Generate new secret
   JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   
   # Set it
   heroku config:set JWT_SECRET="$JWT_SECRET" --app rediforge-plan
   
   # Restart app
   heroku restart --app rediforge-plan
   
   # Users need to re-login (old tokens invalid)
   ```

2. **JWT verification failing**
   ```bash
   # Check JWT_SECRET matches between encoding/decoding
   # Verify in server/src/auth/jwt.ts
   
   # Regenerate and redeploy if suspect mismatch
   ```

3. **Token expired**
   ```bash
   # Normal behavior - users re-login
   # Check token expiration time in server code
   # Usually: jwt.sign(..., { expiresIn: '7d' })
   ```

---

## Category 4: Frontend Issues

### App Not Loading / Blank Page

**Symptoms:**
```
Blank white page
React not rendering
404 for index.html
```

**Diagnosis:**
```bash
# Check response
curl -I https://rediforge-plan.herokuapp.com/

# Check server logs
heroku logs --tail --app rediforge-plan

# Check browser console (F12)
# Look for JavaScript errors
```

**Solutions:**

1. **Frontend not built**
   ```bash
   # Check if client/dist exists
   heroku run "ls -la /app/client/dist/" --app rediforge-plan
   
   # Should show: index.html, assets/, etc.
   
   # If empty, rebuild locally
   npm run build
   
   # Verify build works
   ls -la client/dist/
   
   # Recommit and redeploy
   git push heroku main
   ```

2. **Static files not served**
   ```bash
   # Check Express serving static files
   cat server/src/server.ts | grep "express.static"
   
   # Should have: app.use(express.static(path.join(...)))
   
   # Check file permissions
   heroku run "stat /app/client/dist/index.html" --app rediforge-plan
   ```

3. **React Router fallback missing**
   ```bash
   # Check wildcard route in server
   cat server/src/server.ts | grep "app.get.*\*"
   
   # Should have:
   # app.get('*', (req, res) => {
   #   res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
   # });
   ```

---

### Assets Not Loading (404 for CSS/JS)

**Symptoms:**
```
GET /assets/index-abc123.js 404
GET /assets/style-def456.css 404
```

**Diagnosis:**
```bash
# Check assets built
heroku run "ls -la /app/client/dist/assets/" --app rediforge-plan

# Check asset paths in index.html
heroku run "head -20 /app/client/dist/index.html" --app rediforge-plan
```

**Solutions:**

1. **Build output not included in Git**
   ```bash
   # Check .gitignore
   cat .gitignore | grep dist
   
   # If dist/ ignored, you have two options:
   
   # Option A: Build on Heroku (recommended)
   # Don't commit dist/ - let Heroku build it
   # Ensure heroku-postbuild script exists
   cat package.json | grep "heroku-postbuild"
   
   # Option B: Commit built files
   # Remove dist/ from .gitignore
   # npm run build locally
   # git add client/dist
   # git commit -m "Add built client files"
   # git push heroku main
   ```

2. **Asset paths wrong**
   ```bash
   # Check Vite config
   cat client/vite.config.ts
   
   # Should have correct base path
   # For root domain: base: '/'
   # For subdomain: base: '/app'
   
   # Rebuild if needed
   npm run build
   ```

---

## Category 5: SSL/HTTPS Issues

### SSL Certificate Error

**Symptoms:**
```
SSL_ERROR_RX_RECORD_TOO_LONG
NET::ERR_CERT_AUTHORITY_INVALID
certificate has expired
```

**Diagnosis:**
```bash
# Check certificate status
heroku certs --app rediforge-plan

# Should show status: "ok"
# Common Name: plan.rediforge.com
```

**Solutions:**

1. **Certificate not issued**
   ```bash
   # Check ACM enabled
   heroku certs --app rediforge-plan
   
   # If not enabled
   heroku certs:auto:enable --app rediforge-plan
   
   # Wait for DNS to propagate first
   # Then certificate auto-issued (5-10 min)
   ```

2. **DNS not configured yet**
   ```bash
   # Certificate requires working DNS first
   # Check DNS resolution
   nslookup plan.rediforge.com
   
   # Should resolve to: rediforge-plan.herokuapp.com
   
   # If not, configure DNS at your provider
   # Then wait 15-30 minutes for propagation
   ```

3. **Self-signed certificate showing**
   ```bash
   # This is Heroku's fallback while DNS/cert provisioning
   # Normal during setup
   # Wait 15-30 minutes and refresh browser
   ```

---

### CORS Error on HTTPS

**Symptoms:**
```
Access to XMLHttpRequest blocked by CORS policy
Cross-Origin Request Blocked
```

**Diagnosis:**
```bash
# Check FRONTEND_URL in Heroku config
heroku config:get FRONTEND_URL --app rediforge-plan

# Check browser console (F12 → Console)
# Look for exact CORS error message
```

**Solutions:**

1. **CORS origin mismatch**
   ```bash
   # Update FRONTEND_URL to match browser URL
   heroku config:set FRONTEND_URL="https://plan.rediforge.com" --app rediforge-plan
   # OR
   heroku config:set FRONTEND_URL="https://rediforge-plan.herokuapp.com" --app rediforge-plan
   
   # Restart app
   heroku restart --app rediforge-plan
   ```

2. **CORS middleware not configured**
   ```bash
   # Check server/src/server.ts for CORS setup
   cat server/src/server.ts | grep -A5 "cors"
   
   # Should have:
   app.use(cors({
     origin: process.env.FRONTEND_URL,
     credentials: true,
   }));
   ```

---

## Category 6: Domain & DNS Issues

### Domain Not Resolving

**Symptoms:**
```
ERR_NAME_NOT_RESOLVED
Cannot resolve domain name
Connection refused
```

**Diagnosis:**
```bash
# Check DNS record
nslookup plan.rediforge.com
dig plan.rediforge.com +short

# Should return: rediforge-plan.herokuapp.com
```

**Solutions:**

1. **DNS record not created**
   ```bash
   # Go to your DNS provider (GoDaddy, Namecheap, etc.)
   # Add CNAME record:
   # Host: plan
   # Value: rediforge-plan.herokuapp.com
   
   # See DNS_CONFIGURATION_GUIDE.md for provider-specific steps
   ```

2. **DNS record wrong**
   ```bash
   # Check what DNS says
   nslookup plan.rediforge.com
   
   # If not pointing to rediforge-plan.herokuapp.com
   # Update DNS record at your provider
   # Fix: Remove wrong record, add correct CNAME
   ```

3. **DNS not propagated yet**
   ```bash
   # DNS takes 5-30 minutes usually
   # Wait and retry:
   nslookup plan.rediforge.com  # Try again in 5 min
   
   # Use global DNS checker:
   # https://www.whatsmydns.net/
   # Shows propagation worldwide
   ```

---

### Domain Not Added to Heroku

**Symptoms:**
```
heroku domains shows no custom domain
Domain not configured
```

**Diagnosis:**
```bash
# Check Heroku domains
heroku domains --app rediforge-plan

# Should show: plan.rediforge.com
```

**Solutions:**

1. **Domain not added**
   ```bash
   # Add domain to app
   heroku domains:add plan.rediforge.com --app rediforge-plan
   
   # Verify
   heroku domains --app rediforge-plan
   ```

2. **Add domain failed**
   ```bash
   # Remove and retry
   heroku domains:remove plan.rediforge.com --app rediforge-plan
   heroku domains:add plan.rediforge.com --app rediforge-plan
   ```

---

## Category 7: Performance Issues

### App is Slow / Times Out

**Symptoms:**
```
Request timeout
Application exceeded timeout limit (30 seconds)
Very slow page load (>10 seconds)
```

**Solutions:**

1. **Database queries slow**
   ```bash
   # Check PostgreSQL performance
   heroku run "psql $DATABASE_URL -c 'SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 5;'" --app rediforge-plan
   
   # Optimize slow queries
   # Add database indexes
   # Profile with tools like pg_stat_statements
   ```

2. **Dyno underpowered**
   ```bash
   # Upgrade dyno type
   heroku dyno:type web=hobby-basic --app rediforge-plan
   # ($7/month, twice the resources)
   
   # Check dyno memory
   heroku ps --app rediforge-plan
   ```

3. **Cold starts (app sleeping)**
   ```bash
   # Free dyno sleeps after 30 min of inactivity
   # First request takes 30+ seconds to wake up
   
   # Solution: Upgrade to paid dyno (always on)
   heroku dyno:type web=hobby-basic --app rediforge-plan
   ```

---

## Category 8: Security Issues

### Secrets Committed to Git

**Symptoms:**
```
Found API key in commit history
GitHub secret scanning alert
```

**Solutions:**

1. **If secrets in Git history** (more serious)
   ```bash
   # Option 1: Regenerate secrets (recommended)
   # Old secrets exposed, generate new ones
   JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   heroku config:set JWT_SECRET="$JWT_SECRET" --app rediforge-plan
   
   # Option 2: Rewrite Git history (advanced)
   # Use git-filter-branch or BFG
   # Then force push
   ```

2. **Prevent future leaks**
   ```bash
   # Verify .gitignore has .env
   cat .gitignore | grep ".env"
   
   # Add if missing
   echo ".env" >> .gitignore
   echo ".env.local" >> .gitignore
   
   # Verify no secrets in code
   grep -r "password\|secret\|key" client/src server/src | grep -v node_modules
   
   # All secrets via heroku config:set
   ```

---

## Emergency Procedures

### Rollback to Previous Version

```bash
# List releases
heroku releases --app rediforge-plan

# Find the working version (before recent change)
# Example: v5 was working, v6 broke it

# Rollback
heroku releases:rollback v5 --app rediforge-plan

# Verify
heroku logs --app rediforge-plan
heroku open --app rediforge-plan
```

### Force Restart App

```bash
# Hard restart - kills and restarts all dynos
heroku dyno:restart --app rediforge-plan

# Or restart specific dyno
heroku ps:restart web --app rediforge-plan
```

### Clear Cache (if applicable)

```bash
# For Redis cache
heroku run "redis-cli FLUSHALL" --app rediforge-plan

# Or restart Redis
heroku addons:destroy heroku-redis:premium-0 --app rediforge-plan
heroku addons:create heroku-redis:premium-0 --app rediforge-plan
```

### Emergency: Delete and Recreate App

```bash
# ⚠️ WARNING: This deletes everything!
# Only do this if nothing else works
# You'll lose the app and all data!

# Delete app
heroku destroy --app rediforge-plan
# (Will ask for confirmation - type app name)

# Recreate from scratch
heroku create rediforge-plan --region us
heroku addons:create heroku-postgresql:standard-0 --app rediforge-plan
heroku config:set ... # Set all variables
git push heroku main
```

---

## Debugging Checklist

Run through this if stuck:

```bash
# 1. Check app status
heroku ps --app rediforge-plan

# 2. Check recent logs
heroku logs --app rediforge-plan | tail -100

# 3. Check all config vars
heroku config --app rediforge-plan

# 4. Check database
heroku pg:info --app rediforge-plan
heroku run "psql $DATABASE_URL -c 'SELECT 1;'" --app rediforge-plan

# 5. Test API
curl -I https://rediforge-plan.herokuapp.com/

# 6. Check certificates
heroku certs --app rediforge-plan

# 7. Check domains
heroku domains --app rediforge-plan

# 8. Watch live logs
heroku logs --tail --app rediforge-plan
# (Ctrl+C to exit)
```

---

## When All Else Fails

1. **Check Heroku Status**: https://status.heroku.com/
2. **Read logs carefully**: Look for actual error messages
3. **Search GitHub issues**: Similar problem reported?
4. **Ask community**: Stack Overflow, Heroku forums
5. **Contact Heroku support**: If infrastructure issue (paid support)

---

## Prevention Tips

- **Regular monitoring**: `heroku logs --tail --app rediforge-plan`
- **Set up alerts**: Use monitoring service (Sentry, New Relic)
- **Test before deploy**: `npm run build` locally
- **Read release notes**: Check npm package updates
- **Backup database**: `heroku pg:backups:capture --app rediforge-plan`
- **Keep secrets rotated**: Change JWT_SECRET quarterly
- **Monitor performance**: Check response times regularly

---

**Last Updated**: 2024-06-15
**Version**: 1.0
**Status**: Comprehensive Troubleshooting Guide
