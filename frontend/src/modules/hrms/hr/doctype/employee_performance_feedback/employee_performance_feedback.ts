import { frappe } from '@/shared/frappe'

frappe.ui.form.on('Employee Performance Feedback', {
  onload(frm: any) {
    frm.trigger('set_reviewer')
  },
  refresh(frm: any) {
    frm.trigger('set_filters')
  },
  employee(frm: any) {
    frm.set_value('appraisal', '')
  },
  appraisal(frm: any) {
    if (frm.doc.employee) {
      frm.call('set_feedback_criteria', () => {
        frm.refresh_field('feedback_ratings')
      })
    }
  },
  set_filters(frm: any) {
    frm.set_query('appraisal', () => {
      return {
        filters: {
          employee: frm.doc.employee,
        },
      }
    })
    frm.set_query('reviewer', () => {
      return {
        filters: {
          employee: ['!=', frm.doc.employee],
        },
      }
    })
  },
  set_reviewer(frm: any) {
    if (!frm.doc.reviewer) {
      frappe.db.get_value('Employee', { user_id: frappe.session.user }, 'name').then((employee_record: any) => {
        const session_employee = employee_record?.message?.name
        if (session_employee) frm.set_value('reviewer', session_employee)
      })
    }
  },
})
