/**
 * Retry utilities for agent runs.
 * Uses exponential backoff with jitter to avoid thundering herd.
 * Cheap: retries use smaller models / shorter prompts on retry.
 */

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    onRetry,
  } = options;

  let lastError: Error = new Error("Unknown error");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === maxAttempts) break;

      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000,
        maxDelayMs
      );

      onRetry?.(attempt, lastError);
      console.warn(
        `[retry] Attempt ${attempt}/${maxAttempts} failed: ${lastError.message}. Retrying in ${Math.round(delay)}ms...`
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Retry an LLM call with a fallback to a cheaper/smaller model.
 */
export async function withModelFallback<T>(
  primaryFn: () => Promise<T>,
  fallbackFn: () => Promise<T>
): Promise<T> {
  try {
    return await primaryFn();
  } catch (err) {
    console.warn("[model-fallback] Primary model failed, trying fallback:", err);
    return fallbackFn();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
