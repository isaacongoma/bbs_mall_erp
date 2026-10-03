import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { capture } from '@/core/telemetry'
import { Button, Dialog, ErrorMessage, Tooltip } from '@/design-system'
import { useUsers } from '../hooks/useUsers'
import { Link } from './Controls/Link'
import { UserAvatar } from './UserAvatar'

export interface Assignee {
  name: string
  image?: string | null
  label?: string
}

export interface AssignmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignees: Assignee[]
  onAssigneesChange: (assignees: Assignee[]) => void
  doc?: { name: string } | null
  docs?: Set<string>
  doctype?: string
  onReload?: () => void
}

export function AssignmentModal({
  open,
  onOpenChange,
  assignees,
  onAssigneesChange,
  doc = null,
  docs = new Set(),
  doctype = '',
  onReload,
}: AssignmentModalProps) {
  const { crmUsers, getUser } = useUsers()
  const [oldAssignees] = useState<Assignee[]>(() => [...assignees])
  const [error, setError] = useState('')

  function removeValue(name: string) {
    onAssigneesChange(assignees.filter((assignee) => assignee.name !== name))
  }

  function addValue(name: string) {
    setError('')
    if (!name) return
    const user = getUser(name)
    if (!assignees.some((assignee) => assignee.name === name)) {
      onAssigneesChange([...assignees, { name, image: user.user_image, label: user.full_name }])
    }
  }

  function cancel() {
    onAssigneesChange([...oldAssignees])
    onOpenChange(false)
  }

  async function updateAssignees() {
    const removed = oldAssignees
      .filter((assignee) => !assignees.some((entry) => entry.name === assignee.name))
      .map((assignee) => assignee.name)
    const added = assignees
      .filter((assignee) => !oldAssignees.some((entry) => entry.name === assignee.name))
      .map((assignee) => assignee.name)

    if (removed.length) {
      await rpc({
        url: 'crm.api.doc.remove_assignments',
        params: { doctype, name: doc?.name, assignees: JSON.stringify(removed) },
      })
    }

    if (added.length) {
      if (docs.size) {
        capture('bulk_assign_to', { doctype })
        void rpc({
          url: 'frappe.desk.form.assign_to.add_multiple',
          params: {
            doctype,
            name: JSON.stringify(Array.from(docs)),
            assign_to: added,
            bulk_assign: true,
            re_assign: true,
          },
        }).then(() => onReload?.())
      } else {
        capture('assign_to', { doctype })
        void rpc({ url: 'frappe.desk.form.assign_to.add', params: { doctype, name: doc?.name, assign_to: added } })
      }
    }
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) cancel()
        else onOpenChange(next)
      }}
      title={__('Assign To')}
      size="xl"
      actionsContent={() => (
        <div className="flex items-center justify-between gap-2">
          <div>
            <ErrorMessage message={__(error)} />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="subtle" label={__('Cancel')} onClick={cancel} />
            <Button variant="solid" label={__('Update')} onClick={() => void updateAssignees()} />
          </div>
        </div>
      )}
    >
      <Link
        className="form-control"
        value=""
        doctype="User"
        placeholder={__('John Doe')}
        filters={{ name: ['in', crmUsers.map((user) => user.name)], ignore_user_type: 1 }}
        hideMe
        onChange={addValue}
        target={({ togglePopover }) => (
          <div
            className="flex min-h-12 w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg bg-surface-gray-2 p-1.5 pb-5"
            onClick={(event) => {
              event.stopPropagation()
              togglePopover()
            }}
          >
            {assignees.map((assignee) => (
              <Tooltip key={assignee.name} text={assignee.name}>
                <div onClick={(event) => event.stopPropagation()}>
                  <div className="flex items-center rounded-full border border-outline-gray-1 bg-surface-base !p-0.5 text-sm text-ink-gray-6 hover:bg-surface-base">
                    <UserAvatar user={assignee.name} size="sm" />
                    <div className="ml-1">{getUser(assignee.name).full_name}</div>
                    <Button
                      variant="ghost"
                      className="m-1 !size-4 rounded-full"
                      onClick={(event) => {
                        event.stopPropagation()
                        removeValue(assignee.name)
                      }}
                    >
                      <span className="lucide-x h-3 w-3 text-ink-gray-6" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </Tooltip>
            ))}
          </div>
        )}
        itemPrefix={({ item }) => <UserAvatar className="mr-2" user={String(item.value)} size="sm" />}
        itemLabel={({ item }) => (
          <Tooltip text={String(item.value)}>
            <div className="cursor-pointer text-ink-gray-9">{getUser(String(item.value)).full_name}</div>
          </Tooltip>
        )}
      />
    </Dialog>
  )
}
