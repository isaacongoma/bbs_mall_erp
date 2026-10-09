import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Module Def', {
  refresh: function (frm?: any) {
    frappe.xcall('frappe.core.doctype.module_def.module_def.get_installed_apps').then((r?: any) => {
      frm.set_df_property('app_name', 'options', ['', ...JSON.parse(r)])
      if (!frm.doc.app_name && !frm.doc.custom) {
        frm.set_value('app_name', 'frappe')
      }
    })
    if (!frappe.boot.developer_mode) {
      frm.set_df_property('custom', 'read_only', 1)
      if (frm.is_new()) {
        frm.set_value('custom', 1)
      }
    }
  },
})
