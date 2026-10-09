import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Exit Interview', {
  refresh: function (frm: any) {
    if (
      !frm.doc.__islocal &&
      !frm.doc.questionnaire_email_sent &&
      frappe.boot.user.can_write.includes('Exit Interview')
    ) {
      frm.add_custom_button(__('Send Exit Questionnaire'), function () {
        frm.trigger('send_exit_questionnaire')
      })
    }
  },
  employee: function (frm: any) {
    frappe.db.get_value('Employee', frm.doc.employee, 'relieving_date', (message: any) => {
      if (!message.relieving_date) {
        frappe.throw({
          message: __('Please set the relieving date for employee {0}', [
            '<a href="/app/employee/' + frm.doc.employee + '">' + frm.doc.employee + '</a>',
          ]),
          title: __('Relieving Date Missing'),
        })
      }
    })
  },
  send_exit_questionnaire: function (frm: any) {
    frappe.call({
      method: 'hrms.hr.doctype.exit_interview.exit_interview.send_exit_questionnaire',
      args: {
        interviews: [frm.doc],
      },
      callback: function (r: any) {
        if (!r.exc) {
          frm.refresh_field('questionnaire_email_sent')
        }
      },
    })
  },
})
