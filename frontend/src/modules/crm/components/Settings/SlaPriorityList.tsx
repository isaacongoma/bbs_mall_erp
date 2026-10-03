import { useEffect, useRef, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Button, Checkbox, Dropdown, ErrorMessage, toast } from '@/design-system'
import { DurationInput } from '@/shared/components/Controls/DurationInput'
import { getGridTemplateColumnsForTable } from '@/shared/utils/collections'
import { confirmDeleteOptions } from '@/shared/utils/confirmDelete'
import type { SlaData, SlaErrors, SlaPriority } from '../../utils/sla'
import { EditResponseResolutionModal } from './EditResponseResolutionModal'

export interface SlaPriorityListProps {
  data: SlaData
  errors: SlaErrors
  isNew: boolean
  onChange: (priorities: SlaPriority[]) => void
  onValidate: () => void
}

const COLUMNS = [
  { label: 'Priority', key: 'priority', isRequired: true },
  { label: 'First Response Time', key: 'first_response_time', isRequired: true },
  { label: 'Default Priority', key: 'default_priority', isRequired: false },
]

export function SlaPriorityList({ data, errors, isNew, onChange, onValidate }: SlaPriorityListProps) {
  const [options, setOptions] = useState<{ label: string; value: string }[]>([])
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [editing, setEditing] = useState<SlaPriority | null>(null)
  const validate = useRef(onValidate)
  const seed = useRef({ isNew, onChange })

  useEffect(() => {
    validate.current = onValidate
    seed.current = { isNew, onChange }
  })

  useEffect(() => {
    let cancelled = false
    void rpc<{ name: string }[]>({
      url: 'frappe.client.get_list',
      params: { doctype: 'CRM Communication Status', fields: ['name'] },
    }).then((rows) => {
      if (cancelled) return
      const next = rows.map((row) => ({ label: row.name, value: row.name }))
      setOptions(next)
      if (seed.current.isNew) {
        seed.current.onChange(
          next.map((option, index) => ({
            priority: option.value,
            first_response_time: 60 * 60,
            default_priority: index === 0,
          })),
        )
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => validate.current(), 300)
    return () => clearTimeout(timer)
  }, [data.priorities])

  const priorities = data.priorities
  const columns = COLUMNS.map((column) => ({ ...column, label: __(column.label) }))
  const template = getGridTemplateColumnsForTable(columns.map(() => ({})))

  function update(index: number, patch: Partial<SlaPriority>) {
    onChange(priorities.map((row, at) => (at === index ? { ...row, ...patch } : row)))
  }

  function setDefault(index: number, value: boolean) {
    onChange(priorities.map((row, at) => ({ ...row, default_priority: at === index ? value : false })))
  }

  function addRow() {
    const used = priorities.map((row) => row.priority)
    const available = options.filter((option) => !used.includes(option.value))
    const first = available[0]
    if (!first) {
      toast.error(__('All available priorities have already been added'))
      return
    }
    onChange([
      ...priorities,
      { priority: first.value, first_response_time: 60 * 60, default_priority: priorities.length === 0 },
    ])
  }

  function rowOptions(row: SlaPriority, index: number) {
    return [
      { label: __('Edit'), icon: 'edit', onClick: () => setEditing(row) },
      ...confirmDeleteOptions({
        onConfirmDelete: () => onChange(priorities.filter((_, at) => at !== index)),
        isConfirmingDelete: confirmingDelete,
        setConfirmingDelete,
      }).filter((option) => option.condition()),
    ]
  }

  return (
    <>
      <div className="rounded-md border border-outline-gray-2 px-2 text-sm">
        {priorities.length !== 0 && (
          <>
            <div className="grid items-center p-3 px-4" style={{ gridTemplateColumns: template }}>
              {columns.map((column) => (
                <div
                  key={column.key}
                  className={`overflow-hidden text-ellipsis whitespace-nowrap text-ink-gray-5 ${
                    column.key === 'priority' || column.key === 'first_response_time' ? 'ml-2' : ''
                  }`}
                >
                  {column.label}
                  {column.isRequired && <span className="text-red-500">*</span>}
                </div>
              ))}
            </div>
            <hr className="border-outline-gray-2" />
          </>
        )}
        {priorities.map((row, index) => (
          <div key={row.priority}>
            <div className="grid items-center gap-2 px-4 py-3.5" style={{ gridTemplateColumns: template }}>
              {columns.map((column) => (
                <div key={column.key} className="w-full overflow-hidden text-ellipsis whitespace-nowrap">
                  {column.key === 'default_priority' ? (
                    <div>
                      <Checkbox value={row.default_priority} onChange={(value) => setDefault(index, value)} />
                    </div>
                  ) : column.key === 'first_response_time' ? (
                    <div>
                      <div className="[&_input]:bg-transparent [&_input]:hover:bg-surface-gray-2">
                        <DurationInput
                          value={row.first_response_time}
                          variant="ghost"
                          longForm
                          onChange={(value) => update(index, { first_response_time: value })}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="ml-2">
                      <select
                        value={row.priority}
                        className="-ml-2 h-7 w-full truncate rounded-md border-0 bg-transparent bg-none p-0 pl-2 pr-5 text-base text-ink-gray-8 hover:bg-surface-gray-3 focus-visible:!ring-0"
                        onChange={(event) => update(index, { priority: event.target.value })}
                      >
                        {options.map((option) => (
                          <option key={option.value} value={option.value} className="bg-surface-gray-3">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex justify-end">
                <Dropdown placement="right" options={rowOptions(row, index) as never}>
                  <Button icon="lucide-more-horizontal" variant="ghost" onClick={() => setConfirmingDelete(false)} />
                </Dropdown>
              </div>
            </div>
            {index !== priorities.length - 1 && <hr className="border-outline-gray-2" />}
          </div>
        ))}
        {priorities.length === 0 && (
          <div className="p-4 text-center text-ink-gray-5">{__('No Priorities in the list')}</div>
        )}
      </div>
      {(priorities.length !== options.length || errors.default_priority || errors.priorities) && (
        <div className="mt-2.5 flex items-center justify-between">
          <div>
            {priorities.length !== options.length && (
              <Button variant="subtle" label={__('Add Row')} iconLeft="lucide-plus" onClick={addRow} />
            )}
          </div>
          <ErrorMessage message={errors.default_priority || errors.priorities} />
        </div>
      )}
      {editing && (
        <EditResponseResolutionModal
          key={editing.priority}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          priority={editing}
          priorityOptions={options}
          onSave={(original, next) =>
            onChange(
              priorities.map((row) =>
                row.priority === original.priority
                  ? next
                  : next.default_priority
                    ? { ...row, default_priority: false }
                    : row,
              ),
            )
          }
          onDelete={(original) => onChange(priorities.filter((row) => row.priority !== original.priority))}
        />
      )}
    </>
  )
}
