import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Console Log', {
  refresh: function (frm?: any) {
    frm.add_custom_button(__('Re-Run in Console'), () => {
      window.localStorage.setItem('system_console_code', frm.doc.script)
      window.localStorage.setItem('system_console_type', frm.doc.type)
      frappe.set_route('Form', 'System Console')
    })
  },
})
