import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Web Template', {
  refresh: function (frm?: any) {
    if (!frappe.boot.developer_mode && frm.doc.standard) {
      frm.disable_form()
    }
    frm.toggle_display('standard', frappe.boot.developer_mode)
    frm.toggle_display('template', !frm.doc.standard)
  },
  standard: function (frm?: any) {
    if (!frm.doc.standard && !frm.is_new()) {
      frm.toggle_display('template', false)
      frm.dashboard.clear_headline()
      frm.dashboard.set_headline(__('Please save to edit the template.'))
    }
  },
})
