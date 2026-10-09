import { $, __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Issue', {
  onload: function (frm?: any) {
    frm.email_field = 'raised_by'
    frappe.db.get_value(
      'Support Settings',
      { name: 'Support Settings' },
      ['allow_resetting_service_level_agreement', 'track_service_level_agreement'],
      (r?: any) => {
        if (r && r.track_service_level_agreement == '0') {
          frm.set_df_property('service_level_section', 'hidden', 1)
        }
        if (r && r.allow_resetting_service_level_agreement == '0') {
          frm.set_df_property('reset_service_level_agreement', 'hidden', 1)
        }
      },
    )
  },
  refresh: function (frm?: any) {
    if (frm.doc.status !== 'Closed') {
      frm.add_custom_button(__('Close'), function () {
        frm.set_value('status', 'Closed')
        frm.save()
      })
      frm.add_custom_button(
        __('Task'),
        function () {
          frappe.model.open_mapped_doc({
            method: 'erpnext.support.doctype.issue.issue.make_task',
            frm: frm,
          })
        },
        __('Create'),
      )
    } else {
      frm.add_custom_button(__('Reopen'), function () {
        frm.set_value('status', 'Open')
        frm.save()
      })
    }
  },
  reset_service_level_agreement: function (frm?: any) {
    const reset_sla = new frappe.ui.Dialog({
      title: __('Reset Service Level Agreement'),
      fields: [
        {
          fieldtype: 'Data',
          fieldname: 'reason',
          label: __('Reason'),
          reqd: 1,
        },
      ],
      primary_action_label: __('Reset'),
      primary_action: (values?: any) => {
        reset_sla.disable_primary_action()
        reset_sla.hide()
        reset_sla.clear()
        frappe.show_alert({
          indicator: 'green',
          message: __('Resetting Service Level Agreement.'),
        })
        frappe.call(
          'erpnext.support.doctype.service_level_agreement.service_level_agreement.reset_service_level_agreement',
          {
            reason: values.reason,
            user: frappe.session.user_email,
            doctype: frm.doc.doctype,
            docname: frm.doc.name,
          },
          () => {
            reset_sla.enable_primary_action()
            frm.refresh()
            frappe.msgprint(__('Service Level Agreement was reset.'))
          },
        )
      },
    })
    reset_sla.show()
  },
  timeline_refresh: function (frm?: any) {
    if (!frm.timeline.wrapper.find('.btn-split-issue').length) {
      const split_issue_btn = $(`
				<a class="action-btn btn-split-issue" title="${__('Split Issue')}">
					${frappe.utils.icon('git-branch', 'sm')}
				</a>
			`)
      const communication_box = frm.timeline.wrapper.find('.timeline-item[data-doctype="Communication"]')
      communication_box.find('.actions').prepend(split_issue_btn)
      if (!frm.timeline.wrapper.data('split-issue-event-attached')) {
        frm.timeline.wrapper.on('click', '.btn-split-issue', (e?: any) => {
          const dialog = new frappe.ui.Dialog({
            title: __('Split Issue'),
            fields: [
              {
                fieldname: 'subject',
                fieldtype: 'Data',
                reqd: 1,
                label: __('Subject'),
                description: __('All communications including and above this shall be moved into the new Issue'),
              },
            ],
            primary_action_label: __('Split'),
            primary_action: () => {
              frm.call(
                'split_issue',
                {
                  subject: dialog.fields_dict.subject.value,
                  communication_id: e.currentTarget.closest('.timeline-item').getAttribute('data-name'),
                },
                (r?: any) => {
                  frappe.msgprint(__('New issue created: {0}', [`<a href="/app/issue/${r.message}">${r.message}</a>`]))
                  frm.reload_doc()
                  dialog.hide()
                },
              )
            },
          })
          dialog.show()
        })
        frm.timeline.wrapper.data('split-issue-event-attached', true)
      }
    }
  },
})
