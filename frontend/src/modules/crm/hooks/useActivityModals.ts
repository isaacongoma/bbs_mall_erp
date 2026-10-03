import { rpc } from '@/core/api/rpc'
import { router, useRoute } from '@/core/navigation'
import { capture } from '@/core/telemetry'
import { useUiStore } from '@/shared/stores/uiStore'
import type { ActivityModals } from '../types/activities'

export interface UseActivityModalsInput {
  doctype: string
  doc: Record<string, any>
  reloadActivities: () => void
}

export function useActivityModals({ doctype, doc, reloadActivities }: UseActivityModalsInput): ActivityModals {
  const route = useRoute()
  const showDoctypeModal = useUiStore((state) => state.showDoctypeModal)

  function redirect(tabName: string) {
    if (route.name === 'Lead' || route.name === 'Deal') {
      const hash = `#${tabName}`
      if (route.hash !== hash) router.push({ path: route.path, query: route.query, hash })
    }
  }

  function afterDoctype(saved: { doctype: string }, isInsert = false) {
    reloadActivities()
    const name = saved.doctype === 'FCRM Note' ? 'note' : saved.doctype === 'CRM Task' ? 'task' : 'call_log'
    const redirectHash = saved.doctype === 'CRM Call Log' ? 'calls' : `${name}s`
    capture(`${name}_${isInsert ? 'created' : 'updated'}`)
    redirect(redirectHash)
  }

  const defaults = { reference_doctype: doctype, reference_docname: doc?.name }
  const callbacks = {
    afterInsert: (saved: { doctype: string }) => afterDoctype(saved, true),
    afterUpdate: (saved: { doctype: string }) => afterDoctype(saved),
  }

  return {
    showTask: (task) => showDoctypeModal({ name: task?.name, doctype: 'CRM Task', title: 'Task', defaults, callbacks }),
    showNote: (note) =>
      showDoctypeModal({ name: note?.name, doctype: 'FCRM Note', title: 'Note', defaults, callbacks }),
    createCallLog: () =>
      showDoctypeModal({
        doctype: 'CRM Call Log',
        title: 'Call Log',
        defaults: { ...defaults, reference_doc: { ...doc } },
        callbacks,
      }),
    deleteTask: async (name) => {
      await rpc({ url: 'frappe.client.delete', params: { doctype: 'CRM Task', name } })
      reloadActivities()
    },
    updateTaskStatus: (status, task) => {
      void rpc({
        url: 'frappe.client.set_value',
        params: { doctype: 'CRM Task', name: task.name, fieldname: 'status', value: status },
      }).then(reloadActivities)
    },
  }
}
