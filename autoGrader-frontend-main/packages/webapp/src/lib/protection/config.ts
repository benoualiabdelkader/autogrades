/**
 * Data Protection System - Configuration Presets
 * إعدادات مسبقة لنظام حماية البيانات
 */

import { FilterConfig } from './dataFilter';
import { PipelineConfig } from './dataProtectionPipeline';

/**
 * إعدادات مسبقة محددة مسبقاً
 */
export const PROTECTION_PRESETS = {
  /**
   * الوضع الآمن (الافتراضي)
   * Safe Mode - Recommended for production
   */
  SAFE_MODE: {
    pipeline: {
      detectSensitive: true,
      filterData: true,
      anonymize: true,
      maskSensitive: true,
      stopOnSensitive: false,
      verbose: false,
      keepLogs: true,
    } as PipelineConfig,
    filter: {
      maskSensitive: true,
      anonymize: true,
      maskingMethod: 'replace' as const,
    } as FilterConfig,
  },

  /**
   * الوضع الصارم
   * Strict Mode - For highly sensitive environments
   */
  STRICT_MODE: {
    pipeline: {
      detectSensitive: true,
      filterData: true,
      anonymize: true,
      maskSensitive: true,
      stopOnSensitive: true,
      verbose: true,
      keepLogs: true,
    } as PipelineConfig,
    filter: {
      maskSensitive: true,
      anonymize: true,
      maskingMethod: 'full' as const,
    } as FilterConfig,
  },

  /**
   * وضع التطوير
   * Development Mode - For debugging
   */
  DEVELOPMENT_MODE: {
    pipeline: {
      detectSensitive: true,
      filterData: true,
      anonymize: false,
      maskSensitive: false,
      stopOnSensitive: false,
      verbose: true,
      keepLogs: true,
    } as PipelineConfig,
    filter: {
      maskSensitive: false,
      anonymize: false,
    } as FilterConfig,
  },

  /**
   * وضع الفحص فقط
   * Audit Mode - For compliance checks
   */
  AUDIT_MODE: {
    pipeline: {
      detectSensitive: true,
      filterData: false,
      anonymize: false,
      maskSensitive: false,
      stopOnSensitive: false,
      verbose: true,
      keepLogs: true,
    } as PipelineConfig,
    filter: {} as FilterConfig,
  },

  /**
   * وضع الأداء
   * Performance Mode - For large datasets
   */
  PERFORMANCE_MODE: {
    pipeline: {
      detectSensitive: true,
      filterData: true,
      anonymize: true,
      maskSensitive: true,
      stopOnSensitive: false,
      verbose: false,
      keepLogs: false,
    } as PipelineConfig,
    filter: {
      maskSensitive: true,
      anonymize: true,
      maskingMethod: 'hash' as const,
    } as FilterConfig,
  },

  /**
   * وضع التوافقية
   * Compatibility Mode - For legacy systems
   */
  COMPATIBILITY_MODE: {
    pipeline: {
      detectSensitive: true,
      filterData: true,
      anonymize: true,
      maskSensitive: true,
      stopOnSensitive: false,
      verbose: false,
      keepLogs: true,
    } as PipelineConfig,
    filter: {
      maskSensitive: true,
      anonymize: true,
      maskingMethod: 'partial' as const,
    } as FilterConfig,
  },
};

/**
 * إعدادات الحقول الحساسة المشتركة
 * Common Sensitive Fields
 */
export const SENSITIVE_FIELDS = {
  /**
   * الحقول شديدة الحساسية (يجب حذفها دائماً)
   */
  HIGHLY_SENSITIVE: [
    'password',
    'token',
    'secret',
    'ssn',
    'creditCard',
    'bankAccount',
    'iban',
    'apiKey',
    'secretKey',
  ],

  /**
   * حقول شخصية (يجب إخفاؤها)
   */
  PERSONAL: [
    'name',
    'firstName',
    'lastName',
    'fullName',
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
  ],

  /**
   * حقول الهوية (يجب إخفاؤها)
   */
  IDENTITY: [
    'nationalId',
    'id_number',
    'passportNumber',
    'visaNumber',
    'driversLicense',
    'governmentId',
  ],

  /**
   * حقول مالية (يجب حذفها)
   */
  FINANCIAL: [
    'salary',
    'income',
    'bankBalance',
    'creditScore',
    'taxId',
    'accountNumber',
  ],

  /**
   * بيانات الاتصال والعناوين
   */
  CONTACT: [
    'email',
    'phone',
    'fax',
    'website',
    'socialMedia',
    'linkedIn',
    'twitter',
    'facebook',
  ],

  /**
   * بيانات تسجيل الدخول
   */
  AUTHENTICATION: [
    'username',
    'password',
    'passwordHash',
    'salt',
    '2faSecret',
    'mfaSecret',
    'recoveryCode',
  ],
};

/**
 * إعدادات الحقول المسموح بها
 * Allowed Fields by Context
 */
export const ALLOWED_FIELDS = {
  /**
   * للتحليل الأكاديمي
   */
  ACADEMIC_ANALYSIS: [
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
    'level',
    'major',
    'credits',
  ],

  /**
   * لتقييم السلوك
   */
  BEHAVIOR_ASSESSMENT: [
    'student_id',
    'attendance',
    'participation',
    'conduct',
    'behavior_score',
    'late_arrivals',
    'absences',
    'suspensions',
  ],

  /**
   * لتحليل الصحة العقلية
   */
  WELLNESS_ANALYSIS: [
    'student_id',
    'attendance',
    'participation',
    'engagement',
    'stress_level', // بيانات محددة مسبقاً فقط
    'support_needs',
  ],

  /**
   * لإنشاء التقارير
   */
  REPORTING: [
    'student_id',
    'course',
    'semester',
    'gpa',
    'grade',
    'attendance_rate',
    'completion_date',
  ],

  /**
   * للبحث العلمي (مع موافقة)
   */
  RESEARCH: [
    'student_id', // معرف مغيّر فقط
    'aggregate_data',
    'anonymized_scores',
    'patterns',
    'trends',
  ],
};

/**
 * أنماط الكشف المخصصة
 * Custom Detection Patterns
 */
export const CUSTOM_PATTERNS = {
  /**
   * أسماء طلاب شائعة
   */
  COMMON_NAMES: {
    pattern: /\b(Ahmed|Sara|Mohamed|Fatima|Ali|Zainab|Hassan|Maryam|Omar|Leila|محمد|أحمد|فاطمة|علي|سارة)\b/gi,
    type: 'name' as const,
    severity: 'medium' as const,
  },

  /**
   * أرقام هوية سعودية
   */
  SAUDI_ID: {
    pattern: /\b[0-2]\d{9}\b/g,
    type: 'id' as const,
    severity: 'high' as const,
  },

  /**
   * أرقام من هوية الإمارات
   */
  UAE_ID: {
    pattern: /\b784-\d{4}-\d{7}-\d\b/g,
    type: 'id' as const,
    severity: 'high' as const,
  },

  /**
   * أرقام الطالب المخصصة
   */
  STUDENT_NUMBER: {
    pattern: /STU\d{6,8}/gi,
    type: 'custom' as const,
    severity: 'medium' as const,
  },

  /**
   * رموز المقررات
   */
  COURSE_CODE: {
    pattern: /[A-Z]{2,3}\d{3,4}[A-Z]?/g,
    type: 'custom' as const,
    severity: 'low' as const,
  },

  /**
   * أرقام الموارد البشرية
   */
  HR_NUMBERS: {
    pattern: /HR-\d{5,8}/g,
    type: 'id' as const,
    severity: 'high' as const,
  },
};

/**
 * إعدادات التخفيف (Masking Methods)
 * Masking Configurations
 */
export const MASKING_CONFIGS = {
  /**
   * استبدال كامل
   * Full Replacement
   */
  FULL_REPLACEMENT: {
    maskingMethod: 'replace' as const,
    prefix: '[',
    suffix: ']',
    label: 'MASKED',
  },

  /**
   * إخفاء كامل
   * Full Masking
   */
  FULL_MASK: {
    maskingMethod: 'full' as const,
    character: '*',
  },

  /**
   * إخفاء جزئي (تظهر الأحرف الأولى)
   * Partial Mask (show first characters)
   */
  PARTIAL_MASK: {
    maskingMethod: 'partial' as const,
    visibleChars: 3,
    character: '*',
  },

  /**
   * تجزئة (Hash)
   * Hash-based
   */
  HASH_MASK: {
    maskingMethod: 'hash' as const,
    prefix: '[HASH:',
    suffix: ']',
  },

  /**
   * برمز معرّف
   * With identifier
   */
  IDENTIFIER_MASK: {
    maskingMethod: 'replace' as const,
    prefix: '[ID:',
    suffix: ']',
  },
};

/**
 * إعدادات السجلات (Logging)
 * Logging Configurations
 */
export const LOGGING_CONFIGS = {
  /**
   * سجل مفصل
   * Detailed Logging
   */
  DETAILED: {
    keepLogs: true,
    verbose: true,
    includeStackTrace: true,
    maxLogSize: 10000,
  },

  /**
   * سجل عادي
   * Normal Logging
   */
  NORMAL: {
    keepLogs: true,
    verbose: false,
    includeStackTrace: false,
    maxLogSize: 5000,
  },

  /**
   * سجل ضئيل
   * Minimal Logging
   */
  MINIMAL: {
    keepLogs: false,
    verbose: false,
    includeStackTrace: false,
    maxLogSize: 100,
  },
};

/**
 * معايير الامتثال
 * Compliance Standards
 */
export const COMPLIANCE_STANDARDS = {
  /**
   * GDPR (الاتحاد الأوروبي)
   */
  GDPR: {
    minifyPersonalData: true,
    allowOptOut: true,
    dataRetentionDays: 365,
    requireConsent: true,
    rightToBeForgotten: true,
  },

  /**
   * FERPA (الولايات المتحدة)
   */
  FERPA: {
    restrictAccessWithoutConsent: true,
    maintainAuditLog: true,
    allowStudentAccess: true,
    dataRetentionDays: 730,
  },

  /**
   * قانون حماية خصوصية البيانات في السعودية
   */
  SAUDI_DATA_PROTECTION: {
    minifyPersonalData: true,
    localDataStorage: true,
    restrictAccessByRole: true,
    dataRetentionDays: 365,
    requireLocalApproval: true,
  },

  /**
   * معايير التعليم العام
   */
  GENERAL_EDUCATION: {
    minifyPersonalData: true,
    parentsRightToAccess: true,
    studentPrivacy: true,
    dataRetentionDays: 365,
  },
};

/**
 * دالة مساعدة للحصول على إعدادات مسبقة
 */
export function getPreset(mode: keyof typeof PROTECTION_PRESETS) {
  return PROTECTION_PRESETS[mode];
}

/**
 * دالة مساعدة لدمج الحقول الحساسة
 */
export function mergeBlockedFields(...fieldSets: string[][]): string[] {
  const merged = new Set<string>();
  for (const set of fieldSets) {
    set.forEach((field) => merged.add(field));
  }
  return Array.from(merged);
}

/**
 * دالة مساعدة للتحقق من توافقية المعايير
 */
export function checkCompliance(
  standard: keyof typeof COMPLIANCE_STANDARDS,
  config: any
): { compliant: boolean; issues: string[] } {
  const issues: string[] = [];
  const complianceConfig = COMPLIANCE_STANDARDS[standard];

  // تنفيذ فحوصات التوافقية
  if ('minifyPersonalData' in complianceConfig && complianceConfig.minifyPersonalData && !config.maskSensitive) {
    issues.push(`${standard} يتطلب تقليل البيانات الشخصية`);
  }

  return {
    compliant: issues.length === 0,
    issues,
  };
}

export default {
  PROTECTION_PRESETS,
  SENSITIVE_FIELDS,
  ALLOWED_FIELDS,
  CUSTOM_PATTERNS,
  MASKING_CONFIGS,
  LOGGING_CONFIGS,
  COMPLIANCE_STANDARDS,
  getPreset,
  mergeBlockedFields,
  checkCompliance,
};
