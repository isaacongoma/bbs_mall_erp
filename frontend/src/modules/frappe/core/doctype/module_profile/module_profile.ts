import { $, frappe, has_common } from '@/shared/frappe'
frappe.ui.form.on('Module Profile', {
  refresh: function (frm?: any) {
    if (has_common(frappe.user_roles, ['Administrator', 'System Manager'])) {
      if (!frm.module_editor && frm.doc.__onload && frm.doc.__onload.all_modules) {
        const module_area = $(frm.fields_dict.module_html.wrapper)
        frm.module_editor = new frappe.ModuleEditor(frm, module_area)
      }
    }
    if (frm.module_editor) {
      frm.module_editor.show()
    }
  },
  validate: function (frm?: any) {
    if (frm.module_editor) {
      frm.module_editor.set_modules_in_table()
    }
  },
})
