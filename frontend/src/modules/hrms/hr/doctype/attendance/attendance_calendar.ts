import { frappe } from '@/shared/frappe'

frappe.views.calendar['Attendance'] = {
  fields: ['status'],
  apply_to_custom_calendar_views: true,
  field_map: {
    start: 'attendance_date',
    end: 'attendance_date',
    id: 'name',
    title: 'title',
    allDay: 'allDay',
    color: 'color',
  },
  get_css_class: function (data: any) {
    if (data.doctype === 'Holiday') return 'default'
    else if (!data.doctype || data.doctype === 'Attendance') {
      if (data.status === 'Absent' || data.status === 'On Leave') {
        return 'danger'
      }
      if (data.status === 'Half Day') return 'warning'
      return 'success'
    }
  },
  options: {
    header: {
      left: 'prev,next today',
      center: 'title',
      right: 'month',
    },
  },
  get_events_method: 'hrms.hr.doctype.attendance.attendance.get_events',
}
