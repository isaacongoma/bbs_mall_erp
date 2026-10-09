import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Workflow Transition Tasks', {
  refresh: function (frm?: any) {
    frappe
      .call({
        method: 'frappe.workflow.doctype.workflow.workflow.get_workflow_methods',
        type: 'GET',
      })
      .then((options?: any) => {
        frm.get_field('tasks').grid.update_docfield_property('task', 'options', options.message)
      })
  },
})
