/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react"
import { Form, Input } from "antd"
import type { HttpConfig } from "~lib/types"
import { handleHttp } from "./http"
import type { ServiceTemplate } from "./types"
import { useI18n } from "~lib/i18n"

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

export const TaichuyTemplate: ServiceTemplate = {
  type: "taichuy",
  label: "TaichuY",
  defaultName: "太初y",
  defaultDescription: "从最初问题开始构建智慧",
  handler: handleTaichuy,
  FormItems: () => {
    const { t } = useI18n()
    return (
      <Form.Item
        name="apiKey"
        label={t("apiKey")}
        extra={
          <span>
            {t("getApiKeyFrom")} <a href="https://y.taichu.xyz/profile/key" target="_blank" rel="noopener noreferrer">{t("taichuyProfile")}</a>
          </span>
        }
        rules={[{ required: true, message: t("pleaseEnterApiKey") }]}
      >
        <Input.Password placeholder={t("enterApiKey")} />
      </Form.Item>
    )
  },
  processConfigBeforeSave: (values: Record<string, any>) => {
    return { apiKey: values.apiKey }
  },
  processConfigForEdit: (config: any) => {
    return { apiKey: config.apiKey || "" }
  },
  validate: (config: any) => {
    return !!(config && config.apiKey && config.apiKey.trim() !== "")
  }
}
