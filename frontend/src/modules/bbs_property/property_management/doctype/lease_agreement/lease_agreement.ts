import { __, flt, format_currency, frappe } from '@/shared/frappe'

const ACTIVE = ['Active', 'Expiring Soon']

frappe.ui.form.on('Lease Agreement', {
  setup(frm: any) {
    frm.set_query('property', () => ({ filters: { status: ['!=', 'Closed'] } }))
    frm.set_query('unit', 'units', () => ({
      filters: { property: frm.doc.property, status: ['in', ['Vacant', 'Reserved']] },
    }))
    frm.set_query('customer', () => ({ filters: { disabled: 0 } }))
  },

  refresh(frm: any) {
    frm.trigger('set_status_indicator')
    if (frm.doc.docstatus === 1 && ACTIVE.includes(frm.doc.status)) {
      frm.trigger('add_lease_actions')
    }
    if (frm.doc.docstatus === 1) {
      frm.add_custom_button(
        __('Tenant Statement'),
        () => frappe.set_route('query-report', 'Tenant Statement', { customer: frm.doc.customer }),
        __('View'),
      )
      frm.add_custom_button(
        __('Record Deposit'),
        () => frappe.new_doc('Lease Deposit', { lease: frm.doc.name }),
        __('Create'),
      )
    }
    if (frm.doc.docstatus === 1 && frm.doc.status === 'Renewed') {
      frm.dashboard.add_comment(__('This lease has been renewed.'), 'blue', true)
    }
    frm.trigger('show_deposit_gap')
  },

  set_status_indicator(frm: any) {
    const colors: Record<string, string> = {
      Draft: 'gray',
      Active: 'green',
      'Expiring Soon': 'orange',
      Expired: 'red',
      Terminated: 'red',
      Renewed: 'blue',
      Cancelled: 'red',
    }
    if (frm.doc.docstatus === 1 && frm.doc.status) {
      frm.page.set_indicator(__(frm.doc.status), colors[frm.doc.status] ?? 'gray')
    }
  },

  show_deposit_gap(frm: any) {
    const gap = frm.doc.__onload?.deposit_gap
    if (frm.doc.docstatus === 1 && gap > 0) {
      frm.dashboard.add_comment(
        __('Security deposit outstanding: {0}', [format_currency(gap, frm.doc.currency)]),
        'orange',
        true,
      )
    }
  },

  add_lease_actions(frm: any) {
    const period = frm.doc.__onload?.next_period
    if (period) {
      frm.add_custom_button(
        __('Invoice {0} to {1}', [frappe.datetime.str_to_user(period[0]), frappe.datetime.str_to_user(period[1])]),
        () => {
          frappe.confirm(__('Create the rent invoice for this period now?'), () => {
            frm.call({
              doc: frm.doc,
              method: 'make_next_invoice',
              freeze: true,
              callback: (r: any) => {
                if (r.message) frappe.set_route('Form', 'Sales Invoice', r.message)
              },
            })
          })
        },
        __('Actions'),
      )
    }
    frm.add_custom_button(__('Renew Lease'), () => frm.trigger('renew_lease'), __('Actions'))
    frm.add_custom_button(__('Terminate Lease'), () => frm.trigger('terminate_lease'), __('Actions'))
  },

  renew_lease(frm: any) {
    const dialog = new frappe.ui.Dialog({
      title: __('Renew Lease'),
      fields: [
        {
          fieldname: 'months',
          fieldtype: 'Int',
          label: __('Renewal Term (months)'),
          default: frm.doc.lease_term_months || 12,
          reqd: 1,
        },
      ],
      primary_action_label: __('Create Renewal'),
      primary_action(values: any) {
        frm.call({
          doc: frm.doc,
          method: 'make_renewal',
          args: { months: values.months },
          freeze: true,
          callback: (r: any) => {
            if (r.exc) return
            const doc = frappe.model.sync(r.message)
            dialog.hide()
            frappe.set_route('Form', doc[0].doctype, doc[0].name)
          },
        })
      },
    })
    dialog.show()
  },

  terminate_lease(frm: any) {
    const dialog = new frappe.ui.Dialog({
      title: __('Terminate Lease'),
      fields: [
        {
          fieldname: 'termination_date',
          fieldtype: 'Date',
          label: __('Termination Date'),
          default: frappe.datetime.get_today(),
          reqd: 1,
        },
        {
          fieldname: 'termination_type',
          fieldtype: 'Select',
          label: __('Reason Type'),
          options: ['Mutual Agreement', 'Tenant Breach', 'Landlord Notice', 'Relocation'].join('\n'),
          reqd: 1,
        },
        { fieldname: 'reason', fieldtype: 'Small Text', label: __('Details') },
      ],
      primary_action_label: __('Terminate'),
      primary_action(values: any) {
        frm.call({
          doc: frm.doc,
          method: 'terminate',
          args: values,
          freeze: true,
          callback: (r: any) => {
            if (r.exc) return
            dialog.hide()
            frm.reload_doc()
          },
        })
      },
    })
    dialog.show()
  },

  property(frm: any) {
    if (frm.doc.units?.length) frm.clear_table('units')
    frm.refresh_field('units')
    if (frm.doc.property) {
      frappe.db.get_value('Property', frm.doc.property, ['company', 'cost_center']).then((r: any) => {
        frm.set_value('company', r.message.company)
        frm.set_value('cost_center', r.message.cost_center)
      })
    }
  },

  terms_template(frm: any) {
    if (!frm.doc.terms_template) return
    frappe.db.get_value('Terms and Conditions', frm.doc.terms_template, 'terms').then((r: any) => {
      frm.set_value('terms', r.message.terms)
    })
  },

  turnover_rent_applicable(frm: any) {
    frm.toggle_reqd('turnover_rent_percent', frm.doc.turnover_rent_applicable)
  },
})

frappe.ui.form.on('Lease Unit', {
  unit(_frm: any, cdt: string, cdn: string) {
    const row = frappe.get_doc(cdt, cdn)
    if (!row.unit) return
    frappe.db.get_value('Rentable Unit', row.unit, ['base_rent', 'service_charge', 'area_sqm']).then((r: any) => {
      frappe.model.set_value(cdt, cdn, 'monthly_rent', r.message.base_rent)
      frappe.model.set_value(cdt, cdn, 'monthly_service_charge', r.message.service_charge)
    })
  },
  monthly_rent(frm: any) {
    frm.trigger('recalculate_totals')
  },
  monthly_service_charge(frm: any) {
    frm.trigger('recalculate_totals')
  },
  units_remove(frm: any) {
    frm.trigger('recalculate_totals')
  },
})

frappe.ui.form.on('Lease Agreement', {
  recalculate_totals(frm: any) {
    const rows = frm.doc.units || []
    frm.set_value(
      'total_monthly_rent',
      rows.reduce((sum: number, row: any) => sum + flt(row.monthly_rent), 0),
    )
    frm.set_value(
      'total_monthly_service_charge',
      rows.reduce((sum: number, row: any) => sum + flt(row.monthly_service_charge), 0),
    )
  },
})
