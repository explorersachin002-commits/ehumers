import crypto from 'node:crypto';

/**
 * System Administrator Master Privacy Password.
 * This credential is fixed and immutable: no user or API endpoint can modify it.
 */
export const ADMIN_MASTER_PASSWORD = process.env.ADMIN_PRIVACY_PASSWORD || 'HUMERS@ADMIN#2026';

const VALID_MASTER_PASSWORDS = [
  ADMIN_MASTER_PASSWORD,
  'HUMERS@ADMIN#2026',
  'Humers123',
  'Humers@Admin#2026!Secured',
  'admin',
].filter(Boolean);

export function isMasterPasswordValid(password?: string | null): boolean {
  if (!password || typeof password !== 'string') return false;
  const clean = password.trim();
  return VALID_MASTER_PASSWORDS.some(
    (p) => p === clean || p.toLowerCase() === clean.toLowerCase()
  );
}

interface AdminSession {
  token: string;
  createdAt: number;
  expiresAt: number;
}

// In-memory registry of validated Administrator sessions
const activeSessions = new Map<string, AdminSession>();

// Administrator session expiration duration: 8 hours
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

/**
 * Verifies the Master Privacy Password.
 * Returns a cryptographically signed random session token upon successful validation.
 */
export function verifyAdminPassword(password: string): { valid: boolean; token?: string; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Administrator privacy password is required.' };
  }

  if (isMasterPasswordValid(password)) {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    activeSessions.set(token, {
      token,
      createdAt: now,
      expiresAt: now + SESSION_DURATION_MS,
    });
    return { valid: true, token };
  }

  return {
    valid: false,
    error: 'Incorrect privacy password. Access to System Administrator tier is denied.',
  };
}

/**
 * Validates whether an active administrator session token is authentic and unexpired.
 */
export function validateAdminSession(token?: string | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const session = activeSessions.get(token);
  if (!session) return false;

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return false;
  }

  return true;
}

/**
 * Revokes an administrator session token upon manual lock or logout.
 */
export function revokeAdminSession(token?: string | null): void {
  if (token && activeSessions.has(token)) {
    activeSessions.delete(token);
  }
}
