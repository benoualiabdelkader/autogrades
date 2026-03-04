/**
 * Data Protection Module - Main Export
 * حماية البيانات - التصدريات الرئيسية
 */

export {
  SensitiveDataDetector,
} from './sensitiveDataDetector';
export type {
  SensitivePattern,
  DetectionResult,
} from './sensitiveDataDetector';

export {
  DataFilter,
} from './dataFilter';
export type {
  FilterConfig,
  StudentData,
  FilteredData,
} from './dataFilter';

export {
  ResultMerger,
  quickMerge,
  batchMerge,
} from './resultMerger';
export type {
  AIAnalysisResult,
  OriginalStudentData,
  MergedResult,
} from './resultMerger';

export {
  DataProtectionPipeline,
  createSecurePipeline,
  createStrictPipeline,
} from './dataProtectionPipeline';
export type {
  PipelineConfig,
  PipelineLog,
  PipelineResult,
} from './dataProtectionPipeline';

// Re-export all modules for convenience
export * from './sensitiveDataDetector';
export * from './dataFilter';
export * from './resultMerger';
export * from './dataProtectionPipeline';
