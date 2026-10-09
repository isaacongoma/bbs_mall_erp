import { $, __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Appointment Booking Settings', 'validate', check_times)
function check_times(frm?: any) {
  $.each(frm.doc.availability_of_slots || [], function (i?: any, d?: any) {
    const from_time = Date.parse('01/01/2019 ' + d.from_time)
    const to_time = Date.parse('01/01/2019 ' + d.to_time)
    if (from_time > to_time) {
      frappe.throw(__('In row {0} of Appointment Booking Slots: "To Time" must be later than "From Time".', [i + 1]))
    }
  })
}
