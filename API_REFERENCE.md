# RediForge Authentication API Reference

## Base URL
```
http://localhost:5000
```

## Public Endpoints

### POST /auth/login
Login with email and password. First step of authentication.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "mfaRequired": true,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "message": "Enter your MFA code from your authenticator app"
}
```

**Response (Error):**
```json
{
  "error": "Invalid email or password"
}
```

**Status Codes:**
- `200` - Success, MFA required
- `400` - Missing email or password
- `401` - Invalid credentials

---

### POST /auth/mfa/verify
Verify TOTP code and issue JWT token. Second step of authentication.

**Request:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "token": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

**Response (Error):**
```json
{
  "error": "Invalid or expired MFA token"
}
```

**Status Codes:**
- `200` - Success, JWT issued
- `400` - Missing userId or token
- `401` - Invalid token

---

### POST /auth/mfa/setup
Get MFA QR code for a user's email (for admin setup reference)

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "secret": "JBSWY3DPEBLW64TMMQ6GC43JGIEBW75IOBKF6WLWOMN4LRQHA===",
  "qrCodeUrl": "otpauth://totp/RediForge(user@example.com)?secret=JBSWY3DPEBLW64TMMQ6GC43JGIEBW75IOBKF6WLWOMN4LRQHA===&issuer=RediForge",
  "qrCodeImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJQAAAC..."
}
```

**Status Codes:**
- `200` - Success
- `400` - Missing email
- `404` - User not found

---

## Protected Endpoints
*Require Authorization header: `Authorization: Bearer {jwt_token}`*

### GET /auth/me
Get current authenticated user information

**Request:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (Success):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "admin",
  "mfa_enabled": true,
  "created_at": "2024-06-15T10:30:00Z",
  "updated_at": "2024-06-15T10:30:00Z"
}
```

**Status Codes:**
- `200` - Success
- `401` - Missing or invalid token
- `404` - User not found

---

### POST /auth/logout
Invalidate the current session

**Request:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Status Codes:**
- `200` - Success
- `401` - Invalid token

---

### POST /auth/mfa/enable
Enable MFA for the current user

**Request:**
```json
{
  "secret": "JBSWY3DPEBLW64TMMQ6GC43JGIEBW75IOBKF6WLWOMN4LRQHA===",
  "token": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "MFA enabled successfully"
}
```

**Response (Error):**
```json
{
  "error": "Invalid TOTP token"
}
```

**Status Codes:**
- `200` - Success
- `400` - Missing secret or token
- `401` - Invalid token or TOTP code

---

## Admin-Only Endpoints
*Require Authorization header and admin role*

### POST /auth/admin/create-user
Create a new user (admin-only)

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "tempPassword123!",
  "role": "analyst"
}
```

**Response (Success):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "newuser@example.com",
    "role": "analyst",
    "created_at": "2024-06-15T10:35:00Z"
  },
  "mfa": {
    "secret": "JBSWY3DPEBLW64TMMQ6GC43JGIEBW75IOBKF6WLWOMN4LRQHA===",
    "qrCodeUrl": "otpauth://totp/RediForge(newuser@example.com)?secret=...",
    "qrCodeImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJQAAAC..."
  },
  "instructions": "User must scan QR code and verify TOTP code to enable MFA"
}
```

**Response (Error - Not Admin):**
```json
{
  "error": "Only admins can create users"
}
```

**Response (Error - User Exists):**
```json
{
  "error": "User already exists"
}
```

**Status Codes:**
- `200` - Success
- `400` - Missing fields or user exists
- `401` - Invalid token
- `403` - Insufficient permissions (not admin)

---

## Error Response Format

All errors follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

## JWT Token Structure

JWT tokens are signed with HS256 and contain:

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "admin",
  "iat": 1718440200,
  "exp": 1719045000
}
```

**Token Expiration:** 7 days

## TOTP Code Requirements

- **Length:** 6 digits (000000-999999)
- **Time Step:** 30 seconds
- **Window:** ±2 time steps allowed (for clock drift)
- **Algorithm:** HMAC-SHA1
- **Issuer:** RediForge

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid auth) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found (resource doesn't exist) |
| 500 | Internal Server Error |

## Rate Limiting

Currently not implemented. Recommended to add:
- 5 login attempts per minute
- 3 MFA verification attempts per minute
- 10 user creation attempts per minute

## CORS

Frontend requests are allowed from:
- `http://localhost:3000` (development)
- Configure in production

## Authentication Header Format

```
Authorization: Bearer <jwt_token>
```

Example:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MTg0NDAyMDAsImV4cCI6MTcxOTA0NTAwMH0.abcdef...
```

## Role-Based Access Control

### Admin Role
- Access: All features
- Permissions: User creation, user management
- Special endpoints: `/auth/admin/*`

### Analyst Role
- Access: Analytics and reports
- Permissions: Read/write data access
- Special endpoints: `/analytics/*`

### Viewer Role
- Access: Read-only access
- Permissions: View reports and dashboards
- Special endpoints: None (dashboard only)

## Testing with curl

### Login and get JWT:
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

### Get current user:
```bash
curl -X GET http://localhost:5000/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Create user (admin):
```bash
curl -X POST http://localhost:5000/auth/admin/create-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "email": "newuser@example.com",
    "password": "tempPassword123!",
    "role": "analyst"
  }'
```

## WebSocket Support

WebSocket authentication not currently implemented. To add:
1. Extract JWT from connection query string
2. Verify token on connect
3. Attach user context to socket
4. Validate permissions for emitted events

## Refresh Tokens

Currently not implemented. Tokens expire after 7 days.

To implement:
1. Add `refresh_token` field to sessions table
2. Create `/auth/refresh` endpoint
3. Issue short-lived access token + long-lived refresh token
4. Refresh automatically on frontend before expiration

## API Deprecations

None at this time.
