import { frappe } from '@/shared/frappe'

frappe.ui.form.on('Leave Period', {
  from_date: (frm: any) => {
    let a_year_from_start: any
    if (frm.doc.from_date && !frm.doc.to_date) {
      a_year_from_start = frappe.datetime.add_months(frm.doc.from_date, 12)
      frm.set_value('to_date', frappe.datetime.add_days(a_year_from_start, -1))
    }
  },
  onload: (frm: any) => {
    frm.set_query('department', function () {
      return {
        filters: {
          company: frm.doc.company,
        },
      }
    })
  },
})
