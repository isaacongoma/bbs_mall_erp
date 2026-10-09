import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Translation', {
  refresh: function (frm?: any) {
    frm.set_intro(__('Translations can be viewed by guests, avoid storing private details in translations.'))
  },
})
