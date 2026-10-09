import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Activity Type', {
  onload: function (frm?: any) {
    frm.set_currency_labels(['billing_rate', 'costing_rate'], frappe.defaults.get_global_default('currency'))
  },
  refresh: function (frm?: any) {
    frm.add_custom_button(__('Activity Cost per Employee'), function () {
      frappe.route_options = { activity_type: frm.doc.name }
      frappe.set_route('List', 'Activity Cost')
    })
  },
})
