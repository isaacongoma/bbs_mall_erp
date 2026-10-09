import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Job Opening Template', {
  refresh(frm: any) {
    if (!frm.doc.__islocal) {
      frm.add_custom_button(__('Create Job Opening'), () => {
        frappe.model.open_mapped_doc({
          method: 'hrms.hr.doctype.job_opening_template.job_opening_template.create_job_opening_from_template',
          frm: frm,
        })
      })
    }
  },
})
