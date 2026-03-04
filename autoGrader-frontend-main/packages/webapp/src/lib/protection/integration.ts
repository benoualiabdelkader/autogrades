/**
 * Integration Module - Data Protection with Scraper & APIs
 * وحدة التكامل - حماية البيانات مع Scraper و APIs
 */

import {
  SensitiveDataDetector,
  DataFilter,
  ResultMerger,
  DataProtectionPipeline,
  createSecurePipeline,
} from './index';

/**
 * منسق حماية البيانات المدمج
 * Integrated Data Protection Orchestrator
 */
export class IntegratedDataProtection {
  private pipeline: DataProtectionPipeline;
  private detector: SensitiveDataDetector;
  private filter: DataFilter;
  private merger: ResultMerger;
  private originalDataStore: Map<string | number, any> = new Map();

  constructor(mode: 'safe' | 'strict' | 'dev' = 'safe') {
    this.pipeline = new DataProtectionPipeline({
      detectSensitive: true,
      filterData: true,
      maskSensitive: true,
      stopOnSensitive: mode === 'strict',
      verbose: mode === 'dev',
      keepLogs: true,
    });

    this.detector = new SensitiveDataDetector();
    this.filter = new DataFilter({
      maskSensitive: true,
      anonymize: true,
    });
    this.merger = new ResultMerger();
  }

  /**
   * معالجة البيانات من Scraper
   * Process data from Moodle Scraper
   */
  async processMoodleData(students: any[]): Promise<{
    safeData: any[];
    stats: any;
    warnings: string[];
  }> {
    const result = await this.pipeline.processBefore(students);

    // حفظ البيانات الأصلية للدمج لاحقاً
    students.forEach((student) => {
      const key = student.student_id || student.id;
      if (key) {
        this.originalDataStore.set(key, student);
      }
    });

    return {
      safeData: Array.isArray(result.data) ? result.data : [result.data],
      stats: result.stats,
      warnings: result.warnings,
    };
  }

  /**
   * إرسال البيانات الآمنة للـ AI
   * Send safe data to AI (Groq/OpenAI)
   */
  async sendToAI(
    safeData: any[],
    aiFunction: (data: any) => Promise<any>
  ): Promise<any> {
    try {
      // إرسال البيانات المحمية فقط
      const aiResults = await aiFunction(safeData);
      return aiResults;
    } catch (error) {
      console.error('❌ خطأ في استدعاء AI:', error);
      throw error;
    }
  }

  /**
   * دمج نتائج AI مع البيانات الأصلية
   * Merge AI results with original data
   */
  async processAIResults(aiResults: any[]): Promise<{
    mergedResults: any[];
    stats: any;
  }> {
    // تسجيل البيانات الأصلية المحفوظة
    this.merger.registerStudentData(Array.from(this.originalDataStore.values()));

    // معالجة النتائج بعد AI
    const afterResult = await this.pipeline.processAfter(
      aiResults,
      this.originalDataStore
    );

    if (!afterResult.success) {
      console.error('❌ فشل دمج النتائج:', afterResult.errors);
      throw new Error(`فشل دمج النتائج: ${afterResult.errors.join(', ')}`);
    }

    return {
      mergedResults: Array.isArray(afterResult.data) ? afterResult.data : [afterResult.data],
      stats: afterResult.stats,
    };
  }

  /**
   * سير عمل كامل
   * Complete workflow: Scrape → Protect → AI → Merge
   */
  async completeWorkflow(
    scrapedData: any[],
    aiFunction: (data: any) => Promise<any>
  ): Promise<{
    success: boolean;
    results: any[];
    stats: any;
    logs: any[];
  }> {
    try {
      console.log('🔄 بدء سير العمل الكامل...');

      // 1. معالجة بيانات Scraper
      console.log('📥 معالجة بيانات Moodle...');
      const { safeData, stats: beforeStats, warnings } = await this.processMoodleData(
        scrapedData
      );

      console.log(`✓ تم معالجة ${scrapedData.length} طالب`);
      if (warnings.length > 0) {
        console.warn(`⚠️ تحذيرات: ${warnings.join(', ')}`);
      }

      // 2. إرسال للـ AI
      console.log('🤖 إرسال البيانات للـ AI...');
      const aiResults = await this.sendToAI(safeData, aiFunction);

      // 3. دمج النتائج
      console.log('🔗 دمج النتائج مع البيانات الأصلية...');
      const { mergedResults, stats: afterStats } = await this.processAIResults(
        Array.isArray(aiResults) ? aiResults : [aiResults]
      );

      console.log('✓ اكتملت العملية بنجاح!');

      return {
        success: true,
        results: mergedResults,
        stats: {
          before: beforeStats,
          after: afterStats,
        },
        logs: this.pipeline.getLogs(),
      };
    } catch (error) {
      console.error('❌ خطأ في سير العمل:', error);
      return {
        success: false,
        results: [],
        stats: {},
        logs: this.pipeline.getLogs(),
      };
    }
  }

  /**
   * كشف سريع للبيانات الحساسة فقط
   * Quick detection without processing
   */
  detectOnly(data: any): {
    hasSensitive: boolean;
    count: number;
    highRisk: number;
  } {
    const result = this.detector.detectInObject(data);
    return {
      hasSensitive: result.found,
      count: result.summary.total,
      highRisk: result.summary.high,
    };
  }

  /**
   * مسح جميع البيانات المحفوظة
   * Clear stored data
   */
  clearStoredData(): void {
    this.originalDataStore.clear();
    this.merger.clearData();
    this.pipeline.reset();
  }

  /**
   * الحصول على السجلات
   * Get logs
   */
  getLogs() {
    return this.pipeline.getLogs();
  }
}

/**
 * مثال عملي للاستخدام
 * Practical Usage Example
 */
export async function integratedExample() {
  // إنشاء منسق التكامل
  const protector = new IntegratedDataProtection('safe');

  // بيانات من Scraper (محاكاة)
  const scrapedStudents = [
    {
      student_id: 'S001',
      name: 'أحمد علي',
      email: 'ahmed@uni.com',
      phone: '+966501234567',
      grades: { math: 85, science: 90 },
      attendance: 95,
      address: '123 King St',
    },
    {
      student_id: 'S002',
      name: 'فاطمة محمود',
      email: 'fatima@uni.com',
      phone: '+966512345678',
      grades: { math: 92, science: 88 },
      attendance: 98,
      address: '456 Queen Rd',
    },
  ];

  // دالة AI محاكاة
  const mockAIFunction = async (data: any) => {
    // محاكاة استدعاء Groq/OpenAI API
    return Array.isArray(data)
      ? data.map((student: any) => ({
          student_id: student.student_id,
          analysis: `${student.student_id} يظهر أداء ممتاز`,
          recommendations: ['استمر بالجهد', 'يمكنك تحسين أكثر'],
          score: 88,
        }))
      : {
          student_id: data.student_id,
          analysis: 'أداء جيد',
          recommendations: ['استمر بالمجهود'],
          score: 85,
        };
  };

  // تشغيل سير العمل الكامل
  const result = await protector.completeWorkflow(scrapedStudents, mockAIFunction);

  console.log('\n📊 النتائج النهائية:');
  console.log(JSON.stringify(result.results, null, 2));

  return result;
}

/**
 * مثال الاستخدام مع Groq API
 */
export async function withGroqAPIExample() {
  const protector = new IntegratedDataProtection('safe');

  const students = [
    {
      student_id: 'S001',
      name: 'أحمد',
      email: 'ahmed@uni.com',
      grades: { math: 85 },
      attendance: 95,
    },
  ];

  // استخدام Groq API
  const groqAIFunction = async (safeData: any) => {
    // هذا سيكون الاستدعاء الحقيقي
    // import { Groq } from 'groq-sdk';
    // const groq = new Groq();
    // const response = await groq.chat.completions.create({...});
    // return response.choices[0].message.content;

    // للاختبار، نعود بيانات محاكاة
    return Array.isArray(safeData)
      ? safeData.map((s: any) => ({
          student_id: s.student_id,
          analysis: 'تحليل من Groq',
        }))
      : null;
  };

  const result = await protector.completeWorkflow(students, groqAIFunction);
  return result;
}

/**
 * مثال الاستخدام مع OpenAI API
 */
export async function withOpenAIExample() {
  const protector = new IntegratedDataProtection('safe');

  const students = [
    {
      student_id: 'S001',
      name: 'أحمد',
      email: 'ahmed@uni.com',
      grades: { math: 85 },
    },
  ];

  // استخدام OpenAI API
  const openaiAIFunction = async (safeData: any) => {
    // import { OpenAI } from 'openai';
    // const openai = new OpenAI();
    // const response = await openai.chat.completions.create({...});
    // return response.choices[0].message.content;

    return Array.isArray(safeData)
      ? safeData.map((s: any) => ({
          student_id: s.student_id,
          analysis: 'تحليل من OpenAI',
        }))
      : null;
  };

  const result = await protector.completeWorkflow(students, openaiAIFunction);
  return result;
}

export default IntegratedDataProtection;
