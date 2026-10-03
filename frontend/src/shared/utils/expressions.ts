type Context = Record<string, unknown>

export function _eval(code: string, context: Context = {}): unknown {
  const names = Object.keys(context)
  const values = Object.values(context)
  const body = `let out = ${code}; return out`
  try {
    const fn = new Function(...names, body)
    return fn(...values)
  } catch (error) {
    console.error('Error evaluating the following expression:')
    console.error(body)
    throw error
  }
}

type Expression = string | boolean | ((doc: any) => unknown) | null | undefined

function resolveField(expression: string, doc: Record<string, unknown>): boolean {
  const value = doc[expression]
  return Array.isArray(value) ? !!value.length : !!value
}

export function evaluateDependsOnValue(
  expression: Expression,
  doc: Record<string, unknown> | null | undefined,
): unknown {
  if (!expression) return true
  if (!doc) return true

  if (typeof expression === 'boolean') return expression
  if (typeof expression === 'function') return expression(doc)
  if (expression.slice(0, 5) === 'eval:') {
    try {
      return _eval(expression.slice(5), { doc })
    } catch {
      return true
    }
  }
  return resolveField(expression, doc)
}

export function evaluateExpression(
  expression: Expression,
  doc: Record<string, unknown> | null | undefined,
  parent?: Record<string, any> | null,
): unknown {
  if (!expression) return false
  if (!doc) return false

  if (typeof expression === 'boolean') return expression
  if (typeof expression === 'function') return expression(doc)
  if (expression.slice(0, 5) === 'eval:') {
    try {
      let out = _eval(expression.slice(5), { doc, parent })
      if (parent && parent.istable && expression.includes('is_submittable')) out = true
      return out
    } catch {
      return true
    }
  }
  return resolveField(expression, doc)
}
