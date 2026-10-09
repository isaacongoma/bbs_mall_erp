import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Quality Review', {
  goal: function (frm?: any) {
    frappe.call({
      method: 'frappe.client.get',
      args: {
        doctype: 'Quality Goal',
        name: frm.doc.goal,
      },
      callback: function (data?: any) {
        frm.fields_dict.reviews.grid.remove_all()
        const objectives = data.message.objectives
        for (const i in objectives) {
          frm.add_child('reviews')
          frm.fields_dict.reviews.get_value()[i].objective = objectives[i].objective
          frm.fields_dict.reviews.get_value()[i].target = objectives[i].target
          frm.fields_dict.reviews.get_value()[i].uom = objectives[i].uom
        }
        frm.refresh()
      },
    })
  },
})
