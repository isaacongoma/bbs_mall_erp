export type FilterCondition = [string, string, unknown]

export type ConditionNode = string | unknown[]

export type ConditionList = ConditionNode[]

export interface FilterableField {
  label: string
  value: string
  fieldname: string
  fieldtype: string
  options?: string
  [key: string]: unknown
}
