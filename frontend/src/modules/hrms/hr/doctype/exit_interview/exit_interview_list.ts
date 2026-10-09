import { __, frappe } from '@/shared/frappe'

frappe.listview_settings['Exit Interview'] = {
  has_indicator_for_draft: 1,
  get_indicator: function (doc: any) {
    let status_color: any = {
      Pending: 'orange',
      Scheduled: 'yellow',
      Completed: 'green',
      Cancelled: 'red',
    }
    return [__(doc.status), status_color[doc.status], 'status,=,' + doc.status]
  },
  onload: function (listview: any) {
    if (frappe.boot.user.can_write.includes('Exit Interview')) {
      listview.page.add_action_item(__('Send Exit Questionnaires'), function () {
        const interviews = listview.get_checked_items()
        frappe.call({
          method: 'hrms.hr.doctype.exit_interview.exit_interview.send_exit_questionnaire',
          freeze: true,
          args: {
            interviews: interviews,
          },
        })
      })
    }
  },
}
