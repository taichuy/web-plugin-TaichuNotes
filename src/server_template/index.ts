import { handleHttp } from "./http"
import { handleTaichuy } from "./taichuy"

export const TEMPLATES = {
  http: handleHttp,
  taichuy: handleTaichuy
}

export type TemplateType = keyof typeof TEMPLATES
