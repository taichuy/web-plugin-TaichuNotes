import React from "react"
import { Form, Input } from "antd"
import axios, { isAxiosError } from "axios"
import type { HttpConfig } from "~lib/types"
import { replaceVariables } from "~lib/variable-replacer"
import type { ServiceTemplate } from "./types"

const { TextArea } = Input

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

export const HttpTemplate: ServiceTemplate = {
  type: "http",
  label: "HTTP Request",
  defaultName: "HTTP Service",
  defaultDescription: "Generic HTTP Request",
  handler: handleHttp,
  FormItems: () => (
    <Form.Item
      name="config"
      label="Configuration (JSON)"
      rules={[
        { required: true, message: 'Please enter configuration' },
        { 
          validator: (_, value) => {
             try {
                JSON.parse(value)
                return Promise.resolve()
             } catch (e) {
                return Promise.reject(new Error("Invalid JSON"))
             }
          }
        }
      ]}
    >
      <TextArea rows={10} style={{ fontFamily: 'monospace' }} />
    </Form.Item>
  ),
  processConfigBeforeSave: (values: any) => {
    try {
      return JSON.parse(values.config)
    } catch (e) {
      throw new Error("Invalid JSON in Config field")
    }
  },
  processConfigForEdit: (config: any) => {
    return {
      config: JSON.stringify(config, null, 2)
    }
  }
}
