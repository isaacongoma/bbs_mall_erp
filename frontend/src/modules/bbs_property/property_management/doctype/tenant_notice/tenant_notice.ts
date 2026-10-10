import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Tenant Notice', {
  refresh(frm: any) {
    if (frm.is_new()) return
    if (frm.doc.status === 'Draft') {
      frm.add_custom_button(__('Publish Now'), () => {
        frappe.confirm(__('Publish this notice to the tenants selected?'), () => {
          frm.call({
            doc: frm.doc,
            method: 'publish',
            freeze: true,
            callback: (r: any) => {
              if (!r.exc) {
                frappe.show_alert({ message: __('Published to {0} tenants', [r.message]), indicator: 'green' })
                frm.reload_doc()
              }
            },
          })
        })
      })
    }
    if (frm.doc.status === 'Published') {
      frm.dashboard.add_comment(
        __('Reached {0} tenants on {1}', [frm.doc.recipient_count, frappe.datetime.str_to_user(frm.doc.published_on)]),
        'green',
        true,
      )
    }
  },
})
