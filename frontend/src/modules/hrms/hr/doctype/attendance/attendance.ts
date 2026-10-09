import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Attendance', {
  refresh(frm: any) {
    if (frm.doc.__islocal && !frm.doc.attendance_date) {
      frm.set_value('attendance_date', frappe.datetime.get_today())
    }
    frm.set_query('employee', () => {
      return {
        query: 'erpnext.controllers.queries.employee_query',
      }
    })
    if (frm.doc.docstatus === 1 && frm.doc.status === 'Absent') {
      frm.add_custom_button(
        __('Attendance Request'),
        () => {
          frappe.new_doc('Attendance Request', {
            employee: frm.doc.employee,
            from_date: frm.doc.attendance_date,
            to_date: frm.doc.attendance_date,
          })
        },
        __('Create'),
      )
    }
  },
  employee(frm: any) {
    if (frm.doc.employee && frm.doc.attendance_date && !frm.doc.shift) {
      frm.trigger('set_employee_shift')
    }
  },
  attendance_date(frm: any) {
    if (frm.doc.employee && frm.doc.attendance_date && !frm.doc.shift) {
      frm.trigger('set_employee_shift')
    }
  },
  set_employee_shift(frm: any) {
    if (!frm.doc.employee || !frm.doc.attendance_date) return
    frappe.call({
      method: 'hrms.hr.doctype.attendance.attendance.get_employee_shift',
      args: {
        employee: frm.doc.employee,
        for_date: frm.doc.attendance_date || frappe.datetime.get_today(),
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
