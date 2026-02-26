/**
 * Rate Limiter
 * Manages request rate limiting per domain
 */

interface RateLimitEntry {
  lastRequest: number;
  requestCount: number;
  resetTime: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private defaultDelay: number = 1000; // 1 second between requests
  private maxRequestsPerMinute: number = 30;

  /**
   * Check if request is allowed
   */
  async checkLimit(url: string, customDelay?: number): Promise<boolean> {
    const domain = new URL(url).hostname;
    const now = Date.now();
    const delay = customDelay || this.defaultDelay;

    let entry = this.limits.get(domain);

    if (!entry) {
      // First request to this domain
      entry = {
        lastRequest: now,
        requestCount: 1,
        resetTime: now + 60000, // Reset after 1 minute
      };
      this.limits.set(domain, entry);
      return true;
    }

    // Check if we need to reset counter
    if (now >= entry.resetTime) {
      entry.requestCount = 0;
      entry.resetTime = now + 60000;
    }

    // Check rate limit
    if (entry.requestCount >= this.maxRequestsPerMinute) {
      return false; // Rate limit exceeded
    }

    // Check delay between requests
    const timeSinceLastRequest = now - entry.lastRequest;
    if (timeSinceLastRequest < delay) {
      return false; // Too soon
    }

    // Update entry
    entry.lastRequest = now;
    entry.requestCount++;
    this.limits.set(domain, entry);

    return true;
  }

  /**
   * Wait until request is allowed
   */
  async waitForSlot(url: string, customDelay?: number): Promise<void> {
    const domain = new URL(url).hostname;
    const delay = customDelay || this.defaultDelay;
    const entry = this.limits.get(domain);

    if (!entry) {
      return; // First request, no wait needed
    }

    const now = Date.now();
    const timeSinceLastRequest = now - entry.lastRequest;
    const waitTime = Math.max(0, delay - timeSinceLastRequest);

    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Check again after waiting
    const allowed = await this.checkLimit(url, customDelay);
    if (!allowed) {
      // If still not allowed, wait for reset
      const timeUntilReset = entry.resetTime - Date.now();
      if (timeUntilReset > 0) {
        await new Promise(resolve => setTimeout(resolve, timeUntilReset));
      }
    }
  }

  /**
   * Get remaining requests for domain
   */
  getRemainingRequests(url: string): number {
    const domain = new URL(url).hostname;
    const entry = this.limits.get(domain);

    if (!entry) {
      return this.maxRequestsPerMinute;
    }

    const now = Date.now();
    if (now >= entry.resetTime) {
      return this.maxRequestsPerMinute;
    }

    return Math.max(0, this.maxRequestsPerMinute - entry.requestCount);
  }

  /**
   * Get time until next available slot
   */
  getTimeUntilNextSlot(url: string): number {
    const domain = new URL(url).hostname;
    const entry = this.limits.get(domain);

    if (!entry) {
      return 0;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - entry.lastRequest;
    return Math.max(0, this.defaultDelay - timeSinceLastRequest);
  }

  /**
   * Set custom rate limit for domain
   */
  setDomainLimit(domain: string, requestsPerMinute: number, delayMs: number): void {
    // This would be stored per domain in a production system
    this.maxRequestsPerMinute = requestsPerMinute;
    this.defaultDelay = delayMs;
  }

  /**
   * Clear limits for domain
   */
  clearDomain(url: string): void {
    const domain = new URL(url).hostname;
    this.limits.delete(domain);
  }

  /**
   * Clear all limits
   */
  clearAll(): void {
    this.limits.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalDomains: number;
    domains: Array<{
      domain: string;
      requestCount: number;
      remaining: number;
      resetIn: number;
    }>;
  } {
    const now = Date.now();
    const domains = Array.from(this.limits.entries()).map(([domain, entry]) => ({
      domain,
      requestCount: entry.requestCount,
      remaining: Math.max(0, this.maxRequestsPerMinute - entry.requestCount),
      resetIn: Math.max(0, entry.resetTime - now),
    }));

    return {
      totalDomains: this.limits.size,
      domains,
    };
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();
