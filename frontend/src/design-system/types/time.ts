export interface ParsedTimeValid {
  valid: true
  hh24: string
  mm: string
  ss?: string
  total: number
}

export type ParsedTime = ParsedTimeValid | { valid: false }

export interface TimeOption {
  value: string
  label: string
}
