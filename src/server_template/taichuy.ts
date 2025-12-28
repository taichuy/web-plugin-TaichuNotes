import { handleHttp } from "./http"
import type { HttpConfig } from "~lib/types"

export async function handleTaichuy(config: { apiKey: string }, variables: Record<string, string>) {
  const httpConfig: HttpConfig = {
    url: "https://y.taichu.xyz/api/taichuy_info_my_article:create?action_identification=save_article",
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: {
      "title": "$web_title",
      "summary": "$web_title",
      "content": "$main_text",
      "source_type": "reprint",
      "source_url": "$source_url"
    }
  }
  return handleHttp(httpConfig, variables)
}
