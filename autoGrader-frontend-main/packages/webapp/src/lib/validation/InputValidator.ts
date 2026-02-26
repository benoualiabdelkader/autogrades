/**
 * Input Validation System
 * نظام التحقق من صحة المدخلات
 * 
 * Features:
 * - التحقق من JSON schemas
 * - التحقق من أنواع البيانات
 * - تنظيف وتعقيم المدخلات
 * - رسائل خطأ واضحة بالعربية والإنجليزية
 */

export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationError {
  field: string;
  message: string;
  messageAr: string;
  value: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  sanitized?: any;
}

export class InputValidator {
  /**
   * التحقق من البيانات حسب Schema
   */
  static validate(data: any, schema: ValidationSchema): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitized: any = {};

    // التحقق من كل حقل في الـ schema
    for (const [field, rule] of Object.entries(schema)) {
      const value = data[field];

      // التحقق من الحقول المطلوبة
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field,
          message: `Field '${field}' is required`,
          messageAr: `الحقل '${field}' مطلوب`,
          value
        });
        continue;
      }

      // تخطي الحقول غير المطلوبة والفارغة
      if (!rule.required && (value === undefined || value === null)) {
        continue;
      }

      // التحقق من النوع
      const typeError = this.validateType(field, value, rule);
      if (typeError) {
        errors.push(typeError);
        continue;
      }

      // التحقق من القيود
      const constraintError = this.validateConstraints(field, value, rule);
      if (constraintError) {
        errors.push(constraintError);
        continue;
      }

      // التحقق المخصص
      if (rule.custom) {
        const customResult = rule.custom(value);
        if (customResult !== true) {
          errors.push({
            field,
            message: typeof customResult === 'string' ? customResult : `Custom validation failed for '${field}'`,
            messageAr: typeof customResult === 'string' ? customResult : `فشل التحقق المخصص للحقل '${field}'`,
            value
          });
          continue;
        }
      }

      // تنظيف وإضافة القيمة
      sanitized[field] = this.sanitize(value, rule);
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: errors.length === 0 ? sanitized : undefined
    };
  }

  /**
   * التحقق من النوع
   */
  private static validateType(field: string, value: any, rule: ValidationRule): ValidationError | null {
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            field,
            message: `Field '${field}' must be a string`,
            messageAr: `الحقل '${field}' يجب أن يكون نصاً`,
            value
          };
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return {
            field,
            message: `Field '${field}' must be a number`,
            messageAr: `الحقل '${field}' يجب أن يكون رقماً`,
            value
          };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            field,
            message: `Field '${field}' must be a boolean`,
            messageAr: `الحقل '${field}' يجب أن يكون قيمة منطقية`,
            value
          };
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return {
            field,
            message: `Field '${field}' must be an array`,
            messageAr: `الحقل '${field}' يجب أن يكون مصفوفة`,
            value
          };
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
          return {
            field,
            message: `Field '${field}' must be an object`,
            messageAr: `الحقل '${field}' يجب أن يكون كائناً`,
            value
          };
        }
        break;

      case 'email':
        if (typeof value !== 'string' || !this.isValidEmail(value)) {
          return {
            field,
            message: `Field '${field}' must be a valid email`,
            messageAr: `الحقل '${field}' يجب أن يكون بريداً إلكترونياً صحيحاً`,
            value
          };
        }
        break;

      case 'url':
        if (typeof value !== 'string' || !this.isValidUrl(value)) {
          return {
            field,
            message: `Field '${field}' must be a valid URL`,
            messageAr: `الحقل '${field}' يجب أن يكون رابطاً صحيحاً`,
            value
          };
        }
        break;
    }

    return null;
  }

  /**
   * التحقق من القيود
   */
  private static validateConstraints(field: string, value: any, rule: ValidationRule): ValidationError | null {
    // التحقق من الحد الأدنى والأقصى للنصوص والمصفوفات
    if ((rule.type === 'string' || rule.type === 'array') && value) {
      const length = rule.type === 'string' ? value.length : value.length;

      if (rule.min !== undefined && length < rule.min) {
        return {
          field,
          message: `Field '${field}' must have at least ${rule.min} ${rule.type === 'string' ? 'characters' : 'items'}`,
          messageAr: `الحقل '${field}' يجب أن يحتوي على ${rule.min} ${rule.type === 'string' ? 'حرفاً' : 'عنصراً'} على الأقل`,
          value
        };
      }

      if (rule.max !== undefined && length > rule.max) {
        return {
          field,
          message: `Field '${field}' must have at most ${rule.max} ${rule.type === 'string' ? 'characters' : 'items'}`,
          messageAr: `الحقل '${field}' يجب ألا يتجاوز ${rule.max} ${rule.type === 'string' ? 'حرفاً' : 'عنصراً'}`,
          value
        };
      }
    }

    // التحقق من الحد الأدنى والأقصى للأرقام
    if (rule.type === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return {
          field,
          message: `Field '${field}' must be at least ${rule.min}`,
          messageAr: `الحقل '${field}' يجب أن يكون ${rule.min} على الأقل`,
          value
        };
      }

      if (rule.max !== undefined && value > rule.max) {
        return {
          field,
          message: `Field '${field}' must be at most ${rule.max}`,
          messageAr: `الحقل '${field}' يجب ألا يتجاوز ${rule.max}`,
          value
        };
      }
    }

    // التحقق من النمط (Pattern)
    if (rule.pattern && rule.type === 'string') {
      if (!rule.pattern.test(value)) {
        return {
          field,
          message: `Field '${field}' does not match the required pattern`,
          messageAr: `الحقل '${field}' لا يطابق النمط المطلوب`,
          value
        };
      }
    }

    // التحقق من القيم المسموحة (Enum)
    if (rule.enum && !rule.enum.includes(value)) {
      return {
        field,
        message: `Field '${field}' must be one of: ${rule.enum.join(', ')}`,
        messageAr: `الحقل '${field}' يجب أن يكون أحد القيم: ${rule.enum.join('، ')}`,
        value
      };
    }

    return null;
  }

  /**
   * تنظيف القيمة
   */
  private static sanitize(value: any, rule: ValidationRule): any {
    if (rule.type === 'string') {
      // إزالة المسافات الزائدة
      return value.trim();
    }

    if (rule.type === 'number') {
      // التأكد من أنه رقم صحيح
      return Number(value);
    }

    return value;
  }

  /**
   * التحقق من البريد الإلكتروني
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * التحقق من الرابط
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Schemas جاهزة للاستخدام
   */
  static schemas = {
    // Schema للواجب
    assignment: {
      studentId: { type: 'string' as const, required: true, min: 1, max: 100 },
      assignmentId: { type: 'string' as const, required: true, min: 1, max: 100 },
      assignmentText: { type: 'string' as const, required: true, min: 10, max: 10000 },
      rubricCriteria: { type: 'string' as const, required: true, min: 5, max: 1000 }
    },

    // Schema لبيانات الطالب
    student: {
      id: { type: 'string' as const, required: true },
      name: { type: 'string' as const, required: true, min: 2, max: 100 },
      email: { type: 'email' as const, required: true },
      grade: { type: 'number' as const, min: 0, max: 100 }
    },

    // Schema لإعدادات Workflow
    workflowConfig: {
      workflowId: { type: 'number' as const, required: true, min: 1 },
      maxConcurrent: { type: 'number' as const, min: 1, max: 50 },
      delayBetweenRequests: { type: 'number' as const, min: 0, max: 10 },
      maxItems: { type: 'number' as const, min: 1, max: 1000 }
    },

    // Schema لاستعلام قاعدة البيانات
    databaseQuery: {
      query: { 
        type: 'string' as const, 
        required: true, 
        min: 10, 
        max: 5000,
        pattern: /^(SELECT|WITH)\b/i,
        custom: (value: string) => {
          // منع الكلمات الخطرة
          const dangerous = /\b(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE|CREATE)\b/i;
          if (dangerous.test(value)) {
            return 'Query contains forbidden keywords / الاستعلام يحتوي على كلمات محظورة';
          }
          return true;
        }
      },
      host: { type: 'string' as const, required: true },
      port: { type: 'number' as const, required: true, min: 1, max: 65535 },
      database: { type: 'string' as const, required: true, min: 1, max: 100 },
      user: { type: 'string' as const, required: true, min: 1, max: 100 }
    },

    // Schema لرسالة AI
    aiMessage: {
      model: { type: 'string' as const, enum: ['llama-3.3-70b-versatile', 'qwen/qwen3-32b'] },
      messages: { type: 'array' as const, required: true, min: 1, max: 20 },
      temperature: { type: 'number' as const, min: 0, max: 2 },
      max_tokens: { type: 'number' as const, min: 1, max: 4000 }
    }
  };
}

/**
 * مساعدات للتحقق السريع
 */
export class QuickValidators {
  /**
   * التحقق من JSON
   */
  static isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * التحقق من أن القيمة ليست فارغة
   */
  static isNotEmpty(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  }

  /**
   * تنظيف HTML
   */
  static sanitizeHTML(html: string): string {
    // إزالة العلامات الخطرة
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .trim();
  }

  /**
   * تنظيف SQL
   */
  static sanitizeSQL(query: string): string {
    // إزالة التعليقات
    return query
      .replace(/--[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();
  }

  /**
   * التحقق من حجم الملف
   */
  static isValidFileSize(sizeInBytes: number, maxMB: number = 10): boolean {
    const maxBytes = maxMB * 1024 * 1024;
    return sizeInBytes <= maxBytes;
  }

  /**
   * التحقق من نوع الملف
   */
  static isValidFileType(filename: string, allowedTypes: string[]): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? allowedTypes.includes(ext) : false;
  }
}
