import { Octokit } from "@octokit/rest";
import type { GitHubIssueOptions, GitHubPROptions, ToolResult } from "./types.js";

let _octokit: Octokit | null = null;

function getClient(): Octokit {
  if (!_octokit) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error("GITHUB_TOKEN not set");
    _octokit = new Octokit({ auth: token });
  }
  return _octokit;
}

export async function createGitHubIssue(opts: GitHubIssueOptions): Promise<ToolResult> {
  try {
    const octokit = getClient();
    const res = await octokit.issues.create({
      owner: opts.owner,
      repo: opts.repo,
      title: opts.title,
      body: opts.body,
      labels: opts.labels,
    });
    return { ok: true, data: { number: res.data.number, url: res.data.html_url } };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function createPullRequest(opts: GitHubPROptions): Promise<ToolResult> {
  try {
    const octokit = getClient();
    const res = await octokit.pulls.create({
      owner: opts.owner,
      repo: opts.repo,
      title: opts.title,
      body: opts.body,
      head: opts.head,
      base: opts.base,
    });
    return { ok: true, data: { number: res.data.number, url: res.data.html_url } };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function searchGitHubIssues(
  owner: string,
  repo: string,
  query: string
): Promise<ToolResult> {
  try {
    const octokit = getClient();
    const res = await octokit.search.issuesAndPullRequests({
      q: `${query} repo:${owner}/${repo} is:issue`,
      per_page: 10,
    });
    return {
      ok: true,
      data: res.data.items.map((i) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        url: i.html_url,
        labels: i.labels.map((l) => (typeof l === "string" ? l : l.name)),
      })),
    };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
