import { frappe } from '@/shared/frappe'

frappe.ui.form.on('Employee Incentive', {
  setup: function (frm: any) {
    frm.set_query('employee', function () {
      return {
        filters: {
          status: 'Active',
        },
      }
    })
    frm.trigger('set_earning_component')
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
          frm.trigger('set_earning_component')
        }
      },
    })
  },
  set_earning_component: function (frm: any) {
    if (!frm.doc.company) return
    frm.set_query('salary_component', function () {
      return {
        filters: { component_type: 'Earning', company: frm.doc.company },
        query: 'hrms.payroll.doctype.salary_structure.salary_structure.get_salary_component',
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
})
