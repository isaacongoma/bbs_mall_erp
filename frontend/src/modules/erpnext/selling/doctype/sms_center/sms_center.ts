import { cint, frappe } from '@/shared/frappe'
frappe.ui.form.on('SMS Center', {
  message: function (frm?: any) {
    const total_characters = frm.doc.message.length
    let total_msg = 1
    if (total_characters > 160) {
      total_msg = cint(total_characters / 160)
      total_msg = total_characters % 160 == 0 ? total_msg : total_msg + 1
    }
    frm.set_value('total_characters', total_characters)
    frm.set_value('total_messages', frm.doc.message ? total_msg : 0)
  },
})
