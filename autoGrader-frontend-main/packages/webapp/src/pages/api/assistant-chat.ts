import type { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';
import { PrivacyShield } from '@/lib/protection/PrivacyShield';

type AssistantRole = 'user' | 'assistant';

type AssistantMessage = {
  role: AssistantRole;
  content: string;
};

type AssistantContext = {
  selectedTask?: { id: number; title: string } | null;
  tasks?: Array<{ id: number; title: string; description: string; ready: boolean }>;
  previewCount?: number;
  previewError?: string;
  selectedStudentName?: string;
  selectedRowExcerpt?: string;
  riskLevel?: string;
  hasDraft?: boolean;
  reviewPrompt?: string;
  stats?: { totalStudents?: number; totalCourses?: number; averageGrade?: number; activeSessions?: number } | null;
  studentInsight?: {
    riskScore?: number;
    inactivityDays?: number;
    averageGrade?: number;
    submissionsCount?: number;
    notes?: string[];
  } | null;
};

type ChatRequest = {
  message?: string;
  history?: AssistantMessage[];
  context?: AssistantContext;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'Missing Groq API key' });
  }

  const body = (req.body || {}) as ChatRequest;
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!message) {
    return res.status(400).json({ success: false, error: 'Missing message' });
  }

  const safeHistory: AssistantMessage[] = Array.isArray(body.history)
    ? body.history
        .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
        .map((m) => ({ role: m.role, content: m.content.slice(0, 3000) }))
        .slice(-12)
    : [];

  const context = body.context || {};
  const tasksText = Array.isArray(context.tasks)
    ? context.tasks
        .slice(0, 20)
        .map((t) => `${t.id}. ${t.title} — ${t.description} [${t.ready ? '✅ ready' : '⚠️ needs workflow'}]`)
        .join('\n')
    : 'No task metadata provided.';

  const selectedTaskText = context.selectedTask
    ? `Selected task: #${context.selectedTask.id} - ${context.selectedTask.title}`
    : 'No selected task.';

  const previewText = `Preview rows loaded: ${Number(context.previewCount || 0)}. ${context.previewError ? `Preview error: ${context.previewError}` : ''}`;

  const studentText = `Selected student: ${context.selectedStudentName || 'none'}.
Risk level: ${context.riskLevel || 'unknown'}.
Row excerpt: ${context.selectedRowExcerpt || 'none'}.`;

  const insightText = context.studentInsight
    ? `Student insight: Risk score ${context.studentInsight.riskScore ?? '?'}/7, Avg grade ${context.studentInsight.averageGrade ?? '?'}%, Submissions ${context.studentInsight.submissionsCount ?? '?'}, Inactive ${context.studentInsight.inactivityDays ?? '?'} days. Notes: ${(context.studentInsight.notes || []).join(' | ')}`
    : '';

  const statsText = context.stats
    ? `Class stats: ${context.stats.totalStudents || 0} students, ${context.stats.totalCourses || 0} courses, avg grade ${context.stats.averageGrade || 0}%, ${context.stats.activeSessions || 0} active sessions.`
    : '';

  const editorText = `Feedback draft: ${context.hasDraft ? 'has content' : 'empty'}. Review prompt: ${
    context.reviewPrompt || 'default'
  }`;

  const systemPrompt = `You are the AI Assistant for AutoGrader — an intelligent classroom grading and analytics dashboard designed for university instructors and teachers.

IDENTITY & ROLE:
- You are "AutoGrader AI" — a powerful teaching assistant with full system control.
- You help instructors manage workflows, grade assignments, analyze student data, and generate reports.
- You understand both English and Arabic — ALWAYS respond in the language the user writes in.
- You are proactive: suggest next steps, identify at-risk students, and recommend optimizations.

SYSTEM CAPABILITIES YOU CONTROL:
The instructor can ask you to do ANY of the following. When they request these, generate the appropriate command suggestion:

📋 WORKFLOW MANAGEMENT:
- "create workflow [name] with rules: [rule1] 30%, [rule2] 40%, [rule3] 30%" → Creates a new grading workflow
- "delete workflow [id]" | "run workflow [id]" | "list workflows" | "edit workflow [id]"
- "set description: [text]" → Sets task description
- "أنشئ workflow جديد" | "شغل workflow" | "احذف workflow"

📏 GRADING RULES:
- "add rule name: Grammar | weight: 25 | type: keyword" → Adds a grading rule
- "list rules" | "edit rule [name] weight: 30" | "delete rule [name]"
- "اضف قاعدة" | "عرض القواعد" | "عدل قاعدة"
- Rules control how student answers are evaluated (keyword matching, comprehension, structure, etc.)

📊 DATA & ANALYTICS:
- "import csv" | "import json" → Import data via file upload or paste
- "analyze data" → Full statistical analysis (mean, median, std dev, grade distribution)
- "export csv" | "export json" → Export data
- "class summary" | "grade report" | "search: [query]"
- "استورد CSV" | "حلل البيانات" | "تصدير"

👨‍🎓 STUDENT MANAGEMENT:
- "select student [name/id]" | "analyze student" | "student insight"
- "batch review all" | "batch review top 5" | "review selected"
- "smart review" → Auto-picks weakest student and reviews them
- "حلل الطالب" | "مراجعة جماعية"

🔄 TASK MANAGEMENT:
- "create task title: X | description: Y | prompt: Z"
- "list tasks" | "open task [id]" | "run task [id]"
- "preview data" | "refresh all" | "status"

🛡️ PRIVACY:
- All personal student data (names, emails, IDs) is automatically encrypted before reaching this AI.
- Only academic data (grades, answers, submissions) is analyzed.
- The system uses PrivacyShield tokenization to protect student privacy.

RESPONSE GUIDELINES:
1. Be concise, actionable, and structured. Use bullet points and numbered steps.
2. When student data is in context, proactively analyze: risk level, grade trends, engagement patterns.
3. For at-risk students: recommend immediate intervention with specific actions.
4. For workflow creation requests: Ask for rules and weights if not provided.
5. Always suggest 1-2 follow-up commands the instructor might want to use next.
6. Never invent data not in context. If data is missing, tell them how to load it.
7. Use markdown formatting: **bold** for emphasis, \`code\` for commands, bullet lists for structure.

ANALYSIS DEPTH:
- When given student data, provide: performance trend, strengths/weaknesses, risk assessment, personalized recommendation.
- When asked for class summary, provide: distribution analysis, outliers, pass/fail rates, top/bottom performers.
- When asked about grades, compute: mean, median, standard deviation, and visual distribution description.

Do not output internal reasoning, <think> tags, or meta-commentary. Be direct, helpful, and professional.`;

  try {
    const groq = new Groq({ apiKey });

    // ═══ PRIVACY SHIELD: Protect student data in context ═══
    const shield = new PrivacyShield({ autoDetectPII: true, strictMode: false });
    const contextData = {
      selectedStudentName: context.selectedStudentName,
      selectedRowExcerpt: context.selectedRowExcerpt,
    };
    const protection = shield.protect(contextData);
    const safeContext = protection.sanitizedData;

    const contextBlock = [
      selectedTaskText,
      previewText,
      // Use tokenized student data
      `Selected student: ${safeContext.selectedStudentName || 'none'}.\nRisk level: ${context.riskLevel || 'unknown'}.\nRow excerpt: ${safeContext.selectedRowExcerpt || 'none'}.`,
      insightText,
      statsText,
      editorText,
      `Tasks:\n${tasksText}`,
    ].filter(Boolean).join('\n');

    // Also protect the user message
    const messageProtection = shield.protect({ text: message });
    const safeMessage = messageProtection.sanitizedData.text || message;

    const response = await groq.chat.completions.create({
      model: 'qwen/qwen3-32b',
      temperature: 0.25,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: `Current application context:\n${contextBlock}` },
        ...safeHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: safeMessage }
      ]
    });

    const rawReply = response.choices?.[0]?.message?.content?.trim() || '';
    // Restore personal data tokens in the AI response
    const restoredReply = protection.restore(messageProtection.restore(rawReply));
    const reply = restoredReply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    if (!reply) {
      return res.status(502).json({ success: false, error: 'Empty model response' });
    }

    return res.status(200).json({
      success: true,
      reply,
      model: 'qwen/qwen3-32b'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Assistant request failed'
    });
  }
}
