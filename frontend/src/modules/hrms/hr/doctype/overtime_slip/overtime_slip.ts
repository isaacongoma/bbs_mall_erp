import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Overtime Slip', {
  refresh: async (frm: any) => {
    if (frm.doc.docstatus === 0) {
      frm.add_custom_button(__('Fetch Overtime Details'), () => {
        if (!frm.doc.employee || !frm.doc.posting_date || !frm.doc.company) {
          frappe.msgprint({
            title: __('Missing Fields'),
            message: __('Please fill in Employee, Posting Date, and Company before fetching overtime details.'),
            indicator: 'orange',
          })
        } else {
          frm.events.get_emp_details_and_overtime_duration(frm)
        }
      })
    }
  },
  employee(frm: any) {
    frm.events.set_frequency_and_dates(frm)
  },
  posting_date(frm: any) {
    frm.events.set_frequency_and_dates(frm)
  },
  set_frequency_and_dates: function (frm: any) {
    if (frm.doc.employee && frm.doc.posting_date) {
      return frappe.call({
        method: 'get_frequency_and_dates',
        doc: frm.doc,
        callback: function () {
          frm.refresh()
        },
      })
    }
  },
  get_emp_details_and_overtime_duration: function (frm: any) {
    if (frm.doc.employee) {
      return frappe.call({
        method: 'get_emp_and_overtime_details',
        doc: frm.doc,
        callback: function () {
          frm.refresh()
        },
      })
    }
  },
})
