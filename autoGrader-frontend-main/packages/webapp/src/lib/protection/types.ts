/**
 * Data Protection System - TypeScript Type Definitions
 * تعريفات TypeScript - نظام حماية البيانات
 */

// Re-export all types from modules
export * from './sensitiveDataDetector';
export * from './dataFilter';
export * from './resultMerger';
export * from './dataProtectionPipeline';

/**
 * إعدادات نظام الحماية الشاملة
 * Complete Protection System Configuration
 */
export interface ProtectionConfig {
  /** إعدادات Pipeline */
  pipeline?: import('./dataProtectionPipeline').PipelineConfig;
  
  /** إعدادات Filter */
  filter?: import('./dataFilter').FilterConfig;
  
  /** تفعيل جميع الميزات */
  enableAll?: boolean;
}

/**
 * نتائج العملية الشاملة
 * Complete Operation Results
 */
export interface ProtectionResult {
  /** حالة النجاح */
  success: boolean;
  
  /** البيانات المحمية */
  protected?: any;
  
  /** البيانات المدمجة */
  merged?: any;
  
  /** الأخطاء التي حدثت */
  errors: string[];
  
  /** التحذيرات */
  warnings: string[];
  
  /** الإحصائيات */
  stats: any;
  
  /** السجلات */
  logs: any[];
}

/**
 * خيارات المعالجة
 * Processing Options
 */
export interface ProcessingOptions {
  /** تفعيل الكشف */
  detect?: boolean;
  
  /** تفعيل التصفية */
  filter?: boolean;
  
  /** تفعيل الإخفاء */
  mask?: boolean;
  
  /** تفعيل الدمج */
  merge?: boolean;
  
  /** طريقة الإخفاء */
  maskingMethod?: 'full' | 'partial' | 'replace' | 'hash';
}

/**
 * خريطة ربط الطلاب
 * Student Mapping
 */
export type StudentMap = Map<string | number, any>;

/**
 * دالة معالجة مخصصة
 * Custom Processing Function
 */
export type ProcessingFunction = (data: any) => Promise<any>;

/**
 * دالة تحويل البيانات
 * Data Transformation Function
 */
export type TransformFunction = (data: any, context?: any) => any;

/**
 * دالة التحقق
 * Validation Function
 */
export type ValidationFunction = (data: any) => boolean;

/**
 * Type augmentation for global namespace
 */
declare global {
  namespace DataProtection {
    /**
     * جميع الأصناف الرئيسية
     */
    type SensitiveDataDetector = import('./sensitiveDataDetector').SensitiveDataDetector;
    type DataFilter = import('./dataFilter').DataFilter;
    type ResultMerger = import('./resultMerger').ResultMerger;
    type DataProtectionPipeline = import('./dataProtectionPipeline').DataProtectionPipeline;
  }
}
