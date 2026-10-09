import { __, frappe } from '@/shared/frappe'
frappe.provide('erpnext.projects')
frappe.ui.form.on('Task', {
  setup: function (frm?: any) {
    frm.make_methods = {
      Timesheet: () =>
        frappe.model.open_mapped_doc({
          method: 'erpnext.projects.doctype.task.task.make_timesheet',
          frm: frm,
        }),
    }
  },
  onload: function (frm?: any) {
    frm.set_query('project', function () {
      return {
        query: 'erpnext.controllers.queries.get_project_name',
      }
    })
    frm.set_query('task', 'depends_on', function () {
      const filters: any = {
        name: ['!=', frm.doc.name],
      }
      if (frm.doc.project) filters['project'] = frm.doc.project
      return {
        filters: filters,
      }
    })
    frm.set_query('parent_task', function () {
      const filters: any = {
        is_group: 1,
        name: ['!=', frm.doc.name],
      }
      if (frm.doc.project) filters['project'] = frm.doc.project
      return {
        filters: filters,
      }
    })
  },
  is_group: function (frm?: any) {
    frappe.call({
      method: 'erpnext.projects.doctype.task.task.check_if_child_exists',
      args: {
        name: frm.doc.name,
      },
      callback: function (r?: any) {
        if (r.message.length > 0) {
          const message = __('Cannot convert Task to non-group because the following child Tasks exist: {0}.', [
            r.message.join(', '),
          ])
          frappe.msgprint(message)
          frm.reload_doc()
        }
      },
    })
  },
  validate: function (frm?: any) {
    frm.doc.project && frappe.model.remove_from_locals('Project', frm.doc.project)
  },
})
