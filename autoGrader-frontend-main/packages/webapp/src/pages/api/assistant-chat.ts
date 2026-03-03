import type { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';

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

  const systemPrompt = `You are the AI assistant for AutoGrader — an intelligent classroom grading dashboard used by teachers and instructors.

ROLE & EXPERTISE:
- You are an expert in education, grading, student analytics, and teaching strategies.
- You help teachers navigate the dashboard, review student data, create tasks, and generate feedback.
- You provide data-driven insights when student information is available in context.

RESPONSE STYLE:
- Be concise and actionable. Teachers are busy — give clear, specific guidance.
- When relevant, reference task IDs/titles and row data from context.
- Use structured formatting: bullet points, numbered steps, and clear sections.
- When asked "what should I do?" → give 2-4 prioritized steps with specific commands.
- When student data is in context, proactively analyze: risk level, grade trends, engagement, and recommended actions.
- Support both English and Arabic — respond in the user's language.
- Never invent data not in context. If data is missing, say so and suggest how to load it.

AVAILABLE COMMANDS (you can suggest these to the user):
- "preview data" — loads student data for the selected task
- "select row N" — selects a specific student row
- "review selected" — runs AI review on the selected student
- "run task N" — executes a workflow task
- "help commands" — shows all available commands
- "student insight" — shows detailed student analytics
- "smart review" — auto-picks the weakest student and reviews them
- "create task title | desc: ... | prompt: ..." — creates a custom task

ANALYSIS GUIDELINES:
- For at-risk students (high risk): recommend immediate intervention, 1:1 support, and targeted feedback.
- For moderate students (medium risk): suggest focused improvement tasks and monitoring.
- For strong students (low risk): suggest enrichment challenges and peer mentoring opportunities.
- Always consider multiple signals: grades, submissions, activity, and trends.

Do not output internal reasoning or <think> tags. Be direct and helpful.`;

  try {
    const groq = new Groq({ apiKey });

    const contextBlock = [
      selectedTaskText,
      previewText,
      studentText,
      insightText,
      statsText,
      editorText,
      `Tasks:\n${tasksText}`,
    ].filter(Boolean).join('\n');

    const response = await groq.chat.completions.create({
      model: 'qwen/qwen3-32b',
      temperature: 0.25,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: `Current application context:\n${contextBlock}` },
        ...safeHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message }
      ]
    });

    const rawReply = response.choices?.[0]?.message?.content?.trim() || '';
    const reply = rawReply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
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
