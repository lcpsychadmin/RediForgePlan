import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db.js';
import { encryptMFASecret, decryptMFASecret } from './mfa.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // 7 days
const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Promise<string> - Hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare plain text password with hash
 * @param password - Plain text password
 * @param hash - Stored password hash
 * @returns Promise<boolean> - True if password matches
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Create a JWT token for a user
 * @param userId - User UUID
 * @param email - User email
 * @param role - User role
 * @returns Object with token and expiration
 */
export const createJWT = (userId: string, email: string, role: string, tenantId: string) => {
  const expiresIn = JWT_EXPIRES_IN;
  const token = jwt.sign(
    {
      userId,
      email,
      role,
      tenantId,
    },
    JWT_SECRET,
    { expiresIn }
  );

  return {
    token,
    expiresIn,
  };
};

/**
 * Verify a JWT token
 * @param token - JWT token to verify
 * @returns Object with decoded payload or null if invalid
 */
export const verifyJWT = (token: string): any => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Store session in database
 * @param userId - User UUID
 * @param token - JWT token
 * @returns Promise<void>
 */
export const storeSession = async (userId: string, token: string, tenantId?: string): Promise<void> => {
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  let resolvedTenantId = tenantId;
  if (!resolvedTenantId) {
    const userResult = await query(`SELECT tenant_id FROM users WHERE id = $1`, [userId]);
    resolvedTenantId = userResult.rows[0]?.tenant_id || null;
  }

  if (!resolvedTenantId) {
    throw new Error('Unable to create session without tenant context');
  }

  await query(
    `INSERT INTO sessions (id, user_id, jwt_token, expires_at, tenant_id) VALUES ($1, $2, $3, $4, $5)`,
    [sessionId, userId, token, expiresAt, resolvedTenantId]
  );
};

/**
 * Verify session exists and is not expired
 * @param token - JWT token
 * @returns Promise<boolean> - True if session is valid
 */
export const verifySession = async (token: string, tenantId?: string): Promise<boolean> => {
  try {
    const where: string[] = ['jwt_token = $1', 'expires_at > NOW()'];
    const params: any[] = [token];

    if (tenantId) {
      where.push(`tenant_id = $${params.length + 1}`);
      params.push(tenantId);
    }

    const result = await query(`SELECT id FROM sessions WHERE ${where.join(' AND ')}`, params);

    return result.rows.length > 0;
  } catch (error) {
    return false;
  }
};

/**
 * Invalidate a session
 * @param token - JWT token to invalidate
 * @returns Promise<void>
 */
export const invalidateSession = async (token: string): Promise<void> => {
  await query(`DELETE FROM sessions WHERE jwt_token = $1`, [token]);
};

/**
 * Get user by email
 * @param email - User email
 * @returns Promise with user data or null
 */
export const getUserByEmail = async (email: string, tenantId?: string) => {
  const params: any[] = [email];
  let sql = `SELECT id, email, password_hash, role, mfa_enabled, mfa_secret, tenant_id
             FROM users
             WHERE lower(email) = lower($1)`;

  if (tenantId) {
    sql += ` AND tenant_id = $2`;
    params.push(tenantId);
  }

  const result = await query(sql, params);

  return result.rows[0] || null;
};

/**
 * Get user by ID
 * @param userId - User UUID
 * @returns Promise with user data or null
 */
export const getUserById = async (userId: string, tenantId?: string) => {
  const params: any[] = [userId];
  let sql = `SELECT id, email, role, mfa_enabled, created_at, updated_at, tenant_id
             FROM users
             WHERE id = $1`;

  if (tenantId) {
    sql += ` AND tenant_id = $2`;
    params.push(tenantId);
  }

  const result = await query(sql, params);

  return result.rows[0] || null;
};

/**
 * Create a new user (admin-only)
 * @param email - User email
 * @param password - Temporary password
 * @param role - User role
 * @returns Promise with user data
 */
export const createUser = async (
  email: string,
  password: string,
  role: string = 'viewer',
  tenantId: string
) => {
  const userId = uuidv4();
  const passwordHash = await hashPassword(password);

  const result = await query(
    `INSERT INTO users (id, email, password_hash, role, mfa_enabled, tenant_id) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, role, created_at`,
    [userId, email, passwordHash, role, false, tenantId]
  );

  return result.rows[0];
};

/**
 * List users for assignment workflows
 * @returns Promise of users with identity/role fields
 */
export const listUsersForAssignment = async (tenantId: string) => {
  const result = await query(
    `SELECT id, email, role, created_at, updated_at
     FROM users
     WHERE tenant_id = $1
     ORDER BY email ASC`
    ,
    [tenantId]
  );

  return result.rows;
};

/**
 * Update user MFA secret and enable MFA
 * @param userId - User UUID
 * @param mfaSecret - Encrypted MFA secret
 * @returns Promise<void>
 */
export const enableUserMFA = async (
  userId: string,
  mfaSecret: string,
  tenantId?: string
): Promise<void> => {
  const encryptedSecret = encryptMFASecret(mfaSecret);

  const params: any[] = [encryptedSecret, userId];
  let sql = `UPDATE users SET mfa_secret = $1, mfa_enabled = true, updated_at = NOW() WHERE id = $2`;
  if (tenantId) {
    sql += ` AND tenant_id = $3`;
    params.push(tenantId);
  }

  await query(sql, params);
};

/**
 * Get decrypted MFA secret for a user
 * @param userId - User UUID
 * @returns Promise<string | null> - Decrypted secret or null
 */
export const getUserMFASecret = async (userId: string, tenantId?: string): Promise<string | null> => {
  const params: any[] = [userId];
  let sql = `SELECT mfa_secret FROM users WHERE id = $1`;
  if (tenantId) {
    sql += ` AND tenant_id = $2`;
    params.push(tenantId);
  }
  const result = await query(sql, params);

  if (!result.rows[0] || !result.rows[0].mfa_secret) {
    return null;
  }

  return decryptMFASecret(result.rows[0].mfa_secret);
};

/**
 * Update user password
 * @param userId - User UUID
 * @param newPassword - New password
 * @returns Promise<void>
 */
export const updateUserPassword = async (
  userId: string,
  newPassword: string,
  tenantId?: string
): Promise<void> => {
  const passwordHash = await hashPassword(newPassword);

  const params: any[] = [passwordHash, userId];
  let sql = `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`;
  if (tenantId) {
    sql += ` AND tenant_id = $3`;
    params.push(tenantId);
  }

  await query(sql, params);
};

/**
 * Check if user exists
 * @param email - User email
 * @returns Promise<boolean>
 */
export const userExists = async (email: string, tenantId?: string): Promise<boolean> => {
  const params: any[] = [email];
  let sql = `SELECT id FROM users WHERE lower(email) = lower($1)`;
  if (tenantId) {
    sql += ` AND tenant_id = $2`;
    params.push(tenantId);
  }

  const result = await query(sql, params);
  return result.rows.length > 0;
};
