import type { ExtractedData, PushService, HttpConfig } from "./types"
import { TEMPLATES } from "~server_template"

export async function executeWorkflow(
  services: PushService[],
  data: ExtractedData
) {
  const variables: Record<string, string> = {
    $main_text: data.content,
    $source_url: data.url,
    $web_title: data.title,
    $author: data.author || "",
    $published_time: data.publishedTime || ""
  }

  const results = []

  for (const service of services) {
    if (!service.is_open) continue;

    try {
      let result;
      const handler = TEMPLATES[service.server_type as keyof typeof TEMPLATES]
      
      if (handler) {
         result = await handler(service.config as any, variables)
      } else {
         // Fallback or error
         throw new Error(`Unknown server type: ${service.server_type}`)
      }

      results.push({
        serviceName: service.name,
        success: result.success,
        status: result.status,
        data: result.data,
        error: result.error,
        response: result.response
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      results.push({
        serviceName: service.name,
        success: false,
        error: errorMessage
      })
    }
  }

  return results
}
