import { __, erpnext, frappe } from '@/shared/frappe'
frappe.ui.form.on('Campaign', {
  refresh: function (frm?: any) {
    erpnext.toggle_naming_series(frm)
    if (frm.is_new()) {
      frm.toggle_display('naming_series', frappe.boot.sysdefaults.campaign_naming_by == 'Naming Series')
    } else {
      frm.add_custom_button(
        __('View Leads'),
        function () {
          frappe.route_options = { utm_source: 'Campaign', utm_campaign: frm.doc.name }
          frappe.set_route('List', 'Lead')
        },
        null,
        true,
      )
    }
  },
})
