import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Customer', {
  refresh(frm: any) {
    if (frm.is_new() || !frm.doc.is_tenant) return
    frm.add_custom_button(
      __('Invite Portal User'),
      () => {
        const dialog = new frappe.ui.Dialog({
          title: __('Invite Tenant Portal User'),
          fields: [
            { fieldname: 'full_name', fieldtype: 'Data', label: __('Full Name'), reqd: 1 },
            { fieldname: 'email', fieldtype: 'Data', options: 'Email', label: __('Email'), reqd: 1 },
            { fieldname: 'mobile', fieldtype: 'Data', options: 'Phone', label: __('Mobile Number'), reqd: 1 },
            {
              fieldname: 'access_level',
              fieldtype: 'Select',
              label: __('Access'),
              options: 'Owner\nFinance\nOperations',
              default: 'Owner',
              reqd: 1,
            },
          ],
          primary_action_label: __('Send Invitation'),
          primary_action(values: any) {
            frappe.call({
              method: 'bbs_property.property_management.portal.invite_portal_user',
              args: { customer: frm.doc.name, ...values },
              freeze: true,
              callback(r: any) {
                if (r.exc) return
                dialog.hide()
                frappe.show_alert({ message: __('Invitation sent to {0}', [values.email]), indicator: 'green' })
                frm.reload_doc()
              },
            })
          },
        })
        dialog.show()
      },
      __('Tenant'),
    )
    frm.add_custom_button(
      __('Leases'),
      () => frappe.set_route('List', 'Lease Agreement', { customer: frm.doc.name }),
      __('Tenant'),
    )
    frm.add_custom_button(
      __('Statement'),
      () => frappe.set_route('query-report', 'Tenant Statement', { customer: frm.doc.name }),
      __('Tenant'),
    )
    frm.add_custom_button(
      __('Open Portal as Tenant'),
      () => window.open(`/tenant?customer=${encodeURIComponent(frm.doc.name)}`, '_blank'),
      __('Tenant'),
    )
  },
})
