import { frappe } from '@/shared/frappe'

frappe.ui.form.on('Employee Benefit Claim', {
  setup: (frm: any) => {
    frm.set_query('earning_component', () => {
      return {
        query: 'hrms.payroll.doctype.employee_benefit_claim.employee_benefit_claim.get_benefit_components',
        filters: {
          employee: frm.doc.employee,
          date: frm.doc.payroll_date,
          company: frm.doc.company,
        },
      }
    })
  },
  employee: (frm: any) => {
    frm.set_value('earning_component', null)
    if (frm.doc.employee) {
      frappe.call({
        method: 'hrms.payroll.doctype.salary_structure_assignment.salary_structure_assignment.get_employee_currency',
        args: {
          employee: frm.doc.employee,
        },
        callback: function (r: any) {
          if (r.message) {
            frm.set_value('currency', r.message)
          }
        },
      })
    }
    if (!frm.doc.earning_component) {
      frm.doc.max_amount_eligible = null
      frm.doc.claimed_amount = null
    }
    frm.refresh_fields()
  },
  earning_component: (frm: any) => {
    if (frm.doc.earning_component) {
      frm.call('get_benefit_details').then(() => {
        frm.refresh_fields()
      })
    } else {
      frm.doc.max_amount_eligible = null
      frm.doc.yearly_benefit = null
      frm.refresh_fields()
    }
  },
})
