import type { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';
import { requireAuthWithRole, type AuthenticatedRequest } from '@/lib/api/auth-middleware';
import { rateLimit, RATE_LIMITS } from '@/lib/api/rate-limiter';
import { withSecurityHeaders } from '@/lib/api/security-headers';
import { logAiRequest } from '@/lib/api/audit-logger';

type ChatRole = 'system' | 'user' | 'assistant';
type ChatMessage = { role: ChatRole; content: string };

type ChatRequest = {
  model?: string;
  messages?: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'text' | 'json_object' };
};

const DEFAULT_MODEL = 'qwen/qwen3-32b';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Apply rate limiting for AI requests
  const rateLimiter = rateLimit(RATE_LIMITS.AI);
  const allowed = await rateLimiter(req, res);
  if (!allowed) return;

  // Require authentication and instructor/admin role
  const authorized = await requireAuthWithRole(req, res, ['instructor', 'admin']);
  if (!authorized) return;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'Missing Groq API key' });
  }

  const body = (req.body || {}) as ChatRequest;
  const model = typeof body.model === 'string' && body.model.trim() ? body.model : DEFAULT_MODEL;
  const messages = Array.isArray(body.messages)
    ? body.messages
        .filter(
          (m): m is ChatMessage =>
            (m?.role === 'system' || m?.role === 'user' || m?.role === 'assistant') &&
            typeof m?.content === 'string' &&
            m.content.trim().length > 0
        )
        .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }))
        .slice(-20)
    : [];

  if (!messages.length) {
    return res.status(400).json({ success: false, error: 'At least one message is required' });
  }

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model,
      messages,
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.2,
      max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : 700,
      response_format: body.response_format
    });

    const content = completion.choices?.[0]?.message?.content || '';
    
    logAiRequest(req, model, true, {
      messageCount: messages.length,
      responseLength: content.length
    });

    return res.status(200).json({
      success: true,
      model,
      content,
      choices: completion.choices
    });
  } catch (error: any) {
    const message = error?.message || 'Groq request failed';
    const status = typeof error?.status === 'number' ? error.status : 500;
    
    logAiRequest(req, model, false, { error: message });
    
    return res.status(status).json({
      success: false,
      error: message
    });
  }
}

export default withSecurityHeaders(handler);
