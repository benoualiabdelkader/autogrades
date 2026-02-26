import type { NextApiRequest, NextApiResponse } from 'next';
import { policyChecker } from '@/lib/scraper/policyChecker';
import { rateLimiter } from '@/lib/scraper/rateLimiter';

interface CheckPolicyRequest {
  url: string;
  respectRobots?: boolean;
}

interface CheckPolicyResponse {
  success: boolean;
  allowed: boolean;
  reason?: string;
  warnings: string[];
  robotsInfo?: {
    allowed: boolean;
    crawlDelay: number;
    disallowedPaths: string[];
  };
  rateLimitInfo?: {
    remaining: number;
    waitTime: number;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CheckPolicyResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      allowed: false,
      warnings: [],
      error: 'Method not allowed',
    });
  }

  const { url, respectRobots = true } = req.body as CheckPolicyRequest;

  if (!url) {
    return res.status(400).json({
      success: false,
      allowed: false,
      warnings: [],
      error: 'URL is required',
    });
  }

  try {
    const policyResult = await policyChecker.checkPolicy(url, respectRobots);

    return res.status(200).json({
      success: true,
      ...policyResult,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      allowed: false,
      warnings: [],
      error: error.message || 'Failed to check policy',
    });
  }
}
