import { handleHttp } from "./http"

export const TEMPLATES = {
  http: handleHttp
}

export type TemplateType = keyof typeof TEMPLATES
