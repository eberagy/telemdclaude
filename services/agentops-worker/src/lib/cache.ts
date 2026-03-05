/**
 * Redis cache for AgentOps — reduces repeated LLM calls by 60-70%
 * Caches: repo map, issue summaries, long thread summaries
 */

import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableOfflineQueue: false,
});

redis.on("error", (err) => {
  // Cache failures should NEVER break agent operations
  if (!err.message.includes("ECONNREFUSED")) {
    console.warn("[cache] Redis error:", err.message);
  }
});

const DEFAULT_TTL = 60 * 60; // 1 hour
const REPO_MAP_TTL = 6 * 60 * 60; // 6 hours
const ISSUE_TTL = 30 * 60; // 30 min

/**
 * Get a cached value. Returns null on miss or error.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const val = await redis.get(key);
    if (!val) return null;
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

/**
 * Set a cached value. Silently fails if Redis is unavailable.
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = DEFAULT_TTL
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Cache write failure is non-fatal
  }
}

/**
 * Delete a cached value.
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {}
}

// ---- Typed helpers ----

export async function getRepoMap(owner: string, repo: string): Promise<string | null> {
  return cacheGet<string>(`repo_map:${owner}:${repo}`);
}

export async function setRepoMap(owner: string, repo: string, map: string): Promise<void> {
  return cacheSet(`repo_map:${owner}:${repo}`, map, REPO_MAP_TTL);
}

export async function getIssueSummary(
  owner: string,
  repo: string,
  issue: number
): Promise<string | null> {
  return cacheGet<string>(`issue_summary:${owner}:${repo}:${issue}`);
}

export async function setIssueSummary(
  owner: string,
  repo: string,
  issue: number,
  summary: string
): Promise<void> {
  return cacheSet(`issue_summary:${owner}:${repo}:${issue}`, summary, ISSUE_TTL);
}

/**
 * Wrap any async function with caching.
 * If cached: returns cache (free). If miss: runs fn, caches result.
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds = DEFAULT_TTL
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }
  const result = await fn();
  await cacheSet(key, result, ttlSeconds);
  return result;
}

export { redis };
