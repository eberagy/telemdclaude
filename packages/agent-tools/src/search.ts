/**
 * Web search tool for agents — uses Brave Search API.
 * Falls back to a basic DuckDuckGo instant answer if BRAVE_SEARCH_API_KEY is not set.
 */
import type { ToolResult } from "./types.js";

interface SearchResult {
  title: string;
  url: string;
  description: string;
}

export async function searchWeb(query: string, limit = 5): Promise<ToolResult> {
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;

  if (braveKey) {
    return searchBrave(query, limit, braveKey);
  }

  return searchDuckDuckGo(query);
}

async function searchBrave(query: string, limit: number, apiKey: string): Promise<ToolResult> {
  try {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(limit));

    const res = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    });

    if (!res.ok) return { ok: false, error: `Brave search error: ${res.status}` };

    const data = await res.json() as {
      web?: { results?: Array<{ title: string; url: string; description: string }> };
    };

    const results: SearchResult[] = (data.web?.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      description: r.description,
    }));

    return { ok: true, data: results };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

async function searchDuckDuckGo(query: string): Promise<ToolResult> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1`;
    const res = await fetch(url);
    if (!res.ok) return { ok: false, error: `DDG error: ${res.status}` };

    const data = await res.json() as {
      AbstractText?: string;
      AbstractURL?: string;
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
    };

    const results: SearchResult[] = [];

    if (data.AbstractText) {
      results.push({ title: "Summary", url: data.AbstractURL ?? "", description: data.AbstractText });
    }

    for (const topic of (data.RelatedTopics ?? []).slice(0, 4)) {
      if (topic.Text) {
        results.push({ title: topic.Text.substring(0, 60), url: topic.FirstURL ?? "", description: topic.Text });
      }
    }

    return { ok: true, data: results };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
