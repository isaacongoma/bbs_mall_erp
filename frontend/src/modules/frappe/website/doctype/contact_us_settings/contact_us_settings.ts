import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Contact Us Settings', {
  refresh: function (frm?: any) {
    frm.sidebar.add_user_action(__('See on Website')).attr('href', '/contact').attr('target', '_blank')
  },
})
