import { __ } from '@/core/i18n'
import { capture } from '@/core/telemetry'
import { Avatar, Badge, Button, Dropdown, Tooltip, type ListRowData } from '@/design-system'
import { CommentIcon, EmailAtIcon, IndicatorIcon, PhoneIcon } from '@/shared/components/Icons'
import { KanbanView } from '@/shared/components/Kanban'
import { MultipleAvatar } from '@/shared/components/MultipleAvatar'
import type { ViewController } from '@/shared/hooks/useViewController'
import { useGlobalStore } from '@/shared/stores/globalStore'
import { useUiStore } from '@/shared/stores/uiStore'
import { getRowCell } from '@/shared/utils/listRows'
import { useIntegrationsStore } from '../stores/integrationsStore'
import { NoteIcon, TaskIcon } from './Icons'

type AnyRecord = Record<string, any>

const TIME_FIELDS = ['modified', 'creation', 'first_response_time', 'first_responded_on', 'response_by']

export interface CrmKanbanProps {
  doctype: 'CRM Lead' | 'CRM Deal'
  routeName: 'Lead' | 'Deal'
  paramName: 'leadId' | 'dealId'
  controller: ViewController
  rows: ListRowData[]
  viewQuery?: string
  viewType?: string
  onNewClick: (column: AnyRecord) => void
}

function KanbanValue({
  doctype,
  field,
  cell,
  size,
}: {
  doctype: string
  field: string
  cell: AnyRecord
  size: 'sm' | 'xs'
}) {
  const isLead = doctype === 'CRM Lead'
  return (
    <>
      {field === 'status' && (
        <div>
          <IndicatorIcon className={cell.color} />
        </div>
      )}
      {field === 'organization' && cell.label && (
        <div>
          <Avatar className="flex items-center" image={cell.logo} label={cell.label} size={size} />
        </div>
      )}
      {isLead && field === 'lead_name' && cell.label && (
        <div>
          <Avatar className="flex items-center" image={cell.image} label={cell.image_label} size={size} />
        </div>
      )}
      {field === (isLead ? 'lead_owner' : 'deal_owner') && cell.full_name && (
        <div>
          <Avatar className="flex items-center" image={cell.user_image} label={cell.full_name} size={size} />
        </div>
      )}
    </>
  )
}

export function CrmKanban({
  doctype,
  routeName,
  paramName,
  controller,
  rows,
  viewQuery,
  viewType,
  onNewClick,
}: CrmKanbanProps) {
  const makeCall = useGlobalStore((state) => state.makeCall)
  const callEnabled = useIntegrationsStore((state) => state.callEnabled)
  const showDoctypeModal = useUiStore((state) => state.showDoctypeModal)
  const isLead = doctype === 'CRM Lead'

  const cell = (itemName: string, field: string) => getRowCell(rows, itemName, field)

  function after(created: AnyRecord, isNew = false) {
    const kind = created.doctype === 'FCRM Note' ? 'note' : 'task'
    capture(`${kind}_${isNew ? 'created' : 'updated'}`)
  }

  function showReferenced(referencedDoctype: 'FCRM Note' | 'CRM Task', title: string, name: string) {
    showDoctypeModal({
      doctype: referencedDoctype,
      title,
      defaults: { reference_doctype: doctype, reference_docname: name },
      callbacks: { afterInsert: (created: AnyRecord) => after(created, true), afterUpdate: after },
    })
  }

  function actions(itemName: string) {
    const mobileNo = cell(itemName, 'mobile_no')?.label || ''
    return [
      ...(mobileNo && callEnabled
        ? [{ icon: <PhoneIcon className="h-4 w-4" />, label: __('Make a Call'), onClick: () => makeCall(mobileNo) }]
        : []),
      {
        icon: <NoteIcon className="h-4 w-4" />,
        label: __('New Note'),
        onClick: () => showReferenced('FCRM Note', 'Note', itemName),
      },
      {
        icon: <TaskIcon className="h-4 w-4" />,
        label: __('New Task'),
        onClick: () => showReferenced('CRM Task', 'Task', itemName),
      },
    ]
  }

  return (
    <KanbanView
      list={controller.list}
      options={{
        getRoute: (row) => ({
          name: routeName,
          params: { [paramName]: row.name },
          query: { view: viewQuery, viewType },
        }),
        onNewClick,
      }}
      onUpdate={(data) => controller.updateKanbanSettings(data as never)}
      onLoadMore={(columnName) => controller.loadMoreKanban(columnName)}
      renderTitle={({ titleField, itemName }) => {
        const value = cell(itemName, titleField)
        return (
          <div className="flex items-center gap-2">
            <KanbanValue doctype={doctype} field={titleField} cell={value} size="sm" />
            {isLead && titleField === 'mobile_no' && (
              <div>
                <PhoneIcon className="h-4 w-4" />
              </div>
            )}
            {TIME_FIELDS.includes(titleField) ? (
              <div className="truncate text-base">
                <Tooltip text={value.label}>
                  <div>{value.timeAgo}</div>
                </Tooltip>
              </div>
            ) : titleField === 'sla_status' ? (
              <div className="truncate text-base">
                {value.value && <Badge variant="subtle" theme={value.color} size="md" label={value.value} />}
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
            <KanbanValue doctype={doctype} field={fieldName} cell={value} size="xs" />
            {TIME_FIELDS.includes(fieldName) ? (
              <div className="truncate text-base">
                <Tooltip text={value.label}>
                  <div>{value.timeAgo}</div>
                </Tooltip>
              </div>
            ) : fieldName === 'sla_status' ? (
              <div className="truncate text-base">
                {value.value && <Badge variant="subtle" theme={value.color} size="md" label={value.value} />}
              </div>
            ) : fieldName === '_assign' ? (
              <div className="flex items-center truncate">
                <MultipleAvatar avatars={value.label} size="xs" />
              </div>
            ) : (
              <div className="truncate text-base">{value.label}</div>
            )}
          </div>
        )
      }}
      renderActions={({ itemName }) => (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-ink-gray-5">
            <EmailAtIcon className="h-4 w-4" />
            {cell(itemName, '_email_count').label && <span>{cell(itemName, '_email_count').label}</span>}
            <span className="text-4xl leading-[0]"> &middot; </span>
            <NoteIcon className="h-4 w-4" />
            {cell(itemName, '_note_count').label && <span>{cell(itemName, '_note_count').label}</span>}
            <span className="text-4xl leading-[0]"> &middot; </span>
            <TaskIcon className="h-4 w-4" />
            {cell(itemName, '_task_count').label && <span>{cell(itemName, '_task_count').label}</span>}
            <span className="text-4xl leading-[0]"> &middot; </span>
            <CommentIcon className="h-4 w-4" />
            {cell(itemName, '_comment_count').label && <span>{cell(itemName, '_comment_count').label}</span>}
          </div>
          <span
            className="flex items-center gap-2"
            onClick={(event) => {
              event.stopPropagation()
              event.preventDefault()
            }}
          >
            <Dropdown options={actions(itemName) as never}>
              <Button icon="lucide-plus" variant="ghost" />
            </Dropdown>
          </span>
        </div>
      )}
    />
  )
}
