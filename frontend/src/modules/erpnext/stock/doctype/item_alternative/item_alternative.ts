import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Item Alternative', {
  setup: function (frm?: any) {
    frm.fields_dict.item_code.get_query = () => {
      return {
        filters: {
          allow_alternative_item: 1,
        },
      }
    }
  },
})
