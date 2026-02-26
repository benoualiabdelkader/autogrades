/**
 * Error Handling System
 * نظام إدارة الأخطاء المتقدم
 * 
 * Features:
 * - تصنيف الأخطاء
 * - إعادة المحاولة التلقائية
 * - تسجيل الأخطاء
 * - استرجاع من الأخطاء
 * - رسائل خطأ واضحة
 */

export enum ErrorType {
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  AUTH = 'AUTH',
  PERMISSION = 'PERMISSION',
  DATABASE = 'DATABASE',
  AI_API = 'AI_API',
  WORKFLOW = 'WORKFLOW',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  messageAr: string;
  code?: string;
  details?: any;
  timestamp: Date;
  stack?: string;
  retryable: boolean;
  userAction?: string;
  userActionAr?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  retryableErrors: ErrorType[];
}

export class ErrorHandler {
  private static errorLog: AppError[] = [];
  private static maxLogSize = 100;

  /**
   * إنشاء خطأ مصنف
   */
  static createError(
    type: ErrorType,
    message: string,
    messageAr: string,
    details?: any
  ): AppError {
    const severity = this.determineSeverity(type);
    const error: AppError = {
      type,
      severity,
      message,
      messageAr,
      details,
      timestamp: new Date(),
      retryable: this.isRetryable(type),
      userAction: this.getUserAction(type),
      userActionAr: this.getUserActionAr(type)
    };

    // تسجيل الخطأ
    this.logError(error);

    return error;
  }

  /**
   * معالجة خطأ من Exception
   */
  static handleError(error: any, context?: string): AppError {
    let appError: AppError;

    if (error instanceof Error) {
      const type = this.classifyError(error);
      appError = {
        type,
        severity: this.determineSeverity(type),
        message: error.message,
        messageAr: this.translateError(error.message),
        timestamp: new Date(),
        stack: error.stack,
        retryable: this.isRetryable(type),
        userAction: this.getUserAction(type),
        userActionAr: this.getUserActionAr(type),
        details: { context }
      };
    } else {
      appError = {
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
        message: String(error),
        messageAr: 'خطأ غير معروف',
        timestamp: new Date(),
        retryable: false,
        details: { context, error }
      };
    }

    this.logError(appError);
    return appError;
  }

  /**
   * تنفيذ مع إعادة المحاولة
   */
  static async executeWithRetry<T>(
    fn: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const defaultConfig: RetryConfig = {
      maxAttempts: 3,
      delayMs: 1000,
      backoffMultiplier: 2,
      retryableErrors: [
        ErrorType.NETWORK,
        ErrorType.TIMEOUT,
        ErrorType.AI_API
      ]
    };

    const finalConfig = { ...defaultConfig, ...config };
    let lastError: any;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const appError = this.handleError(error, `Attempt ${attempt}/${finalConfig.maxAttempts}`);

        // التحقق من إمكانية إعادة المحاولة
        if (!finalConfig.retryableErrors.includes(appError.type)) {
          throw error;
        }

        // آخر محاولة - رمي الخطأ
        if (attempt === finalConfig.maxAttempts) {
          throw error;
        }

        // الانتظار قبل إعادة المحاولة
        const delay = finalConfig.delayMs * Math.pow(finalConfig.backoffMultiplier, attempt - 1);
        console.log(`⏳ Retrying in ${delay}ms... (attempt ${attempt + 1}/${finalConfig.maxAttempts})`);
        await this.delay(delay);
      }
    }

    throw lastError;
  }

  /**
   * تنفيذ مع timeout
   */
  static async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage?: string
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const error = this.createError(
          ErrorType.TIMEOUT,
          timeoutMessage || `Operation timed out after ${timeoutMs}ms`,
          `انتهت مهلة العملية بعد ${timeoutMs} ميلي ثانية`
        );
        reject(error);
      }, timeoutMs);

      try {
        const result = await fn();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * تنفيذ آمن (لا يرمي أخطاء)
   */
  static async executeSafely<T>(
    fn: () => Promise<T>,
    fallback: T
  ): Promise<{ success: boolean; data?: T; error?: AppError }> {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (error) {
      const appError = this.handleError(error);
      return { success: false, error: appError, data: fallback };
    }
  }

  /**
   * تصنيف الخطأ
   */
  private static classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return ErrorType.NETWORK;
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return ErrorType.TIMEOUT;
    }
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('token')) {
      return ErrorType.AUTH;
    }
    if (message.includes('permission') || message.includes('forbidden') || message.includes('access denied')) {
      return ErrorType.PERMISSION;
    }
    if (message.includes('database') || message.includes('sql') || message.includes('query')) {
      return ErrorType.DATABASE;
    }
    if (message.includes('groq') || message.includes('openai') || message.includes('ai') || message.includes('model')) {
      return ErrorType.AI_API;
    }
    if (message.includes('workflow') || message.includes('execution')) {
      return ErrorType.WORKFLOW;
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * تحديد خطورة الخطأ
   */
  private static determineSeverity(type: ErrorType): ErrorSeverity {
    switch (type) {
      case ErrorType.AUTH:
      case ErrorType.PERMISSION:
      case ErrorType.DATABASE:
        return ErrorSeverity.CRITICAL;
      
      case ErrorType.AI_API:
      case ErrorType.WORKFLOW:
        return ErrorSeverity.HIGH;
      
      case ErrorType.NETWORK:
      case ErrorType.TIMEOUT:
        return ErrorSeverity.MEDIUM;
      
      case ErrorType.VALIDATION:
      default:
        return ErrorSeverity.LOW;
    }
  }

  /**
   * التحقق من إمكانية إعادة المحاولة
   */
  private static isRetryable(type: ErrorType): boolean {
    return [
      ErrorType.NETWORK,
      ErrorType.TIMEOUT,
      ErrorType.AI_API
    ].includes(type);
  }

  /**
   * الحصول على إجراء المستخدم
   */
  private static getUserAction(type: ErrorType): string {
    switch (type) {
      case ErrorType.VALIDATION:
        return 'Please check your input and try again';
      case ErrorType.NETWORK:
        return 'Please check your internet connection and try again';
      case ErrorType.TIMEOUT:
        return 'The operation took too long. Please try again';
      case ErrorType.AUTH:
        return 'Please log in again';
      case ErrorType.PERMISSION:
        return 'You do not have permission to perform this action';
      case ErrorType.DATABASE:
        return 'Database error. Please contact support';
      case ErrorType.AI_API:
        return 'AI service is temporarily unavailable. Please try again later';
      case ErrorType.WORKFLOW:
        return 'Workflow execution failed. Please try again';
      default:
        return 'An error occurred. Please try again';
    }
  }

  /**
   * الحصول على إجراء المستخدم بالعربية
   */
  private static getUserActionAr(type: ErrorType): string {
    switch (type) {
      case ErrorType.VALIDATION:
        return 'يرجى التحقق من المدخلات والمحاولة مرة أخرى';
      case ErrorType.NETWORK:
        return 'يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى';
      case ErrorType.TIMEOUT:
        return 'استغرقت العملية وقتاً طويلاً. يرجى المحاولة مرة أخرى';
      case ErrorType.AUTH:
        return 'يرجى تسجيل الدخول مرة أخرى';
      case ErrorType.PERMISSION:
        return 'ليس لديك صلاحية لتنفيذ هذا الإجراء';
      case ErrorType.DATABASE:
        return 'خطأ في قاعدة البيانات. يرجى الاتصال بالدعم';
      case ErrorType.AI_API:
        return 'خدمة الذكاء الاصطناعي غير متاحة مؤقتاً. يرجى المحاولة لاحقاً';
      case ErrorType.WORKFLOW:
        return 'فشل تنفيذ سير العمل. يرجى المحاولة مرة أخرى';
      default:
        return 'حدث خطأ. يرجى المحاولة مرة أخرى';
    }
  }

  /**
   * ترجمة رسالة الخطأ
   */
  private static translateError(message: string): string {
    const translations: Record<string, string> = {
      'validation failed': 'فشل التحقق من الصحة',
      'network error': 'خطأ في الشبكة',
      'timeout': 'انتهت المهلة',
      'unauthorized': 'غير مصرح',
      'forbidden': 'محظور',
      'not found': 'غير موجود',
      'database error': 'خطأ في قاعدة البيانات',
      'ai api error': 'خطأ في واجهة الذكاء الاصطناعي',
      'workflow failed': 'فشل سير العمل'
    };

    const lowerMessage = message.toLowerCase();
    for (const [key, value] of Object.entries(translations)) {
      if (lowerMessage.includes(key)) {
        return value;
      }
    }

    return 'خطأ غير معروف';
  }

  /**
   * تسجيل الخطأ
   */
  private static logError(error: AppError): void {
    // إضافة إلى السجل
    this.errorLog.unshift(error);

    // الحفاظ على حجم السجل
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // طباعة في Console
    const emoji = this.getSeverityEmoji(error.severity);
    console.error(`${emoji} [${error.type}] ${error.message}`, error.details);

    // إرسال إلى خدمة التسجيل في الإنتاج
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(error);
    }
  }

  /**
   * الحصول على emoji حسب الخطورة
   */
  private static getSeverityEmoji(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL: return '🔴';
      case ErrorSeverity.HIGH: return '🟠';
      case ErrorSeverity.MEDIUM: return '🟡';
      case ErrorSeverity.LOW: return '🔵';
      default: return '⚪';
    }
  }

  /**
   * إرسال إلى خدمة التسجيل
   */
  private static sendToLoggingService(error: AppError): void {
    // TODO: إرسال إلى Sentry, LogRocket, أو خدمة أخرى
    // مثال:
    // Sentry.captureException(error);
  }

  /**
   * الحصول على سجل الأخطاء
   */
  static getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  /**
   * مسح سجل الأخطاء
   */
  static clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * تأخير
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * مساعدات للأخطاء الشائعة
 */
export class CommonErrors {
  static validationError(field: string, message: string): AppError {
    return ErrorHandler.createError(
      ErrorType.VALIDATION,
      `Validation failed for ${field}: ${message}`,
      `فشل التحقق من ${field}: ${message}`
    );
  }

  static networkError(details?: string): AppError {
    return ErrorHandler.createError(
      ErrorType.NETWORK,
      `Network error${details ? ': ' + details : ''}`,
      `خطأ في الشبكة${details ? ': ' + details : ''}`
    );
  }

  static timeoutError(operation: string, timeoutMs: number): AppError {
    return ErrorHandler.createError(
      ErrorType.TIMEOUT,
      `${operation} timed out after ${timeoutMs}ms`,
      `انتهت مهلة ${operation} بعد ${timeoutMs} ميلي ثانية`
    );
  }

  static authError(message: string = 'Authentication required'): AppError {
    return ErrorHandler.createError(
      ErrorType.AUTH,
      message,
      'مطلوب تسجيل الدخول'
    );
  }

  static permissionError(action: string): AppError {
    return ErrorHandler.createError(
      ErrorType.PERMISSION,
      `You do not have permission to ${action}`,
      `ليس لديك صلاحية لـ ${action}`
    );
  }

  static databaseError(details?: string): AppError {
    return ErrorHandler.createError(
      ErrorType.DATABASE,
      `Database error${details ? ': ' + details : ''}`,
      `خطأ في قاعدة البيانات${details ? ': ' + details : ''}`
    );
  }

  static aiApiError(details?: string): AppError {
    return ErrorHandler.createError(
      ErrorType.AI_API,
      `AI API error${details ? ': ' + details : ''}`,
      `خطأ في واجهة الذكاء الاصطناعي${details ? ': ' + details : ''}`
    );
  }

  static workflowError(workflowId: number, details?: string): AppError {
    return ErrorHandler.createError(
      ErrorType.WORKFLOW,
      `Workflow ${workflowId} failed${details ? ': ' + details : ''}`,
      `فشل سير العمل ${workflowId}${details ? ': ' + details : ''}`
    );
  }
}
