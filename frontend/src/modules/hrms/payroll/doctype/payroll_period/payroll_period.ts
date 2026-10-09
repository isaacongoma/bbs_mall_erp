import { frappe } from '@/shared/frappe'

frappe.ui.form.on('Payroll Period', {
  onload: function (frm: any) {
    frm.trigger('set_start_date')
  },
  set_start_date: function (frm: any) {
    if (!frm.doc.__islocal) return
    frappe.db
      .get_list('Payroll Period', {
        fields: ['end_date'],
        order_by: 'end_date desc',
        limit: 1,
      })
      .then((result: any) => {
        if (result.length) {
          const last_end_date = result[0].end_date
          frm.set_value('start_date', frappe.datetime.add_days(last_end_date, 1))
        } else {
          frm.set_value('start_date', frappe.defaults.get_default('year_start_date'))
        }
      })
  },
  start_date: function (frm: any) {
    frm.set_value('end_date', frappe.datetime.add_days(frappe.datetime.add_months(frm.doc.start_date, 12), -1))
  },
})
