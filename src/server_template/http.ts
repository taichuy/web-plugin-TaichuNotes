import axios, { isAxiosError } from "axios"
import type { HttpConfig } from "~lib/types"
import { replaceVariables } from "~lib/variable-replacer"

export async function handleHttp(config: HttpConfig, variables: Record<string, string>) {
  try {
      const url = replaceVariables(config.url, variables) as string
      const headers = replaceVariables(config.headers || {}, variables) as Record<string, string>
      const body = replaceVariables(config.body, variables)

      const response = await axios({
        url,
        method: config.method,
        headers,
        data: body
      })

      return {
        success: true,
        status: response.status,
        data: response.data
      }
    } catch (error: unknown) {
      console.error("HTTP Request failed", error)
      
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

      return {
        success: false,
        error: errorMessage,
        response: errorResponse
      }
    }
}
