import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { capture } from '@/core/telemetry'
import type { Assignee } from '../components/AssignmentModal'

export type AssignOnUpdate = (
  added: string[],
  removed: string[],
  actions: {
    addAssignees: (names: string[]) => Promise<unknown>
    removeAssignees: (names: string[]) => Promise<unknown>
  },
) => void | Promise<void>

export interface UseAssigneeSyncInput {
  doctype: string
  docname: string
  assignees: Assignee[]
  onUpdate?: AssignOnUpdate | null
}

export function useAssigneeSync({ doctype, docname, assignees, onUpdate = null }: UseAssigneeSyncInput) {
  const [oldAssignees, setOldAssignees] = useState<Assignee[]>([])
  const [open, setOpen] = useState(false)

  async function addAssignees(names: string[]) {
    const result = await rpc({
      url: 'frappe.desk.form.assign_to.add',
      params: { doctype, name: docname, assign_to: names },
    })
    capture('assign_to', { doctype })
    return result
  }

  function removeAssignees(names: string[]) {
    return rpc({ url: 'crm.api.doc.remove_assignments', params: { doctype, name: docname, assignees: names } })
  }

  async function commit() {
    if (JSON.stringify(oldAssignees) === JSON.stringify(assignees)) return
    const removed = oldAssignees
      .filter((assignee) => !assignees.some((entry) => entry.name === assignee.name))
      .map((assignee) => assignee.name)
    const added = assignees
      .filter((assignee) => !oldAssignees.some((entry) => entry.name === assignee.name))
      .map((assignee) => assignee.name)

    if (onUpdate) {
      await onUpdate(added, removed, { addAssignees, removeAssignees })
    } else {
      if (removed.length) await removeAssignees(removed)
      if (added.length) void addAssignees(added)
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (next) setOldAssignees([...assignees])
    else void commit()
  }

  return { open, onOpenChange }
}
