import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Interview Feedback', {
  onload: function (frm: any) {
    frm.ignore_doctypes_on_cancel_all = ['Interview']
    frm.set_query('interview', function () {
      return {
        filters: {
          docstatus: ['!=', 2],
        },
      }
    })
  },
  interview_type: function (frm: any) {
    frappe.call({
      method: 'hrms.hr.doctype.interview.interview.get_expected_skill_set',
      args: {
        interview_type: frm.doc.interview_type,
      },
      callback: function (r: any) {
        frm.set_value('skill_assessment', r.message)
      },
    })
  },
  interview: function (frm: any) {
    frappe.call({
      method: 'hrms.hr.doctype.interview_feedback.interview_feedback.get_applicable_interviewers',
      args: {
        interview: frm.doc.interview || '',
      },
      callback: function (r: any) {
        frm.set_query('interviewer', function () {
          return {
            filters: {
              name: ['in', r.message],
            },
          }
        })
      },
    })
  },
  interviewer: function (frm: any) {
    if (!frm.doc.interview) {
      frappe.throw(__('Select Interview first'))
      frm.set_value('interviewer', '')
    }
  },
})
