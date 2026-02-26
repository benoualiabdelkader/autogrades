import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import {
  parseMoodleConfig,
  sameOriginRequest,
  validateReadOnlyQuery
} from '@/lib/api/moodle-security';
import { requireAuthWithRole, type AuthenticatedRequest } from '@/lib/api/auth-middleware';
import { rateLimit, RATE_LIMITS } from '@/lib/api/rate-limiter';
import { withSecurityHeaders } from '@/lib/api/security-headers';
import { logDatabaseQuery, logSecurityViolation } from '@/lib/api/audit-logger';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Apply rate limiting
  const rateLimiter = rateLimit(RATE_LIMITS.READ);
  const allowed = await rateLimiter(req, res);
  if (!allowed) return;

  // Require authentication and instructor/admin role
  const authorized = await requireAuthWithRole(req, res, ['instructor', 'admin']);
  if (!authorized) return;

  if (!sameOriginRequest(req)) {
    logSecurityViolation(req, 'Cross-origin request blocked');
    return res.status(403).json({
      success: false,
      error: 'Cross-origin requests are blocked'
    });
  }

  const query = typeof req.body?.query === 'string' ? req.body.query : '';
  const queryValidationError = validateReadOnlyQuery(query);
  if (queryValidationError) {
    logSecurityViolation(req, 'Invalid SQL query', { error: queryValidationError });
    return res.status(400).json({
      success: false,
      error: queryValidationError
    });
  }

  const { host, port, database, user, password } = parseMoodleConfig(req);
  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 7000
    });

    const [rows] = await connection.query(query);

    logDatabaseQuery(req, query, true);

    return res.status(200).json({
      success: true,
      data: rows,
      count: Array.isArray(rows) ? rows.length : 0
    });
  } catch (error: any) {
    console.error('Database query error:', error);
    logDatabaseQuery(req, query, false, error?.message);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Database query failed'
    });
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch {
        // Ignore connection cleanup errors.
      }
    }
  }
}

export default withSecurityHeaders(handler);
