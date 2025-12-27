export type ExtractMode = "smart" | "selection" | "selected" | "full";

export interface ExtractedData {
  title: string;
  content: string; // Markdown
  url: string;
  author?: string;
  publishedTime?: string;
  html?: string;
}

export interface WorkflowRequest {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers: Record<string, string>;
  body: any; // Supports variable substitution
}

export interface AppSettings {
  workflow: WorkflowRequest[];
  theme: "light" | "dark" | "auto";
}
