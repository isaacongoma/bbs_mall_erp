import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Bin', {
  refresh(frm?: any) {
    frm.trigger('recalculate_values')
  },
  recalculate_values(frm?: any) {
    frm.add_custom_button(__('Recalculate Values'), () => {
      frappe.call({
        method: 'recalculate_values',
        freeze: true,
        doc: frm.doc,
        callback: function () {
          frappe.show_alert(__('Bin Values Recalculated'), 2)
        },
      })
    })
  },
})
