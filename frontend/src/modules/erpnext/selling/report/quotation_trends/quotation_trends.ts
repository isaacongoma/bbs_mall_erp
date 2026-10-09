import { $, erpnext, frappe } from '@/shared/frappe'
frappe.query_reports['Quotation Trends'] = $.extend({}, erpnext.sales_trends_filters)
