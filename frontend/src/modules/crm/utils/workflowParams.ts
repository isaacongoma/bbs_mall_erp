export interface ParamRow {
  field: string
  value: unknown
}

export function parseJsonFieldInput(value: string): unknown {
  if (!value) return ''
  try {
    return JSON.parse(value)
  } catch {
    return String(value)
  }
}

export function formatJsonFieldValue(value: unknown): unknown {
  return value && typeof value === 'object' ? JSON.stringify(value, null, 2) : value
}

export function paramsToRows(params: Record<string, any>): ParamRow[] {
  const rows: ParamRow[] = []
  if (params.field) rows.push({ field: params.field, value: params.value ?? '' })
  const values = params.values && typeof params.values === 'object' ? params.values : {}
  for (const [field, value] of Object.entries(values)) rows.push({ field, value })
  return rows.length ? rows : [{ field: '', value: '' }]
}

export function rowsToParams(rows: ParamRow[]) {
  const values: Record<string, unknown> = {}
  for (const row of rows) {
    if (row.field) values[row.field] = row.value
  }
  return { field: null, value: null, values }
}
