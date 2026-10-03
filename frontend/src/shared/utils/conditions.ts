type ConditionLeaf = [string, string, unknown]
type ConditionNode = string | ConditionLeaf | ConditionNode[]

const OPERATOR_MAP: Record<string, string> = {
  equals: '==',
  '=': '==',
  '==': '==',
  '!=': '!=',
  'not equals': '!=',
  '<': '<',
  '<=': '<=',
  '>': '>',
  '>=': '>=',
  in: 'in',
  'not in': 'not in',
  like: 'like',
  'not like': 'not like',
  is: 'is',
  'is not': 'is not',
  between: 'between',
}

interface ConvertOptions {
  conditions: readonly unknown[] | null | undefined
  fieldPrefix?: string
}

function convertLeaf([field, operator, value]: ConditionLeaf, fieldPrefix?: string): string {
  const fieldAccess = fieldPrefix ? `${fieldPrefix}.${field}` : field
  const op = OPERATOR_MAP[operator.toLowerCase()] || operator
  const lowered = String(value).toLowerCase()

  if ((op === '==' || op === '!=') && (lowered === 'yes' || lowered === 'no')) {
    let checkVal = lowered === 'yes'
    if (op === '!=') checkVal = !checkVal
    return checkVal ? fieldAccess : `not ${fieldAccess}`
  }

  if (op === 'is' && lowered === 'set') return fieldAccess
  if ((op === 'is' && lowered === 'not set') || (op === 'is not' && lowered === 'set')) return `not ${fieldAccess}`

  if (op === 'like') return `(${fieldAccess} and "${value}" in ${fieldAccess})`
  if (op === 'not like') return `(${fieldAccess} and "${value}" not in ${fieldAccess})`

  if (op === 'between' && typeof value === 'string' && value.includes(',')) {
    const [start, end] = value.split(',').map((part) => part.trim())
    return `(${fieldAccess} >= "${start}" and ${fieldAccess} <= "${end}")`
  }

  if (op === 'in' || op === 'not in') {
    let items: string[]
    if (Array.isArray(value)) items = value.map((item) => `"${String(item).trim()}"`)
    else if (typeof value === 'string') items = value.split(',').map((item) => `"${item.trim()}"`)
    else items = [`"${String(value).trim()}"`]
    return `(${fieldAccess} and ${fieldAccess} ${op} [${items.join(', ')}])`
  }

  let valueStr: string
  if (typeof value === 'string') valueStr = `"${value.replace(/"/g, '\\"')}"`
  else if (typeof value === 'number' || typeof value === 'boolean') valueStr = String(value)
  else if (value === null || value === undefined) return op === '==' || op === 'is' ? `not ${fieldAccess}` : fieldAccess
  else valueStr = `"${String(value).replace(/"/g, '\\"')}"`

  return `${fieldAccess} ${op} ${valueStr}`
}

export function convertToConditions({ conditions, fieldPrefix }: ConvertOptions): string {
  if (!conditions || conditions.length === 0) return ''

  const processCondition = (condition: ConditionNode): string => {
    if (typeof condition === 'string') return condition.toLowerCase()
    if (Array.isArray(condition)) {
      if (Array.isArray(condition[0])) {
        return `(${convertToConditions({ conditions: condition as ConditionNode[], fieldPrefix })})`
      }
      return convertLeaf(condition as ConditionLeaf, fieldPrefix)
    }
    return ''
  }

  return conditions.map((condition) => processCondition(condition as ConditionNode)).join(' ')
}

export function validateConditions(conditions: unknown): boolean {
  if (!Array.isArray(conditions)) return false

  if (conditions.length === 3 && typeof conditions[0] === 'string' && typeof conditions[1] === 'string') {
    return conditions[0] !== '' && conditions[1] !== '' && conditions[2] !== ''
  }

  for (let i = 0; i < conditions.length; i++) {
    const item = conditions[i]

    if (item === 'and' || item === 'or') {
      if (i === 0 || i === conditions.length - 1 || conditions[i - 1] === 'and' || conditions[i - 1] === 'or') {
        return false
      }
      continue
    }

    if (Array.isArray(item)) {
      if (!validateConditions(item)) return false
    } else if (item !== undefined && item !== null) {
      return false
    }
  }

  return conditions.length > 0
}
