import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Page', {
  refresh: function (frm?: any) {
    if (!frappe.boot.developer_mode && frappe.session.user != 'Administrator') {
      frm.set_read_only()
    }
    if (!frm.is_new() && !frm.doc.istable) {
      frm.add_custom_button(__('Go to {0} Page', [frm.doc.title || frm.doc.name]), () => {
        frappe.set_route(frm.doc.name)
      })
    }
  },
})
