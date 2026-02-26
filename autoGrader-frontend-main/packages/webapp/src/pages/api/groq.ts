import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Do not expose provider secrets to browsers.
  return res.status(410).json({
    error: 'This endpoint is disabled for security.',
    message: 'Use server-side AI routes (e.g. /api/groq-chat or /api/assistant-chat).'
  });
}
