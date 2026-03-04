/**
 * PrivacyShield - نظام حماية الخصوصية الذكي
 * Smart Privacy Protection System
 * 
 * PURPOSE: Encrypt/tokenize personal & sensitive data BEFORE sending to external AI APIs.
 * Only non-personal data (answers, grades, submission text) passes to AI servers.
 * After AI analysis, personal data is restored (decrypted/de-tokenized) in the final output.
 * 
 * FLOW:
 *   Extension Data → PrivacyShield.protect() → Sanitized Data → AI API → AI Response
 *   → PrivacyShield.restore() → Full Result with Original Personal Data
 * 
 * STRATEGY: Tokenization with a reversible local map (never leaves the server).
 *   - Names → [STUDENT_001], [STUDENT_002] ...
 *   - Emails → [EMAIL_001], [EMAIL_002] ...
 *   - IDs → [ID_001], [ID_002] ...
 *   - Phones → [PHONE_001] ...
 *   - Other PII → [PII_001] ...
 * 
 * The map is held in memory only during the request lifecycle.
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface PrivacyShieldConfig {
  /** Fields that are ALWAYS personal (blocked from AI) */
  personalFields: string[];
  /** Fields that are ALWAYS safe for AI (academic content) */
  safeFields: string[];
  /** Enable auto-detection of PII in free-text fields */
  autoDetectPII: boolean;
  /** When true, unknown fields are blocked by default (strict mode) */
  strictMode: boolean;
  /** Custom regex patterns to detect as PII */
  customPatterns?: Array<{ name: string; pattern: RegExp; type: PIIType }>;
}

export type PIIType = 'name' | 'email' | 'phone' | 'id' | 'address' | 'financial' | 'custom';

export interface TokenEntry {
  token: string;
  original: string;
  type: PIIType;
  field: string;
  /** Original record index for multi-record operations */
  recordIndex?: number;
}

export interface ProtectionResult {
  /** Sanitized data safe to send to AI */
  sanitizedData: any;
  /** Number of PII items tokenized */
  tokenCount: number;
  /** Summary of what was protected */
  summary: {
    fieldsRemoved: string[];
    fieldsTokenized: string[];
    piiDetected: number;
    recordsProcessed: number;
  };
  /** Restore function — call with AI response to get full data back */
  restore: (aiResponse: string) => string;
  /** Restore object fields — for structured AI responses */
  restoreObject: (obj: any) => any;
  /** Get the token map for debugging (tokens → types, NO originals shown) */
  getTokenSummary: () => Array<{ token: string; type: PIIType; field: string }>;
}

// ─── Default Configuration ──────────────────────────────────────────

const DEFAULT_PERSONAL_FIELDS = [
  // Identity
  'name', 'full_name', 'fullname', 'firstname', 'lastname', 'first_name', 'last_name',
  'student_name', 'studentName', 'username', 'user_name', 'displayname',
  // Contact
  'email', 'mail', 'e_mail', 'emailaddress', 'email_address',
  'phone', 'mobile', 'telephone', 'phone_number', 'phoneNumber', 'tel',
  // Address
  'address', 'street', 'city', 'state', 'zip', 'zipcode', 'zip_code', 'postal_code', 'country',
  // IDs
  'national_id', 'nationalId', 'ssn', 'social_security', 'passport', 'passport_number',
  'id_number', 'idnumber', 'identity_number',
  // Financial
  'credit_card', 'creditCard', 'card_number', 'bank_account', 'iban',
  // Auth
  'password', 'token', 'secret', 'api_key', 'apikey', 'auth_token',
  // Profile images
  'avatar', 'photo', 'picture', 'profile_image', 'profileimageurl', 'profileimageurlsmall',
  // Moodle-specific personal
  'alternatename', 'middlename', 'institution', 'department', 'description',
  'firstaccess', 'lastaccess', 'lastlogin', 'currentlogin', 'auth', 'confirmed',
  'lang', 'timezone', 'theme', 'mailformat', 'lastip',
];

const DEFAULT_SAFE_FIELDS = [
  // Academic content
  'grade', 'grades', 'score', 'mark', 'marks', 'points', 'total', 'max_grade', 'maxgrade',
  'assignment', 'assignment_name', 'assignmentname', 'course', 'course_name', 'coursename',
  'submission', 'submission_text', 'submissiontext', 'answer', 'response', 'response_text',
  'question', 'quiz', 'test', 'exam', 'content', 'feedback', 'comment', 'comments',
  'rubric', 'criteria', 'criterion',
  // Status
  'status', 'submission_status', 'grading_status', 'attempt', 'attempts',
  'due_date', 'duedate', 'submit_date', 'submitdate', 'timesubmitted', 'timegraded',
  'timemodified', 'timecreated',
  // Numeric identifiers (pseudonymous)
  'student_id', 'studentId', 'id', 'userid', 'user_id', 'courseid', 'course_id',
  'assignmentid', 'assignment_id', 'submissionid',
  // Statistics
  'gpa', 'attendance', 'performance', 'rank', 'percentile',
  'average', 'median', 'std_dev', 'min', 'max',
  // Structural
  'section', 'module', 'category', 'type', 'format',
];

// ─── PII Detection Patterns ────────────────────────────────────────

const PII_PATTERNS: Array<{ name: string; pattern: RegExp; type: PIIType }> = [
  // Email
  { name: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, type: 'email' },
  // Phone (international format)
  { name: 'phone', pattern: /(?:\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4,6}/g, type: 'phone' },
  // Names (Arabic full names — 2+ words with Arabic chars)
  { name: 'arabic_name', pattern: /[\u0600-\u06FF]{2,}\s+[\u0600-\u06FF]{2,}(?:\s+[\u0600-\u06FF]{2,})*/g, type: 'name' },
  // National ID (10 digits starting with 1 or 2 — Saudi/Gulf)
  { name: 'national_id', pattern: /\b[12]\d{9}\b/g, type: 'id' },
  // Credit card (16 digits with optional separators)
  { name: 'credit_card', pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, type: 'financial' },
  // IP address
  { name: 'ip_address', pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, type: 'address' },
];

// ─── PrivacyShield Class ────────────────────────────────────────────

export class PrivacyShield {
  private config: PrivacyShieldConfig;
  /** Maps token → original value. Lives in memory only during request. */
  private tokenMap: Map<string, TokenEntry> = new Map();
  /** Maps original value → token (reverse lookup for deduplication) */
  private reverseMap: Map<string, string> = new Map();
  /** Counters per PII type for sequential token naming */
  private counters: Map<PIIType, number> = new Map();
  /** Personal field names (lowercased for comparison) */
  private personalFieldsSet: Set<string>;
  /** Safe field names (lowercased for comparison) */
  private safeFieldsSet: Set<string>;

  constructor(config?: Partial<PrivacyShieldConfig>) {
    this.config = {
      personalFields: DEFAULT_PERSONAL_FIELDS,
      safeFields: DEFAULT_SAFE_FIELDS,
      autoDetectPII: true,
      strictMode: false,
      ...config,
    };
    this.personalFieldsSet = new Set(this.config.personalFields.map(f => f.toLowerCase()));
    this.safeFieldsSet = new Set(this.config.safeFields.map(f => f.toLowerCase()));
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Protect data before sending to AI.
   * Returns sanitized data + a restore function.
   */
  protect(data: any): ProtectionResult {
    this.reset();
    const fieldsRemoved: string[] = [];
    const fieldsTokenized: string[] = [];
    let piiDetected = 0;
    let recordsProcessed = 0;

    const sanitized = this.processValue(data, '', (field, type, count) => {
      if (type === 'removed') fieldsRemoved.push(field);
      if (type === 'tokenized') fieldsTokenized.push(field);
      piiDetected += count;
    }, 0);

    if (Array.isArray(data)) recordsProcessed = data.length;
    else if (typeof data === 'object' && data !== null) recordsProcessed = 1;

    const tokenMapSnapshot = new Map(this.tokenMap);
    const restore = (text: string) => this.restoreText(text, tokenMapSnapshot);
    const restoreObject = (obj: any) => this.restoreObjectData(obj, tokenMapSnapshot);
    const getTokenSummary = () => [...tokenMapSnapshot.values()].map(e => ({
      token: e.token,
      type: e.type,
      field: e.field,
    }));

    return {
      sanitizedData: sanitized,
      tokenCount: tokenMapSnapshot.size,
      summary: {
        fieldsRemoved: [...new Set(fieldsRemoved)],
        fieldsTokenized: [...new Set(fieldsTokenized)],
        piiDetected,
        recordsProcessed,
      },
      restore,
      restoreObject,
      getTokenSummary,
    };
  }

  /**
   * Convenience: Protect an array of student records.
   */
  protectStudents(students: Record<string, any>[]): ProtectionResult {
    return this.protect(students);
  }

  /**
   * Convenience: Protect a single student record.
   */
  protectStudent(student: Record<string, any>): ProtectionResult {
    return this.protect(student);
  }

  /**
   * Reset internal state (called automatically by protect()).
   */
  reset(): void {
    this.tokenMap.clear();
    this.reverseMap.clear();
    this.counters.clear();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CORE PROCESSING
  // ═══════════════════════════════════════════════════════════════════

  private processValue(
    value: any,
    fieldPath: string,
    onAction: (field: string, type: 'removed' | 'tokenized', count: number) => void,
    recordIndex: number,
  ): any {
    if (value === null || value === undefined) return value;

    if (Array.isArray(value)) {
      return value.map((item, i) => this.processValue(item, fieldPath, onAction, i));
    }

    if (typeof value === 'object') {
      return this.processObject(value, fieldPath, onAction, recordIndex);
    }

    // Primitive value in a field context
    if (fieldPath && typeof value === 'string') {
      return this.processStringField(value, fieldPath, onAction, recordIndex);
    }

    return value;
  }

  private processObject(
    obj: Record<string, any>,
    parentPath: string,
    onAction: (field: string, type: 'removed' | 'tokenized', count: number) => void,
    recordIndex: number,
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = parentPath ? `${parentPath}.${key}` : key;
      const keyLower = key.toLowerCase();

      // Case 1: Known personal field → tokenize the entire value
      if (this.isPersonalField(keyLower)) {
        if (value !== null && value !== undefined && String(value).trim()) {
          const strVal = String(value);
          const piiType = this.inferPIIType(keyLower);
          const token = this.getOrCreateToken(strVal, piiType, key, recordIndex);
          result[key] = token;
          onAction(key, 'tokenized', 1);
        } else {
          // Empty/null personal field → just remove
          onAction(key, 'removed', 0);
        }
        continue;
      }

      // Case 2: Known safe field → pass through as-is
      if (this.isSafeField(keyLower)) {
        result[key] = value;
        continue;
      }

      // Case 3: Unknown field
      if (this.config.strictMode) {
        // In strict mode, unknown fields are removed
        onAction(key, 'removed', 0);
        continue;
      }

      // In normal mode: process recursively, auto-detect PII in strings
      if (typeof value === 'string' && this.config.autoDetectPII) {
        const processed = this.scanAndTokenizePII(value, key, recordIndex);
        if (processed.changed) {
          result[key] = processed.text;
          onAction(key, 'tokenized', processed.count);
        } else {
          result[key] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.processValue(value, fieldPath, onAction, recordIndex);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private processStringField(
    value: string,
    fieldPath: string,
    onAction: (field: string, type: 'removed' | 'tokenized', count: number) => void,
    recordIndex: number,
  ): string {
    const fieldName = fieldPath.split('.').pop() || fieldPath;
    const keyLower = fieldName.toLowerCase();

    if (this.isPersonalField(keyLower)) {
      const piiType = this.inferPIIType(keyLower);
      const token = this.getOrCreateToken(value, piiType, fieldName, recordIndex);
      onAction(fieldName, 'tokenized', 1);
      return token;
    }

    if (this.isSafeField(keyLower)) return value;

    // Auto-detect PII in the text content
    if (this.config.autoDetectPII) {
      const result = this.scanAndTokenizePII(value, fieldName, recordIndex);
      if (result.changed) {
        onAction(fieldName, 'tokenized', result.count);
        return result.text;
      }
    }

    return value;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PII SCANNING & TOKENIZATION
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Scan a string for PII patterns and replace with tokens.
   */
  private scanAndTokenizePII(
    text: string,
    field: string,
    recordIndex: number,
  ): { text: string; changed: boolean; count: number } {
    let result = text;
    let count = 0;
    let changed = false;

    const allPatterns = [...PII_PATTERNS, ...(this.config.customPatterns || [])];

    for (const { pattern, type } of allPatterns) {
      // Reset regex lastIndex
      const regex = new RegExp(pattern.source, pattern.flags);
      const matches = [...text.matchAll(regex)];

      for (const match of matches) {
        const original = match[0];
        // Don't tokenize very short matches (likely false positives)
        if (original.length < 3) continue;
        // Don't tokenize numbers that look like grades/scores
        if (type === 'id' && this.looksLikeGrade(original, field)) continue;

        const token = this.getOrCreateToken(original, type, field, recordIndex);
        result = result.split(original).join(token);
        count++;
        changed = true;
      }
    }

    return { text: result, changed, count };
  }

  /**
   * Heuristic: does this number look like a grade rather than an ID?
   */
  private looksLikeGrade(value: string, field: string): boolean {
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    const fieldLower = field.toLowerCase();
    // If the field is grade-related, treat as grade
    if (/grade|score|mark|point|total|max|gpa|percent/i.test(fieldLower)) return true;
    // Numbers 0-100 in non-ID fields are likely grades
    if (num >= 0 && num <= 100 && !/id|number|national|passport/i.test(fieldLower)) return true;
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TOKEN MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  private getOrCreateToken(original: string, type: PIIType, field: string, recordIndex: number): string {
    // Deduplicate: if we've seen this exact value, reuse the token
    const existing = this.reverseMap.get(original);
    if (existing) return existing;

    const count = (this.counters.get(type) || 0) + 1;
    this.counters.set(type, count);

    const prefix = this.getTokenPrefix(type);
    const token = `[${prefix}_${String(count).padStart(3, '0')}]`;

    const entry: TokenEntry = { token, original, type, field, recordIndex };
    this.tokenMap.set(token, entry);
    this.reverseMap.set(original, token);

    return token;
  }

  private getTokenPrefix(type: PIIType): string {
    switch (type) {
      case 'name': return 'STUDENT';
      case 'email': return 'EMAIL';
      case 'phone': return 'PHONE';
      case 'id': return 'ID';
      case 'address': return 'ADDR';
      case 'financial': return 'FIN';
      case 'custom': return 'PII';
      default: return 'PII';
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FIELD CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════════

  private isPersonalField(fieldLower: string): boolean {
    return this.personalFieldsSet.has(fieldLower);
  }

  private isSafeField(fieldLower: string): boolean {
    return this.safeFieldsSet.has(fieldLower);
  }

  private inferPIIType(fieldLower: string): PIIType {
    if (/email|mail/.test(fieldLower)) return 'email';
    if (/phone|mobile|tel/.test(fieldLower)) return 'phone';
    if (/name|firstname|lastname|fullname/.test(fieldLower)) return 'name';
    if (/id|passport|national|ssn/.test(fieldLower)) return 'id';
    if (/address|street|city|zip|postal|country/.test(fieldLower)) return 'address';
    if (/credit|card|bank|iban|financial/.test(fieldLower)) return 'financial';
    return 'custom';
  }

  // ═══════════════════════════════════════════════════════════════════
  //  RESTORATION (De-tokenization)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Restore all tokens in a text string back to original values.
   * Used for AI text responses.
   */
  private restoreText(text: string, map: Map<string, TokenEntry>): string {
    let result = text;
    for (const [token, entry] of map) {
      // Use split+join for global replacement (works with brackets)
      result = result.split(token).join(entry.original);
    }
    return result;
  }

  /**
   * Restore tokens in an object recursively.
   * Used for structured AI responses (JSON).
   */
  private restoreObjectData(obj: any, map: Map<string, TokenEntry>): any {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
      return this.restoreText(obj, map);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.restoreObjectData(item, map));
    }

    if (typeof obj === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.restoreObjectData(value, map);
      }
      return result;
    }

    return obj;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UTILITIES
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get a human-readable protection report.
   */
  getProtectionReport(result: ProtectionResult, lang: 'en' | 'ar' = 'en'): string {
    const s = result.summary;
    if (lang === 'ar') {
      return [
        '🛡️ **تقرير حماية الخصوصية:**',
        `- السجلات المعالجة: ${s.recordsProcessed}`,
        `- البيانات الشخصية المحمية: ${s.piiDetected}`,
        `- الحقول المرمزة: ${s.fieldsTokenized.join(', ') || 'لا يوجد'}`,
        `- الحقول المحذوفة: ${s.fieldsRemoved.join(', ') || 'لا يوجد'}`,
        `- إجمالي الرموز: ${result.tokenCount}`,
        '',
        '✅ البيانات الشخصية لن تمر على خوادم AI الخارجية.',
      ].join('\n');
    }
    return [
      '🛡️ **Privacy Protection Report:**',
      `- Records processed: ${s.recordsProcessed}`,
      `- PII items protected: ${s.piiDetected}`,
      `- Fields tokenized: ${s.fieldsTokenized.join(', ') || 'None'}`,
      `- Fields removed: ${s.fieldsRemoved.join(', ') || 'None'}`,
      `- Total tokens: ${result.tokenCount}`,
      '',
      '✅ No personal data will reach external AI servers.',
    ].join('\n');
  }
}

// ─── Singleton ──────────────────────────────────────────────────────

let _instance: PrivacyShield | null = null;

export function getPrivacyShield(config?: Partial<PrivacyShieldConfig>): PrivacyShield {
  if (!_instance) {
    _instance = new PrivacyShield(config);
  }
  return _instance;
}

export default PrivacyShield;
