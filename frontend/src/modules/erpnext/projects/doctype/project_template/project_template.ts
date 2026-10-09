import { frappe, locals, refresh_field } from '@/shared/frappe'
frappe.ui.form.on('Project Template', {
  setup: function (frm?: any) {
    frm.set_query('task', 'tasks', function () {
      return {
        filters: {
          is_template: 1,
        },
      }
    })
  },
})
frappe.ui.form.on('Project Template Task', {
  task: function (_frm?: any, cdt?: any, cdn?: any) {
    const row = locals[cdt][cdn]
    if (!row.task) {
      row.subject = null
      refresh_field('tasks')
      return
    }
    frappe.db.get_value('Task', row.task, 'subject', (value?: any) => {
      row.subject = value.subject
      refresh_field('tasks')
    })
  },
})
