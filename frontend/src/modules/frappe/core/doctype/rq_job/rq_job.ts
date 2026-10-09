import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('RQ Job', {
  refresh: function (frm?: any) {
    frm.disable_form()
    frm.dashboard.set_headline_alert(__('This is a virtual doctype and data is cleared periodically.'))
    if (['started', 'queued'].includes(frm.doc.status)) {
      frm.add_custom_button(__('Force Stop job'), () => {
        frappe.confirm(__('This will terminate the job immediately and might be dangerous, are you sure?'), () => {
          frappe
            .xcall('frappe.core.doctype.rq_job.rq_job.stop_job', {
              job_id: frm.doc.name,
            })
            .then(() => {
              frappe.show_alert(__('Job Stopped Successfully'))
              frm.reload_doc()
            })
        })
      })
    }
  },
})
