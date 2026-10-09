import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Stock Reposting Settings', {
  refresh: function (frm?: any) {
    frm.trigger('convert_to_item_based_reposting')
  },
  convert_to_item_based_reposting: function (frm?: any) {
    frm.add_custom_button(__('Convert to Item Based Reposting'), function () {
      frm.call({
        method: 'convert_to_item_wh_reposting',
        frezz: true,
        doc: frm.doc,
        callback: function (r?: any) {
          if (!r.exc) {
            frm.reload_doc()
          }
        },
      })
    })
  },
})
