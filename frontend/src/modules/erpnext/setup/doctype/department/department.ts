import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Department', {
  onload: function (frm?: any) {
    frm.set_query('parent_department', function () {
      return { filters: [['Department', 'is_group', '=', 1]] }
    })
  },
  refresh: function (frm?: any) {
    if (!frm.doc.parent_department && !frm.is_new()) {
      frm.set_read_only()
      frm.set_intro(__('This is a root department and cannot be edited.'))
    }
  },
  validate: function (frm?: any) {
    if (frm.doc.name == 'All Departments') {
      frappe.throw(__('You cannot edit the root node.'))
    }
  },
})
