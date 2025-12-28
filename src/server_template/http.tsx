/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react"
import { Form, Input } from "antd"
import axios, { isAxiosError } from "axios"
import type { HttpConfig } from "~lib/types"
import { replaceVariables } from "~lib/variable-replacer"
import type { ServiceTemplate } from "./types"
import { useI18n } from "~lib/i18n"

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
  FormItems: () => {
    const { t } = useI18n()
    return (
      <Form.Item
        name="config"
        label={t("configurationJson")}
        rules={[
          { required: true, message: t("pleaseEnterConfig") },
          { 
            validator: (_, value) => {
               try {
                  JSON.parse(value)
                  return Promise.resolve()
               } catch {
                  return Promise.reject(new Error(t("invalidJson")))
               }
            }
          }
        ]}
      >
        <TextArea rows={10} style={{ fontFamily: 'monospace' }} />
      </Form.Item>
    )
  },
  processConfigBeforeSave: (values: Record<string, any>) => {
    try {
      return JSON.parse(values.config)
    } catch {
      throw new Error("Invalid JSON in Config field")
    }
  },
  processConfigForEdit: (config: any) => {
    return {
      config: JSON.stringify(config, null, 2)
    }
  },
  validate: (config: any) => {
    return !!(config && config.url && config.method)
  }
}
