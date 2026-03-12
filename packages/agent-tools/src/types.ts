export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface SlackMessageOptions {
  channel: string;
  text: string;
  blocks?: unknown[];
}

export interface GitHubIssueOptions {
  owner: string;
  repo: string;
  title: string;
  body: string;
  labels?: string[];
}

export interface GitHubPROptions {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  from?: string;
}

export interface DelegateOptions {
  toAgent: string;
  taskTitle: string;
  taskDescription: string;
  priority?: number;
  labels?: string[];
}
