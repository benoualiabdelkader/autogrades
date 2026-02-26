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
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
        .slice(-8)
    : [];

  const context = body.context || {};
  const tasksText = Array.isArray(context.tasks)
    ? context.tasks
        .slice(0, 20)
        .map((t) => `${t.id}. ${t.title} [${t.ready ? 'ready' : 'missing workflow'}]`)
        .join('\n')
    : 'No task metadata provided.';

  const selectedTaskText = context.selectedTask
    ? `Selected task: ${context.selectedTask.id} - ${context.selectedTask.title}`
    : 'No selected task.';

  const previewText = `Preview rows: ${Number(context.previewCount || 0)}. Preview error: ${
    context.previewError || 'none'
  }`;
  const studentText = `Selected student: ${context.selectedStudentName || 'none'}. Risk level: ${
    context.riskLevel || 'unknown'
  }. Row excerpt: ${context.selectedRowExcerpt || 'none'}`;
  const editorText = `Feedback draft: ${context.hasDraft ? 'present' : 'empty'}. Review prompt: ${
    context.reviewPrompt || 'not set'
  }`;

  const systemPrompt = `You are the AI assistant for an AutoGrader workflow dashboard used by instructors.
Be very helpful, accurate, and practical.
When relevant, give clear next actions tied to the available tasks and database preview.
Prefer short, operational answers with concrete commands the user can type in chat.
When a user asks "what should I do" or similar, give 2-4 prioritized steps.
If a user asks for execution guidance, reference task IDs/titles from context.
Do not invent data that is not in context.
Do not output hidden reasoning or internal thoughts.
Do not include tags like <think>...</think>.`;

  try {
    const groq = new Groq({ apiKey });

    const response = await groq.chat.completions.create({
      model: 'qwen/qwen3-32b',
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'system',
          content: `Application context:\n${selectedTaskText}\n${previewText}\n${studentText}\n${editorText}\nTasks:\n${tasksText}`
        },
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
