import { $, __, frappe, refresh_field } from '@/shared/frappe'

frappe.ui.form.on('Employee Separation', {
  setup: function (frm: any) {
    frm.add_fetch('employee_separation_template', 'company', 'company')
    frm.add_fetch('employee_separation_template', 'department', 'department')
    frm.add_fetch('employee_separation_template', 'designation', 'designation')
    frm.add_fetch('employee_separation_template', 'employee_grade', 'employee_grade')
  },
  refresh: function (frm: any) {
    if (frm.doc.employee) {
      frm.add_custom_button(
        __('Employee'),
        function () {
          frappe.set_route('Form', 'Employee', frm.doc.employee)
        },
        __('View'),
      )
    }
    if (frm.doc.project) {
      frm.add_custom_button(
        __('Project'),
        function () {
          frappe.set_route('Form', 'Project', frm.doc.project)
        },
        __('View'),
      )
      frm.add_custom_button(
        __('Task'),
        function () {
          frappe.set_route('List', 'Task', { project: frm.doc.project })
        },
        __('View'),
      )
    }
  },
  employee_separation_template: function (frm: any) {
    frm.set_value('activities', '')
    if (frm.doc.employee_separation_template) {
      frappe.call({
        method: 'hrms.controllers.employee_boarding_controller.get_onboarding_details',
        args: {
          parent: frm.doc.employee_separation_template,
          parenttype: 'Employee Separation Template',
        },
        callback: function (r: any) {
          if (r.message) {
            $.each(r.message, function (_i: any, d: any) {
              let row = frappe.model.add_child(frm.doc, 'Employee Boarding Activity', 'activities')
              $.extend(row, d)
            })
          }
          refresh_field('activities')
        },
      })
    }
  },
})
