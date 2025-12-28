export type ExtractMode = "smart" | "selection" | "selected" | "full";

export interface ExtractedData {
  title: string;
  content: string; // Markdown
  url: string;
  author?: string;
  publishedTime?: string;
  html?: string;
}

export interface HttpConfig {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers: Record<string, string>;
  body: unknown; // Supports variable substitution
}

export interface PushService {
  name: string;
  description: string;
  is_open: boolean;
  server_type: "http" | string;
  config: HttpConfig | Record<string, unknown>;
}

export interface AppSettings {
  services: PushService[];
  theme: "light" | "dark" | "auto";
}
