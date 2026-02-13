/**
 * FailoverManager - Orchestrates provider failover for mail sending
 * Tries primary provider first, then falls back through a chain of backup providers
 */

import type {
  MailOptions,
  MailProvider,
  MailResponse,
  FailoverConfig,
  FailoverDetail,
} from '../types';

export class FailoverManager {
  /**
   * Send with failover support.
   * Tries the primary provider first (with retries), then iterates through the chain.
   */
  async sendWithFailover(
    options: MailOptions,
    primaryName: string,
    primaryProvider: MailProvider,
    failoverConfig: FailoverConfig,
    getProvider: (name: string) => MailProvider,
  ): Promise<MailResponse> {
    const maxRetries = failoverConfig.maxRetriesPerProvider ?? 1;
    const retryDelay = failoverConfig.retryDelay ?? 0;
    const failoverDelay = failoverConfig.failoverDelay ?? 0;
    const attempts: FailoverDetail[] = [];

    // Try primary provider
    const primaryResult = await this.tryProvider(
      primaryProvider,
      primaryName,
      options,
      maxRetries,
      retryDelay,
      attempts,
    );

    if (primaryResult.success) {
      return {
        ...primaryResult,
        provider: primaryName,
        failoverUsed: false,
        failoverAttempts: attempts,
      };
    }

    // Primary failed — iterate through chain
    for (const chainName of failoverConfig.chain) {
      // Skip if chain entry matches primary
      if (chainName === primaryName) {
        continue;
      }

      // Resolve provider, skip gracefully if misconfigured
      let chainProvider: MailProvider;
      try {
        chainProvider = getProvider(chainName);
      } catch {
        continue;
      }

      // Fire onFailover callback — wrapped in try/catch so callback errors
      // never abort the failover chain
      const lastFailed = attempts[attempts.length - 1];
      if (failoverConfig.onFailover && lastFailed) {
        try {
          failoverConfig.onFailover({
            failedMailer: lastFailed.mailer,
            error: lastFailed.error ?? 'Unknown error',
            nextMailer: chainName,
            attemptIndex: attempts.length,
            timestamp: new Date().toISOString(),
          });
        } catch {
          // Callback errors must not abort failover
        }
      }

      // Wait failoverDelay before switching provider
      if (failoverDelay > 0) {
        await this.delay(failoverDelay);
      }

      const chainResult = await this.tryProvider(
        chainProvider,
        chainName,
        options,
        maxRetries,
        retryDelay,
        attempts,
      );

      if (chainResult.success) {
        return {
          ...chainResult,
          provider: chainName,
          failoverUsed: true,
          failoverAttempts: attempts,
        };
      }
    }

    // All providers exhausted
    return {
      success: false,
      error: 'All providers failed',
      provider: primaryName,
      failoverUsed: true,
      failoverAttempts: attempts,
    };
  }

  /**
   * Try a single provider up to maxRetries times.
   * Records each attempt in the attempts array and returns the last response.
   */
  private async tryProvider(
    provider: MailProvider,
    name: string,
    options: MailOptions,
    maxRetries: number,
    retryDelay: number,
    attempts: FailoverDetail[],
  ): Promise<MailResponse> {
    let lastResponse: MailResponse = { success: false, error: 'No attempts made' };

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0 && retryDelay > 0) {
        await this.delay(retryDelay);
      }

      const start = Date.now();
      try {
        lastResponse = await provider.send(options);
        const durationMs = Date.now() - start;

        const detail: FailoverDetail = { mailer: name, success: lastResponse.success, durationMs };
        if (!lastResponse.success && lastResponse.error) {
          detail.error = lastResponse.error;
        }
        attempts.push(detail);

        if (lastResponse.success) {
          return lastResponse;
        }
      } catch (err: unknown) {
        const durationMs = Date.now() - start;
        const errorMessage = err instanceof Error ? err.message : String(err);

        lastResponse = { success: false, error: errorMessage };
        attempts.push({
          mailer: name,
          success: false,
          error: errorMessage,
          durationMs,
        });
      }
    }

    return lastResponse;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
