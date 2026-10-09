import { $, frappe, hrms } from '@/shared/frappe'

frappe.query_reports['Salary Payments Based On Payment Mode'] = $.extend(
  {},
  hrms.salary_slip_deductions_report_filters,
  {
    formatter: function (value: any, row: any, column: any, data: any, default_formatter: any) {
      value = default_formatter(value, row, column, data)
      if (data.branch && data.branch.includes('Total') && column.colIndex === 1) {
        value = value.bold()
      }
      return value
    },
  },
)
