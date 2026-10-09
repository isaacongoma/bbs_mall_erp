import { __, frappe, hrms } from '@/shared/frappe'

hrms.leave_utils = {
  add_view_ledger_button(frm: any) {
    if (frm.doc.__islocal || frm.doc.docstatus != 1) return
    frm.add_custom_button(__('View Ledger'), () => {
      frappe.route_options = {
        from_date: frm.doc.from_date,
        to_date: frm.doc.to_date,
        transaction_type: frm.doc.doctype,
        transaction_name: frm.doc.name,
        company: frm.doc.company,
      }
      frappe.set_route('query-report', 'Leave Ledger')
    })
  },
  add_leave_balance_button(frm: any) {
    if (frm.doc.__islocal || !frm.doc.employee) return
    frm.add_custom_button(__('View Leave Balance'), () => {
      frappe.route_options = {
        from_date: frm.doc.from_date,
        to_date: frm.doc.to_date,
        company: frm.doc.company,
        employee: frm.doc.employee,
      }
      frappe.set_route('query-report', 'Employee Leave Balance')
    })
  },
}
