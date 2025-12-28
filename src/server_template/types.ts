import type { FormInstance } from "antd"
import type { ReactNode } from "react"

export interface ServiceTemplate {
  type: string
  label: string
  defaultName?: string
  defaultDescription?: string
  handler: (config: any, variables: any) => Promise<any>
  FormItems: React.FC
  processConfigBeforeSave: (values: any) => any
  processConfigForEdit: (config: any) => any
}
