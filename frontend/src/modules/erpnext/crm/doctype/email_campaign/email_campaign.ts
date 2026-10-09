import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Email Campaign', {
  email_campaign_for: function (frm?: any) {
    frm.set_value('recipient', '')
  },
})
