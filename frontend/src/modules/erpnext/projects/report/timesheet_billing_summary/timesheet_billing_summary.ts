import { __, frappe } from '@/shared/frappe'
frappe.query_reports['Timesheet Billing Summary'] = {
  tree: true,
  initial_depth: 0,
  filters: [
    {
      fieldname: 'employee',
      label: __('Employee'),
      fieldtype: 'Link',
      options: 'Employee',
      on_change: function (report?: any) {
        unset_group_by(report, 'employee')
      },
    },
    {
      fieldname: 'project',
      label: __('Project'),
      fieldtype: 'Link',
      options: 'Project',
      on_change: function (report?: any) {
        unset_group_by(report, 'project')
      },
    },
    {
      fieldname: 'from_date',
      label: __('From Date'),
      fieldtype: 'Date',
      default: frappe.datetime.add_months(frappe.datetime.month_start(), -1),
    },
    {
      fieldname: 'to_date',
      label: __('To Date'),
      fieldtype: 'Date',
      default: frappe.datetime.add_days(frappe.datetime.month_start(), -1),
    },
    {
      fieldname: 'group_by',
      label: __('Group By'),
      fieldtype: 'Select',
      options: [
        '',
        { value: 'employee', label: __('Employee') },
        { value: 'project', label: __('Project') },
        { value: 'date', label: __('Start Date') },
      ],
    },
    {
      fieldname: 'include_draft_timesheets',
      label: __('Include Timesheets in Draft Status'),
      fieldtype: 'Check',
    },
  ],
}
function unset_group_by(report?: any, fieldname?: any) {
  if (report.get_filter_value(fieldname) && report.get_filter_value('group_by') == fieldname) {
    report.set_filter_value('group_by', '')
  }
}
