import { $, frappe, hrms } from '@/shared/frappe'

frappe.query_reports['Income Tax Deductions'] = $.extend({}, hrms.salary_slip_deductions_report_filters)
