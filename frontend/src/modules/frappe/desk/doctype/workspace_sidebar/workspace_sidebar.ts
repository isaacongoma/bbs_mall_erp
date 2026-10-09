import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Workspace Sidebar', {
  refresh(frm?: any) {
    frm.set_intro(__("This is an archive of the previous navigation. Customize the module's sidebar instead."))
    frm.set_read_only()
    frm.disable_save()
  },
})
