import { frappe } from '@/shared/frappe'

frappe.ui.form.on('Arrear', {
  setup(frm: any) {
    const companyFilter = () => (frm.doc.company ? { filters: { company: frm.doc.company } } : {})
    frm.set_query('employee', () => companyFilter())
    frm.set_query('payroll_period', () => companyFilter())
    frm.set_query('salary_structure', () => companyFilter())
  },
  employee: (frm: any) => {
    if (frm.doc.employee) {
      frm.trigger('get_employee_currency')
      frm.trigger('set_company')
    } else {
      frm.set_value('company', null)
    }
  },
  get_employee_currency: (frm: any) => {
    frappe.call({
      method: 'hrms.payroll.doctype.salary_structure_assignment.salary_structure_assignment.get_employee_currency',
      args: {
        employee: frm.doc.employee,
      },
      callback: (r: any) => {
        if (r.message) {
          frm.set_value('currency', r.message)
        }
      },
    })
  },
  set_company: (frm: any) => {
    if (frm.doc.employee) {
      return frappe.db.get_value('Employee', frm.doc.employee, 'company').then(({ message }: any) => {
        if (message?.company) {
          frm.set_value('company', message.company)
        }
      })
    }
  },
})
