import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Salary Withholding', {
  employee(frm: any) {
    if (!frm.doc.employee) return
    frappe
      .call({
        method: 'hrms.payroll.doctype.salary_withholding.salary_withholding.get_payroll_frequency',
        args: {
          employee: frm.doc.employee,
          posting_date: frm.doc.posting_date,
        },
      })
      .then((r: any) => {
        if (r.message) {
          frm.set_value('payroll_frequency', r.message)
        }
      })
  },
  from_date(frm: any) {
    if (!frm.doc.from_date || !frm.doc.payroll_frequency)
      frappe.msgprint(__('Please select From Date and Payroll Frequency first'))
    frm
      .call({
        method: 'set_withholding_cycles_and_to_date',
        doc: frm.doc,
      })
      .then(() => {
        frm.refresh_field('to_date')
        frm.refresh_field('cycles')
      })
  },
})
