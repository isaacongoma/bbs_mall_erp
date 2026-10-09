import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Fiscal Year', {
  onload: function (frm?: any) {
    if (frm.doc.__islocal) {
      frm.set_value('year_start_date', frappe.datetime.year_start())
    }
  },
  year_start_date: function (frm?: any) {
    if (!frm.doc.is_short_year) {
      const year_end_date = frappe.datetime.add_days(frappe.datetime.add_months(frm.doc.year_start_date, 12), -1)
      frm.set_value('year_end_date', year_end_date)
    }
  },
})
