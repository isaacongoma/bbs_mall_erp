import { erpnext, frappe } from '@/shared/frappe'
frappe.query_reports['Stock Balance'] = erpnext.get_stock_balance_report_settings()
erpnext.utils.add_inventory_dimensions('Stock Balance', 8)
