/**
 * Data Filter & Anonymizer
 * تصفية وإخفاء البيانات الحساسة قبل الإرسال
 */

import { SensitiveDataDetector } from './sensitiveDataDetector';

export interface FilterConfig {
  /** الحقول المسموحة للإرسال - Allowed fields for AI */
  allowedFields?: string[];

  /** الحقول المحجوبة - Blocked fields */
  blockedFields?: string[];

  /** تفعيل الـ Anonymization - Enable anonymization */
  anonymize?: boolean;

  /** تفعيل Masking - Enable masking */
  maskSensitive?: boolean;

  /** حقول معينة للاحتفاظ بها - Fields to preserve */
  preserveFields?: string[];

  /** طريقة الإخفاء - Masking method */
  maskingMethod?: 'full' | 'partial' | 'replace' | 'hash';
}

export interface StudentData {
  id?: string | number;
  student_id?: string | number;
  name?: string;
  email?: string;
  phone?: string;
  grades?: any;
  attendance?: any;
  courses?: any;
  [key: string]: any;
}

export interface FilteredData {
  /** البيانات المصفاة - Filtered data */
  filtered: any;

  /** البيانات المحذوفة - Removed fields */
  removed: string[];

  /** البيانات المخفية - Masked data info */
  masked: string[];

  /** معرف الطالب للربط - Student ID for mapping */
  studentId?: string | number;
}

/**
 * فلتر البيانات والتخفيف - Data Filter & Anonymizer
 */
export class DataFilter {
  private sensitiveDetector: SensitiveDataDetector;
  private config: FilterConfig;

  // الحقول الحساسة الافتراضية
  private readonly DEFAULT_BLOCKED_FIELDS = [
    'password',
    'token',
    'secret',
    'ssn',
    'creditCard',
    'bankAccount',
    'iban',
    'iban_number',
    'full_name',
    'firstName',
    'lastName',
    'email',
    'phone',
    'phoneNumber',
    'mobile',
    'address',
    'city',
    'country',
    'zipCode',
    'birthDate',
    'dateOfBirth',
    'dob',
    'nationalId',
    'id_number',
    'passportNumber',
    'visaNumber',
  ];

  // الحقول المسموحة الافتراضية
  private readonly DEFAULT_ALLOWED_FIELDS = [
    'student_id',
    'course',
    'courses',
    'grades',
    'attendance',
    'performance',
    'gpa',
    'score',
    'marks',
    'semester',
    'subjects',
    'status',
    'level',
    'major',
  ];

  constructor(config: FilterConfig = {}) {
    this.sensitiveDetector = new SensitiveDataDetector();
    this.config = {
      allowedFields: config.allowedFields || this.DEFAULT_ALLOWED_FIELDS,
      blockedFields: config.blockedFields || this.DEFAULT_BLOCKED_FIELDS,
      anonymize: config.anonymize !== false,
      maskSensitive: config.maskSensitive !== false,
      maskingMethod: config.maskingMethod || 'replace',
      ...config,
    };
  }

  /**
   * تصفية بيانات الطالب - Filter student data
   */
  filterStudentData(student: StudentData): FilteredData {
    const result: FilteredData = {
      filtered: {},
      removed: [],
      masked: [],
      studentId: student.student_id || student.id,
    };

    // استخراج معرف الطالب
    const studentId =
      student.student_id || student.id || `S${Math.random().toString(36).substr(2, 9)}`;

    // المرور على جميع الحقول
    for (const [key, value] of Object.entries(student)) {
      // تجاهل الحقول المحجوبة
      if (this.config.blockedFields?.includes(key)) {
        result.removed.push(key);
        continue;
      }

      // إذا كان هناك قائمة بالحقول المسموحة، تحقق من الانتماء
      if (
        this.config.allowedFields &&
        this.config.allowedFields.length > 0 &&
        !this.config.allowedFields.includes(key)
      ) {
        result.removed.push(key);
        continue;
      }

      // معالجة القيم الحساسة
      if (value !== null && value !== undefined) {
        const processedValue = this.processValue(value, key);
        if (processedValue.masked) {
          result.masked.push(key);
        }
        result.filtered[key] = processedValue.value;
      }
    }

    // التأكد من وجود معرف الطالب
    if (!result.filtered.student_id) {
      result.filtered.student_id = studentId;
    }

    return result;
  }

  /**
   * معالجة القيمة الفردية - Process individual value
   */
  private processValue(
    value: any,
    fieldName: string
  ): { value: any; masked: boolean } {
    // إذا كانت القيمة كائن أو مصفوفة
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return {
          value: value.map((item) =>
            typeof item === 'object' ? this.filterObject(item) : item
          ),
          masked: false,
        };
      } else {
        return {
          value: this.filterObject(value),
          masked: false,
        };
      }
    }

    // إذا كانت قيمة نصية
    if (typeof value === 'string') {
      const detection = this.sensitiveDetector.detect(value);
      if (detection.found && this.config.maskSensitive) {
        return {
          value: this.maskString(value, detection),
          masked: true,
        };
      }
    }

    return { value, masked: false };
  }

  /**
   * تصفية كائن متكامل - Filter complete object
   */
  private filterObject(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const filtered: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!this.config.blockedFields?.includes(key)) {
        if (typeof value === 'object') {
          filtered[key] = this.filterObject(value);
        } else if (typeof value === 'string') {
          const detection = this.sensitiveDetector.detect(value);
          filtered[key] = detection.found && this.config.maskSensitive ? '[MASKED]' : value;
        } else {
          filtered[key] = value;
        }
      }
    }
    return filtered;
  }

  /**
   * إخفاء نص - Mask string
   */
  private maskString(text: string, detection: any): string {
    const method = this.config.maskingMethod || 'replace';

    switch (method) {
      case 'full':
        return '[' + '*'.repeat(text.length) + ']';

      case 'partial':
        const visibleChars = Math.max(2, Math.floor(text.length / 3));
        const hiddenChars = text.length - visibleChars;
        return text.substring(0, visibleChars) + '*'.repeat(hiddenChars);

      case 'replace':
        let result = text;
        for (const match of detection.matches) {
          result = result.replace(match.text, `[${match.type.toUpperCase()}]`);
        }
        return result;

      case 'hash':
        return `[HASH:${this.hashString(text)}]`;

      default:
        return '[MASKED]';
    }
  }

  /**
   * حساب بسيط للـ Hash - Simple hash
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  }

  /**
   * تصفية مجموعة من الطلاب - Filter array of students
   */
  filterStudents(students: StudentData[]): FilteredData[] {
    return students.map((student) => this.filterStudentData(student));
  }

  /**
   * إعادة تعيين الحقول المسموحة - Set allowed fields
   */
  setAllowedFields(fields: string[]): void {
    this.config.allowedFields = fields;
  }

  /**
   * إعادة تعيين الحقول المحجوبة - Set blocked fields
   */
  setBlockedFields(fields: string[]): void {
    this.config.blockedFields = fields;
  }

  /**
   * إضافة حقل مسموح - Add allowed field
   */
  addAllowedField(field: string): void {
    if (!this.config.allowedFields?.includes(field)) {
      this.config.allowedFields?.push(field);
    }
  }

  /**
   * إزالة حقل مسموح - Remove allowed field
   */
  removeAllowedField(field: string): void {
    if (this.config.allowedFields) {
      this.config.allowedFields = this.config.allowedFields.filter((f) => f !== field);
    }
  }

  /**
   * الحصول على الإعدادات الحالية - Get current config
   */
  getConfig(): FilterConfig {
    return { ...this.config };
  }
}
