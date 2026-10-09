import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Project Update', {
  refresh: function () {},
  onload: function (frm?: any) {
    frm.set_value('naming_series', 'UPDATE-.project.-.YY.MM.DD.-.####')
  },
  validate: function (frm?: any) {
    frm.set_value('time', frappe.datetime.now_time())
    frm.set_value('date', frappe.datetime.nowdate())
  },
})
