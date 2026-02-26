/**
 * Authentication Middleware
 * Provides JWT-based authentication for API routes
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { SignJWT, jwtVerify } from 'jose';

export type UserRole = 'admin' | 'instructor' | 'student';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  institutionId?: string;
}

export interface AuthenticatedRequest extends NextApiRequest {
  user?: AuthUser;
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-this-secret-in-production'
);

const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRATION = '24h';

/**
 * Generate JWT token for authenticated user
 */
export async function generateToken(user: AuthUser): Promise<string> {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    role: user.role,
    institutionId: user.institutionId
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    return {
      id: payload.id as string,
      email: payload.email as string,
      role: payload.role as UserRole,
      institutionId: payload.institutionId as string | undefined
    };
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from request headers
 */
function extractToken(req: NextApiRequest): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Authentication middleware - verifies JWT token
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: NextApiResponse
): Promise<boolean> {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'NO_TOKEN'
    });
    return false;
  }

  const user = await verifyToken(token);

  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
    return false;
  }

  req.user = user;
  return true;
}

/**
 * Role-based authorization middleware
 */
export function requireRole(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  allowedRoles: UserRole[]
): boolean {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'NO_USER'
    });
    return false;
  }

  if (!allowedRoles.includes(req.user.role)) {
    res.status(403).json({
      success: false,
      error: 'Insufficient permissions',
      code: 'FORBIDDEN',
      required: allowedRoles,
      current: req.user.role
    });
    return false;
  }

  return true;
}

/**
 * Combined auth + role check
 */
export async function requireAuthWithRole(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  allowedRoles: UserRole[]
): Promise<boolean> {
  const authenticated = await requireAuth(req, res);
  if (!authenticated) return false;

  return requireRole(req, res, allowedRoles);
}
