# Environment Variables Reference Guide

## Complete Environment Variables for RediForge Production

This guide documents all environment variables needed for RediForge to run on Heroku.

---

## Environment Variables Summary

| Variable | Source | Required | Format | Example |
|----------|--------|----------|--------|---------|
| NODE_ENV | Manual | Yes | String | "production" |
| PORT | Heroku | Auto | Number | 5000 |
| DATABASE_URL | Auto (add-on) | Yes | PostgreSQL URI | postgres://user:pass@host/db |
| JWT_SECRET | Generated | Yes | Hex String | a1b2c3d4e5f6... (64 chars) |
| MFA_ENCRYPTION_KEY | Generated | Yes | Hex String | f6e5d4c3b2a1... (64 chars) |
| ENCRYPTION_IV | Generated | Yes | Hex String | 9z8y7x6w5v4u... (32 chars) |
| API_BASE_URL | Manual | Yes | URL | https://rediforge-plan.herokuapp.com/api |
| FRONTEND_URL | Manual | Yes | URL | https://rediforge-plan.herokuapp.com |

---

## Detailed Variable Specifications

### 1. NODE_ENV

**Purpose**: Tells Express to run in production mode

**Value**: `production`

**How to Set**:
```bash
heroku config:set NODE_ENV=production --app rediforge-plan
```

**Verify**:
```bash
heroku config:get NODE_ENV --app rediforge-plan
# Output: production
```

---

### 2. PORT

**Purpose**: Port number for Express server

**Value**: `5000` (or auto-assigned by Heroku)

**Note**: Heroku automatically sets this. You don't need to set it manually.

**Verify**:
```bash
heroku config:get PORT --app rediforge-plan
# Output: (empty - Heroku sets dynamically)
```

**Code Usage** (server/src/server.ts):
```typescript
const PORT = process.env.PORT || 5000;
```

---

### 3. DATABASE_URL

**Purpose**: PostgreSQL connection string

**Format**: `postgres://[username]:[password]@[host]:[port]/[database]`

**Example**: `postgres://uabc123def456:password@ec2-1-23-45-678.compute-1.amazonaws.com:5432/db1234567`

**Auto-Set By**: Heroku PostgreSQL add-on

**Verify**:
```bash
heroku config:get DATABASE_URL --app rediforge-plan
# Output: postgres://user:pass@host:port/dbname
```

**Test Connection**:
```bash
heroku run "psql $DATABASE_URL -c 'SELECT version();'" --app rediforge-plan
```

**Note**: DO NOT commit this to code. Heroku sets it automatically.

---

### 4. JWT_SECRET

**Purpose**: Secret key for signing JWT authentication tokens

**Requirements**:
- Cryptographically secure random string
- 32 bytes minimum (64 hex characters)
- Used for token signing/verification
- Must be kept secret

**Generate**:
```bash
# Generates 32 random bytes as hex string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example Output**: 
```
a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
```

**Set**:
```bash
heroku config:set JWT_SECRET="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2" --app rediforge-plan
```

**Verify**:
```bash
heroku config:get JWT_SECRET --app rediforge-plan
# Output: a1b2c3d4e5f6...
```

**Code Usage** (server/src/auth):
```typescript
const SECRET = process.env.JWT_SECRET;
jwt.sign(payload, SECRET, { expiresIn: '7d' });
```

---

### 5. MFA_ENCRYPTION_KEY

**Purpose**: 32-byte key for encrypting MFA secrets (TOTP)

**Requirements**:
- Cryptographically secure random string
- 32 bytes minimum (64 hex characters)
- Used for AES-256 encryption
- Must match the 32-byte requirement

**Generate**:
```bash
# Generates 32 random bytes as hex string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example Output**:
```
f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5
```

**Set**:
```bash
heroku config:set MFA_ENCRYPTION_KEY="f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5" --app rediforge-plan
```

**Verify**:
```bash
heroku config:get MFA_ENCRYPTION_KEY --app rediforge-plan
```

**Code Usage** (server/src/services/mfa):
```typescript
const key = Buffer.from(process.env.MFA_ENCRYPTION_KEY, 'hex');
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
```

---

### 6. ENCRYPTION_IV

**Purpose**: Initialization Vector for encryption

**Requirements**:
- Cryptographically secure random string
- 16 bytes (32 hex characters)
- Used in AES encryption
- Should be random for each encryption operation

**Generate**:
```bash
# Generates 16 random bytes as hex string (32 hex characters)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

**Example Output**:
```
9z8y7x6w5v4u3t2s1r0qponmlkjihgfe
```

**Set**:
```bash
heroku config:set ENCRYPTION_IV="9z8y7x6w5v4u3t2s1r0qponmlkjihgfe" --app rediforge-plan
```

**Verify**:
```bash
heroku config:get ENCRYPTION_IV --app rediforge-plan
```

**Code Usage** (server/src/utils/encryption):
```typescript
const iv = Buffer.from(process.env.ENCRYPTION_IV, 'hex');
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
```

---

### 7. API_BASE_URL

**Purpose**: Backend API URL for frontend to call

**Value**: `https://rediforge-plan.herokuapp.com/api` (or custom domain)

**Set**:
```bash
heroku config:set API_BASE_URL="https://rediforge-plan.herokuapp.com/api" --app rediforge-plan

# OR with custom domain (after DNS is working)
heroku config:set API_BASE_URL="https://plan.rediforge.com/api" --app rediforge-plan
```

**Verify**:
```bash
heroku config:get API_BASE_URL --app rediforge-plan
```

**Code Usage** (client/src/api/client.ts):
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
                     process.env.API_BASE_URL || 
                     'http://localhost:5000/api';
```

---

### 8. FRONTEND_URL

**Purpose**: Frontend URL for CORS, redirects, and other references

**Value**: `https://rediforge-plan.herokuapp.com` (or custom domain)

**Set**:
```bash
heroku config:set FRONTEND_URL="https://rediforge-plan.herokuapp.com" --app rediforge-plan

# OR with custom domain (after DNS is working)
heroku config:set FRONTEND_URL="https://plan.rediforge.com" --app rediforge-plan
```

**Verify**:
```bash
heroku config:get FRONTEND_URL --app rediforge-plan
```

**Code Usage** (server/src/middleware/cors):
```typescript
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',  // for local dev
];

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));
```

---

## Setting All Variables at Once

```bash
# Single command to set all required variables
heroku config:set \
  NODE_ENV=production \
  JWT_SECRET="<your-jwt-secret>" \
  MFA_ENCRYPTION_KEY="<your-mfa-key>" \
  ENCRYPTION_IV="<your-iv>" \
  API_BASE_URL="https://rediforge-plan.herokuapp.com/api" \
  FRONTEND_URL="https://rediforge-plan.herokuapp.com" \
  --app rediforge-plan
```

---

## Verifying All Variables

```bash
# View all environment variables set on Heroku
heroku config --app rediforge-plan
```

**Expected Output**:
```
=== rediforge-plan Config Vars
API_BASE_URL:          https://rediforge-plan.herokuapp.com/api
ENCRYPTION_IV:         9z8y7x6w5v4u3t2s1r0qponmlkjihgfe
DATABASE_URL:          postgres://user:pass@host:port/db
FRONTEND_URL:          https://rediforge-plan.herokuapp.com
JWT_SECRET:            a1b2c3d4e5f6a1b2c3d4e5f6...
MFA_ENCRYPTION_KEY:    f6e5d4c3b2a1f6e5d4c3b2a1...
NODE_ENV:              production
```

---

## Optional Environment Variables

These are optional and can enhance functionality:

### Sentry (Error Tracking)

```bash
heroku config:set SENTRY_DSN="https://key@sentry.io/project" --app rediforge-plan
```

### Email Service (SendGrid, Mailgun, etc.)

```bash
# SendGrid
heroku config:set SENDGRID_API_KEY="SG.xxxxx" --app rediforge-plan

# Mailgun
heroku config:set MAILGUN_API_KEY="key-xxxxx" --app rediforge-plan
```

### Analytics/Monitoring

```bash
heroku config:set ANALYTICS_API_KEY="xxxxx" --app rediforge-plan
```

---

## Key Generation Quick Reference

### Generate All Keys at Once

```bash
#!/bin/bash

echo "=== RediForge Secret Keys Generation ==="
echo ""

echo "JWT_SECRET (64 hex chars):"
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo $JWT_SECRET
echo ""

echo "MFA_ENCRYPTION_KEY (64 hex chars):"
MFA_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo $MFA_KEY
echo ""

echo "ENCRYPTION_IV (32 hex chars):"
IV=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
echo $IV
echo ""

echo "=== Copy these values and use in heroku config:set ==="
```

Run:
```bash
chmod +x generate-keys.sh
./generate-keys.sh
```

---

## Environment Variable Storage (Dev vs Prod)

### Development (.env file - Local)

**File**: `.env` in root directory

```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgres://localhost:5432/rediforge_dev
JWT_SECRET=your-dev-secret
MFA_ENCRYPTION_KEY=your-dev-mfa-key
ENCRYPTION_IV=your-dev-iv
API_BASE_URL=http://localhost:5000/api
FRONTEND_URL=http://localhost:3000
```

**Note**: `.env` is in `.gitignore` - never commit secrets!

### Production (Heroku Config Vars)

Set via: `heroku config:set KEY=VALUE`

**Why**: 
- More secure (not stored in repository)
- Can be changed without redeploying
- Each environment can have different values
- Secrets never exposed in code

---

## Rotating Secrets

### When to Rotate

- Quarterly security review
- Team member leaves
- Suspected compromise
- After any security incident

### How to Rotate JWT_SECRET

```bash
# Generate new secret
NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Set new value
heroku config:set JWT_SECRET="$NEW_SECRET" --app rediforge-plan

# Restart app to apply
heroku restart --app rediforge-plan

# Existing tokens will fail (users re-login)
# This is expected and secure
```

### How to Rotate MFA_ENCRYPTION_KEY

**Warning**: This will invalidate all existing MFA secrets. Users must re-enable MFA.

```bash
# Generate new key
NEW_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Set new value
heroku config:set MFA_ENCRYPTION_KEY="$NEW_KEY" --app rediforge-plan

# Clear all active MFA sessions (re-authenticate required)
heroku run "npm run clear-mfa-sessions" --app rediforge-plan

# Restart app
heroku restart --app rediforge-plan
```

---

## Troubleshooting

### Problem: "Variable not accessible in application"

**Solution**:
```bash
# Restart dyno to apply changes
heroku restart --app rediforge-plan

# Verify variable is set
heroku config:get JWT_SECRET --app rediforge-plan
```

### Problem: "Encryption fails - invalid key"

**Cause**: Key length mismatch

**Solution**:
1. Verify key is exactly 32 bytes (64 hex characters)
2. Regenerate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. Set new value: `heroku config:set MFA_ENCRYPTION_KEY="..."`
4. Restart app: `heroku restart --app rediforge-plan`

### Problem: "JWT token invalid"

**Cause**: JWT_SECRET changed or wrong value

**Solution**:
1. Verify JWT_SECRET is set correctly
2. Check if key was rotated (existing tokens become invalid)
3. Users can re-login to get new tokens

### Problem: "Database connection refused"

**Cause**: DATABASE_URL missing or incorrect

**Solution**:
```bash
# Verify DATABASE_URL is set
heroku config:get DATABASE_URL --app rediforge-plan

# Test connection
heroku run "psql $DATABASE_URL -c 'SELECT 1;'" --app rediforge-plan

# If empty, ensure add-on created
heroku addons:create heroku-postgresql:standard-0 --app rediforge-plan
```

---

## Checklists

### Pre-Production Checklist

- [ ] NODE_ENV set to "production"
- [ ] DATABASE_URL verified working
- [ ] JWT_SECRET generated and set (64 hex chars)
- [ ] MFA_ENCRYPTION_KEY generated and set (64 hex chars)
- [ ] ENCRYPTION_IV generated and set (32 hex chars)
- [ ] API_BASE_URL set correctly
- [ ] FRONTEND_URL set correctly
- [ ] All variables verified with `heroku config`
- [ ] Application restarts successfully
- [ ] No "undefined" errors in logs

### Security Checklist

- [ ] All secrets are cryptographically random
- [ ] No secrets committed to Git
- [ ] .gitignore includes .env
- [ ] Secrets never logged or displayed
- [ ] HTTPS enforced (SSL certificate installed)
- [ ] CORS configured with FRONTEND_URL
- [ ] Database credentials in DATABASE_URL (not hardcoded)
- [ ] Secrets rotated on schedule

---

## Reference

**Database Connection String Format**:
```
postgres://[user]:[password]@[host]:[port]/[database]
```

**Key Length Reference**:
- 32 bytes = 64 hex characters
- 16 bytes = 32 hex characters

**Generate Secure Keys**:
```bash
# 32 bytes (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 16 bytes (32 hex chars)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

---

**Last Updated**: 2024-06-15
**Environment**: Heroku Production
**Status**: Ready for Deployment
