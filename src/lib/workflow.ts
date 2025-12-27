import axios from "axios"

import type { ExtractedData, WorkflowRequest } from "./types"

function replaceVariables(
  template: any,
  variables: Record<string, string>
): any {
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
    const newObj: any = {}
    for (const key in template) {
      newObj[key] = replaceVariables(template[key], variables)
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
      const url = replaceVariables(step.url, variables)
      const headers = replaceVariables(step.headers || {}, variables)
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
    } catch (error: any) {
      console.error("Workflow step failed", error)
      results.push({
        success: false,
        error: error.message,
        response: error.response?.data
      })
      // Stop execution on error?
      throw new Error(`Step failed: ${error.message}`)
    }
  }

  return results
}
