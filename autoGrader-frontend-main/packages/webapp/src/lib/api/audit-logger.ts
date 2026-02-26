/**
 * Audit Logging System
 * Tracks all security-relevant events
 */

import type { NextApiRequest } from 'next';
import type { AuthUser } from './auth-middleware';

export type AuditEventType =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_FAILED'
  | 'API_ACCESS'
  | 'DB_QUERY'
  | 'AI_REQUEST'
  | 'WORKFLOW_EXECUTE'
  | 'DATA_EXPORT'
  | 'SECURITY_VIOLATION'
  | 'RATE_LIMIT_EXCEEDED';

export interface AuditEvent {
  timestamp: string;
  type: AuditEventType;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ip: string;
  userAgent: string;
  endpoint: string;
  method: string;
  success: boolean;
  details?: Record<string, any>;
  error?: string;
}

/**
 * Get client IP from request
 */
function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
  }
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Log audit event
 * In production, this should write to a secure logging service
 * (e.g., CloudWatch, Datadog, Splunk)
 */
export function logAuditEvent(
  req: NextApiRequest,
  type: AuditEventType,
  success: boolean,
  details?: Record<string, any>,
  error?: string
): void {
  const user = (req as any).user as AuthUser | undefined;

  const event: AuditEvent = {
    timestamp: new Date().toISOString(),
    type,
    userId: user?.id,
    userEmail: user?.email,
    userRole: user?.role,
    ip: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'unknown',
    endpoint: req.url || 'unknown',
    method: req.method || 'unknown',
    success,
    details,
    error
  };

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.log('[AUDIT]', JSON.stringify(event, null, 2));
  }

  // In production, send to logging service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with CloudWatch, Datadog, or other logging service
    // Example: await sendToCloudWatch(event);
    
    // For now, write to stdout (captured by container logs)
    console.log(JSON.stringify(event));
  }

  // Store critical security events in database for compliance
  if (isCriticalEvent(type)) {
    storeCriticalEvent(event).catch(err => {
      console.error('Failed to store critical audit event:', err);
    });
  }
}

/**
 * Check if event is critical and requires database storage
 */
function isCriticalEvent(type: AuditEventType): boolean {
  return [
    'AUTH_FAILED',
    'SECURITY_VIOLATION',
    'RATE_LIMIT_EXCEEDED',
    'DATA_EXPORT'
  ].includes(type);
}

/**
 * Store critical events in database
 * TODO: Implement database storage
 */
async function storeCriticalEvent(event: AuditEvent): Promise<void> {
  // Placeholder for database storage
  // In production, store in audit_logs table
}

/**
 * Helper to log successful API access
 */
export function logApiAccess(
  req: NextApiRequest,
  details?: Record<string, any>
): void {
  logAuditEvent(req, 'API_ACCESS', true, details);
}

/**
 * Helper to log failed authentication
 */
export function logAuthFailure(
  req: NextApiRequest,
  reason: string
): void {
  logAuditEvent(req, 'AUTH_FAILED', false, { reason });
}

/**
 * Helper to log security violations
 */
export function logSecurityViolation(
  req: NextApiRequest,
  violation: string,
  details?: Record<string, any>
): void {
  logAuditEvent(req, 'SECURITY_VIOLATION', false, {
    violation,
    ...details
  });
}

/**
 * Helper to log database queries
 */
export function logDatabaseQuery(
  req: NextApiRequest,
  query: string,
  success: boolean,
  error?: string
): void {
  logAuditEvent(req, 'DB_QUERY', success, {
    queryLength: query.length,
    queryPreview: query.substring(0, 100)
  }, error);
}

/**
 * Helper to log AI requests
 */
export function logAiRequest(
  req: NextApiRequest,
  model: string,
  success: boolean,
  details?: Record<string, any>
): void {
  logAuditEvent(req, 'AI_REQUEST', success, {
    model,
    ...details
  });
}
