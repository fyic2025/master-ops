/**
 * Rate Limiter
 *
 * Implements token bucket algorithm for rate limiting API calls.
 * Prevents exceeding API rate limits for external services.
 *
 * Usage:
 * ```typescript
 * const limiter = new RateLimiter(100, 60000) // 100 requests per minute
 * await limiter.acquire() // Wait for available slot
 * ```
 */

export interface RateLimiterConfig {
  maxRequests: number // Maximum requests allowed
  windowMs: number // Time window in milliseconds
  minDelay?: number // Minimum delay between requests (ms)
}

export class RateLimiter {
  private tokens: number
  private lastRefill: number
  private readonly maxTokens: number
  private readonly refillRate: number // tokens per millisecond
  private readonly minDelay: number

  constructor(config: RateLimiterConfig) {
    this.maxTokens = config.maxRequests
    this.tokens = this.maxTokens
    this.lastRefill = Date.now()
    this.refillRate = this.maxTokens / config.windowMs
    this.minDelay = config.minDelay || 0
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    const tokensToAdd = elapsed * this.refillRate

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd)
    this.lastRefill = now
  }

  /**
   * Acquire a token (wait if necessary)
   */
  async acquire(): Promise<void> {
    this.refill()

    while (this.tokens < 1) {
      // Calculate wait time
      const tokensNeeded = 1 - this.tokens
      const waitMs = Math.ceil(tokensNeeded / this.refillRate)

      await this.sleep(waitMs)
      this.refill()
    }

    this.tokens -= 1

    // Enforce minimum delay if configured
    if (this.minDelay > 0) {
      await this.sleep(this.minDelay)
    }
  }

  /**
   * Try to acquire a token without waiting
   * Returns true if token acquired, false otherwise
   */
  tryAcquire(): boolean {
    this.refill()

    if (this.tokens >= 1) {
      this.tokens -= 1
      return true
    }

    return false
  }

  /**
   * Get current token count
   */
  getAvailableTokens(): number {
    this.refill()
    return Math.floor(this.tokens)
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.tokens = this.maxTokens
    this.lastRefill = Date.now()
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
