import { HttpTemplate } from "./http"
import { TaichuyTemplate } from "./taichuy"
import type { ServiceTemplate } from "./types"

// Export handlers for workflow compatibility (though we should migrate workflow to use REGISTRY if possible, 
// but for now keeping TEMPLATES map for backward compatibility is safe)
export const TEMPLATES = {
  http: HttpTemplate.handler,
  taichuy: TaichuyTemplate.handler
}

export type TemplateType = keyof typeof TEMPLATES

export const SERVICE_REGISTRY: Record<string, ServiceTemplate> = {
  http: HttpTemplate,
  taichuy: TaichuyTemplate
}

export const getServiceTemplate = (type: string): ServiceTemplate => {
  return SERVICE_REGISTRY[type] || SERVICE_REGISTRY['http']
}

export const getServiceOptions = () => {
  return Object.values(SERVICE_REGISTRY).map(template => ({
    value: template.type,
    label: template.label
  }))
}
