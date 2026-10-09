import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Web Form Request', {
  refresh(frm?: any) {
    if (frm.is_new() || !frm.doc.key || !frm.doc.web_form) {
      return
    }
    frm.add_custom_button(__('Copy Link'), () => {
      frappe.db.get_value('Web Form', frm.doc.web_form, 'route').then(({ message }: any) => {
        const route = message.route || frm.doc.web_form
        const key = encodeURIComponent(frm.doc.key)
        const url = frappe.urllib.get_full_url(`${route}/new?web_form_request_key=${key}`)
        frappe.utils.copy_to_clipboard(url, __('Web Form Request link copied'))
      })
    })
  },
})
