import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Desktop Icon', {
  setup: function (frm?: any) {
    frm.set_query('parent_icon', function () {
      return {
        filters: {
          icon_type: ['in', ['Folder', 'App']],
        },
      }
    })
  },
})
