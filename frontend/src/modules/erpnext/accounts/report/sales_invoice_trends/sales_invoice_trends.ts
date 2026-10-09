import { $, erpnext, frappe } from '@/shared/frappe'
frappe.query_reports['Sales Invoice Trends'] = $.extend({}, erpnext.sales_trends_filters)
