import type { ListAlign, ListColumn } from '../types/listView'

export function getGridTemplateColumns(columns: ListColumn[], withCheckbox = true): string {
  const checkboxWidth = withCheckbox ? '14px ' : ''
  const columnsWidth = columns
    .map((column) => {
      const width = column.width || 1
      return typeof width === 'number' ? `${width}fr` : width
    })
    .join(' ')
  return checkboxWidth + columnsWidth
}

export const alignmentMap: Record<ListAlign, string> = {
  left: 'justify-start',
  start: 'justify-start',
  center: 'justify-center',
  middle: 'justify-center',
  right: 'justify-end',
  end: 'justify-end',
}

export function alignClass(align: ListAlign | undefined): string | undefined {
  return align ? alignmentMap[align] : undefined
}
