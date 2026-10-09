import { frappe } from '@/shared/frappe'

frappe.ui.form.on('Additional Salary', {
  setup: function (frm: any) {
    frm.add_fetch(
      'salary_component',
      'deduct_full_tax_on_selected_payroll_date',
      'deduct_full_tax_on_selected_payroll_date',
    )
    frm.set_query('employee', function () {
      return {
        filters: {
          company: frm.doc.company,
          status: ['!=', 'Inactive'],
        },
      }
    })
  },
  onload: function (frm: any) {
    frm.trigger('set_component_query')
  },
  employee: function (frm: any) {
    if (frm.doc.employee) {
      frappe.run_serially([() => frm.trigger('get_employee_currency'), () => frm.trigger('set_company')])
    } else {
      frm.set_value('company', null)
    }
  },
  set_company: function (frm: any) {
    frappe.call({
      method: 'frappe.client.get_value',
      args: {
        doctype: 'Employee',
        fieldname: 'company',
        filters: {
          name: frm.doc.employee,
        },
      },
      callback: function (data: any) {
        if (data.message) {
          frm.set_value('company', data.message.company)
        }
      },
    })
  },
  company: function (frm: any) {
    frm.trigger('set_component_query')
  },
  set_component_query: function (frm: any) {
    if (!frm.doc.company) return
    frm.set_query('salary_component', function () {
      return {
        filters: {
          disabled: 0,
        },
      }
    })
  },
  get_employee_currency: function (frm: any) {
    frappe.call({
      method: 'hrms.payroll.doctype.salary_structure_assignment.salary_structure_assignment.get_employee_currency',
      args: {
        employee: frm.doc.employee,
      },
      callback: function (r: any) {
        if (r.message) {
          frm.set_value('currency', r.message)
          frm.refresh_fields()
        }
      },
    })
  },
  is_recurring: function (frm: any) {
    if (frm.doc.is_recurring) {
      frm.set_value('payroll_date', null)
    } else {
      frm.set_value('from_date', null)
      frm.set_value('to_date', null)
    }
  },
  salary_component: function (frm: any) {
    if (!frm.doc.ref_doctype) {
      frm.trigger('get_salary_component_amount')
    }
  },
  get_salary_component_amount: function (frm: any) {
    frappe.call({
      method: 'frappe.client.get_value',
      args: {
        doctype: 'Salary Component',
        fieldname: 'amount',
        filters: {
          name: frm.doc.salary_component,
        },
      },
      callback: function (data: any) {
        if (data.message) {
          frm.set_value('amount', data.message.amount)
        }
      },
    })
  },
})
