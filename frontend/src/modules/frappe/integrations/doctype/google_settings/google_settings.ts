import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Google Settings', {
  refresh: function (frm?: any) {
    frm.dashboard.set_headline(
      __('For more information, {0}.', [
        `<a href='https://erpnext.com/docs/user/manual/en/google_settings'>${__('Click here')}</a>`,
      ]),
    )
  },
})
