import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { Button, Dialog, Dropdown, FormControl, Switch, toast } from '@/design-system'
import { confirmDeleteOptions } from '@/shared/utils/confirmDelete'
import { PRIORITY_OPTIONS } from '../../utils/assignmentRules'

type AnyRecord = Record<string, any>

export interface AssignmentRuleListItemProps {
  data: AnyRecord
  onReload: () => void
  onOpen: (data: AnyRecord | null) => void
}

export function AssignmentRuleListItem({ data, onReload, onOpen }: AssignmentRuleListItemProps) {
  const [priority, setPriority] = useState(String(data.priority))
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [duplicate, setDuplicate] = useState({ show: false, name: '' })

  async function setValue(key: string, value: unknown, fieldName?: string) {
    try {
      await rpc({
        url: 'frappe.client.set_value',
        params: { doctype: 'Assignment Rule', name: data.name, fieldname: key, value },
      })
      onReload()
      toast.success(__('Assignment rule {0} updated', [fieldName || key]))
    } catch (failure) {
      toast.error(toErrorMessage(failure))
    }
  }

  async function remove() {
    try {
      await rpc({ url: 'frappe.client.delete', params: { doctype: 'Assignment Rule', name: data.name } })
      onReload()
      setConfirmingDelete(false)
      toast.success(__('Assignment rule deleted'))
    } catch (failure) {
      toast.error(toErrorMessage(failure))
    }
  }

  async function duplicateRule() {
    try {
      const created = await rpc<AnyRecord>({
        url: 'crm.api.assignment_rule.duplicate_assignment_rule',
        params: { docname: data.name, new_name: duplicate.name },
      })
      onReload()
      toast.success(__('Assignment rule duplicated'))
      setDuplicate({ show: false, name: '' })
      onOpen(created)
    } catch (failure) {
      toast.error(toErrorMessage(failure))
    }
  }

  function toggle() {
    if (!data.users_exists && data.disabled) {
      toast.error(__('Cannot enable rule without adding users in it'))
      return
    }
    void setValue('disabled', !data.disabled, 'status')
  }

  const options = [
    { label: __('Duplicate'), icon: 'copy', onClick: () => setDuplicate({ show: true, name: `${data.name} (Copy)` }) },
    ...confirmDeleteOptions({
      onConfirmDelete: () => void remove(),
      isConfirmingDelete: confirmingDelete,
      setConfirmingDelete,
    }).filter((option) => option.condition()),
  ]

  return (
    <>
      <div className="flex cursor-pointer items-center justify-between rounded p-3 hover:bg-surface-sidebar">
        <div className="w-7/12" onClick={() => onOpen(data)}>
          <div className="text-base-medium text-ink-gray-7">{data.name}</div>
          {data.description && data.description.length > 0 && (
            <div className="mt-0.5 w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-p-base text-ink-gray-5">
              {data.description}
            </div>
          )}
        </div>
        <div className="w-3/12">
          <select
            value={priority}
            className="-ml-2 h-7 w-full truncate rounded-md border-0 bg-transparent bg-none p-0 pl-2 pr-5 text-base text-ink-gray-8 hover:bg-surface-gray-3 focus-visible:!ring-0"
            onChange={(event) => {
              setPriority(event.target.value)
              void setValue('priority', event.target.value)
            }}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-2/12 items-center justify-between">
          <Switch size="sm" value={!data.disabled} onChange={toggle} />
          <Dropdown placement="right" options={options as never}>
            <Button icon="lucide-more-horizontal" variant="ghost" onClick={() => setConfirmingDelete(false)} />
          </Dropdown>
        </div>
      </div>
      <Dialog
        open={duplicate.show}
        onOpenChange={(open) => setDuplicate((current) => ({ ...current, show: open }))}
        title={__('Duplicate Assignment Rule')}
        actionsContent={() => (
          <div className="flex justify-end gap-2">
            <Button variant="subtle" label={__('Close')} onClick={() => setDuplicate({ show: false, name: '' })} />
            <Button variant="solid" label={__('Duplicate')} onClick={() => void duplicateRule()} />
          </div>
        )}
      >
        <div className="flex flex-col gap-4">
          <FormControl
            label={__('New Assignment Rule Name')}
            type="text"
            value={duplicate.name}
            onChange={(value: string) => setDuplicate((current) => ({ ...current, name: value }))}
          />
        </div>
      </Dialog>
    </>
  )
}
