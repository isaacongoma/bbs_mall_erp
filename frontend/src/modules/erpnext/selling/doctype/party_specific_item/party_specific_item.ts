import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Party Specific Item', {
  setup: function (frm?: any) {
    frm.trigger('party_type')
  },
  party_type: function (frm?: any) {
    if (['Customer Group', 'Supplier Group'].includes(frm.doc.party_type)) {
      frm.set_query('party', function () {
        return {
          filters: {
            is_group: 0,
          },
        }
      })
    } else {
      frm.set_query('party', null)
    }
  },
})
