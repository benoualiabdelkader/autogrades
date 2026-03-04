/**
 * Data Protection Pipeline
 * منسق حماية البيانات الشاملة
 * Orchestrates the complete data protection workflow
 */

import { SensitiveDataDetector, DetectionResult } from './sensitiveDataDetector';
import { DataFilter, FilteredData, StudentData } from './dataFilter';
import { ResultMerger, AIAnalysisResult, OriginalStudentData, MergedResult } from './resultMerger';

export interface PipelineConfig {
  /** تفعيل كشف البيانات الحساسة - Enable sensitive data detection */
  detectSensitive?: boolean;

  /** تفعيل التصفية - Enable filtering */
  filterData?: boolean;

  /** تفعيل الـ Anonymization - Enable anonymization */
  anonymize?: boolean;

  /** تفعيل الإخفاء - Enable masking */
  maskSensitive?: boolean;

  /** توقيف العملية عند اكتشاف بيانات حساسة - Stop on sensitive data */
  stopOnSensitive?: boolean;

  /** إرسال تحذيرات - Send warnings */
  verbose?: boolean;

  /** حفظ السجلات - Keep logs */
  keepLogs?: boolean;
}

export interface PipelineLog {
  timestamp: string;
  step: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  data?: any;
}

export interface PipelineResult {
  /** حالة النجاح - Success status */
  success: boolean;

  /** البيانات المعالجة - Processed data */
  data?: any;

  /** الأخطاء والتحذيرات - Errors and warnings */
  errors: string[];
  warnings: string[];

  /** سجلات العملية - Operation logs */
  logs: PipelineLog[];

  /** الإحصائيات - Statistics */
  stats: {
    sensitivePatternsFound: number;
    dataFiltered: boolean;
    fieldsRemoved: number;
    fieldsAnonymized: number;
    processingTime: number;
  };
}

/**
 * منسق خط أنابيب حماية البيانات - Data Protection Pipeline Orchestrator
 */
export class DataProtectionPipeline {
  private detector: SensitiveDataDetector;
  private filter: DataFilter;
  private merger: ResultMerger;
  private config: PipelineConfig;
  private logs: PipelineLog[] = [];

  constructor(config: PipelineConfig = {}) {
    this.detector = new SensitiveDataDetector();
    this.filter = new DataFilter({
      maskSensitive: config.maskSensitive !== false,
      anonymize: config.anonymize !== false,
    });
    this.merger = new ResultMerger();
    this.config = {
      detectSensitive: true,
      filterData: true,
      anonymize: true,
      maskSensitive: true,
      stopOnSensitive: false,
      verbose: false,
      keepLogs: true,
      ...config,
    };
  }

  /**
   * معالجة بيانات الطالب قبل الإرسال - Process student data before sending to AI
   */
  async processBefore(students: StudentData | StudentData[]): Promise<PipelineResult> {
    const result: PipelineResult = {
      success: false,
      errors: [],
      warnings: [],
      logs: [],
      stats: {
        sensitivePatternsFound: 0,
        dataFiltered: false,
        fieldsRemoved: 0,
        fieldsAnonymized: 0,
        processingTime: 0,
      },
    };

    const startTime = Date.now();
    this.logs = [];

    try {
      const studentsArray = Array.isArray(students) ? students : [students];

      // الخطوة 1: كشف البيانات الحساسة
      if (this.config.detectSensitive) {
        this.log('DETECTION', 'بدء كشف البيانات الحساسة...', 'info');

        let totalSensitive = 0;

        for (const student of studentsArray) {
          const detection = this.detector.detectInObject(student);
          if (detection.found) {
            totalSensitive += detection.summary.total;
            result.warnings.push(
              `الطالب ${student.student_id || student.id}: تم اكتشاف ${detection.summary.total} بيانات حساسة`
            );

            if (this.config.verbose) {
              this.log('DETECTION', `الطالب ${student.student_id}: ${JSON.stringify(detection)}`, 'warning');
            }
          }
        }

        result.stats.sensitivePatternsFound = totalSensitive;

        if (totalSensitive > 0) {
          this.log(
            'DETECTION',
            `تم اكتشاف ${totalSensitive} بيانات حساسة في المجموع`,
            'warning'
          );

          if (this.config.stopOnSensitive) {
            throw new Error(`تم اكتشاف بيانات حساسة. توقفت العملية.`);
          }
        }
      }

      // الخطوة 2: تصفية البيانات
      if (this.config.filterData) {
        this.log('FILTERING', 'بدء تصفية البيانات...', 'info');

        const filteredStudents = studentsArray.map((student) => {
          const filtered = this.filter.filterStudentData(student);
          result.stats.fieldsRemoved += filtered.removed.length;
          result.stats.fieldsAnonymized += filtered.masked.length;
          return filtered.filtered;
        });

        result.data = studentsArray.length === 1 ? filteredStudents[0] : filteredStudents;
        result.stats.dataFiltered = true;

        this.log(
          'FILTERING',
          `تم إزالة ${result.stats.fieldsRemoved} حقل وإخفاء ${result.stats.fieldsAnonymized} حقل`,
          'info'
        );
      } else {
        result.data = studentsArray.length === 1 ? studentsArray[0] : studentsArray;
      }

      result.success = true;
      result.stats.processingTime = Date.now() - startTime;

      this.log('PIPELINE', 'اكتملت معالجة البيانات بنجاح', 'info');
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : String(error));
      this.log('PIPELINE', `خطأ: ${error}`, 'error');
    }

    if (this.config.keepLogs) {
      result.logs = [...this.logs];
    }

    return result;
  }

  /**
   * معالجة نتائج AI ودمجها - Process AI results and merge with original data
   */
  async processAfter(
    aiResults: AIAnalysisResult | AIAnalysisResult[],
    originalData: Map<string | number, OriginalStudentData> | OriginalStudentData[]
  ): Promise<PipelineResult> {
    const result: PipelineResult = {
      success: false,
      errors: [],
      warnings: [],
      logs: [],
      stats: {
        sensitivePatternsFound: 0,
        dataFiltered: false,
        fieldsRemoved: 0,
        fieldsAnonymized: 0,
        processingTime: 0,
      },
    };

    const startTime = Date.now();
    this.logs = [];

    try {
      // تحول البيانات الأصلية إلى خريطة
      let studentMap: Map<string | number, OriginalStudentData>;

      if (originalData instanceof Map) {
        studentMap = originalData;
      } else if (Array.isArray(originalData)) {
        studentMap = ResultMerger.createMapFromArray(originalData);
      } else {
        studentMap = ResultMerger.createMapFromArray([originalData]);
      }

      this.log('MERGING', `بدء دمج النتائج مع بيانات الطلاب الأصلية...`, 'info');

      // دمج النتائج
      const resultsArray = Array.isArray(aiResults) ? aiResults : [aiResults];
      const mergedResults = this.merger.mergeWithPresets(resultsArray, studentMap);

      result.data = resultsArray.length === 1 ? mergedResults[0] : mergedResults;
      result.success = true;
      result.stats.processingTime = Date.now() - startTime;

      this.log(
        'MERGING',
        `تم دمج ${mergedResults.length} نتيجة بنجاح`,
        'info'
      );
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : String(error));
      this.log('MERGING', `خطأ: ${error}`, 'error');
    }

    if (this.config.keepLogs) {
      result.logs = [...this.logs];
    }

    return result;
  }

  /**
   * خط أنابيب كامل - Complete pipeline
   */
  async fullPipeline(
    students: StudentData | StudentData[],
    aiResults: AIAnalysisResult | AIAnalysisResult[],
    originalData: Map<string | number, OriginalStudentData> | OriginalStudentData[]
  ): Promise<{
    beforeProcessing: PipelineResult;
    aiAnalysis: PipelineResult;
    finalResults: MergedResult | MergedResult[];
  }> {
    // المعالجة قبل AI
    const beforeProcessing = await this.processBefore(students);

    // معالجة نتائج AI
    const aiAnalysis = await this.processAfter(aiResults, originalData);

    // الحصول على النتائج النهائية
    const resultsArray = Array.isArray(aiResults) ? aiResults : [aiResults];
    const finalResults = this.merger.mergeResults(resultsArray);

    return {
      beforeProcessing,
      aiAnalysis,
      finalResults: resultsArray.length === 1 ? finalResults[0] : finalResults,
    };
  }

  /**
   * تسجيل الرسائل - Log messages
   */
  private log(step: string, message: string, severity: 'info' | 'warning' | 'error'): void {
    const log: PipelineLog = {
      timestamp: new Date().toISOString(),
      step,
      message,
      severity,
    };

    this.logs.push(log);

    if (this.config.verbose) {
      console.log(`[${step}] ${message}`);
    }
  }

  /**
   * الحصول على السجلات - Get logs
   */
  getLogs(): PipelineLog[] {
    return [...this.logs];
  }

  /**
   * مسح السجلات - Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * تحديث الإعدادات - Update configuration
   */
  updateConfig(config: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * إعادة تعيين المنسق - Reset orchestrator
   */
  reset(): void {
    this.detector = new SensitiveDataDetector();
    this.filter = new DataFilter();
    this.merger = new ResultMerger();
    this.logs = [];
  }
}

/**
 * دالة مساعدة للحصول على منسق محسّن - Helper to get pre-configured pipeline
 */
export function createSecurePipeline(): DataProtectionPipeline {
  return new DataProtectionPipeline({
    detectSensitive: true,
    filterData: true,
    anonymize: true,
    maskSensitive: true,
    stopOnSensitive: false,
    verbose: false,
    keepLogs: true,
  });
}

/**
 * دالة مساعدة للحصول على منسق صارم - Helper for strict pipeline
 */
export function createStrictPipeline(): DataProtectionPipeline {
  return new DataProtectionPipeline({
    detectSensitive: true,
    filterData: true,
    anonymize: true,
    maskSensitive: true,
    stopOnSensitive: true,
    verbose: true,
    keepLogs: true,
  });
}
