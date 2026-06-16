# RediForge Authentication System Documentation

## Overview

This document describes the complete local authentication system for RediForge, including:
- User management (Admin-only creation)
- Password authentication with bcrypt hashing
- TOTP-based Multi-Factor Authentication (MFA)
- JWT session tokens with 7-day expiration
- Role-based access control (Admin, Analyst, Viewer)
- No external authentication services required

## Architecture

### Backend (Express + Node.js + PostgreSQL)

#### Database Schema

**users table:**
```sql
id (UUID, PK)
email (VARCHAR, UNIQUE)
password_hash (VARCHAR)
role (ENUM: admin, analyst, viewer)
mfa_secret (TEXT, encrypted)
mfa_enabled (BOOLEAN)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

**sessions table:**
```sql
id (UUID, PK)
user_id (UUID, FK → users.id)
jwt_token (TEXT, UNIQUE)
expires_at (TIMESTAMP)
created_at (TIMESTAMP)
```

#### Services

**auth.service.ts**
- `hashPassword()` - Bcrypt password hashing (10 salt rounds)
- `comparePassword()` - Bcrypt verification
- `createJWT()` - Create JWT tokens (7-day expiration)
- `verifyJWT()` - Verify JWT signature
- `storeSession()` - Store session in database
- `verifySession()` - Check session validity
- `createUser()` - Create new users (admin-only)
- `getUserByEmail()` / `getUserById()` - Retrieve user data
- `enableUserMFA()` / `getUserMFASecret()` - MFA management
- `updateUserPassword()` - Password updates

**mfa.service.ts**
- `generateMFASecret()` - Generate TOTP secret
- `generateQRCodeDataUrl()` - Generate QR code for authenticator app
- `verifyTOTPToken()` - Verify 6-digit TOTP code
- `encryptMFASecret()` / `decryptMFASecret()` - Secure MFA secret storage (AES-256)

#### Auth Routes

**POST /auth/login**
- Input: `{ email, password }`
- Output: `{ mfaRequired: true, userId, message }`
- Returns MFA challenge requirement

**POST /auth/mfa/verify**
- Input: `{ userId, token }` (6-digit TOTP code)
- Output: `{ success: true, token: JWT, user: {...} }`
- Issues JWT session token

**POST /auth/logout**
- Requires: Bearer token
- Invalidates session in database

**GET /auth/me**
- Requires: Bearer token
- Returns: Current user profile

**POST /auth/admin/create-user**
- Requires: Bearer token + Admin role
- Input: `{ email, password, role }`
- Output: User data + MFA QR code setup instructions
- QR code URL format: `otpauth://totp/RediForge(user@email.com)?secret=BASE32SECRET&issuer=RediForge`

**POST /auth/mfa/setup**
- Input: `{ email }`
- Output: QR code for MFA setup

**POST /auth/mfa/enable**
- Requires: Bearer token
- Input: `{ secret, token }` (6-digit verification code)
- Enables MFA for current user

#### Middleware

**requireAuth**
- Verifies JWT signature
- Checks session validity in database
- Attaches `userId`, `userEmail`, `userRole` to request
- Returns 401 if invalid

**requireRole(...roles)**
- Checks user role against allowed roles
- Returns 403 if insufficient permissions

**optionalAuth**
- Attaches user info if present
- Doesn't block if authentication missing

### Frontend (React + TypeScript)

#### AuthContext

Global state management for authentication:
- `user` - Current user object (email, role, MFA status)
- `isAuthenticated` - Boolean flag
- `loading` - Request state
- `error` - Error messages

Methods:
- `login(email, password)` - Step 1: Email/password validation
- `verifyMFA(userId, token)` - Step 2: TOTP verification
- `logout()` - Invalidate session
- `setupMFA(email)` - Get MFA QR code
- `enableMFA(secret, token)` - Enable MFA after setup
- `createUser(email, password, role)` - Admin: Create user

#### Protected Routes

**<ProtectedRoute>**
- Requires authentication
- Redirects to `/login` if not authenticated
- Shows loading spinner during auth check

**<RoleRoute role="admin">**
- Requires specific role(s)
- Redirects to `/dashboard` if insufficient permissions

**<PermissionRoute permission={(user) => custom_check}>**
- Custom permission logic

#### Pages

**Login (/login)**
- Email and password fields
- Redirects to MFA challenge on success
- Error handling for invalid credentials

**MFA (/mfa)**
- 6-digit TOTP input field
- Auto-focuses and handles numeric-only input
- Redirects to `/dashboard` on success
- Shows back-to-login option

**Dashboard (/dashboard)**
- Shows user account information
- Displays MFA status
- Server health check

**Admin Users (/admin/users)**
- Admin-only access
- Create new users (email, password, role)
- Display user list with roles
- Generate temporary passwords
- Show MFA setup QR codes

#### Components

**LoginForm**
- Email/password input
- Submit button
- Error alerts

**MFAChallenge**
- 6-digit code input (numeric only)
- Auto-submits when 6 digits entered
- Back to login button

**CreateUserModal**
- Email, password, role fields
- Password generation button
- MFA QR code display after creation
- Setup instructions

**ProtectedRoute / RoleRoute**
- Route protection wrappers
- Loading states

## Authentication Flow

### First-Time Login (New User Setup)

1. **Admin creates user:**
   - POST `/auth/admin/create-user`
   - Receives: User data + MFA QR code
   - Admin shares credentials and QR code with user

2. **User logs in:**
   - POST `/auth/login` with email/password
   - System verifies credentials
   - Returns: MFA challenge required

3. **User scans QR code:**
   - User opens authenticator app (Google Authenticator, Microsoft Authenticator, etc.)
   - Scans QR code
   - App displays 6-digit TOTP code

4. **User verifies MFA:**
   - POST `/auth/mfa/verify` with userId + TOTP code
   - Backend verifies code against decrypted secret
   - Issues JWT token
   - Session stored in database
   - User logged in

### Subsequent Logins

1. POST `/auth/login` → MFA challenge
2. POST `/auth/mfa/verify` → JWT + Session
3. Token attached to all requests via `Authorization: Bearer {token}`

### Logout

1. POST `/auth/logout`
2. Session invalidated in database
3. JWT removed from localStorage
4. User redirected to `/login`

## Environment Variables

### Backend (.env)

```bash
# Server
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rediforge

# JWT
JWT_SECRET=your-super-secret-key-change-this

# MFA Encryption (32-byte AES-256 key)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
MFA_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:5000
```

## Security Features

### Password Security
- Bcrypt hashing with 10 salt rounds
- Passwords never stored in plain text
- Temporary passwords for new users

### MFA Security
- TOTP (Time-based One-Time Password) using RFC 6238
- 30-second time windows (2 windows allowed for clock drift)
- Secrets encrypted with AES-256-CBC before storage
- Random IV for each encryption

### JWT Security
- Signed with secret key
- 7-day expiration
- Session validated on every request
- Automatically invalidated on logout

### Role-Based Access Control
- Three roles: Admin, Analyst, Viewer
- Server-side permission checks
- Client-side route protection

## Database Setup

### Local Development

```bash
# Create database
createdb rediforge

# Run migrations
psql -U postgres -d rediforge -f db/migrations/001_initial_schema.sql

# (Optional) Seed sample data
psql -U postgres -d rediforge -f db/seeds/01_users.sql
```

### Heroku Production

```bash
# Heroku Postgres is auto-provisioned
# DATABASE_URL env var is automatically set

# Run migrations via SSH
heroku pg:psql < db/migrations/001_initial_schema.sql
```

## API Testing

### cURL Examples

**Login:**
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

**Verify MFA:**
```bash
curl -X POST http://localhost:5000/auth/mfa/verify \
  -H "Content-Type: application/json" \
  -d '{"userId":"uuid-here","token":"123456"}'
```

**Get Current User:**
```bash
curl -X GET http://localhost:5000/auth/me \
  -H "Authorization: Bearer JWT_TOKEN_HERE"
```

**Create User (Admin):**
```bash
curl -X POST http://localhost:5000/auth/admin/create-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{"email":"newuser@example.com","password":"temppass123","role":"analyst"}'
```

## Troubleshooting

### MFA Code Not Working
- Check system clock is in sync
- Try code from previous 30-second window
- Ensure base32 secret wasn't corrupted during encryption

### Session Expired
- JWT tokens expire after 7 days
- Sessions auto-invalidate on logout
- No refresh token mechanism (user must login again)

### Login Failed
- Verify email exists in database
- Check password hash with bcrypt
- Ensure user account not disabled

### Database Connection Error
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check database permissions

## Production Deployment

### Heroku Setup

1. **Configure secrets:**
   ```bash
   heroku config:set JWT_SECRET=your-production-secret --app your-app
   heroku config:set MFA_ENCRYPTION_KEY=your-32-byte-key --app your-app
   ```

2. **Add Postgres:**
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev --app your-app
   ```

3. **Deploy:**
   ```bash
   git push heroku main
   ```

4. **Run migrations:**
   ```bash
   heroku pg:psql < db/migrations/001_initial_schema.sql --app your-app
   ```

### Security Checklist

- [ ] JWT_SECRET changed from default
- [ ] MFA_ENCRYPTION_KEY is cryptographically random (32 bytes)
- [ ] Database credentials secured
- [ ] HTTPS enforced
- [ ] CORS configured correctly
- [ ] Rate limiting implemented (recommended)
- [ ] Password complexity rules added (optional)
- [ ] Account lockout after failed attempts (optional)

## Future Enhancements

- [ ] Password reset functionality
- [ ] Email verification
- [ ] Two-step verification (backup codes)
- [ ] Account lockout after N failed attempts
- [ ] Rate limiting on login endpoint
- [ ] Audit logging
- [ ] Session management (view/revoke active sessions)
- [ ] OAuth2 integration (optional external auth)
- [ ] Passwordless authentication (magic links)
- [ ] Biometric authentication support

## Support

For issues with authentication, check:
1. Environment variables are set correctly
2. Database migrations have run
3. Backend dependencies installed (`npm install --prefix server`)
4. Frontend dependencies installed (`npm install --prefix client`)
5. No firewall/CORS blocking requests
6. System time is synchronized (for TOTP)
