import { $, erpnext, frappe } from '@/shared/frappe'
frappe.query_reports['Purchase Invoice Trends'] = $.extend({}, erpnext.purchase_trends_filters)
