import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Attendance Request', {
  refresh(frm: any) {
    frm.trigger('show_attendance_warnings')
  },
  show_attendance_warnings(frm: any) {
    if (!frm.is_new() && frm.doc.docstatus === 0) {
      frm.dashboard.clear_headline()
      frm.call('get_attendance_warnings').then((r: any) => {
        if (r.message?.length) {
          frm.dashboard.reset()
          frm.dashboard.add_section(
            frappe.render_template('attendance_warnings', {
              warnings: r.message || [],
            }),
            __('Attendance Warnings'),
          )
          frm.dashboard.show()
        }
      })
    }
  },
  employee(frm: any) {
    if (frm.doc.employee && frm.doc.from_date && !frm.doc.shift) {
      frm.trigger('set_employee_shift')
    }
  },
  from_date(frm: any) {
    if (frm.doc.employee && frm.doc.from_date && !frm.doc.shift) {
      frm.trigger('set_employee_shift')
    }
  },
  set_employee_shift(frm: any) {
    if (!frm.doc.employee || !frm.doc.from_date) return
    frappe.call({
      method: 'hrms.hr.doctype.attendance.attendance.get_employee_shift',
      args: {
        employee: frm.doc.employee,
        for_date: frm.doc.from_date,
        consider_default_shift: true,
      },
      callback(r: any) {
        if (r.message && !frm.doc.shift) {
          frm.set_value('shift', r.message)
        }
      },
    })
  },
})
