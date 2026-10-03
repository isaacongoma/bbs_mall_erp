import { useRef } from 'react'
import {
  ListHeader,
  ListHeaderItem,
  ListRow,
  ListRowItem,
  ListRows,
  ListSelectBanner,
  ListView,
  type ListRowData,
  type ListViewHandle,
} from '@/design-system'

export type LinkedDocColumn = { label: string; key: string; width?: string; [key: string]: unknown }

export interface LinkedDocsListViewProps {
  rows: ListRowData[]
  columns: LinkedDocColumn[]
  className?: string
  onSelectionsChanged?: (selections: Set<string | number>) => void
  viewLinkedDoc?: (row: ListRowData) => void
}

function getDoctypeName(doctype: string): string {
  return doctype.replace(/^(CRM|FCRM)\s*/, '')
}

export function LinkedDocsListView({
  rows,
  columns,
  className,
  onSelectionsChanged,
  viewLinkedDoc,
}: LinkedDocsListViewProps) {
  const handle = useRef<ListViewHandle>(null)

  return (
    <ListView
      handleRef={handle}
      className={className}
      columns={columns}
      rows={rows}
      rowKey="reference_docname"
      options={{ selectable: true, showTooltip: true, resizeColumn: true }}
      onSelectionsChange={onSelectionsChanged}
    >
      <ListHeader>
        {columns.map((column) => (
          <ListHeaderItem key={column.key} item={column} />
        ))}
      </ListHeader>
      <div className="*:mx-0 *:sm:mx-0">
        <ListRows>
          {rows.map((row) => (
            <ListRow key={row.reference_docname} row={row}>
              {({ column, item }) => (
                <div className="w-full" onClick={() => handle.current?.toggleRow(row.reference_docname)}>
                  <ListRowItem column={column} row={row} item={item} className="!w-full">
                    {({ label }) =>
                      column.key === 'title' ? (
                        <div className="flex w-full gap-2 truncate text-base">
                          <span className="max-w-[90%] truncate">{label}</span>
                          {viewLinkedDoc && (
                            <span
                              className="lucide-external-link h-4 w-4 cursor-pointer"
                              aria-hidden="true"
                              onClick={(event) => {
                                event.stopPropagation()
                                viewLinkedDoc(row)
                              }}
                            />
                          )}
                        </div>
                      ) : column.key === 'reference_doctype' ? (
                        <span className="flex gap-2 truncate text-base">{getDoctypeName(row.reference_doctype)}</span>
                      ) : (
                        <span className="truncate text-base">{label}</span>
                      )
                    }
                  </ListRowItem>
                </div>
              )}
            </ListRow>
          ))}
        </ListRows>
      </div>
      <ListSelectBanner />
    </ListView>
  )
}
