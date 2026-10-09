import { __, erpnext, flt, frappe } from '@/shared/frappe'
frappe.provide('erpnext.accounts.dimensions')
frappe.ui.form.on('Budget', {
  onload: function (frm?: any) {
    frm.set_query('monthly_distribution', function () {
      return {
        filters: {
          fiscal_year: frm.doc.fiscal_year,
        },
      }
    })
    frm.set_query('account', function () {
      return {
        filters: {
          is_group: 0,
          company: frm.doc.company,
          root_type: ['in', ['Income', 'Expense']],
        },
      }
    })
    erpnext.accounts.dimensions.setup_dimension_filters(frm, frm.doctype)
    frappe.db.get_single_value('Accounts Settings', 'use_legacy_budget_controller').then((value?: any) => {
      if (value) {
        frm.get_field('control_action_for_cumulative_expense_section').hide()
      }
    })
  },
  refresh: async function (frm?: any) {
    frm.trigger('toggle_reqd_fields')
    if (!frm.doc.__islocal && frm.doc.docstatus == 1) {
      frm.add_custom_button(
        __('Revise Budget'),
        function () {
          frm.events.revise_budget_action(frm)
        },
        __('Actions'),
      )
    }
    toggle_distribution_fields(frm)
  },
  budget_against: function (frm?: any) {
    frm.trigger('set_null_value')
    frm.trigger('toggle_reqd_fields')
  },
  budget_amount(frm?: any) {
    if (frm.doc.budget_distribution?.length) {
      frm.doc.budget_distribution.forEach((row?: any) => {
        row.amount = flt((row.percent / 100) * frm.doc.budget_amount, 2)
      })
      set_total_budget_amount(frm)
      frm.refresh_field('budget_distribution')
    }
  },
  distribute_equally: function (frm?: any) {
    toggle_distribution_fields(frm)
  },
  set_null_value: function (frm?: any) {
    if (frm.doc.budget_against == 'Cost Center') {
      frm.set_value('project', null)
    } else {
      frm.set_value('cost_center', null)
    }
  },
  toggle_reqd_fields: function (frm?: any) {
    frm.toggle_reqd('cost_center', frm.doc.budget_against == 'Cost Center')
    frm.toggle_reqd('project', frm.doc.budget_against == 'Project')
  },
  revise_budget_action: function (frm?: any) {
    frappe.confirm(
      __(
        'Are you sure you want to revise this budget? The current budget will be cancelled and a new draft will be created.',
      ),
      function () {
        frappe.call({
          method: 'erpnext.accounts.doctype.budget.budget.revise_budget',
          args: { budget_name: frm.doc.name },
          callback: function (r?: any) {
            if (r.message) {
              frappe.msgprint(__('New revised budget created successfully'))
              frappe.set_route('Form', 'Budget', r.message)
            }
          },
        })
      },
      function () {
        frappe.msgprint(__('Revision cancelled'))
      },
    )
  },
})
frappe.ui.form.on('Budget Distribution', {
  amount(frm?: any, cdt?: any, cdn?: any) {
    const row = frappe.get_doc(cdt, cdn)
    if (frm.doc.budget_amount) {
      row.percent = flt((row.amount / frm.doc.budget_amount) * 100, 2)
      set_total_budget_amount(frm)
      frm.refresh_field('budget_distribution')
    }
  },
  percent(frm?: any, cdt?: any, cdn?: any) {
    const row = frappe.get_doc(cdt, cdn)
    if (frm.doc.budget_amount) {
      row.amount = flt((row.percent / 100) * frm.doc.budget_amount, 2)
      set_total_budget_amount(frm)
      frm.refresh_field('budget_distribution')
    }
  },
})
function set_total_budget_amount(frm?: any) {
  let total = 0
  ;(frm.doc.budget_distribution || []).forEach((row?: any) => {
    total += flt(row.amount)
  })
  frm.set_value('budget_distribution_total', total)
}
function toggle_distribution_fields(frm?: any) {
  const grid = frm.fields_dict.budget_distribution.grid
  frm.set_df_property('budget_distribution', 'cannot_add_rows', true)
  frm.set_df_property('budget_distribution', 'cannot_delete_rows', true)
  ;['amount', 'percent'].forEach((field?: any) => {
    grid.update_docfield_property(field, 'read_only', frm.doc.distribute_equally)
  })
  grid.refresh()
}
