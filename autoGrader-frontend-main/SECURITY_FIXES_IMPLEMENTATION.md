# Security Fixes Implementation Guide

## Overview

This document describes the comprehensive security improvements implemented to address critical vulnerabilities identified in the security audit.

## Fixed Vulnerabilities

### 1. API Key Exposure (CRITICAL) ✅ FIXED
**Status:** Already secured in codebase
- `/api/groq.ts` and `/api/openai.ts` return 410 Gone status
- API keys never exposed to client
- All AI requests proxied through server-side endpoints

### 2. SQL Injection (CRITICAL) ✅ FIXED
**Status:** Already secured with validation
- `validateReadOnlyQuery()` function blocks dangerous SQL
- Only SELECT and WITH queries allowed
- No multiple statements, comments, or write operations
- Table prefix sanitization with regex validation

### 3. Authentication & Authorization (CRITICAL) ✅ NEW
**Implementation:** Complete JWT-based auth system

**Files Created:**
- `src/lib/api/auth-middleware.ts` - JWT authentication
- `src/pages/api/auth/login.ts` - Login endpoint

**Features:**
- JWT token generation and verification
- Role-based access control (admin, instructor, student)
- Token expiration (24 hours)
- Secure token storage recommendations

**Usage Example:**
```typescript
import { requireAuthWithRole, type AuthenticatedRequest } from '@/lib/api/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // Require authentication and specific role
  const authorized = await requireAuthWithRole(req, res, ['instructor', 'admin']);
  if (!authorized) return;
  
  // Access authenticated user
  const userId = req.user?.id;
  const userRole = req.user?.role;
  
  // ... your logic
}
```

### 4. Rate Limiting (HIGH) ✅ NEW
**Implementation:** Comprehensive rate limiting system

**File Created:**
- `src/lib/api/rate-limiter.ts`

**Rate Limit Configurations:**
- AUTH endpoints: 5 requests / 15 minutes
- AI endpoints: 10 requests / minute
- READ endpoints: 120 requests / minute
- WRITE endpoints: 30 requests / minute
- Standard API: 60 requests / minute

**Features:**
- Per-user and per-IP tracking
- Automatic cleanup of expired entries
- Rate limit headers (X-RateLimit-*)
- Retry-After header on 429 responses

**Usage Example:**
```typescript
import { rateLimit, RATE_LIMITS } from '@/lib/api/rate-limiter';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const rateLimiter = rateLimit(RATE_LIMITS.AI);
  const allowed = await rateLimiter(req, res);
  if (!allowed) return;
  
  // ... your logic
}
```

### 5. Security Headers (HIGH) ✅ NEW
**Implementation:** OWASP-compliant security headers

**File Created:**
- `src/lib/api/security-headers.ts`

**Headers Applied:**
- X-Frame-Options: DENY (clickjacking protection)
- X-Content-Type-Options: nosniff (MIME sniffing protection)
- X-XSS-Protection: 1; mode=block
- Content-Security-Policy (CSP)
- Permissions-Policy (feature restrictions)
- Strict-Transport-Security (HSTS in production)
- CORS headers (restrictive by default)

**Usage Example:**
```typescript
import { withSecurityHeaders } from '@/lib/api/security-headers';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ... your logic
}

export default withSecurityHeaders(handler);
```

### 6. Audit Logging (HIGH) ✅ NEW
**Implementation:** Comprehensive audit trail system

**File Created:**
- `src/lib/api/audit-logger.ts`

**Logged Events:**
- Authentication (login, logout, failures)
- API access
- Database queries
- AI requests
- Workflow executions
- Data exports
- Security violations
- Rate limit exceeded

**Features:**
- Structured JSON logging
- User identification (ID, email, role)
- IP address and user agent tracking
- Timestamp and endpoint tracking
- Critical event database storage
- Production-ready logging integration points

**Usage Example:**
```typescript
import { logAuditEvent, logSecurityViolation } from '@/lib/api/audit-logger';

// Log successful operation
logAuditEvent(req, 'WORKFLOW_EXECUTE', true, { workflowId: 123 });

// Log security violation
logSecurityViolation(req, 'Invalid query attempt', { query });
```

## Updated API Endpoints

### Protected Endpoints

**1. `/api/moodle/query.ts`**
- ✅ Authentication required (instructor/admin)
- ✅ Rate limiting (120 req/min)
- ✅ Security headers applied
- ✅ Audit logging enabled
- ✅ SQL injection protection (existing)
- ✅ Cross-origin protection (existing)

**2. `/api/groq-chat.ts`**
- ✅ Authentication required (instructor/admin)
- ✅ Rate limiting (10 req/min for AI)
- ✅ Security headers applied
- ✅ Audit logging for AI requests
- ✅ API key kept server-side

**3. `/api/assistant-chat.ts`**
- ⚠️ Needs similar updates (TODO)

## Installation & Setup

### 1. Install Required Dependencies

```bash
cd autoGrader-frontend-main/packages/webapp
npm install jose
```

### 2. Environment Variables

Add to `.env.local`:

```env
# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Allowed CORS Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Groq API Key (existing)
GROQ_API_KEY=your-groq-api-key

# Node Environment
NODE_ENV=development
```

### 3. Generate Secure JWT Secret

```bash
# Generate a secure random secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Database Setup (TODO)

Create audit logs table:

```sql
CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  timestamp DATETIME NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  user_id VARCHAR(100),
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  success BOOLEAN NOT NULL,
  details JSON,
  error TEXT,
  INDEX idx_timestamp (timestamp),
  INDEX idx_user_id (user_id),
  INDEX idx_event_type (event_type)
);
```

## Testing the Security Features

### 1. Test Authentication

```bash
# Login (will fail until you implement user database)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"demo-password"}'

# Expected response:
# {"success":true,"token":"eyJhbGc...","user":{...}}
```

### 2. Test Protected Endpoint

```bash
# Without token (should fail)
curl -X POST http://localhost:3000/api/moodle/query \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT * FROM mdl_user LIMIT 1"}'

# Expected: 401 Unauthorized

# With token (should succeed)
curl -X POST http://localhost:3000/api/moodle/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"query":"SELECT * FROM mdl_user LIMIT 1"}'
```

### 3. Test Rate Limiting

```bash
# Make 11 rapid requests (should get rate limited)
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/groq-chat \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"test"}]}'
done

# 11th request should return: 429 Too Many Requests
```

### 4. Check Security Headers

```bash
curl -I http://localhost:3000/api/moodle/query

# Should see headers:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy: ...
# etc.
```

## Migration Guide

### For Existing API Endpoints

To secure an existing endpoint:

```typescript
// Before
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ... logic
}

// After
import { requireAuthWithRole, type AuthenticatedRequest } from '@/lib/api/auth-middleware';
import { rateLimit, RATE_LIMITS } from '@/lib/api/rate-limiter';
import { withSecurityHeaders } from '@/lib/api/security-headers';
import { logApiAccess } from '@/lib/api/audit-logger';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // Apply rate limiting
  const rateLimiter = rateLimit(RATE_LIMITS.API);
  const allowed = await rateLimiter(req, res);
  if (!allowed) return;

  // Require authentication
  const authorized = await requireAuthWithRole(req, res, ['instructor', 'admin']);
  if (!authorized) return;

  // Log access
  logApiAccess(req);

  // ... your existing logic
}

export default withSecurityHeaders(handler);
```

## Production Deployment Checklist

- [ ] Generate strong JWT_SECRET (64+ characters)
- [ ] Set NODE_ENV=production
- [ ] Configure ALLOWED_ORIGINS for your domain
- [ ] Implement user database and authentication
- [ ] Set up audit log database table
- [ ] Configure external logging service (CloudWatch/Datadog)
- [ ] Set up Redis for rate limiting (replace in-memory store)
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Perform security penetration testing
- [ ] Review and update CSP headers for your domain
- [ ] Implement password hashing (bcrypt) for user auth
- [ ] Set up automated security scanning (Snyk/Dependabot)

## Remaining Security Tasks

### High Priority
1. **User Authentication Database**
   - Create users table
   - Implement password hashing (bcrypt)
   - Add email verification
   - Implement password reset flow

2. **Session Management**
   - Token refresh mechanism
   - Token revocation/blacklist
   - Multi-device session tracking

3. **Input Validation**
   - Implement Zod schemas for all endpoints
   - Validate all request bodies
   - Sanitize user inputs

### Medium Priority
4. **CSRF Protection**
   - Implement CSRF tokens for state-changing operations
   - Add SameSite cookie attributes

5. **API Key Rotation**
   - Implement API key rotation for Groq/OpenAI
   - Add key expiration monitoring

6. **Database Credentials**
   - Move DB credentials to server-side only
   - Implement connection pooling
   - Use environment-based configuration

### Low Priority
7. **Advanced Monitoring**
   - Set up intrusion detection
   - Implement anomaly detection
   - Add performance monitoring

8. **Compliance**
   - GDPR compliance audit
   - FERPA compliance for education data
   - Data retention policies

## Security Best Practices

1. **Never expose secrets to client**
   - Keep API keys server-side
   - Use environment variables
   - Rotate keys regularly

2. **Always validate input**
   - Validate on server-side
   - Use type-safe schemas
   - Sanitize user input

3. **Implement defense in depth**
   - Multiple layers of security
   - Fail securely
   - Log security events

4. **Follow principle of least privilege**
   - Grant minimum necessary permissions
   - Use role-based access control
   - Audit permission changes

5. **Keep dependencies updated**
   - Regular security updates
   - Monitor for vulnerabilities
   - Use automated scanning

## Support & Questions

For security-related questions or to report vulnerabilities:
- Create a private security advisory on GitHub
- Email: security@yourdomain.com (configure this)
- Do NOT create public issues for security vulnerabilities

## Changelog

- **2026-02-23**: Initial security implementation
  - Added JWT authentication system
  - Implemented rate limiting
  - Added security headers
  - Created audit logging system
  - Updated critical API endpoints
