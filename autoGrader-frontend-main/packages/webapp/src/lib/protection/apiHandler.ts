/**
 * API Integration Example - Secure Data Protection Handler
 * مثال التكامل مع API - معالج حماية البيانات الآمنة
 */

import { IntegratedDataProtection } from './integration';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * معالج API آمن للتحليل
 * Secure API Handler for Analysis
 */
export class SecureAnalysisHandler {
  private protector: IntegratedDataProtection;

  constructor(mode: 'safe' | 'strict' | 'dev' = 'safe') {
    this.protector = new IntegratedDataProtection(mode);
  }

  /**
   * معالج API: استقبال البيانات وإرسالها للـ AI
   * API Handler: Receive data, protect it, send to AI
   */
  async handle(
    students: any[],
    aiFunction: (data: any) => Promise<any>
  ): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
    stats?: any;
  }> {
    try {
      const result = await this.protector.completeWorkflow(students, aiFunction);

      if (result.success) {
        return {
          success: true,
          data: result.results,
          stats: result.stats,
        };
      } else {
        return {
          success: false,
          error: 'فشلت معالجة البيانات',
        };
      }
    } catch (error) {
      console.error('❌ خطأ في معالجة API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      };
    }
  }

  /**
   * التحقق من البيانات الحساسة فقط
   * Check for sensitive data only
   */
  checkSensitiveData(data: any): {
    hasSensitive: boolean;
    count: number;
    safe: boolean;
  } {
    const detection = this.protector.detectOnly(data);
    return {
      hasSensitive: detection.hasSensitive,
      count: detection.count,
      safe: detection.count === 0,
    };
  }

  /**
   * تنظيف الموارد
   * Cleanup resources
   */
  cleanup(): void {
    this.protector.clearStoredData();
  }
}

/**
 * مثال: Pages API Endpoint
 * Example: Pages API Endpoint
 */
export async function analyzeStudentsHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const handler = new SecureAnalysisHandler('safe');

  try {
    const { students, analyzeWith } = req.body;

    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ error: 'Invalid students data' });
    }

    // دالة AI بناءً على الطلب
    const aiFunction = async (data: any) => {
      // هنا تستدعي Groq أو OpenAI API
      // Here you would call Groq or OpenAI API

      if (analyzeWith === 'groq') {
        // const groq = new Groq();
        // return await groq.chat.completions.create({...});
        return mockAnalysis(data);
      } else {
        // const openai = new OpenAI();
        // return await openai.chat.completions.create({...});
        return mockAnalysis(data);
      }
    };

    // معالجة البيانات
    const result = await handler.handle(students, aiFunction);

    console.log('📊 API Response Stats:', result.stats);

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  } finally {
    handler.cleanup();
  }
}

/**
 * دالة محاكاة التحليل
 * Mock analysis function
 */
function mockAnalysis(data: any) {
  return Array.isArray(data)
    ? data.map((student: any) => ({
        student_id: student.student_id,
        analysis: `تحليل لـ ${student.student_id}: أداء جيد`,
        recommendations: ['استمر بالجهد الحالي'],
        score: Math.floor(Math.random() * 40) + 60,
      }))
    : {
        student_id: data.student_id,
        analysis: 'تحليل عام: أداء جيد',
        recommendations: ['تحسين عام'],
        score: 75,
      };
}

/**
 * مثال: استخدام مباشر في Component
 * Example: Direct usage in Component
 */
export async function analyzeStudentsDirectly(
  students: any[]
): Promise<{
  success: boolean;
  results: any[];
  stats: any;
}> {
  const handler = new SecureAnalysisHandler('safe');

  try {
    const mockAI = async (data: any) => mockAnalysis(data);
    const result = await handler.handle(students, mockAI);

    return {
      success: result.success,
      results: result.data || [],
      stats: result.stats || {},
    };
  } finally {
    handler.cleanup();
  }
}

export default {
  SecureAnalysisHandler,
  analyzeStudentsHandler,
  analyzeStudentsDirectly,
};
