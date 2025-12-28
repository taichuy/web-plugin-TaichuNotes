import axios, { isAxiosError } from "axios"

import type { ExtractedData, WorkflowRequest } from "./types"

function replaceVariables(
  template: unknown,
  variables: Record<string, string>
): unknown {
  if (typeof template === "string") {
    let result = template
    for (const [key, value] of Object.entries(variables)) {
      // Use a global regex to replace all occurrences
      // Escape the key for regex usage (though $ is special, we want literal match)
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      result = result.replace(new RegExp(escapedKey, "g"), value)
    }
    return result
  } else if (Array.isArray(template)) {
    return template.map((item) => replaceVariables(item, variables))
  } else if (typeof template === "object" && template !== null) {
    const newObj: Record<string, unknown> = {}
    for (const key in template) {
      newObj[key] = replaceVariables((template as Record<string, unknown>)[key], variables)
    }
    return newObj
  }
  return template
}

export async function executeWorkflow(
  workflow: WorkflowRequest[],
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

  for (const step of workflow) {
    try {
      const url = replaceVariables(step.url, variables) as string
      const headers = replaceVariables(step.headers || {}, variables) as Record<string, string>
      const body = replaceVariables(step.body, variables)

      const response = await axios({
        url,
        method: step.method,
        headers,
        data: body
      })

      results.push({
        success: true,
        status: response.status,
        data: response.data
      })
    } catch (error: unknown) {
      console.error("Workflow step failed", error)
      
      let errorMessage = "Unknown error"
      let errorResponse = undefined

      if (isAxiosError(error)) {
          errorMessage = error.message
          errorResponse = error.response?.data
      } else if (error instanceof Error) {
          errorMessage = error.message
      } else {
          errorMessage = String(error)
      }

      results.push({
        success: false,
        error: errorMessage,
        response: errorResponse
      })
      // Stop execution on error?
      throw new Error(`Step failed: ${errorMessage}`)
    }
  }

  return results
}
