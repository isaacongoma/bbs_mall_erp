import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Stock Closing Entry', {
  refresh(frm?: any) {
    frm.trigger('generate_closing_balance')
    frm.trigger('regenerate_closing_balance')
  },
  generate_closing_balance(frm?: any) {
    if (['Queued', 'Failed'].includes(frm.doc.status)) {
      frm.add_custom_button(__('Generate Stock Closing Entry'), () => {
        frm.call({
          method: 'enqueue_job',
          doc: frm.doc,
          freeze: true,
          callback: () => {
            frm.reload_doc()
          },
        })
      })
    }
  },
  regenerate_closing_balance(frm?: any) {
    if (frm.doc.status == 'Completed') {
      frm.add_custom_button(__('Regenerate Stock Closing Entry'), () => {
        frm.call({
          method: 'regenerate_closing_balance',
          doc: frm.doc,
          freeze: true,
          callback: () => {
            frm.reload_doc()
          },
        })
      })
    }
  },
})
