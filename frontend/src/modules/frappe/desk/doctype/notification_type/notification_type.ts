import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Notification Type', {
  refresh: (frm?: any) => {
    if (frm.is_new() || !frm.doc.enabled || !frappe.user.has_role('System Manager')) {
      return
    }
    frm.add_custom_button(
      __('Enable Email Notifications for All Users'),
      () => {
        frappe.confirm(
          __(
            "Email everyone for <b>{0}</b> notifications? This adds it to every user's email preferences. Users can still opt out individually afterwards.",
            [frm.doc.name],
          ),
          () => {
            frm.call({
              method: 'frappe.desk.doctype.notification_type.notification_type.enable_email_for_all_users',
              args: { notification_type: frm.doc.name },
            })
          },
        )
      },
      __('Actions'),
    )
  },
})
