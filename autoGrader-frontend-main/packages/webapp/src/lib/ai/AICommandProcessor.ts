/**
 * AI Command Processor - المعالج المركزي لأوامر المساعد الذكي
 * يتيح التحكم الكامل بالنظام عبر المحادثة الطبيعية
 * 
 * القدرات:
 * - إنشاء وتعديل Workflows عبر المحادثة
 * - إدخال وتحليل بيانات CSV/JSON
 * - إدارة القواعد والوصف والمعايير
 * - استعلام وتصفية البيانات
 * - تنفيذ عمليات التقييم والتحليل
 * - تصدير النتائج بصيغ متعددة
 */

export interface AICommand {
  type: CommandType;
  action: string;
  params: Record<string, any>;
  rawInput: string;
  confidence: number;
  language: 'en' | 'ar';
}

export type CommandType =
  | 'workflow_create'
  | 'workflow_edit'
  | 'workflow_delete'
  | 'workflow_run'
  | 'workflow_list'
  | 'workflow_status'
  | 'data_import_csv'
  | 'data_import_json'
  | 'data_export'
  | 'data_query'
  | 'data_analyze'
  | 'data_filter'
  | 'data_visualize'
  | 'rules_add'
  | 'rules_edit'
  | 'rules_delete'
  | 'rules_list'
  | 'task_create'
  | 'task_edit'
  | 'task_delete'
  | 'task_run'
  | 'task_list'
  | 'description_set'
  | 'description_get'
  | 'student_select'
  | 'student_analyze'
  | 'student_grade'
  | 'student_feedback'
  | 'student_batch'
  | 'rubric_generate'
  | 'rubric_customize'
  | 'system_status'
  | 'system_settings'
  | 'system_help'
  | 'navigation'
  | 'chat_general';

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  actions?: SystemAction[];
  suggestions?: string[];
}

export interface SystemAction {
  type: 'setState' | 'navigate' | 'api_call' | 'download' | 'notify' | 'ui_update';
  target: string;
  value: any;
}

// ===== Pattern Definitions =====
interface CommandPattern {
  type: CommandType;
  patterns_en: RegExp[];
  patterns_ar: RegExp[];
  extract: (input: string, lang: 'en' | 'ar') => Record<string, any>;
  priority: number;
}

const COMMAND_PATTERNS: CommandPattern[] = [
  // ===== WORKFLOW COMMANDS =====
  {
    type: 'workflow_create',
    patterns_en: [
      /create\s+(?:a\s+)?(?:new\s+)?workflow\s*(.*)/i,
      /build\s+(?:a\s+)?workflow\s*(.*)/i,
      /make\s+(?:a\s+)?(?:new\s+)?workflow\s*(.*)/i,
      /new\s+workflow\s*(.*)/i,
      /setup\s+workflow\s*(.*)/i,
    ],
    patterns_ar: [
      /(?:انشئ|أنشئ|اعمل|صمم|بناء)\s*(?:workflow|ووركفلو|سير عمل|مسار عمل)\s*(.*)/i,
      /(?:انشاء|إنشاء)\s*(?:workflow|ووركفلو|سير عمل)\s*(.*)/i,
    ],
    extract: (input: string) => {
      const nameMatch = input.match(/(?:named?|called?|title[d]?|اسمه?|بعنوان)\s*[:=]?\s*["']?([^"'\n|,]+)/i);
      const descMatch = input.match(/(?:description|desc|وصف|الوصف)\s*[:=]?\s*["']?([^"'\n|]+)/i);
      const stepsMatch = input.match(/(?:steps?|خطوات?)\s*[:=]?\s*["']?([^"'\n]+)/i);
      const typeMatch = input.match(/(?:type|for|نوع|لـ?)\s*[:=]?\s*["']?(\w+)/i);
      const rulesMatch = input.match(/(?:rules?|criteria|قواعد|معايير)\s*[:=]?\s*["']?([^"'\n]+)/i);
      return {
        name: nameMatch?.[1]?.trim() || '',
        description: descMatch?.[1]?.trim() || '',
        steps: stepsMatch?.[1]?.trim() || '',
        type: typeMatch?.[1]?.trim() || 'grading',
        rules: rulesMatch?.[1]?.trim() || '',
      };
    },
    priority: 10,
  },
  {
    type: 'workflow_edit',
    patterns_en: [
      /(?:edit|modify|update|change)\s+workflow\s*(.*)/i,
      /(?:edit|modify|update|change)\s+(?:the\s+)?workflow\s*(.*)/i,
    ],
    patterns_ar: [
      /(?:عدل|تعديل|تغيير|تحديث)\s*(?:workflow|ووركفلو|سير العمل)\s*(.*)/i,
    ],
    extract: (input: string) => {
      const idMatch = input.match(/(?:id|رقم)\s*[:=]?\s*(\d+)/i);
      const nameMatch = input.match(/(?:name|title|اسم|عنوان)\s*[:=]?\s*["']?([^"'\n|]+)/i);
      const descMatch = input.match(/(?:description|desc|وصف)\s*[:=]?\s*["']?([^"'\n|]+)/i);
      return {
        id: idMatch?.[1] ? parseInt(idMatch[1]) : null,
        name: nameMatch?.[1]?.trim() || '',
        description: descMatch?.[1]?.trim() || '',
      };
    },
    priority: 9,
  },
  {
    type: 'workflow_run',
    patterns_en: [
      /(?:run|execute|start|launch)\s+workflow\s*(\d+)?/i,
      /(?:run|execute|start)\s+(?:the\s+)?(\w+)\s+workflow/i,
    ],
    patterns_ar: [
      /(?:شغل|نفذ|ابدأ|تشغيل)\s*(?:workflow|ووركفلو|سير العمل)\s*(\d+)?/i,
    ],
    extract: (input: string) => {
      const idMatch = input.match(/(\d+)/);
      return { id: idMatch?.[1] ? parseInt(idMatch[1]) : null };
    },
    priority: 9,
  },
  {
    type: 'workflow_list',
    patterns_en: [
      /(?:list|show|display)\s+(?:all\s+)?workflows?/i,
      /(?:what|which)\s+workflows?\s+(?:are|do)/i,
    ],
    patterns_ar: [
      /(?:اعرض|عرض|قائمة)\s*(?:كل\s+)?(?:workflows?|ووركفلو|مسارات العمل)/i,
      /(?:ما هي|ماهي)\s*(?:workflows?|ووركفلو|مسارات)/i,
    ],
    extract: () => ({}),
    priority: 8,
  },

  // ===== DATA IMPORT COMMANDS =====
  {
    type: 'data_import_csv',
    patterns_en: [
      /(?:import|upload|load|read)\s+(?:a\s+)?csv\s*(.*)/i,
      /(?:import|upload|load)\s+(?:a\s+)?(?:file|data)\s+(?:from\s+)?csv/i,
      /csv\s+(?:import|upload|load)/i,
      /(?:parse|process)\s+csv\s*(.*)/i,
    ],
    patterns_ar: [
      /(?:استيراد|تحميل|رفع|قراءة|ادخال|إدخال)\s*(?:ملف\s+)?csv\s*(.*)/i,
      /(?:استيراد|تحميل|رفع)\s*(?:ملف|بيانات)\s*(?:من\s+)?csv/i,
      /csv\s*(?:استيراد|تحميل|إدخال)/i,
    ],
    extract: (input: string) => {
      const delimiterMatch = input.match(/(?:delimiter|separator|فاصل)\s*[:=]?\s*["']?([^"'\s]+)/i);
      const hasHeaderMatch = input.match(/(?:no\s+header|بدون\s+عناوين)/i);
      return {
        delimiter: delimiterMatch?.[1] || ',',
        hasHeaders: !hasHeaderMatch,
      };
    },
    priority: 10,
  },
  {
    type: 'data_import_json',
    patterns_en: [
      /(?:import|upload|load|read)\s+(?:a\s+)?json\s*(.*)/i,
      /(?:import|upload|load)\s+(?:a\s+)?(?:file|data)\s+(?:from\s+)?json/i,
      /json\s+(?:import|upload|load)/i,
      /(?:parse|process)\s+json\s*(.*)/i,
    ],
    patterns_ar: [
      /(?:استيراد|تحميل|رفع|قراءة|ادخال|إدخال)\s*(?:ملف\s+)?json\s*(.*)/i,
      /(?:استيراد|تحميل|رفع)\s*(?:ملف|بيانات)\s*(?:من\s+)?json/i,
      /json\s*(?:استيراد|تحميل|إدخال)/i,
    ],
    extract: () => ({}),
    priority: 10,
  },
  {
    type: 'data_export',
    patterns_en: [
      /(?:export|download|save)\s+(?:data|results?)\s+(?:as|to)\s+(csv|json|pdf|excel)/i,
      /(?:export|download)\s+(csv|json|pdf)/i,
      /(?:save|generate)\s+(?:a\s+)?(csv|json|pdf)\s+(?:file|report)/i,
    ],
    patterns_ar: [
      /(?:تصدير|تحميل|حفظ|انشاء)\s*(?:البيانات|النتائج)?\s*(?:كـ?|بصيغة|إلى)\s*(csv|json|pdf)/i,
      /(?:تصدير|تحميل)\s*(csv|json|pdf)/i,
    ],
    extract: (input: string) => {
      const formatMatch = input.match(/(csv|json|pdf|excel)/i);
      return { format: formatMatch?.[1]?.toLowerCase() || 'csv' };
    },
    priority: 9,
  },
  {
    type: 'data_analyze',
    patterns_en: [
      /(?:analyze|analyse)\s+(?:the\s+)?(?:data|results?|students?|grades?|performance)\s*(.*)/i,
      /(?:give|show|get)\s+(?:me\s+)?(?:analysis|analytics|statistics|stats)\s*(.*)/i,
      /(?:what|how)\s+(?:is|are)\s+(?:the\s+)?(?:performance|results?|grades?)\s*(.*)/i,
      /(?:data|grade|performance)\s+(?:analysis|analytics|summary)/i,
    ],
    patterns_ar: [
      /(?:حلل|تحليل|تحليلات)\s*(?:البيانات|النتائج|الطلاب|الأداء|الدرجات)?\s*(.*)/i,
      /(?:اعرض|عرض|أعطني)\s*(?:التحليل|الإحصائيات|ملخص)\s*(.*)/i,
      /(?:ما هو|كيف)\s*(?:الأداء|النتائج|الدرجات)/i,
    ],
    extract: (input: string) => {
      const targetMatch = input.match(/(?:for|of|عن|لـ?)\s+["']?([^"'\n]+)/i);
      return { target: targetMatch?.[1]?.trim() || 'all' };
    },
    priority: 8,
  },
  {
    type: 'data_query',
    patterns_en: [
      /(?:query|search|find|look for|filter)\s+(?:students?|data|records?)\s*(.*)/i,
      /(?:show|get|fetch)\s+(?:me\s+)?(?:students?|data|records?)\s+(?:where|with|who|that)\s+(.*)/i,
      /(?:how many|count)\s+(?:students?|records?)\s*(.*)/i,
    ],
    patterns_ar: [
      /(?:ابحث|بحث|فلتر|تصفية|جد)\s*(?:عن\s+)?(?:طلاب|بيانات|سجلات)\s*(.*)/i,
      /(?:اعرض|عرض|اجلب)\s*(?:الطلاب|البيانات|السجلات)\s+(?:الذين?|حيث|من)\s+(.*)/i,
      /(?:كم عدد|كم)\s*(?:الطلاب|السجلات)\s*(.*)/i,
    ],
    extract: (input: string) => {
      const conditionMatch = input.match(/(?:where|with|who|that|حيث|الذين)\s+(.+)/i);
      return { condition: conditionMatch?.[1]?.trim() || '' };
    },
    priority: 7,
  },

  // ===== RULES COMMANDS =====
  {
    type: 'rules_add',
    patterns_en: [
      /(?:add|create|set)\s+(?:a\s+)?(?:new\s+)?(?:grading\s+)?rule\s*(.*)/i,
      /(?:add|create)\s+(?:grading\s+)?(?:criteria|criterion)\s*(.*)/i,
      /(?:define|set)\s+(?:grading\s+)?(?:standards?|rules?|criteria)\s*(.*)/i,
    ],
    patterns_ar: [
      /(?:اضف|أضف|إضافة|انشئ)\s*(?:قاعدة|معيار|معايير)\s*(?:تقييم|تصحيح)?\s*(.*)/i,
      /(?:حدد|ضع|عرّف)\s*(?:قواعد|معايير)\s*(?:التقييم|التصحيح)?\s*(.*)/i,
    ],
    extract: (input: string) => {
      const nameMatch = input.match(/(?:name|named?|called?|اسم|بعنوان)\s*[:=]?\s*["']?([^"'\n|,]+)/i);
      const weightMatch = input.match(/(?:weight|percentage|وزن|نسبة)\s*[:=]?\s*(\d+)/i);
      const typeMatch = input.match(/(?:type|نوع)\s*[:=]?\s*["']?(\w+)/i);
      const descMatch = input.match(/(?:description|desc|وصف)\s*[:=]?\s*["']?([^"'\n|]+)/i);
      return {
        name: nameMatch?.[1]?.trim() || '',
        weight: weightMatch?.[1] ? parseInt(weightMatch[1]) : 20,
        type: typeMatch?.[1]?.trim() || 'keyword',
        description: descMatch?.[1]?.trim() || '',
      };
    },
    priority: 9,
  },
  {
    type: 'rules_list',
    patterns_en: [
      /(?:list|show|display|view)\s+(?:all\s+)?(?:grading\s+)?rules?/i,
      /(?:what|which)\s+(?:grading\s+)?rules?\s+(?:are|do|exist)/i,
      /(?:current|active)\s+(?:grading\s+)?rules?/i,
    ],
    patterns_ar: [
      /(?:اعرض|عرض|قائمة)\s*(?:كل\s+)?(?:القواعد|المعايير)\s*(.*)/i,
      /(?:ما هي|ماهي)\s*(?:القواعد|المعايير)\s*(.*)/i,
    ],
    extract: () => ({}),
    priority: 8,
  },
  {
    type: 'rules_edit',
    patterns_en: [
      /(?:edit|modify|update|change)\s+rule\s*(.*)/i,
      /(?:set|change)\s+(?:the\s+)?(?:weight|percentage)\s+(?:of|for)\s+(.+)\s+to\s+(\d+)/i,
    ],
    patterns_ar: [
      /(?:عدل|تعديل|تغيير|تحديث)\s*(?:القاعدة|المعيار)\s*(.*)/i,
      /(?:غيّر|ضع)\s*(?:وزن|نسبة)\s*(?:القاعدة|المعيار)\s+(.+)\s+(?:إلى|الى)\s+(\d+)/i,
    ],
    extract: (input: string) => {
      const idMatch = input.match(/(?:id|رقم)\s*[:=]?\s*["']?([^"'\s]+)/i);
      const weightMatch = input.match(/(?:weight|percentage|وزن|نسبة)\s*[:=]?\s*(\d+)/i);
      const nameMatch = input.match(/(?:name|اسم)\s*[:=]?\s*["']?([^"'\n|]+)/i);
      return {
        id: idMatch?.[1]?.trim() || '',
        weight: weightMatch?.[1] ? parseInt(weightMatch[1]) : null,
        name: nameMatch?.[1]?.trim() || '',
      };
    },
    priority: 9,
  },

  // ===== DESCRIPTION COMMANDS =====
  {
    type: 'description_set',
    patterns_en: [
      /(?:set|update|change)\s+(?:the\s+)?(?:task\s+)?description\s*(?:to|[:=])\s*(.*)/i,
      /(?:describe|description)\s*[:=]\s*(.*)/i,
    ],
    patterns_ar: [
      /(?:اضبط|عدل|غير|حدد)\s*(?:الـ?)?وصف\s*(?:المهمة)?\s*(?:إلى|الى|[:=])\s*(.*)/i,
      /وصف\s*[:=]\s*(.*)/i,
    ],
    extract: (input: string) => {
      const descMatch = input.match(/(?:to|[:=])\s*["']?(.+)/i) ||
        input.match(/(?:إلى|الى|[:=])\s*["']?(.+)/i);
      return { description: descMatch?.[1]?.trim() || '' };
    },
    priority: 8,
  },

  // ===== STUDENT COMMANDS =====
  {
    type: 'student_analyze',
    patterns_en: [
      /(?:analyze|analyse)\s+(?:student|learner)\s*(.*)/i,
      /(?:student|learner)\s+(?:analysis|analytics|insight)\s*(.*)/i,
      /(?:check|review)\s+(?:student|learner)\s+(?:performance|progress)\s*(.*)/i,
    ],
    patterns_ar: [
      /(?:حلل|تحليل)\s*(?:الطالب|الطالبة|المتعلم)\s*(.*)/i,
      /(?:أداء|تقدم)\s*(?:الطالب|الطالبة)\s*(.*)/i,
    ],
    extract: (input: string) => {
      const nameMatch = input.match(/(?:named?|called?|اسمه?|المسمى)\s*["']?([^"'\n|]+)/i);
      const idMatch = input.match(/(?:id|رقم)\s*[:=]?\s*(\d+)/i);
      return {
        name: nameMatch?.[1]?.trim() || '',
        id: idMatch?.[1] ? parseInt(idMatch[1]) : null,
      };
    },
    priority: 8,
  },
  {
    type: 'student_batch',
    patterns_en: [
      /(?:batch|bulk)\s+(?:grade|review|analyze|process)\s*(.*)/i,
      /(?:grade|review|process)\s+(?:all|multiple|batch)\s+(?:students?|submissions?)\s*(.*)/i,
    ],
    patterns_ar: [
      /(?:تقييم|مراجعة|تحليل)\s*(?:دفعة|جماعي|مجموعة|كل|جميع)\s*(?:الطلاب|الإجابات)\s*(.*)/i,
    ],
    extract: (input: string) => {
      const limitMatch = input.match(/(?:top|first|limit|أول|أعلى)\s*(\d+)/i);
      return { limit: limitMatch?.[1] ? parseInt(limitMatch[1]) : 10 };
    },
    priority: 8,
  },

  // ===== RUBRIC COMMANDS =====
  {
    type: 'rubric_generate',
    patterns_en: [
      /(?:generate|create|make|build)\s+(?:a\s+)?rubric\s*(.*)/i,
      /(?:rubric)\s+(?:for|about)\s*(.*)/i,
    ],
    patterns_ar: [
      /(?:انشئ|أنشئ|اعمل|بناء|توليد)\s*(?:rubric|روبريك|معيار تقييم|سلم تقييم)\s*(.*)/i,
      /(?:rubric|روبريك|سلم تقييم)\s*(?:لـ?|عن|حول)\s*(.*)/i,
    ],
    extract: (input: string) => {
      const subjectMatch = input.match(/(?:for|about|لـ?|عن)\s*["']?([^"'\n]+)/i);
      const levelMatch = input.match(/(?:level|مستوى)\s*[:=]?\s*["']?(\w+)/i);
      return {
        subject: subjectMatch?.[1]?.trim() || '',
        level: levelMatch?.[1]?.trim() || 'intermediate',
      };
    },
    priority: 9,
  },

  // ===== SYSTEM COMMANDS =====
  {
    type: 'system_status',
    patterns_en: [
      /(?:system|dashboard)\s+status/i,
      /(?:what|how)\s+(?:is|are)\s+(?:the\s+)?(?:system|dashboard)/i,
      /(?:status|health)\s+(?:check|report)/i,
    ],
    patterns_ar: [
      /(?:حالة|وضع)\s*(?:النظام|لوحة التحكم)/i,
      /(?:فحص|تقرير)\s*(?:الحالة|النظام)/i,
    ],
    extract: () => ({}),
    priority: 7,
  },
  {
    type: 'system_help',
    patterns_en: [
      /(?:help|commands|what can you do|capabilities)/i,
      /(?:show|list)\s+(?:all\s+)?(?:commands|capabilities|features)/i,
    ],
    patterns_ar: [
      /(?:مساعدة|أوامر|ماذا تستطيع|قدرات|إمكانيات)/i,
      /(?:اعرض|عرض)\s*(?:كل\s+)?(?:الأوامر|القدرات|الميزات)/i,
    ],
    extract: () => ({}),
    priority: 5,
  },
];

// ===== Main Processor =====
export class AICommandProcessor {
  private static instance: AICommandProcessor;
  private commandHistory: AICommand[] = [];
  private context: Record<string, any> = {};

  private constructor() {}

  static getInstance(): AICommandProcessor {
    if (!AICommandProcessor.instance) {
      AICommandProcessor.instance = new AICommandProcessor();
    }
    return AICommandProcessor.instance;
  }

  /**
   * Detect language from input text
   */
  detectLanguage(input: string): 'en' | 'ar' {
    const arabicChars = (input.match(/[\u0600-\u06FF]/g) || []).length;
    const latinChars = (input.match(/[a-zA-Z]/g) || []).length;
    return arabicChars > latinChars ? 'ar' : 'en';
  }

  /**
   * Parse user input into structured command
   */
  parseCommand(input: string): AICommand {
    const lang = this.detectLanguage(input);
    const normalizedInput = input.trim();

    let bestMatch: { pattern: CommandPattern; match: RegExpMatchArray } | null = null;
    let bestPriority = -1;

    for (const pattern of COMMAND_PATTERNS) {
      const patterns = lang === 'ar' ? [...pattern.patterns_ar, ...pattern.patterns_en] : [...pattern.patterns_en, ...pattern.patterns_ar];
      for (const regex of patterns) {
        const match = normalizedInput.match(regex);
        if (match && pattern.priority > bestPriority) {
          bestMatch = { pattern, match };
          bestPriority = pattern.priority;
        }
      }
    }

    if (bestMatch) {
      const params = bestMatch.pattern.extract(normalizedInput, lang);
      const command: AICommand = {
        type: bestMatch.pattern.type,
        action: bestMatch.match[0],
        params,
        rawInput: normalizedInput,
        confidence: 0.85 + (bestPriority / 100),
        language: lang,
      };
      this.commandHistory.push(command);
      return command;
    }

    // Default: general chat
    return {
      type: 'chat_general',
      action: 'chat',
      params: { message: normalizedInput },
      rawInput: normalizedInput,
      confidence: 0.5,
      language: lang,
    };
  }

  /**
   * Check if input contains file data (CSV inline)
   */
  detectInlineCSV(input: string): { found: boolean; data: string } {
    const csvPatterns = [
      /```csv\n?([\s\S]+?)```/i,
      /```\n?((?:[^\n]+,)+[^\n]+\n(?:[\s\S]+?))```/i,
    ];
    for (const pattern of csvPatterns) {
      const match = input.match(pattern);
      if (match) return { found: true, data: match[1].trim() };
    }
    // Check for multi-line comma-separated data
    const lines = input.split('\n').filter(l => l.includes(',') && l.trim().length > 5);
    if (lines.length >= 2) {
      const colCount = lines[0].split(',').length;
      const consistent = lines.every(l => Math.abs(l.split(',').length - colCount) <= 1);
      if (consistent && colCount >= 2) {
        return { found: true, data: lines.join('\n') };
      }
    }
    return { found: false, data: '' };
  }

  /**
   * Check if input contains JSON data
   */
  detectInlineJSON(input: string): { found: boolean; data: any } {
    const jsonPatterns = [
      /```json\n?([\s\S]+?)```/i,
      /```\n?(\{[\s\S]+?\})```/i,
      /```\n?(\[[\s\S]+?\])```/i,
    ];
    for (const pattern of jsonPatterns) {
      const match = input.match(pattern);
      if (match) {
        try {
          const parsed = JSON.parse(match[1].trim());
          return { found: true, data: parsed };
        } catch { continue; }
      }
    }
    // Try direct JSON parsing
    const jsonMatch = input.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return { found: true, data: parsed };
      } catch { /* not valid JSON */ }
    }
    return { found: false, data: null };
  }

  /**
   * Parse workflow definition from natural language
   */
  parseWorkflowFromChat(input: string): {
    name: string;
    description: string;
    steps: Array<{ name: string; type: string; config: any }>;
    rules: Array<{ name: string; weight: number; type: string }>;
    dataSource: string;
    outputFormat: string;
  } {
    const lang = this.detectLanguage(input);
    const lines = input.split('\n').map(l => l.trim()).filter(Boolean);

    let name = '';
    let description = '';
    const steps: Array<{ name: string; type: string; config: any }> = [];
    const rules: Array<{ name: string; weight: number; type: string }> = [];
    let dataSource = 'extension';
    let outputFormat = 'csv';

    for (const line of lines) {
      // Name extraction
      const nameMatch = line.match(/(?:name|اسم|عنوان)\s*[:=]\s*(.+)/i);
      if (nameMatch) { name = nameMatch[1].trim(); continue; }

      // Description extraction
      const descMatch = line.match(/(?:description|desc|وصف)\s*[:=]\s*(.+)/i);
      if (descMatch) { description = descMatch[1].trim(); continue; }

      // Steps extraction
      const stepMatch = line.match(/(?:step|خطوة)\s*\d*\s*[:=]?\s*(.+)/i) ||
        line.match(/^\d+[.)]\s*(.+)/);
      if (stepMatch) {
        const stepText = stepMatch[1].trim().toLowerCase();
        let type = 'transform';
        if (/fetch|get|جلب|استيراد/.test(stepText)) type = 'fetch_data';
        else if (/ai|grade|تقييم|ذكاء/.test(stepText)) type = 'process_ai';
        else if (/rule|قاعد/.test(stepText)) type = 'apply_rules';
        else if (/export|تصدير/.test(stepText)) type = 'export';
        steps.push({ name: stepMatch[1].trim(), type, config: {} });
        continue;
      }

      // Rules extraction
      const ruleMatch = line.match(/(?:rule|criteria|قاعدة|معيار)\s*[:=]?\s*(.+?)(?:\s*[-:,]\s*(\d+)%?)?$/i);
      if (ruleMatch) {
        rules.push({
          name: ruleMatch[1].trim(),
          weight: ruleMatch[2] ? parseInt(ruleMatch[2]) : 20,
          type: 'keyword',
        });
        continue;
      }

      // Data source
      const sourceMatch = line.match(/(?:source|data|مصدر|بيانات)\s*[:=]\s*(csv|json|moodle|extension)/i);
      if (sourceMatch) { dataSource = sourceMatch[1].toLowerCase(); continue; }

      // Output format
      const outputMatch = line.match(/(?:output|format|المخرج|صيغة)\s*[:=]\s*(csv|json|pdf|html)/i);
      if (outputMatch) { outputFormat = outputMatch[1].toLowerCase(); continue; }
    }

    // Auto-generate steps if none provided
    if (steps.length === 0) {
      steps.push(
        { name: 'Fetch Data', type: 'fetch_data', config: {} },
        { name: 'Apply Rules', type: 'apply_rules', config: {} },
        { name: 'AI Processing', type: 'process_ai', config: {} },
        { name: 'Transform Results', type: 'transform', config: {} },
        { name: 'Export Results', type: 'export', config: { format: outputFormat } }
      );
    }

    return { name, description, steps, rules, dataSource, outputFormat };
  }

  /**
   * Generate help text based on language
   */
  getHelpText(lang: 'en' | 'ar'): string {
    if (lang === 'ar') {
      return `🤖 **مساعد AutoGrader الذكي - التحكم الكامل بالنظام**

📋 **أوامر Workflow:**
- \`انشئ workflow اسم: تقييم المقالات | وصف: تقييم مقالات الطلاب\`
- \`شغل workflow 1\`
- \`اعرض كل workflows\`
- \`عدل workflow رقم: 2 | وصف: وصف جديد\`

📊 **إدخال البيانات:**
- \`استيراد csv\` (ثم الصق البيانات أو ارفق الملف)
- \`إدخال json\` (ثم الصق البيانات)
- \`تصدير النتائج كـ csv\`
- يمكنك لصق بيانات CSV أو JSON مباشرة في المحادثة

📏 **إدارة القواعد:**
- \`اضف قاعدة اسم: دقة المحتوى | وزن: 30 | نوع: keyword\`
- \`اعرض القواعد\`
- \`عدل القاعدة | وزن: 40\`

🔍 **استعلام وتحليل:**
- \`حلل البيانات\` / \`حلل الطالب أحمد\`
- \`ابحث عن طلاب حيث الدرجة أقل من 60\`
- \`كم عدد الطلاب\`

👨‍🎓 **أوامر الطلاب:**
- \`تقييم جماعي أول 10\`
- \`حلل الطالب رقم 5\`
- \`انشئ rubric لـ مقالات اللغة الإنجليزية\`

⚙️ **النظام:**
- \`حالة النظام\` / \`مساعدة\`
- \`وصف: وصف المهمة الجديدة\`

💡 **نصائح:**
- يمكنك كتابة أكثر من أمر مفصولين بـ "ثم" أو ";"
- يمكنك لصق بيانات CSV/JSON مباشرة وسأتعرف عليها تلقائياً
- جميع الأوامر تعمل بالعربية والإنجليزية`;
    }

    return `🤖 **AutoGrader AI Assistant - Full System Control**

📋 **Workflow Commands:**
- \`create workflow name: Essay Grading | description: Grade student essays\`
- \`run workflow 1\`
- \`list all workflows\`
- \`edit workflow id: 2 | description: new description\`

📊 **Data Import/Export:**
- \`import csv\` (then paste data or attach file)
- \`import json\` (then paste data)
- \`export results as csv\`
- You can paste CSV or JSON data directly into the chat

📏 **Rules Management:**
- \`add rule name: Content Accuracy | weight: 30 | type: keyword\`
- \`list rules\`
- \`edit rule | weight: 40\`

🔍 **Query & Analysis:**
- \`analyze data\` / \`analyze student Ahmed\`
- \`find students where grade less than 60\`
- \`how many students\`

👨‍🎓 **Student Commands:**
- \`batch grade top 10\`
- \`analyze student id 5\`
- \`generate rubric for English essays\`

⚙️ **System:**
- \`system status\` / \`help\`
- \`set description to: new task description\`

💡 **Tips:**
- Chain multiple commands with "then" or ";"
- Paste CSV/JSON data directly and it will be auto-detected
- All commands work in both English and Arabic`;
  }

  /**
   * Set context for contextual command processing
   */
  setContext(key: string, value: any): void {
    this.context[key] = value;
  }

  /**
   * Get context value
   */
  getContext(key: string): any {
    return this.context[key];
  }

  /**
   * Get command history
   */
  getHistory(): AICommand[] {
    return [...this.commandHistory];
  }

  /**
   * Clear command history
   */
  clearHistory(): void {
    this.commandHistory = [];
  }
}
