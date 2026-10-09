function cellValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function csvEscape(value: unknown): string {
  const text = cellValue(value)
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: string[]): string {
  const header = columns.map(csvEscape).join(',')
  const body = rows.map((row) => columns.map((column) => csvEscape(row[column])).join(','))
  return [header, ...body].join('\r\n')
}

export function parseCsv(content: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let quoted = false

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index]
    const next = content[index + 1]
    if (character === '"') {
      if (quoted && next === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      row.push(value)
      value = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1
      row.push(value)
      rows.push(row)
      row = []
      value = ''
    } else {
      value += character
    }
  }

  if (value || row.length) {
    row.push(value)
    rows.push(row)
  }

  return rows.filter((entry) => entry.some((cell) => cell.trim() !== ''))
}

export function downloadCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns: Array<{ key: string; label: string }>,
): void {
  const content = toCsv(rows, columns.map((column) => column.key))
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
