import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Property', {
  setup(frm: any) {
    frm.set_query('rent_income_account', () => ({
      filters: { company: frm.doc.company, root_type: 'Income', is_group: 0 },
    }))
    frm.set_query('service_charge_account', () => ({
      filters: { company: frm.doc.company, root_type: 'Income', is_group: 0 },
    }))
    frm.set_query('security_deposit_account', () => ({
      filters: { company: frm.doc.company, root_type: 'Liability', is_group: 0 },
    }))
    frm.set_query('cost_center', () => ({ filters: { company: frm.doc.company, is_group: 0 } }))
  },

  refresh(frm: any) {
    if (frm.is_new()) return
    const metrics = frm.doc.__onload?.metrics
    if (metrics) {
      frm.dashboard.add_indicator(__('{0} units', [metrics.total_units]), 'blue')
      frm.dashboard.add_indicator(__('{0} occupied', [metrics.occupied_units]), 'green')
      frm.dashboard.add_indicator(__('{0} vacant', [metrics.vacant_units]), metrics.vacant_units ? 'orange' : 'gray')
      frm.dashboard.add_indicator(
        __('{0}% occupancy', [metrics.occupancy_rate]),
        metrics.occupancy_rate >= 90 ? 'green' : 'orange',
      )
    }
    frm.add_custom_button(
      __('Add Floor'),
      () => frappe.new_doc('Property Floor', { property: frm.doc.name }),
      __('Create'),
    )
    frm.add_custom_button(
      __('Add Unit'),
      () => frappe.new_doc('Rentable Unit', { property: frm.doc.name }),
      __('Create'),
    )
    frm.add_custom_button(
      __('Create Lease'),
      () => frappe.new_doc('Lease Agreement', { property: frm.doc.name }),
      __('Create'),
    )
    frm.add_custom_button(
      __('Rent Roll'),
      () => frappe.set_route('query-report', 'Rent Roll', { property: frm.doc.name }),
      __('Reports'),
    )
    frm.add_custom_button(
      __('Occupancy'),
      () => frappe.set_route('query-report', 'Occupancy and Vacancy', { property: frm.doc.name }),
      __('Reports'),
    )
    frm.add_custom_button(__('Refresh Occupancy Figures'), () => {
      frm.call({ doc: frm.doc, method: 'refresh_metrics', freeze: true, callback: () => frm.reload_doc() })
    })
  },
})
