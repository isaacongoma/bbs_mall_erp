import { useState } from 'react'
import { __ } from '@/core/i18n'
import { router } from '@/core/navigation'
import { Avatar, Button, Dropdown, Tooltip, type ListRowData } from '@/design-system'
import { DeleteLinkedDocModal } from '@/shared/components/DeleteLinkedDocModal'
import { ArrowUpRightIcon } from '@/shared/components/Icons'
import { KanbanView } from '@/shared/components/Kanban'
import type { ViewController } from '@/shared/hooks/useViewController'
import { getRowCell } from '@/shared/utils/listRows'
import { sanitizeHTML } from '@/shared/utils/text'
import { TaskPriorityIcon, TaskStatusIcon } from './Icons'

type AnyRecord = Record<string, any>

export interface TasksKanbanProps {
  controller: ViewController
  rows: ListRowData[]
  onShowTask: (name: string) => void
  onCreateTask: (column?: AnyRecord) => void
}

export function TasksKanban({ controller, rows, onShowTask, onCreateTask }: TasksKanbanProps) {
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const cell = (itemName: string, field: string) => getRowCell(rows, itemName, field)

  function redirect(doctype: string, docname: string) {
    if (!docname) return
    if (doctype === 'CRM Deal') router.push({ name: 'Deal', params: { dealId: docname } })
    else router.push({ name: 'Lead', params: { leadId: docname } })
  }

  function actions(name: string) {
    return [
      { label: __('Edit'), icon: 'edit-2', onClick: () => onShowTask(name) },
      { label: __('Delete'), icon: 'trash-2', onClick: () => setTaskToDelete(name) },
    ]
  }

  return (
    <>
      <KanbanView
        list={controller.list}
        options={{ onClick: (row) => onShowTask(row.name), onNewClick: (column) => onCreateTask(column) }}
        onUpdate={(data) => controller.updateKanbanSettings(data as never)}
        onLoadMore={(columnName) => controller.loadMoreKanban(columnName)}
        renderTitle={({ titleField, itemName }) => {
          const value = cell(itemName, titleField)
          return (
            <div className="flex items-center gap-2">
              {titleField === 'status' && (
                <div>
                  <TaskStatusIcon status={value.label} />
                </div>
              )}
              {titleField === 'priority' && (
                <div>
                  <TaskPriorityIcon priority={value.label} />
                </div>
              )}
              {titleField === 'assigned_to' && value.full_name && (
                <div>
                  <Avatar className="flex items-center" image={value.user_image} label={value.full_name} size="sm" />
                </div>
              )}
              {['modified', 'creation'].includes(titleField) ? (
                <div className="truncate text-base">
                  <Tooltip text={value.label}>
                    <div>{value.timeAgo}</div>
                  </Tooltip>
                </div>
              ) : value.label ? (
                <div className="truncate text-base">{value.label}</div>
              ) : (
                <div className="text-ink-gray-4">{__('No Title')}</div>
              )}
            </div>
          )
        }}
        renderField={({ fieldName, itemName }) => {
          const value = cell(itemName, fieldName)
          if (!value.label) return null
          return (
            <div className="flex items-center gap-2 truncate">
              {fieldName === 'status' && (
                <div>
                  <TaskStatusIcon className="size-3" status={value.label} />
                </div>
              )}
              {fieldName === 'priority' && (
                <div>
                  <TaskPriorityIcon priority={value.label} />
                </div>
              )}
              {fieldName === 'assigned_to' && value.full_name && (
                <div>
                  <Avatar className="flex items-center" image={value.user_image} label={value.full_name} size="sm" />
                </div>
              )}
              {['modified', 'creation'].includes(fieldName) ? (
                <div className="truncate text-base">
                  <Tooltip text={value.label}>
                    <div>{value.timeAgo}</div>
                  </Tooltip>
                </div>
              ) : fieldName === 'description' ? (
                <div className="max-h-44 truncate text-base">
                  <div
                    className="prose-f prose-sm max-w-none flex-1 overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: sanitizeHTML(value.label) }}
                  />
                </div>
              ) : (
                <div className="truncate text-base">{value.label}</div>
              )}
            </div>
          )
        }}
        renderActions={({ itemName }) => (
          <div className="flex items-center justify-between gap-2">
            <div>
              {cell(itemName, 'reference_docname').label && (
                <Button
                  className="-ml-2"
                  variant="ghost"
                  size="sm"
                  label={cell(itemName, 'reference_doctype').label === 'CRM Deal' ? __('Deal') : __('Lead')}
                  iconRight={ArrowUpRightIcon}
                  onClick={(event) => {
                    event.stopPropagation()
                    redirect(cell(itemName, 'reference_doctype').label, cell(itemName, 'reference_docname').label)
                  }}
                />
              )}
            </div>
            <span
              className="flex items-center gap-2"
              onClick={(event) => {
                event.stopPropagation()
                event.preventDefault()
              }}
            >
              <Dropdown options={actions(itemName) as never}>
                <Button icon="lucide-more-horizontal" variant="ghost" />
              </Dropdown>
            </span>
          </div>
        )}
      />
      {taskToDelete && (
        <DeleteLinkedDocModal
          open
          onOpenChange={(open) => {
            if (!open) setTaskToDelete(null)
          }}
          name="Tasks"
          doctype="CRM Task"
          docname={taskToDelete}
          reload={() => void controller.list.reload().catch(() => undefined)}
        />
      )}
    </>
  )
}
