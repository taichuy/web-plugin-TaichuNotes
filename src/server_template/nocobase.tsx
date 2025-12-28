/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react"
import { Form, Input, Divider } from "antd"
import type { HttpConfig } from "~lib/types"
import { handleHttp } from "./http"
import type { ServiceTemplate } from "./types"
import { useI18n } from "~lib/i18n"

interface NocobaseConfig {
  domain: string
  collection: string
  apiKey: string
  titleField: string
  urlField: string
  contentField: string
  urlParams?: string
}

export async function handleNocobase(config: NocobaseConfig, variables: Record<string, string>) {
  // Normalize domain: remove trailing slash
  const domain = config.domain.replace(/\/$/, "")
  let url = `${domain}/api/${config.collection}:create`
  
  // Append URL params if present
  if (config.urlParams && config.urlParams.trim()) {
    const prefix = url.includes("?") ? "&" : "?"
    url = `${url}${prefix}${config.urlParams.trim()}`
  }

  const body: Record<string, string> = {
    [config.titleField]: "$web_title",
    [config.urlField]: "$source_url",
    [config.contentField]: "$main_text"
  }

  const httpConfig: HttpConfig = {
    url,
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body
  }
  return handleHttp(httpConfig, variables)
}

export const NocobaseTemplate: ServiceTemplate = {
  type: "nocobase",
  label: "NocoBase",
  // No defaultName/description to prevent auto-fill
  handler: handleNocobase,
  FormItems: () => {
    const { t } = useI18n()
    return (
      <>
        <Form.Item
          name="domain"
          label={t("nocobaseDomain")}
          rules={[{ required: true, message: t("pleaseEnterDomain") }]}
          extra={t("domainExample")}
        >
          <Input placeholder="https://your-nocobase.com" />
        </Form.Item>

        <Form.Item
          name="collection"
          label={t("collectionName")}
          rules={[{ required: true, message: t("pleaseEnterCollection") }]}
          extra={t("collectionExample")}
        >
          <Input placeholder="collection_name" />
        </Form.Item>

        <Form.Item
          name="urlParams"
          label={t("urlParams")}
          extra={t("urlParamsExample")}
        >
          <Input placeholder="key=value" />
        </Form.Item>

        <Form.Item
          name="apiKey"
          label={t("apiKey")}
          rules={[{ required: true, message: t("pleaseEnterApiKey") }]}
        >
          <Input.Password placeholder="Bearer Token" />
        </Form.Item>

        <Divider orientation={"left" as any} plain>{t("fieldMappingConfig")}</Divider>

        <Form.Item
          name="titleField"
          label={t("pageTitleField")}
          initialValue="title"
          rules={[{ required: true, message: t("pleaseEnterTitleField") }]}
        >
          <Input placeholder={t("defaultTitle")} />
        </Form.Item>

        <Form.Item
          name="urlField"
          label={t("pageUrlField")}
          initialValue="url"
          rules={[{ required: true, message: t("pleaseEnterUrlField") }]} 
        >
          <Input placeholder={t("defaultUrl")} />
        </Form.Item>

        <Form.Item
          name="contentField"
          label={t("pageContentField")}
          initialValue="content"
          rules={[{ required: true, message: t("pleaseEnterContentField") }]}
        >
          <Input placeholder={t("defaultContent")} />
        </Form.Item>
      </>
    )
  },
  processConfigBeforeSave: (values: Record<string, any>) => {
    return {
      domain: values.domain,
      collection: values.collection,
      apiKey: values.apiKey,
      titleField: values.titleField,
      urlField: values.urlField,
      contentField: values.contentField,
      urlParams: values.urlParams
    }
  },
  processConfigForEdit: (config: any) => {
    return {
      domain: config.domain || "",
      collection: config.collection || "",
      apiKey: config.apiKey || "",
      titleField: config.titleField || "title",
      urlField: config.urlField || "source_url",
      contentField: config.contentField || "content",
      urlParams: config.urlParams || ""
    }
  },
  validate: (config: any) => {
    return !!(config && config.domain && config.collection && config.apiKey)
  }
}
