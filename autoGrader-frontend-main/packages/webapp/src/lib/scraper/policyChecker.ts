/**
 * Policy Checker
 * Comprehensive policy validation before scraping
 */

import { RobotsParser } from './robotsParser';
import { rateLimiter } from './rateLimiter';

export interface PolicyCheckResult {
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
}

export class PolicyChecker {
  private robotsCache: Map<string, RobotsParser> = new Map();
  private userAgent: string = 'AutoGrader-Bot/1.0 (Educational Purpose; +https://github.com/autograder)';

  /**
   * Comprehensive policy check
   */
  async checkPolicy(url: string, respectRobots: boolean = true): Promise<PolicyCheckResult> {
    const result: PolicyCheckResult = {
      allowed: true,
      warnings: [],
    };

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      // 1. Check URL validity
      if (!this.isValidUrl(url)) {
        return {
          allowed: false,
          reason: 'رابط غير صالح',
          warnings: [],
        };
      }

      // 2. Check blacklisted domains
      if (this.isBlacklisted(domain)) {
        return {
          allowed: false,
          reason: 'هذا الموقع محظور من الاستخراج',
          warnings: [],
        };
      }

      // 3. Check robots.txt
      if (respectRobots) {
        const robotsParser = await this.getRobotsParser(url);
        const robotsAllowed = robotsParser.isAllowed(url, this.userAgent);
        const crawlDelay = robotsParser.getCrawlDelay(this.userAgent);
        const summary = robotsParser.getSummary();

        result.robotsInfo = {
          allowed: robotsAllowed,
          crawlDelay: crawlDelay * 1000, // Convert to ms
          disallowedPaths: summary.disallowedPaths,
        };

        if (!robotsAllowed) {
          return {
            allowed: false,
            reason: 'محظور بواسطة robots.txt',
            warnings: result.warnings,
            robotsInfo: result.robotsInfo,
          };
        }

        if (crawlDelay > 0) {
          result.warnings.push(`يجب الانتظار ${crawlDelay} ثانية بين الطلبات`);
        }
      }

      // 4. Check rate limiting
      const remaining = rateLimiter.getRemainingRequests(url);
      const waitTime = rateLimiter.getTimeUntilNextSlot(url);

      result.rateLimitInfo = {
        remaining,
        waitTime,
      };

      if (remaining === 0) {
        return {
          allowed: false,
          reason: 'تم تجاوز حد الطلبات. الرجاء الانتظار',
          warnings: result.warnings,
          rateLimitInfo: result.rateLimitInfo,
        };
      }

      if (waitTime > 0) {
        result.warnings.push(`يجب الانتظار ${Math.ceil(waitTime / 1000)} ثانية`);
      }

      // 5. Check for sensitive content indicators
      const sensitiveWarnings = this.checkSensitiveContent(url);
      result.warnings.push(...sensitiveWarnings);

      return result;
    } catch (error: any) {
      return {
        allowed: false,
        reason: `خطأ في التحقق من السياسة: ${error.message}`,
        warnings: [],
      };
    }
  }

  /**
   * Get or fetch robots.txt parser
   */
  private async getRobotsParser(url: string): Promise<RobotsParser> {
    const domain = new URL(url).hostname;
    
    if (this.robotsCache.has(domain)) {
      return this.robotsCache.get(domain)!;
    }

    const parser = new RobotsParser();
    await parser.fetch(url);
    this.robotsCache.set(domain, parser);
    
    return parser;
  }

  /**
   * Validate URL
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Check if domain is blacklisted
   */
  private isBlacklisted(domain: string): boolean {
    const blacklist = [
      // Add domains that should never be scraped
      'facebook.com',
      'twitter.com',
      'instagram.com',
      'linkedin.com',
      'banking',
      'paypal.com',
      'login',
      'signin',
      'admin',
    ];

    return blacklist.some(blocked => domain.includes(blocked));
  }

  /**
   * Check for sensitive content indicators
   */
  private checkSensitiveContent(url: string): string[] {
    const warnings: string[] = [];
    const urlLower = url.toLowerCase();

    const sensitiveKeywords = [
      { keyword: 'login', warning: 'تحذير: صفحة تسجيل دخول' },
      { keyword: 'signin', warning: 'تحذير: صفحة تسجيل دخول' },
      { keyword: 'admin', warning: 'تحذير: صفحة إدارية' },
      { keyword: 'password', warning: 'تحذير: صفحة كلمة مرور' },
      { keyword: 'payment', warning: 'تحذير: صفحة دفع' },
      { keyword: 'checkout', warning: 'تحذير: صفحة دفع' },
      { keyword: 'private', warning: 'تحذير: محتوى خاص' },
    ];

    for (const { keyword, warning } of sensitiveKeywords) {
      if (urlLower.includes(keyword)) {
        warnings.push(warning);
      }
    }

    return warnings;
  }

  /**
   * Get user agent
   */
  getUserAgent(): string {
    return this.userAgent;
  }

  /**
   * Set custom user agent
   */
  setUserAgent(userAgent: string): void {
    this.userAgent = userAgent;
  }

  /**
   * Clear robots cache
   */
  clearCache(): void {
    this.robotsCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    cachedDomains: number;
    domains: string[];
  } {
    return {
      cachedDomains: this.robotsCache.size,
      domains: Array.from(this.robotsCache.keys()),
    };
  }
}

// Singleton instance
export const policyChecker = new PolicyChecker();
