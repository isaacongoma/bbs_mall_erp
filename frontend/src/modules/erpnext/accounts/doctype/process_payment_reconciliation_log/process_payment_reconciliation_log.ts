import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Process Payment Reconciliation Log', {
  refresh(frm?: any) {
    if (['Completed', 'Running', 'Paused', 'Partially Reconciled'].find((x?: any) => x == frm.doc.status)) {
      let progress = 0
      if (frm.doc.reconciled_entries != 0) {
        progress = (frm.doc.reconciled_entries / frm.doc.total_allocations) * 100
      } else if (frm.doc.total_allocations == 0 && frm.doc.status == 'Completed') {
        progress = 100
      }
      frm.dashboard.add_progress(__('Reconciliation Progress'), progress)
    }
  },
})
