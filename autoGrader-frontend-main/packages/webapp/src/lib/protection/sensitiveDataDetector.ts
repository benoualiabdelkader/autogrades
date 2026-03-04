/**
 * حكاية حماية البيانات الحساسة
 * Sensitive Data Detector
 * كشف وتعرف على البيانات الحساسة تلقائيًا
 */

export interface SensitivePattern {
  name: string;
  pattern: RegExp;
  type: 'email' | 'phone' | 'id' | 'name' | 'financial' | 'custom';
  severity: 'high' | 'medium' | 'low';
}

export interface DetectionResult {
  found: boolean;
  matches: Array<{
    text: string;
    type: string;
    pattern: string;
    position: number;
    severity: 'high' | 'medium' | 'low';
  }>;
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * كاشف البيانات الحساسة - Sensitive Data Detector
 */
export class SensitiveDataDetector {
  private patterns: Map<string, SensitivePattern>;

  constructor() {
    this.patterns = new Map();
    this.initializePatterns();
  }

  /**
   * تهيئة الأنماط الحساسة الافتراضية
   * Initialize default sensitive patterns
   */
  private initializePatterns(): void {
    // البريد الإلكتروني - Email Pattern
    this.patterns.set('email', {
      name: 'بريد إلكتروني',
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      type: 'email',
      severity: 'high',
    });

    // أرقام الهاتف - Phone Pattern (International)
    this.patterns.set('phone', {
      name: 'رقم الهاتف',
      pattern: /(?:\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{4,6}/g,
      type: 'phone',
      severity: 'high',
    });

    // رقم الهوية - ID Pattern (Saudi, UAE, etc)
    this.patterns.set('nationalId', {
      name: 'رقم الهوية الوطنية',
      pattern: /\b[0-2]\d{9}\b/g,
      type: 'id',
      severity: 'high',
    });

    // Passport Pattern
    this.patterns.set('passport', {
      name: 'جواز السفر',
      pattern: /\b[A-Z]{2}\d{6,9}\b/g,
      type: 'id',
      severity: 'high',
    });

    // أرقام بطاقة الائتمان - Credit Card Pattern
    this.patterns.set('creditCard', {
      name: 'بطاقة ائتمان',
      pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      type: 'financial',
      severity: 'high',
    });

    // أرقام IBAN - IBAN Pattern
    this.patterns.set('iban', {
      name: 'حساب بنكي (IBAN)',
      pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b/g,
      type: 'financial',
      severity: 'high',
    });

    // رقم الضمان الاجتماعي - SSN Pattern (US)
    this.patterns.set('ssn', {
      name: 'رقم الضمان الاجتماعي',
      pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
      type: 'financial',
      severity: 'high',
    });

    // عنوان منزلي - Address Pattern
    this.patterns.set('address', {
      name: 'عنوان منزلي',
      pattern: /\b\d+\s+[A-Za-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct)\b/gi,
      type: 'custom',
      severity: 'medium',
    });

    // تاريخ الميلاد - Date of Birth Pattern
    this.patterns.set('dob', {
      name: 'تاريخ الميلاد',
      pattern: /\b(0[1-9]|[12]\d|3[01])[-\/](0[1-9]|1[012])[-\/](19|20)\d{2}\b/g,
      type: 'custom',
      severity: 'medium',
    });

    // أسماء شائعة - Name Pattern
    this.patterns.set('names', {
      name: 'أسماء طلاب',
      pattern: /\b(Ahmed|Sara|Mohamed|Fatima|Ali|Zainab|Hassan|Maryam|Omar|Leila)\b/gi,
      type: 'name',
      severity: 'medium',
    });
  }

  /**
   * إضافة نمط مخصص - Add custom pattern
   */
  addPattern(key: string, pattern: SensitivePattern): void {
    this.patterns.set(key, pattern);
  }

  /**
   * كشف البيانات الحساسة في النص - Detect sensitive data in text
   */
  detect(text: string): DetectionResult {
    if (!text || typeof text !== 'string') {
      return {
        found: false,
        matches: [],
        summary: { total: 0, high: 0, medium: 0, low: 0 },
      };
    }

    const matches: DetectionResult['matches'] = [];
    const severityCounts = { high: 0, medium: 0, low: 0 };

    for (const pattern of this.patterns.values()) {
      let match;
      const patternString = pattern.pattern.source;

      // Reset regex
      const regex = new RegExp(patternString, 'g');

      while ((match = regex.exec(text)) !== null) {
        matches.push({
          text: match[0],
          type: pattern.name,
          pattern: pattern.name,
          position: match.index,
          severity: pattern.severity,
        });

        severityCounts[pattern.severity]++;
      }
    }

    return {
      found: matches.length > 0,
      matches: matches.sort((a, b) => a.position - b.position),
      summary: {
        total: matches.length,
        high: severityCounts.high,
        medium: severityCounts.medium,
        low: severityCounts.low,
      },
    };
  }

  /**
   * كشف البيانات الحساسة في كائن - Detect sensitive data in object
   */
  detectInObject(obj: any, maxDepth: number = 10): DetectionResult {
    let allMatches: DetectionResult['matches'] = [];
    const severityCounts = { high: 0, medium: 0, low: 0 };

    const traverse = (current: any, depth: number) => {
      if (depth > maxDepth) return;

      if (typeof current === 'string') {
        const result = this.detect(current);
        allMatches = allMatches.concat(result.matches);
        severityCounts.high += result.summary.high;
        severityCounts.medium += result.summary.medium;
        severityCounts.low += result.summary.low;
      } else if (Array.isArray(current)) {
        current.forEach((item) => traverse(item, depth + 1));
      } else if (typeof current === 'object' && current !== null) {
        Object.values(current).forEach((value) => traverse(value, depth + 1));
      }
    };

    traverse(obj, 0);

    return {
      found: allMatches.length > 0,
      matches: allMatches,
      summary: {
        total: allMatches.length,
        high: severityCounts.high,
        medium: severityCounts.medium,
        low: severityCounts.low,
      },
    };
  }

  /**
   * الحصول على قائمة الأنماط المسجلة - Get all registered patterns
   */
  getPatterns(): Map<string, SensitivePattern> {
    return new Map(this.patterns);
  }
}
