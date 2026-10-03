export interface SelectOptionItem {
  label: string
  value: string
}

export interface DocField {
  fieldname: string
  label?: string
  fieldtype: string
  options?: any
  reqd?: number | boolean
  hidden?: number | boolean
  read_only?: number | boolean
  precision?: number | string | null
  fetch_from?: string
  fetch_if_empty?: number | boolean
  mandatory_depends_on?: string
  depends_on?: string
  read_only_depends_on?: string
  parent?: string
  placeholder?: string
  description?: string
  default?: unknown
  in_list_view?: number | boolean
  in_standard_filter?: number | boolean
  link_filters?: unknown
  [key: string]: any
}

export interface DocTypeMeta {
  name: string
  doctype?: string
  fields: DocField[]
  translated_doctype?: boolean | number
  istable?: number
  [key: string]: any
}

export interface DocTypeLoadResponse {
  docs: DocTypeMeta[]
  user_settings: string
}

export type DocRecord = Record<string, any>
