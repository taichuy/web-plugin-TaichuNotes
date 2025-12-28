import React from "react"
import { Form, Input, Divider } from "antd"
import type { HttpConfig } from "~lib/types"
import { handleHttp } from "./http"
import type { ServiceTemplate } from "./types"

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
  FormItems: () => (
    <>
      <Form.Item
        name="domain"
        label="NocoBase 域名"
        rules={[{ required: true, message: '请输入 NocoBase 域名' }]}
        extra="例如: https://wwww.taichuy.com"
      >
        <Input placeholder="https://your-nocobase.com" />
      </Form.Item>

      <Form.Item
        name="collection"
        label="存储表名 (Collection)"
        rules={[{ required: true, message: '请输入存储表名' }]}
        extra="例如: collection"
      >
        <Input placeholder="collection_name" />
      </Form.Item>

      <Form.Item
        name="urlParams"
        label="URL 参数"
        extra="可选，例如: triggerWorkflows=123"
      >
        <Input placeholder="key=value" />
      </Form.Item>

      <Form.Item
        name="apiKey"
        label="API Key"
        rules={[{ required: true, message: '请输入 API Key' }]}
      >
        <Input.Password placeholder="Bearer Token" />
      </Form.Item>

      <Divider orientation="left" plain>字段映射配置</Divider>

      <Form.Item
        name="titleField"
        label="当前页面标题"
        initialValue="title"
        rules={[{ required: true, message: '请输入标题字段名' }]}
      >
        <Input placeholder="默认为 title" />
      </Form.Item>

      <Form.Item
        name="urlField"
        label="当前页面URL"
        initialValue="source_url"
        rules={[{ required: true, message: '请输入URL字段名' }]}
      >
        <Input placeholder="默认为 source_url" />
      </Form.Item>

      <Form.Item
        name="contentField"
        label="编辑器内容"
        initialValue="content"
        rules={[{ required: true, message: '请输入正文字段名' }]}
      >
        <Input placeholder="默认为 content" />
      </Form.Item>
    </>
  ),
  processConfigBeforeSave: (values: any) => {
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
