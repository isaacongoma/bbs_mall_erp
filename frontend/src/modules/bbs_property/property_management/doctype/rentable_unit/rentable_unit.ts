import { __, flt, frappe } from '@/shared/frappe'

const COLORS: Record<string, string> = {
  Vacant: 'orange',
  Reserved: 'blue',
  Occupied: 'green',
  'Under Maintenance': 'red',
}

frappe.ui.form.on('Rentable Unit', {
  setup(frm: any) {
    frm.set_query('floor', () => ({ filters: { property: frm.doc.property } }))
  },

  refresh(frm: any) {
    if (frm.is_new()) return
    frm.page.set_indicator(__(frm.doc.status), COLORS[frm.doc.status] ?? 'gray')
    if (frm.doc.status === 'Vacant' || frm.doc.status === 'Reserved') {
      frm.add_custom_button(__('Create Lease'), () => {
        frappe.model.with_doctype('Lease Agreement', () => {
          const lease = frappe.model.get_new_doc('Lease Agreement')
          lease.property = frm.doc.property
          const row = frappe.model.add_child(lease, 'Lease Unit', 'units')
          row.unit = frm.doc.name
          row.monthly_rent = frm.doc.base_rent
          row.monthly_service_charge = frm.doc.service_charge
          frappe.set_route('Form', 'Lease Agreement', lease.name)
        })
      })
    }
    if (frm.doc.current_lease) {
      frm.add_custom_button(
        __('Open Lease'),
        () => frappe.set_route('Form', 'Lease Agreement', frm.doc.current_lease),
        __('View'),
      )
    }
    frm.add_custom_button(
      __('Add Meter'),
      () => frappe.new_doc('Utility Meter', { unit: frm.doc.name, property: frm.doc.property }),
      __('Create'),
    )
    frm.add_custom_button(
      __('Maintenance Request'),
      () => frappe.new_doc('Maintenance Request', { unit: frm.doc.name, property: frm.doc.property }),
      __('Create'),
    )
  },

  area_sqm(frm: any) {
    frm.trigger('calculate_rent')
  },
  rate_per_sqm(frm: any) {
    frm.trigger('calculate_rent')
  },
  service_charge_per_sqm(frm: any) {
    frm.trigger('calculate_rent')
  },
  calculate_rent(frm: any) {
    if (flt(frm.doc.rate_per_sqm)) frm.set_value('base_rent', flt(frm.doc.rate_per_sqm) * flt(frm.doc.area_sqm))
    if (flt(frm.doc.service_charge_per_sqm)) {
      frm.set_value('service_charge', flt(frm.doc.service_charge_per_sqm) * flt(frm.doc.area_sqm))
    }
  },
})
