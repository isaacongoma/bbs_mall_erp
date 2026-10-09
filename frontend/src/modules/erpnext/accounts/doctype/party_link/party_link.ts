import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Party Link', {
  refresh: function (frm?: any) {
    frm.set_query('primary_role', () => {
      return {
        filters: {
          name: ['in', ['Customer', 'Supplier']],
        },
      }
    })
    frm.set_query('secondary_role', () => {
      const party_types = Object.keys(frappe.boot.party_account_types).filter((p?: any) => p != frm.doc.primary_role)
      return {
        filters: {
          name: ['in', party_types],
        },
      }
    })
  },
  primary_role(frm?: any) {
    frm.set_value('primary_party', '')
    frm.set_value('secondary_role', '')
  },
  secondary_role(frm?: any) {
    frm.set_value('secondary_party', '')
  },
})
