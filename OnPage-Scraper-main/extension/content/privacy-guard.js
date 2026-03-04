/**
 * ExtensionPrivacyGuard - حماية البيانات في الإضافة
 * Privacy Protection Layer for Extension Data
 * 
 * Strips / tokenizes personal identifiable information (PII) before
 * data is sent from the extension to any external API, including
 * the AutoGrader dashboard. Personal data stays local; only academic
 * data (grades, answers, submission status) leaves the browser.
 * 
 * This mirrors the server-side PrivacyShield.ts but runs entirely
 * in the browser context (content script or service worker).
 */

class ExtensionPrivacyGuard {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.strictMode = options.strictMode || false;
        // Token counter per type for unique, reversible tokens
        this._counters = {};
        // Forward map: original → token
        this._tokenMap = new Map();
        // Reverse map: token → original
        this._reverseMap = new Map();
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PUBLIC: Protect Data Before Sending
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Protect an array of student/grade records before sending to API.
     * Returns { sanitized, restore, summary }.
     */
    protectRecords(records) {
        if (!this.enabled || !Array.isArray(records)) {
            return { sanitized: records, restore: (r) => r, summary: { fieldsProtected: 0 } };
        }

        this._resetMaps();
        const sanitized = records.map(record => this._protectRecord(record));

        const reverseMap = new Map(this._reverseMap);
        const restoreFn = (data) => this._restoreData(data, reverseMap);

        return {
            sanitized,
            restore: restoreFn,
            summary: {
                recordsProcessed: records.length,
                fieldsProtected: this._tokenMap.size,
                tokenTypes: this._getTokenTypeCounts(),
            }
        };
    }

    /**
     * Protect a single object.
     */
    protectObject(obj) {
        if (!this.enabled || !obj || typeof obj !== 'object') {
            return { sanitized: obj, restore: (o) => o, summary: { fieldsProtected: 0 } };
        }

        this._resetMaps();
        const sanitized = this._protectRecord(obj);

        const reverseMap = new Map(this._reverseMap);
        return {
            sanitized,
            restore: (data) => this._restoreData(data, reverseMap),
            summary: { fieldsProtected: this._tokenMap.size },
        };
    }

    /**
     * Protect free text (e.g. chat messages).
     */
    protectText(text) {
        if (!this.enabled || typeof text !== 'string') return { sanitized: text, restore: (t) => t };

        this._resetMaps();
        const sanitized = this._tokenizeFreeText(text);
        const reverseMap = new Map(this._reverseMap);

        return {
            sanitized,
            restore: (t) => this._restoreText(t, reverseMap),
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    //  FIELD CLASSIFICATION
    // ═══════════════════════════════════════════════════════════════════

    /** Fields that contain personal/identifying information */
    static PERSONAL_FIELDS = new Set([
        'name', 'student_name', 'studentName', 'student', 'fullname', 'full_name',
        'first_name', 'last_name', 'firstName', 'lastName', 'displayname',
        'email', 'e_mail', 'emailaddress', 'student_email', 'studentEmail',
        'phone', 'mobile', 'telephone', 'phone_number', 'phoneNumber',
        'address', 'city', 'country', 'street', 'postal', 'zip',
        'id_number', 'national_id', 'ssn', 'passport', 'idNumber',
        'student_id', 'studentId', 'user_id', 'userId', 'profileUrl',
        'username', 'login', 'ip_address', 'ipAddress',
        'parent_name', 'parentName', 'guardian', 'emergency_contact',
        'date_of_birth', 'dob', 'birthdate', 'age', 'gender', 'sex',
        'photo', 'avatar', 'picture', 'image', 'profilepic',
        // Arabic field names
        'الاسم', 'اسم_الطالب', 'البريد', 'الهاتف', 'العنوان', 'الرقم_الوطني',
    ]);

    /** Fields that are safe to send (academic/grade data) */
    static SAFE_FIELDS = new Set([
        'grade', 'score', 'mark', 'points', 'percentage', 'max_grade', 'maxGrade',
        'status', 'submission_status', 'submissionStatus', 'grading_status',
        'assignment', 'assignment_name', 'assignmentName', 'title',
        'course', 'course_name', 'courseName', 'course_id', 'courseId',
        'assignment_id', 'assignmentId', 'type', 'category',
        'feedback', 'comment', 'comments', 'response', 'answer',
        'submission_date', 'submissionDate', 'due_date', 'dueDate',
        'attempt', 'attempts', 'time_spent', 'timeSpent',
        'source', 'url', 'timestamp', 'created_at', 'updated_at',
        // Computed stats
        'averageGrade', 'average_grade', 'totalAssignments', 'total_assignments',
        // Arabic labels
        'الدرجة', 'النتيجة', 'الحالة', 'المادة', 'الواجب',
    ]);

    // ═══════════════════════════════════════════════════════════════════
    //  PII REGEX PATTERNS
    // ═══════════════════════════════════════════════════════════════════

    static PII_PATTERNS = [
        { type: 'EMAIL', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
        { type: 'PHONE', regex: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g },
        { type: 'ARABIC_NAME', regex: /(?:[\u0621-\u064A]+\s){2,}[\u0621-\u064A]+/g },
        { type: 'NATIONAL_ID', regex: /\b\d{9,14}\b/g },
    ];

    // ═══════════════════════════════════════════════════════════════════
    //  INTERNAL: Tokenization
    // ═══════════════════════════════════════════════════════════════════

    _resetMaps() {
        this._counters = {};
        this._tokenMap = new Map();
        this._reverseMap = new Map();
    }

    _getToken(type, originalValue) {
        // Dedup: same value → same token
        const key = `${type}::${originalValue}`;
        if (this._tokenMap.has(key)) {
            return this._tokenMap.get(key);
        }

        this._counters[type] = (this._counters[type] || 0) + 1;
        const token = `[${type}_${String(this._counters[type]).padStart(3, '0')}]`;
        this._tokenMap.set(key, token);
        this._reverseMap.set(token, originalValue);
        return token;
    }

    _protectRecord(record) {
        if (!record || typeof record !== 'object') return record;
        if (Array.isArray(record)) return record.map(r => this._protectRecord(r));

        const sanitized = {};
        for (const [key, value] of Object.entries(record)) {
            const lowerKey = key.toLowerCase().replace(/[-_\s]/g, '');

            if (ExtensionPrivacyGuard.SAFE_FIELDS.has(key)) {
                // Safe fields: pass through but scan for PII in text values
                sanitized[key] = typeof value === 'string' ? this._tokenizeFreeText(value) : value;
            } else if (ExtensionPrivacyGuard.PERSONAL_FIELDS.has(key) || this._looksPersonal(lowerKey)) {
                // Personal fields: tokenize
                if (typeof value === 'string' && value.trim()) {
                    const tokenType = this._fieldToTokenType(key);
                    sanitized[key] = this._getToken(tokenType, value.trim());
                } else {
                    sanitized[key] = value;
                }
            } else if (typeof value === 'object' && value !== null) {
                // Nested objects
                sanitized[key] = this._protectRecord(value);
            } else if (typeof value === 'string') {
                // Unknown fields: scan for PII
                sanitized[key] = this.strictMode ? this._tokenizeFreeText(value) : value;
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    _looksPersonal(normalizedKey) {
        const personalHints = ['name', 'email', 'phone', 'mobile', 'address', 'birth', 'ssn', 'passport', 'national', 'parent', 'guardian'];
        return personalHints.some(hint => normalizedKey.includes(hint));
    }

    _fieldToTokenType(fieldName) {
        const lower = fieldName.toLowerCase();
        if (lower.includes('email')) return 'EMAIL';
        if (lower.includes('phone') || lower.includes('mobile')) return 'PHONE';
        if (lower.includes('id') && !lower.includes('assignment') && !lower.includes('course')) return 'ID';
        if (lower.includes('address') || lower.includes('city') || lower.includes('country')) return 'ADDRESS';
        return 'STUDENT';
    }

    _tokenizeFreeText(text) {
        if (!text || typeof text !== 'string') return text;
        let result = text;

        for (const { type, regex } of ExtensionPrivacyGuard.PII_PATTERNS) {
            result = result.replace(new RegExp(regex.source, regex.flags), (match) => {
                return this._getToken(type, match);
            });
        }
        return result;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  INTERNAL: Restoration
    // ═══════════════════════════════════════════════════════════════════

    _restoreData(data, reverseMap) {
        if (typeof data === 'string') return this._restoreText(data, reverseMap);
        if (Array.isArray(data)) return data.map(item => this._restoreData(item, reverseMap));
        if (data && typeof data === 'object') {
            const restored = {};
            for (const [key, value] of Object.entries(data)) {
                restored[key] = this._restoreData(value, reverseMap);
            }
            return restored;
        }
        return data;
    }

    _restoreText(text, reverseMap) {
        if (typeof text !== 'string') return text;
        let result = text;
        for (const [token, original] of reverseMap.entries()) {
            result = result.split(token).join(original);
        }
        return result;
    }

    _getTokenTypeCounts() {
        const counts = {};
        for (const [key] of this._tokenMap) {
            const type = key.split('::')[0];
            counts[type] = (counts[type] || 0) + 1;
        }
        return counts;
    }
}

// Make available in multiple contexts
if (typeof window !== 'undefined') {
    window.ExtensionPrivacyGuard = ExtensionPrivacyGuard;
}
if (typeof self !== 'undefined') {
    self.ExtensionPrivacyGuard = ExtensionPrivacyGuard;
}
