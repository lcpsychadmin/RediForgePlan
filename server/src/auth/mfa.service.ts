import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

/**
 * MFA Service - Handles TOTP generation, verification, and QR code generation
 */

const MFA_ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || 'your-32-byte-encryption-key-here';

/**
 * Generate a new TOTP secret for a user
 * @param email - User email (used in QR code label)
 * @returns Object with base32 secret and provisioning URI
 */
export const generateMFASecret = (email: string) => {
  const secret = speakeasy.generateSecret({
    name: `RediForge (${email})`,
    issuer: 'RediForge',
    length: 32,
  });

  return {
    base32: secret.base32,
    qrCodeUrl: secret.otpauth_url,
  };
};

/**
 * Generate QR code as data URL (for displaying in UI)
 * @param otpauth_url - The provisioning URI (otpauth://)
 * @returns Promise<string> - Data URL of QR code PNG
 */
export const generateQRCodeDataUrl = async (otpauth_url: string): Promise<string> => {
  try {
    const qrCodeUrl = await QRCode.toDataURL(otpauth_url);
    return qrCodeUrl;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Verify a TOTP token against a secret
 * @param token - The 6-digit code from authenticator app
 * @param base32Secret - The stored base32 secret
 * @returns boolean - True if token is valid
 */
export const verifyTOTPToken = (token: string, base32Secret: string): boolean => {
  try {
    const verified = speakeasy.totp.verify({
      secret: base32Secret,
      encoding: 'base32',
      token: token,
      window: 2, // Allow 2 time windows for clock drift
    });

    return verified;
  } catch (error) {
    return false;
  }
};

/**
 * Encrypt MFA secret for storage in database
 * @param secret - The base32 secret to encrypt
 * @returns string - Encrypted secret
 */
export const encryptMFASecret = (secret: string): string => {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(MFA_ENCRYPTION_KEY, 'utf-8').slice(0, 32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Prepend IV to encrypted data
  return iv.toString('hex') + ':' + encrypted;
};

/**
 * Decrypt MFA secret from database
 * @param encryptedSecret - The encrypted secret with IV prepended
 * @returns string - Decrypted base32 secret
 */
export const decryptMFASecret = (encryptedSecret: string): string => {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(MFA_ENCRYPTION_KEY, 'utf-8').slice(0, 32);

  const parts = encryptedSecret.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};
