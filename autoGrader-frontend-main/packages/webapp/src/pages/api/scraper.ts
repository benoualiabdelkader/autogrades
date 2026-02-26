import type { NextApiRequest, NextApiResponse } from 'next';
import { policyChecker } from '@/lib/scraper/policyChecker';
import { rateLimiter } from '@/lib/scraper/rateLimiter';

interface ScrapeRequest {
  url: string;
  selector?: string;
  type: 'basic' | 'advanced' | 'screenshot';
  respectRobots?: boolean;
  options?: {
    waitForSelector?: string;
    timeout?: number;
    userAgent?: string;
    viewport?: { width: number; height: number };
    javascript?: boolean;
  };
}

interface ScrapeResponse {
  success: boolean;
  data?: any;
  error?: string;
  policyInfo?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ScrapeResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { url, selector, type, respectRobots = true, options = {} } = req.body as ScrapeRequest;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  try {
    // 1. Check policy compliance
    const policyResult = await policyChecker.checkPolicy(url, respectRobots);
    
    if (!policyResult.allowed) {
      return res.status(403).json({
        success: false,
        error: policyResult.reason || 'غير مسموح بالاستخراج من هذا الموقع',
        policyInfo: policyResult,
      });
    }

    // 2. Wait for rate limit slot
    await rateLimiter.waitForSlot(url, policyResult.robotsInfo?.crawlDelay || 1000);

    // 3. Set user agent
    const userAgent = options.userAgent || policyChecker.getUserAgent();
    // Import playwright dynamically
    const { chromium } = await import('playwright');
    
    // Launch browser
    const browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      userAgent: userAgent,
      viewport: options.viewport || { width: 1920, height: 1080 },
      javaScriptEnabled: options.javascript !== false,
    });

    const page = await context.newPage();

    // Navigate to URL
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: options.timeout || 30000,
    });

    // Wait for specific selector if provided
    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, {
        timeout: options.timeout || 30000,
      });
    }

    let scrapedData: any = {};

    if (type === 'screenshot') {
      // Take screenshot
      const screenshot = await page.screenshot({
        fullPage: true,
        type: 'png',
      });
      scrapedData.screenshot = `data:image/png;base64,${screenshot.toString('base64')}`;
    } else if (type === 'basic') {
      // Basic scraping
      scrapedData = await page.evaluate(() => {
        return {
          title: document.title,
          content: document.body.innerText.substring(0, 5000),
          links: Array.from(document.querySelectorAll('a'))
            .map(a => a.href)
            .filter(href => href.startsWith('http')),
          images: Array.from(document.querySelectorAll('img'))
            .map(img => img.src)
            .filter(src => src.startsWith('http')),
          metadata: {
            description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
            keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content'),
            author: document.querySelector('meta[name="author"]')?.getAttribute('content'),
          },
        };
      });
    } else if (type === 'advanced') {
      // Advanced scraping with selector
      if (selector) {
        const elements = await page.$$(selector);
        const extractedData = [];

        for (const element of elements) {
          const text = await element.textContent();
          const html = await element.innerHTML();
          extractedData.push({ text, html });
        }

        scrapedData = {
          title: await page.title(),
          selector,
          elements: extractedData,
          count: extractedData.length,
        };
      } else {
        // If no selector, do basic scraping
        scrapedData = await page.evaluate(() => {
          return {
            title: document.title,
            content: document.body.innerText.substring(0, 5000),
            headings: Array.from(document.querySelectorAll('h1, h2, h3'))
              .map(h => ({ tag: h.tagName, text: h.textContent })),
            links: Array.from(document.querySelectorAll('a'))
              .map(a => a.href)
              .filter(href => href.startsWith('http')),
          };
        });
      }
    }

    await browser.close();

    return res.status(200).json({
      success: true,
      data: scrapedData,
    });
  } catch (error: any) {
    console.error('Scraping error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to scrape website',
    });
  }
}

// Increase API timeout for scraping operations
export const config = {
  api: {
    responseLimit: '10mb',
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
