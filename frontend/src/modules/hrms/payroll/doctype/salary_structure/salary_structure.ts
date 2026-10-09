import { $, __, erpnext, flt, frappe, hrms, locals, refresh_field, refresh_many, toTitle } from '@/shared/frappe'

frappe.ui.form.on('Salary Structure', {
  onload: function (frm: any) {
    frm.alerted_rows = []
    let help_button = $(`<a class = 'control-label'>
			${__('Condition and Formula Help')}
		</a>`).click(() => {
      let d = new frappe.ui.Dialog({
        title: __('Condition and Formula Help'),
        fields: [
          {
            fieldname: 'msg_wrapper',
            fieldtype: 'HTML',
          },
        ],
      })
      let message_html = frappe.render_template('condition_and_formula_help')
      d.fields_dict.msg_wrapper.$wrapper.append(message_html)
      d.show()
    })
    let help_button_wrapper = frm.get_field('conditions_and_formula_variable_and_example').$wrapper
    help_button_wrapper.empty()
    help_button_wrapper.append(frm.doc.filters_html).append(help_button)
    frm.toggle_reqd(['payroll_frequency'], !frm.doc.salary_slip_based_on_timesheet)
    frm.set_query('payment_account', function () {
      let account_types: any = ['Bank', 'Cash']
      return {
        filters: {
          account_type: ['in', account_types],
          is_group: 0,
          company: frm.doc.company,
        },
      }
    })
    frm.trigger('set_earning_deduction_component')
  },
  mode_of_payment: function (frm: any) {
    erpnext.accounts.pos.get_payment_mode_account(frm, frm.doc.mode_of_payment, function (account: any) {
      frm.set_value('payment_account', account)
    })
  },
  set_earning_deduction_component: function (frm: any) {
    if (!frm.doc.company) return
    frm.set_query('salary_component', 'earnings', function () {
      return {
        filters: { component_type: 'earning', company: frm.doc.company },
        query: 'hrms.payroll.doctype.salary_structure.salary_structure.get_salary_component',
      }
    })
    frm.set_query('salary_component', 'deductions', function () {
      return {
        filters: { component_type: 'deduction', company: frm.doc.company },
        query: 'hrms.payroll.doctype.salary_structure.salary_structure.get_salary_component',
      }
    })
    frm.set_query('salary_component', 'employer_contributions', function () {
      return {
        filters: { component_type: 'employer contribution', company: frm.doc.company },
        query: 'hrms.payroll.doctype.salary_structure.salary_structure.get_salary_component',
      }
    })
  },
  company: function (frm: any) {
    frm.trigger('set_earning_deduction_component')
  },
  currency: function (frm: any) {
    calculate_totals(frm.doc)
    frm.trigger('set_dynamic_labels')
    frm.refresh()
  },
  set_dynamic_labels: function (frm: any) {
    frm.set_currency_labels(
      ['net_pay', 'hour_rate', 'leave_encashment_amount_per_day', 'max_benefits', 'total_earning', 'total_deduction'],
      frm.doc.currency,
    )
    frm.set_currency_labels(
      ['amount', 'additional_amount', 'tax_on_flexible_benefit', 'tax_on_additional_salary'],
      frm.doc.currency,
      'earnings',
    )
    frm.set_currency_labels(
      ['amount', 'additional_amount', 'tax_on_flexible_benefit', 'tax_on_additional_salary'],
      frm.doc.currency,
      'deductions',
    )
    frm.refresh_fields()
  },
  refresh: function (frm: any) {
    frm.trigger('set_dynamic_labels')
    frm.trigger('toggle_fields')
    frm.fields_dict['earnings'].grid.set_column_disp('default_amount', false)
    frm.fields_dict['deductions'].grid.set_column_disp('default_amount', false)
    if (frm.doc.docstatus === 1) {
      frm.add_custom_button(
        __('Single Assignment'),
        function () {
          const doc = frappe.model.get_new_doc('Salary Structure Assignment')
          doc.salary_structure = frm.doc.name
          doc.company = frm.doc.company
          frappe.set_route('Form', 'Salary Structure Assignment', doc.name)
        },
        __('Create'),
      )
      frm.add_custom_button(
        __('Bulk Assignments'),
        () => {
          const doc = frappe.model.get_new_doc('Bulk Salary Structure Assignment')
          doc.salary_structure = frm.doc.name
          doc.company = frm.doc.company
          frappe.set_route('Form', 'Bulk Salary Structure Assignment', doc.name)
        },
        __('Create'),
      )
      frm.add_custom_button(
        __('Income Tax Slab'),
        () => {
          frappe.model.with_doctype('Income Tax Slab', () => {
            const doc = frappe.model.get_new_doc('Income Tax Slab')
            frappe.set_route('Form', 'Income Tax Slab', doc.name)
          })
        },
        __('Create'),
      )
      frm.page.set_inner_btn_group_as_primary(__('Create'))
      frm.add_custom_button(
        __('Preview Salary Slip'),
        function () {
          frm.trigger('preview_salary_slip')
        },
        __('Actions'),
      )
    }
    let fields_read_only: any = ['is_tax_applicable', 'is_flexible_benefit', 'variable_based_on_taxable_salary']
    fields_read_only.forEach(function (field: any) {
      frm.fields_dict.earnings.grid.update_docfield_property(field, 'read_only', 1)
      frm.fields_dict.deductions.grid.update_docfield_property(field, 'read_only', 1)
    })
    frm.trigger('set_earning_deduction_component')
  },
  salary_slip_based_on_timesheet: function (frm: any) {
    frm.trigger('toggle_fields')
  },
  preview_salary_slip: function (frm: any) {
    frappe.call({
      method: 'hrms.payroll.doctype.salary_structure.salary_structure.get_employees',
      args: {
        salary_structure: frm.doc.name,
      },
      callback: function (r: any) {
        let d: any
        let employees = r.message
        if (!employees) return
        if (employees.length == 1) {
          frm.events.open_salary_slip(frm, employees[0])
        } else {
          d = new frappe.ui.Dialog({
            title: __('Preview Salary Slip'),
            fields: [
              {
                label: __('Employee'),
                fieldname: 'employee',
                fieldtype: 'Autocomplete',
                reqd: true,
                options: employees,
              },
              {
                fieldname: 'fetch',
                label: __('Show Salary Slip'),
                fieldtype: 'Button',
              },
            ],
          })
          d.get_input('fetch').on('click', function () {
            let values = d.get_values()
            if (!values) return
            frm.events.open_salary_slip(frm, values.employee)
          })
          d.show()
        }
      },
    })
  },
  open_salary_slip: function (frm: any, employee: any) {
    let print_format = frm.doc.salary_slip_based_on_timesheet
      ? 'Salary Slip based on Timesheet'
      : 'Salary Slip Standard'
    frappe.call({
      method: 'hrms.payroll.doctype.salary_structure.salary_structure.make_salary_slip',
      args: {
        source_name: frm.doc.name,
        employee: employee,
        as_print: 1,
        print_format: print_format,
        for_preview: 1,
      },
      callback: function (r: any) {
        const new_window: any = window.open()
        new_window.document.write(r.message)
      },
    })
  },
  toggle_fields: function (frm: any) {
    frm.toggle_display(['salary_component', 'hour_rate'], frm.doc.salary_slip_based_on_timesheet)
    frm.toggle_reqd(['salary_component', 'hour_rate'], frm.doc.salary_slip_based_on_timesheet)
    frm.toggle_reqd(['payroll_frequency'], !frm.doc.salary_slip_based_on_timesheet)
  },
})
let calculate_totals = function (doc: any) {
  let tbl1 = doc.earnings || []
  let tbl2 = doc.deductions || []
  let total_earn = 0
  let total_ded = 0
  for (let i = 0; i < tbl1.length; i++) {
    total_earn += flt(tbl1[i].amount)
  }
  for (let j = 0; j < tbl2.length; j++) {
    total_ded += flt(tbl2[j].amount)
  }
  doc.total_earning = total_earn
  doc.total_deduction = total_ded
  doc.net_pay = 0.0
  if (doc.salary_slip_based_on_timesheet == 0) {
    doc.net_pay = flt(total_earn) - flt(total_ded)
  }
  refresh_many(['total_earning', 'total_deduction', 'net_pay'])
}
frappe.ui.form.on('Salary Structure', {
  setup: function (frm: any) {
    frm.cscript.amount = function (doc: any) {
      calculate_totals(doc)
    }
    frm.cscript.validate = function (doc: any) {
      calculate_totals(doc)
    }
  },
})
frappe.ui.form.on('Salary Detail', {
  form_render: function (frm: any, cdt: any, cdn: any) {
    const row = locals[cdt][cdn]
    hrms.payroll_utils.set_autocompletions_for_condition_and_formula(frm, row)
  },
  amount: function (frm: any) {
    calculate_totals(frm.doc)
  },
  earnings_remove: function (frm: any) {
    calculate_totals(frm.doc)
  },
  deductions_remove: function (frm: any) {
    calculate_totals(frm.doc)
  },
  formula: function (frm: any, cdt: any, cdn: any) {
    const row = locals[cdt][cdn]
    if (row.formula && !row?.amount_based_on_formula && !frm.alerted_rows.includes(cdn)) {
      frappe.msgprint({
        message: __('{0} Row #{1}: {2} needs to be enabled for the formula to be considered.', [
          toTitle(row.parentfield),
          row.idx,
          __('Amount based on formula').bold(),
        ]),
        title: __('Warning'),
        indicator: 'orange',
      })
      frm.alerted_rows.push(cdn)
    }
  },
  salary_component: function (_frm: any, cdt: any, cdn: any) {
    let child = locals[cdt][cdn]
    if (child.salary_component) {
      frappe.call({
        method: 'frappe.client.get',
        args: {
          doctype: 'Salary Component',
          name: child.salary_component,
        },
        callback: function (data: any) {
          let result: any
          if (data.message) {
            result = data.message
            frappe.model.set_value(cdt, cdn, {
              condition: result.condition,
              amount_based_on_formula: result.amount_based_on_formula,
              statistical_component: result.statistical_component,
              depends_on_payment_days: result.depends_on_payment_days,
              do_not_include_in_total: result.do_not_include_in_total,
              do_not_include_in_accounts: result.do_not_include_in_accounts,
              variable_based_on_taxable_salary: result.variable_based_on_taxable_salary,
              is_tax_applicable: result.is_tax_applicable,
              is_flexible_benefit: result.is_flexible_benefit,
              ...(result.amount_based_on_formula == 1 ? { formula: result.formula } : { amount: result.amount }),
            })
            refresh_field('earnings')
            refresh_field('deductions')
          }
        },
      })
    }
  },
  amount_based_on_formula: function (frm: any, cdt: any, cdn: any) {
    let child = locals[cdt][cdn]
    if (child.amount_based_on_formula == 1) {
      frappe.model.set_value(cdt, cdn, 'amount', null)
      const index = frm.alerted_rows.indexOf(cdn)
      if (index > -1) frm.alerted_rows.splice(index, 1)
    } else {
      frappe.model.set_value(cdt, cdn, 'formula', null)
    }
  },
})
