# RediForge Authentication System - Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd app
npm install
npm install --prefix client
npm install --prefix server
```

### 2. Generate Encryption Keys

```bash
# Generate JWT_SECRET and MFA_ENCRYPTION_KEY
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex')); console.log('MFA_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Setup Environment Variables

**server/.env**
```bash
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/rediforge
JWT_SECRET=<generated-key-from-above>
MFA_ENCRYPTION_KEY=<generated-key-from-above>
```

**client/.env**
```bash
VITE_API_URL=http://localhost:5000
```

### 4. Setup Database

```bash
# Create database
createdb rediforge

# Run migrations
psql -U postgres -d rediforge -f db/migrations/001_initial_schema.sql
```

### 5. Create First Admin User

```bash
# Start backend in separate terminal
cd app
npm run server

# In another terminal, use psql to insert admin user directly
psql -U postgres -d rediforge

-- Inside psql:
INSERT INTO users (id, email, password_hash, role, mfa_enabled)
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  '$2a$10$...', -- Use bcrypt hash of your password
  'admin',
  false
);
```

Or use Node to hash the password:
```bash
node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('admin123', 10, (err, hash) => {
  if (err) throw err;
  console.log(hash);
});
"
```

### 6. Start Development

**Terminal 1 - Backend:**
```bash
cd app
npm run server
```

**Terminal 2 - Frontend:**
```bash
cd app
npm run client
```

Access the app at http://localhost:3000

## User Onboarding Workflow

### Step 1: Admin Creates User

1. Navigate to `/admin/users`
2. Click "Create User"
3. Enter email, set password (or auto-generate)
4. Select role: Admin, Analyst, or Viewer
5. Click "Create User"
6. Admin receives:
   - User email
   - Temporary password
   - MFA QR code
   - Setup instructions

### Step 2: Admin Shares Credentials

Share with new user:
- Email address
- Temporary password
- MFA QR code (or manual entry code)
- Instructions to:
  1. Go to http://localhost:3000/login
  2. Enter email and temporary password
  3. Scan QR code with authenticator app
  4. Enter 6-digit code
  5. Click Verify

### Step 3: User Completes First Login

1. User navigates to `/login`
2. Enters email and temporary password
3. Clicks "Login"
4. Redirected to `/mfa`
5. Scans QR code with authenticator app (Google Authenticator, Microsoft Authenticator, Authy, etc.)
6. Authenticator app displays 6-digit code
7. User enters 6-digit code in MFA form
8. Clicks "Verify"
9. User logged in and redirected to `/dashboard`

### Step 4: User Account Ready

User can now:
- View dashboard
- Access features based on role
- Use `/auth/me` endpoint to view profile

## Testing Authentication

### Using curl

**Test Login:**
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

**Test MFA Verify (after getting userId from login):**
```bash
# Note: You need to get a valid TOTP code from the authenticator app
curl -X POST http://localhost:5000/auth/mfa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<userId-from-login>",
    "token": "123456"
  }'
```

**Test Protected Route:**
```bash
curl -X GET http://localhost:5000/auth/me \
  -H "Authorization: Bearer <jwt-token-from-mfa-verify>"
```

### Using Postman

1. Create a new POST request to `http://localhost:5000/auth/login`
2. Set Body → raw → JSON:
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```
3. Send and get userId from response
4. Create another POST to `http://localhost:5000/auth/mfa/verify`
5. Enter userId and TOTP code from authenticator
6. Copy JWT token from response
7. Create GET request to `http://localhost:5000/auth/me`
8. Set Authorization header: `Bearer <jwt-token>`

## File Structure

```
app/
├── server/
│   ├── src/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts    # Route handlers
│   │   │   ├── auth.service.ts       # JWT, password, session logic
│   │   │   ├── auth.routes.ts        # Express routes
│   │   │   └── mfa.service.ts        # TOTP, QR code generation
│   │   ├── middleware/
│   │   │   ├── index.ts              # Error, logging middleware
│   │   │   └── authMiddleware.ts     # JWT, role-based auth
│   │   ├── db.ts                     # PostgreSQL pool
│   │   ├── routes/
│   │   │   └── index.ts              # Health check, other routes
│   │   └── server.ts                 # Express app setup
│   ├── package.json
│   └── tsconfig.json
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── MFAChallenge.tsx
│   │   │   ├── CreateUserModal.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── TopNav.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── MFA.tsx
│   │   │   ├── Home.tsx
│   │   │   └── AdminUsers.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx        # Global auth state
│   │   ├── api/
│   │   │   └── client.ts             # Axios config with JWT interceptors
│   │   ├── App.tsx                   # Route setup
│   │   └── main.tsx
│   ├── package.json
│   └── tsconfig.json
│
├── db/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── seeds/
│   │   └── 01_users.sql
│   └── schema.sql
│
├── AUTHENTICATION.md                 # Full documentation
├── AUTH_SETUP.md                     # This file
├── README.md                         # Project overview
├── Procfile                          # Heroku config
├── package.json                      # Monorepo config
└── .gitignore
```

## Key Features

✅ **User Management**
- Admin-only user creation
- Role-based access (Admin, Analyst, Viewer)
- User listing and management

✅ **Secure Authentication**
- Bcrypt password hashing
- JWT tokens (7-day expiration)
- Session tracking in database

✅ **TOTP MFA**
- QR code generation for authenticator apps
- Support for Google Authenticator, Microsoft Authenticator, Authy, etc.
- Encrypted secret storage
- Time window tolerance for clock drift

✅ **Role-Based Access Control**
- Server-side permission checks
- Client-side route protection
- Granular role definitions

✅ **Production Ready**
- TypeScript for type safety
- Error handling and validation
- CORS configured
- Environment variable support
- Heroku deployment ready

## Common Tasks

### Change Admin Password

```bash
# In psql
UPDATE users SET password_hash = '$2a$10$...' WHERE email = 'admin@example.com';
```

### Reset User MFA

```sql
-- In psql
UPDATE users SET mfa_enabled = false, mfa_secret = NULL WHERE email = 'user@example.com';
```

### View Active Sessions

```sql
SELECT u.email, s.expires_at, s.created_at
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.expires_at > NOW()
ORDER BY s.created_at DESC;
```

### Invalidate All User Sessions

```sql
DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com');
```

## Troubleshooting

### "TOTP code is invalid"
- Ensure your device time is synced
- Check you're using the correct base32 secret
- Try the code from the current or previous 30-second window

### "User not found"
- Verify email in database: `SELECT email FROM users;`
- Check for typos in email address

### "Invalid JWT"
- Ensure JWT_SECRET hasn't changed
- Token may be expired (7-day limit)
- Try logging in again

### "Database connection error"
- Verify PostgreSQL is running: `psql -l`
- Check DATABASE_URL in .env
- Ensure database exists: `psql -l`

### Frontend can't reach backend
- Check VITE_API_URL in client/.env
- Ensure backend is running on port 5000
- Check CORS is enabled in server.ts
- Check firewall isn't blocking port 5000

## Security Recommendations

1. **Change JWT_SECRET in production**
   - Generate cryptographically secure key
   - Use environment variable

2. **Use HTTPS in production**
   - Never send credentials over HTTP
   - Enable HSTS headers

3. **Implement rate limiting**
   - Limit login attempts
   - Prevent brute force attacks

4. **Add audit logging**
   - Log failed login attempts
   - Track user actions

5. **Enable password complexity**
   - Minimum 8 characters
   - Mix of upper/lower/numbers/symbols

6. **Implement password reset**
   - Secure email-based flow
   - Time-limited reset tokens

## Next Steps

- Add password change functionality
- Implement account lockout after failed attempts
- Add email notifications
- Set up audit logging
- Add two-step verification (backup codes)
- Implement session management
- Add admin dashboard with user activity

For detailed API documentation, see [AUTHENTICATION.md](./AUTHENTICATION.md)
