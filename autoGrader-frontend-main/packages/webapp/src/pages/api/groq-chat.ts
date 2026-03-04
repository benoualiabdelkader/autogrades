import type { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';
import { requireAuthWithRole, type AuthenticatedRequest } from '@/lib/api/auth-middleware';
import { rateLimit, RATE_LIMITS } from '@/lib/api/rate-limiter';
import { withSecurityHeaders } from '@/lib/api/security-headers';
import { logAiRequest } from '@/lib/api/audit-logger';
import { PrivacyShield } from '@/lib/protection/PrivacyShield';

type ChatRole = 'system' | 'user' | 'assistant';
type ChatMessage = { role: ChatRole; content: string };

type ChatRequest = {
  model?: string;
  messages?: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'text' | 'json_object' };
};

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const GRADING_MODEL = 'llama-3.3-70b-versatile';

// Smart max_tokens based on request context
function getMaxTokens(body: ChatRequest): number {
  // If explicitly set, respect it (but cap at 4000)
  if (typeof body.max_tokens === 'number') {
    return Math.min(body.max_tokens, 4000);
  }
  
  // Detect grading/analysis requests for higher token limits
  const systemMsg = body.messages?.find(m => m?.role === 'system')?.content || '';
  const userMsg = body.messages?.find(m => m?.role === 'user')?.content || '';
  const combined = `${systemMsg} ${userMsg}`.toLowerCase();
  
  if (combined.includes('json') || combined.includes('تقييم') || combined.includes('تحليل') || combined.includes('grade') || combined.includes('rubric')) {
    return 2000; // Grading/analysis needs detailed output
  }
  if (combined.includes('rule') || combined.includes('قاعدة') || combined.includes('تصحيح')) {
    return 1800;
  }
  return 1200; // Better default than 700
}

// Smart model selection based on task
function getModel(body: ChatRequest): string {
  if (typeof body.model === 'string' && body.model.trim()) {
    return body.model;
  }
  
  const systemMsg = body.messages?.find(m => m?.role === 'system')?.content || '';
  const combined = systemMsg.toLowerCase();
  
  // Use the powerful model for grading tasks
  if (combined.includes('تقييم') || combined.includes('grade') || combined.includes('تحليل') || combined.includes('تصحيح')) {
    return GRADING_MODEL;
  }
  return DEFAULT_MODEL;
}

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
  const model = getModel(body);
  const messages = Array.isArray(body.messages)
    ? body.messages
        .filter(
          (m): m is ChatMessage =>
            (m?.role === 'system' || m?.role === 'user' || m?.role === 'assistant') &&
            typeof m?.content === 'string' &&
            m.content.trim().length > 0
        )
        .map((m) => ({ role: m.role, content: m.content.slice(0, 12000) }))
        .slice(-30)
    : [];

  if (!messages.length) {
    return res.status(400).json({ success: false, error: 'At least one message is required' });
  }

  try {
    // ═══ PRIVACY SHIELD: Protect personal data in messages ═══
    const shield = new PrivacyShield({ autoDetectPII: true, strictMode: false });
    const protectedMessages = messages.map(m => {
      if (m.role === 'system') return m; // System prompts are our own — safe
      const protection = shield.protect({ content: m.content });
      return { ...m, content: protection.sanitizedData.content || m.content };
    });

    const groq = new Groq({ apiKey });
    const maxTokens = getMaxTokens(body);
    const completion = await groq.chat.completions.create({
      model,
      messages: protectedMessages,
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.15,
      max_tokens: maxTokens,
      response_format: body.response_format
    });

    let content = completion.choices?.[0]?.message?.content || '';

    // ═══ PRIVACY SHIELD: Restore personal data in response ═══
    // Re-create protection to get the same token map
    const fullProtection = shield.protect({ text: messages.map(m => m.content).join('\n') });
    content = fullProtection.restore(content);
    
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
