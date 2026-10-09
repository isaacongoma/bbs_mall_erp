import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Location', {
  setup: function (frm?: any) {
    frm.set_query('parent_location', function () {
      return {
        filters: {
          is_group: 1,
        },
      }
    })
  },
  onload_post_render(frm?: any) {
    if (!frm.doc.location && frm.doc.latitude && frm.doc.longitude) {
      frm.fields_dict.location.map.setView([frm.doc.latitude, frm.doc.longitude], 13)
    } else {
      frm.doc.latitude = frm.fields_dict.location.map.getCenter()['lat']
      frm.doc.longitude = frm.fields_dict.location.map.getCenter()['lng']
    }
  },
})
