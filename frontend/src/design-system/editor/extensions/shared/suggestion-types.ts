export interface BaseSuggestionItem {
  display?: string
  title?: string
  name?: string
  group?: string
  [key: string]: unknown
}

export interface SuggestionListExpose {
  onKeyDown(props: { event: KeyboardEvent }): boolean
}

export interface SuggestionRange {
  from: number
  to: number
}
