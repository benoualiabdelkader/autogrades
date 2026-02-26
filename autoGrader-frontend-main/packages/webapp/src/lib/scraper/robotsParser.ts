/**
 * Robots.txt Parser
 * Parses and validates robots.txt rules
 */

interface RobotsRule {
  userAgent: string;
  disallow: string[];
  allow: string[];
  crawlDelay?: number;
}

export class RobotsParser {
  private rules: RobotsRule[] = [];
  private sitemaps: string[] = [];

  /**
   * Fetch and parse robots.txt
   */
  async fetch(baseUrl: string): Promise<void> {
    try {
      const robotsUrl = new URL('/robots.txt', baseUrl).toString();
      const response = await fetch(robotsUrl);
      
      if (!response.ok) {
        // If robots.txt doesn't exist, allow all
        return;
      }

      const content = await response.text();
      this.parse(content);
    } catch (error) {
      console.warn('Failed to fetch robots.txt:', error);
      // If fetch fails, allow all (fail open)
    }
  }

  /**
   * Parse robots.txt content
   */
  private parse(content: string): void {
    const lines = content.split('\n');
    let currentRule: RobotsRule | null = null;

    for (let line of lines) {
      line = line.trim();
      
      // Skip comments and empty lines
      if (!line || line.startsWith('#')) continue;

      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      if (!key || !value) continue;

      const lowerKey = key.toLowerCase();

      if (lowerKey === 'user-agent') {
        // Start new rule
        if (currentRule) {
          this.rules.push(currentRule);
        }
        currentRule = {
          userAgent: value,
          disallow: [],
          allow: [],
        };
      } else if (currentRule) {
        if (lowerKey === 'disallow') {
          currentRule.disallow.push(value);
        } else if (lowerKey === 'allow') {
          currentRule.allow.push(value);
        } else if (lowerKey === 'crawl-delay') {
          currentRule.crawlDelay = parseFloat(value);
        }
      } else if (lowerKey === 'sitemap') {
        this.sitemaps.push(value);
      }
    }

    // Add last rule
    if (currentRule) {
      this.rules.push(currentRule);
    }
  }

  /**
   * Check if URL is allowed to be scraped
   */
  isAllowed(url: string, userAgent: string = '*'): boolean {
    const urlPath = new URL(url).pathname;

    // Find matching rules (specific user-agent or *)
    const matchingRules = this.rules.filter(
      rule => rule.userAgent === userAgent || rule.userAgent === '*'
    );

    if (matchingRules.length === 0) {
      return true; // No rules = allowed
    }

    // Check rules in order
    for (const rule of matchingRules) {
      // Check allow rules first
      for (const allowPath of rule.allow) {
        if (this.matchPath(urlPath, allowPath)) {
          return true;
        }
      }

      // Then check disallow rules
      for (const disallowPath of rule.disallow) {
        if (this.matchPath(urlPath, disallowPath)) {
          return false;
        }
      }
    }

    return true; // Default allow
  }

  /**
   * Get crawl delay for user agent
   */
  getCrawlDelay(userAgent: string = '*'): number {
    const rule = this.rules.find(
      r => r.userAgent === userAgent || r.userAgent === '*'
    );
    return rule?.crawlDelay || 0;
  }

  /**
   * Get sitemaps
   */
  getSitemaps(): string[] {
    return this.sitemaps;
  }

  /**
   * Match URL path against robots.txt pattern
   */
  private matchPath(urlPath: string, pattern: string): boolean {
    if (pattern === '/') {
      return true;
    }

    // Convert robots.txt pattern to regex
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
      .replace(/\*/g, '.*'); // * matches anything

    const regex = new RegExp('^' + regexPattern);
    return regex.test(urlPath);
  }

  /**
   * Get summary of rules
   */
  getSummary(): {
    totalRules: number;
    disallowedPaths: string[];
    crawlDelay: number;
    hasSitemaps: boolean;
  } {
    const allDisallowed = this.rules.flatMap(r => r.disallow);
    const maxCrawlDelay = Math.max(...this.rules.map(r => r.crawlDelay || 0));

    return {
      totalRules: this.rules.length,
      disallowedPaths: [...new Set(allDisallowed)],
      crawlDelay: maxCrawlDelay,
      hasSitemaps: this.sitemaps.length > 0,
    };
  }
}
