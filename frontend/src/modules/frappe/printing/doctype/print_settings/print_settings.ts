import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Print Settings', {
  print_style: function (frm?: any) {
    frappe.db.get_value('Print Style', frm.doc.print_style, 'preview').then((r?: any) => {
      if (r.message.preview) {
        frm.get_field('print_style_preview').$wrapper.html(`<img src="${r.message.preview}" class="img-responsive">`)
      } else {
        frm
          .get_field('print_style_preview')
          .$wrapper.html(`<p style="margin: 60px 0px" class="text-center text-muted">${__('No Preview')}</p>`)
      }
    })
  },
  onload: function (frm?: any) {
    frm.script_manager.trigger('print_style')
  },
})
