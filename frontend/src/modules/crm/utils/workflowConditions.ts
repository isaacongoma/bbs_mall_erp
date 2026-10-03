import { __ } from '@/core/i18n'

type Leaf = [string, string, unknown]
export type Condition = string | Leaf | Condition[]
type FieldInfo = { fieldname: string; fieldtype?: string }

const NUMERIC_FIELDTYPES = ['Int', 'Float', 'Currency', 'Percent']
const COMPARISONS = ['==', '!=', '>=', '<=', '>', '<']
const OPERATOR_TO_PYTHON: Record<string, string> = { '=': '==', '!=': '!=' }

function isGroup(item: unknown): item is Condition[] {
  return Array.isArray(item) && Array.isArray(item[0])
}

function withConjunctions(conditions: Condition[]): Condition[] {
  if (conditions.some((item) => typeof item === 'string')) return conditions
  return conditions.flatMap((item, index) => (index ? ['and', item] : [item]))
}

function joinParts(parts: string[]): string {
  const kept: string[] = []
  parts.forEach((part) => {
    const conjunction = part === 'and' || part === 'or'
    if (!part) return
    if (conjunction && !kept.length) return
    if (conjunction && (kept.at(-1) === 'and' || kept.at(-1) === 'or')) return
    kept.push(part)
  })
  if (kept.at(-1) === 'and' || kept.at(-1) === 'or') kept.pop()
  return kept.join(' ')
}

function quote(text: unknown): string {
  return `"${String(text).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function splitValues(value: unknown): string[] {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function literal(value: unknown, fieldname: string, fields: FieldInfo[]): string {
  if (typeof value === 'number') return String(value)
  const text = String(value ?? '')
  const field = fields.find((item) => item.fieldname === fieldname)
  const numeric = NUMERIC_FIELDTYPES.includes(field?.fieldtype ?? '') || field?.fieldtype === 'Check'
  if (numeric && text !== '' && !Number.isNaN(Number(text))) return text
  return quote(text)
}

function presenceClause(fieldname: string, value: unknown): string {
  const comparison = value === 'not set' ? '==' : '!='
  return `(doc.${fieldname} or "") ${comparison} ""`
}

function containsClause(fieldname: string, operator: string, value: unknown): string {
  const needle = String(value ?? '')
    .replace(/%/g, '')
    .toLowerCase()
  const membership = operator === 'like' ? 'in' : 'not in'
  return `${quote(needle)} ${membership} (doc.${fieldname} or "").lower()`
}

function listClause(fieldname: string, operator: string, value: unknown, fields: FieldInfo[]): string {
  const items = (Array.isArray(value) ? value : splitValues(value)).map((item) => literal(item, fieldname, fields))
  return `doc.${fieldname} ${operator} [${items.join(', ')}]`
}

function clauseFor(filter: Leaf, fields: FieldInfo[]): string {
  const [fieldname, operator, value] = filter
  if (operator === 'is') return presenceClause(fieldname, value)
  if (operator === 'like' || operator === 'not like') return containsClause(fieldname, operator, value)
  if (operator === 'in' || operator === 'not in') return listClause(fieldname, operator, value, fields)
  const comparison = OPERATOR_TO_PYTHON[operator] || operator
  if (!COMPARISONS.includes(comparison)) return ''
  return `doc.${fieldname} ${comparison} ${literal(value, fieldname, fields)}`
}

export function toExpression(conditions: Condition[] | null | undefined, fields: FieldInfo[] = []): string {
  const parts: string[] = []
  withConjunctions(conditions || []).forEach((item) => {
    if (typeof item === 'string') {
      parts.push(item)
      return
    }
    const clause = isGroup(item) ? groupExpression(item, fields) : clauseFor(item as Leaf, fields)
    parts.push(clause || '')
  })
  return joinParts(parts)
}

function groupExpression(item: Condition[], fields: FieldInfo[]): string {
  const inner = toExpression(item, fields)
  return inner ? `(${inner})` : ''
}

const LITERAL = `"[^"]*"|'[^']*'|-?\\d+(?:\\.\\d+)?`
const PRESENCE = /^\(doc\.(\w+) or ""\) (==|!=) ""$/
const CONTAINS =
  /^"([^"]*)" (not in|in) \(doc\.(\w+) or ""\)\.lower\(\)$|^'([^']*)' (not in|in) \(doc\.(\w+) or ""\)\.lower\(\)$/
const MEMBERSHIP = new RegExp(`^doc\\.(\\w+) (not in|in) \\[((?:${LITERAL})(?:, *(?:${LITERAL}))*)?\\]$`)
const COMPARISON = new RegExp(`^doc\\.(\\w+) (==|!=|>=|<=|>|<) (${LITERAL})$`)

function unquote(text: string): string {
  return text.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
}

function parseLiteral(text: string): string | number {
  if (/^".*"$/.test(text) || /^'.*'$/.test(text)) return unquote(text.slice(1, -1))
  if (text === '') return ''
  return Number.isNaN(Number(text)) ? text : Number(text)
}

function parsePresence(clause: string): Leaf | null {
  const match = clause.match(PRESENCE)
  if (!match) return null
  return [match[1] ?? '', 'is', match[2] === '==' ? 'not set' : 'set']
}

function parseContains(clause: string): Leaf | null {
  const match = clause.match(CONTAINS)
  if (!match) return null
  const [value, operator, fieldname] =
    match[1] === undefined ? [match[4], match[5], match[6]] : [match[1], match[2], match[3]]
  return [fieldname ?? '', operator === 'in' ? 'like' : 'not like', unquote(value ?? '')]
}

function parseMembership(clause: string): Leaf | null {
  const match = clause.match(MEMBERSHIP)
  if (!match) return null
  const items = String(match[3] || '')
    .split(',')
    .map((item) => parseLiteral(item.trim()))
    .filter((item) => item !== '')
  return [match[1] ?? '', match[2] ?? 'in', items]
}

function parseComparison(clause: string): Leaf | null {
  const match = clause.match(COMPARISON)
  if (!match) return null
  const operator = match[2] === '==' ? '=' : (match[2] ?? '=')
  return [match[1] ?? '', operator, parseLiteral((match[3] ?? '').trim())]
}

function parseClause(clause: string): Leaf | null {
  return parsePresence(clause) || parseContains(clause) || parseMembership(clause) || parseComparison(clause)
}

function matchKeyword(text: string, index: number): string | null {
  const before = index === 0 || /\s/.test(text[index - 1] ?? '')
  if (!before) return null
  return (
    ['and', 'or'].find((word) => text.startsWith(word, index) && /\s/.test(text[index + word.length] || '')) ?? null
  )
}

function expandGroups(parts: string[]): Condition[] | null {
  const expanded: Condition[] = []
  for (const part of parts) {
    if (part === 'and' || part === 'or') {
      expanded.push(part)
      continue
    }
    if (!part.startsWith('(') || !part.endsWith(')')) {
      expanded.push(part)
      continue
    }
    const inner = toFilters(part.slice(1, -1))
    if (!inner) return null
    expanded.push(inner)
  }
  return expanded
}

function splitTopLevel(text: string): Condition[] | null {
  const parts: string[] = []
  let depth = 0
  let current = ''
  let quoteChar = ''
  for (let index = 0; index < text.length; index++) {
    const char = text[index] ?? ''
    if (quoteChar) {
      if (char === quoteChar) quoteChar = ''
      current += char
      continue
    }
    if (char === '"' || char === "'") quoteChar = char
    if (char === '(') depth++
    if (char === ')') depth--
    const keyword = depth === 0 ? matchKeyword(text, index) : null
    if (!keyword) {
      current += char
      continue
    }
    parts.push(current.trim(), keyword)
    current = ''
    index += keyword.length
  }
  parts.push(current.trim())
  return depth === 0 ? expandGroups(parts.filter(Boolean)) : null
}

export function toFilters(expression: unknown): Condition[] | null {
  const text = String(expression || '').trim()
  if (!text) return []
  const parts = splitTopLevel(text)
  if (!parts) return null
  const parsed = parts.map((part) => {
    if (part === 'and' || part === 'or') return part
    if (Array.isArray(part)) return part
    return parseClause(part as string)
  })
  return parsed.every(Boolean) ? (parsed as Condition[]) : null
}

export function isFilterExpression(expression: unknown): boolean {
  return toFilters(expression) !== null
}

function prettyField(fieldname: string): string {
  const words = String(fieldname || '').replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function describeFilter([fieldname, operator, value]: Leaf): string {
  const field = prettyField(fieldname)
  if (operator === 'is') return value === 'set' ? __('{0} is set', [field]) : __('{0} is empty', [field])
  const text = Array.isArray(value) ? value.join(', ') : String(value ?? '')
  const phrases: Record<string, string> = {
    '=': __('{0} is {1}', [field, text]),
    '!=': __('{0} is not {1}', [field, text]),
    in: __('{0} is one of {1}', [field, text]),
    'not in': __('{0} is none of {1}', [field, text]),
    like: __('{0} contains {1}', [field, text]),
    'not like': __('{0} does not contain {1}', [field, text]),
  }
  return phrases[operator] ?? `${field} ${operator} ${text}`
}

function describeConditions(conditions: Condition[]): string {
  return conditions
    .map((item) => {
      if (typeof item === 'string') return item === 'or' ? __('or') : __('and')
      return isGroup(item) ? `(${describeConditions(item)})` : describeFilter(item as Leaf)
    })
    .join(' ')
}

export function summarizeCondition(expression: unknown): string {
  const conditions = toFilters(expression)
  if (!conditions) return String(expression || '')
  return describeConditions(conditions)
}
