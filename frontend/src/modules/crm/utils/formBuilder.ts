export const BREAK_TYPES = ['Section Break', 'Column Break']
export const MAX_COLUMNS = 4
export const TEXTAREA_TYPES = ['Small Text', 'Text', 'Long Text', 'Text Editor', 'HTML Editor', 'Markdown Editor']
export const TARGET_OPTIONS = [
  { label: 'Lead', value: 'CRM Lead' },
  { label: 'Deal', value: 'CRM Deal' },
]

const EMBEDDING_DOMAIN_RE = /^(https?:\/\/)?(\*\.)?[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?(?::\d+)?$/

export interface FormField {
  name?: string
  fieldname: string
  label: string
  fieldtype: string
  options?: string
  reqd: boolean
  placeholder?: string
  field_description?: string
  depends_on?: string
  mandatory_depends_on?: string
  read_only_depends_on?: string
}

export interface HiddenField {
  fieldname: string
  label: string
  fieldtype: string
  options: string
  default: string
}

export interface FormColumn {
  id: string
  colField: FormField | null
  items: FormField[]
}

export interface FormSection {
  id: string
  secField: FormField
  columns: FormColumn[]
  editingLabel: boolean
}

export interface FormState {
  name: string
  title: string
  route: string
  document_type: string
  description: string
  submit_button_label: string
  success_message: string
  redirect_url: string
  allowed_embedding_domains: string
  published: number
}

export interface CatalogField {
  fieldname: string
  label: string
  fieldtype: string
  options?: string
  reqd?: boolean | number
  default?: string
}

export function docLabel(doctype: string): string {
  return TARGET_OPTIONS.find((option) => option.value === doctype)?.label || doctype
}

export function slugify(value: string): string {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function uid(fieldtype: string): string {
  const prefix = fieldtype === 'Section Break' ? 'section_break_' : 'column_break_'
  return prefix + Math.random().toString(36).slice(2, 8)
}

export function makeMarker(fieldtype: string): FormField {
  return {
    fieldname: uid(fieldtype),
    label: '',
    fieldtype,
    options: '',
    reqd: false,
    placeholder: '',
    field_description: '',
  }
}

export function newColumn(colField: FormField | null = null): FormColumn {
  return {
    id: colField?.fieldname ?? `col_${Math.random().toString(36).slice(2, 8)}`,
    colField,
    items: [],
  }
}

export function newSection(secField: FormField | null = null): FormSection {
  const field = secField || makeMarker('Section Break')
  return { id: field.fieldname, secField: field, columns: [newColumn()], editingLabel: false }
}

export function buildSections(fields: FormField[]): FormSection[] {
  const sections: FormSection[] = []
  let current: FormSection | null = null
  const ensureSection = (): FormSection => {
    if (!current) {
      current = newSection()
      sections.push(current)
    }
    return current
  }
  for (const field of fields) {
    if (field.fieldtype === 'Section Break') {
      current = newSection(field)
      sections.push(current)
    } else if (field.fieldtype === 'Column Break') {
      ensureSection().columns.push(newColumn(field))
    } else {
      const section = ensureSection()
      const column = section.columns[section.columns.length - 1]
      column?.items.push(field)
    }
  }
  if (!sections.length) sections.push(newSection())
  return sections
}

export function flattenSections(sections: FormSection[]): FormField[] {
  const out: FormField[] = []
  for (const section of sections) {
    out.push(section.secField)
    section.columns.forEach((column, index) => {
      if (index > 0) out.push(column.colField ?? makeMarker('Column Break'))
      out.push(...column.items)
    })
  }
  return out
}

export function fieldCount(section: FormSection): number {
  return section.columns.reduce((total, column) => total + column.items.length, 0)
}

export interface PreviewSection {
  label: string | null
  columns: FormField[][]
}

export function previewLayout(fields: FormField[]): PreviewSection[] {
  const sections: PreviewSection[] = []
  let current: PreviewSection = { label: null, columns: [[]] }
  for (const field of fields) {
    if (field.fieldtype === 'Section Break') {
      sections.push(current)
      current = { label: field.label || null, columns: [[]] }
    } else if (field.fieldtype === 'Column Break') {
      current.columns.push([])
    } else {
      current.columns[current.columns.length - 1]?.push(field)
    }
  }
  sections.push(current)
  return sections.filter((section) => section.label || section.columns.some((column) => column.length))
}

export function moveFieldBetweenColumns(
  sections: FormSection[],
  fieldname: string,
  targetColumnId: string,
  targetIndex: number | null,
): FormSection[] {
  let moved: FormField | null = null
  const stripped = sections.map((section) => ({
    ...section,
    columns: section.columns.map((column) => {
      const found = column.items.find((item) => item.fieldname === fieldname)
      if (!found) return column
      moved = found
      return { ...column, items: column.items.filter((item) => item !== found) }
    }),
  }))
  const field = moved as FormField | null
  if (!field) return sections
  return stripped.map((section) => ({
    ...section,
    columns: section.columns.map((column) => {
      if (column.id !== targetColumnId) return column
      const items = [...column.items]
      items.splice(targetIndex === null ? items.length : targetIndex, 0, field)
      return { ...column, items }
    }),
  }))
}

export function locateField(sections: FormSection[], fieldname: string): { columnId: string; index: number } | null {
  for (const section of sections) {
    for (const column of section.columns) {
      const index = column.items.findIndex((item) => item.fieldname === fieldname)
      if (index >= 0) return { columnId: column.id, index }
    }
  }
  return null
}

export function optionList(field: { options?: string }): string[] {
  return (field.options || '').split('\n').filter(Boolean)
}

export function inputType(field: FormField): string {
  if (field.options === 'Email') return 'email'
  if (['Int', 'Float', 'Currency', 'Percent'].includes(field.fieldtype)) return 'number'
  if (field.fieldtype === 'Date') return 'date'
  if (field.fieldtype === 'Datetime') return 'datetime-local'
  if (field.fieldtype === 'Time') return 'time'
  if (field.fieldtype === 'Color') return 'color'
  return 'text'
}

export function embeddingDomains(value: string): string[] {
  return (value || '').split(/\s+/).filter(Boolean)
}

export function invalidEmbeddingDomains(value: string): string[] {
  return embeddingDomains(value).filter((domain) => !EMBEDDING_DOMAIN_RE.test(domain))
}

export function fieldTypeIcon(field: { fieldtype?: string; options?: string }): string {
  if (field.options === 'Email') return 'lucide-mail'
  switch (field.fieldtype) {
    case 'Select':
      return 'lucide-chevrons-up-down'
    case 'Int':
    case 'Float':
    case 'Currency':
      return 'lucide-hash'
    case 'Percent':
      return 'lucide-percent'
    case 'Date':
      return 'lucide-calendar'
    case 'Datetime':
      return 'lucide-calendar-clock'
    case 'Time':
      return 'lucide-clock'
    case 'Color':
      return 'lucide-palette'
    case 'Check':
      return 'lucide-square-check'
    case 'Phone':
      return 'lucide-phone'
    case 'Small Text':
    case 'Text':
    case 'Long Text':
    case 'Text Editor':
    case 'HTML Editor':
    case 'Markdown Editor':
      return 'lucide-align-left'
    case 'Link':
      return 'lucide-link'
    default:
      return 'lucide-type'
  }
}

export function fieldTypeLabel(field: { fieldtype?: string; options?: string }): string {
  return field.options === 'Email' ? 'Email' : (field.fieldtype ?? '')
}

export function serializeFields(fields: FormField[]) {
  return fields.map((field) => ({
    fieldname: field.fieldname,
    label: field.label,
    fieldtype: field.fieldtype,
    options: field.options,
    reqd: field.reqd ? 1 : 0,
    placeholder: field.placeholder,
    field_description: field.field_description,
    depends_on: field.depends_on || '',
    mandatory_depends_on: field.mandatory_depends_on || '',
    read_only_depends_on: field.read_only_depends_on || '',
  }))
}

export function focusRouteEnd(event: { target: EventTarget; currentTarget: HTMLElement }) {
  if ((event.target as HTMLElement).tagName === 'INPUT') return
  const input = event.currentTarget.querySelector('input')
  if (!input) return
  input.focus()
  input.setSelectionRange(input.value.length, input.value.length)
}
