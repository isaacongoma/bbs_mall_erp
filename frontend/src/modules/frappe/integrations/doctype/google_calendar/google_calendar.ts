import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Google Calendar', {
  refresh: function (frm?: any) {
    if (frm.is_new()) {
      frm.dashboard.set_headline(
        __('To use Google Calendar, enable {0}.', [`<a href='/desk/google-settings'>${__('Google Settings')}</a>`]),
      )
    }
    frappe.realtime.on('import_google_calendar', (data?: any) => {
      if (data.progress) {
        frm.dashboard.show_progress(
          'Syncing Google Calendar',
          (data.progress / data.total) * 100,
          __('Syncing {0} of {1}', [data.progress, data.total]),
        )
        if (data.progress === data.total) {
          frm.dashboard.hide_progress('Syncing Google Calendar')
        }
      }
    })
    if (frm.doc.refresh_token) {
      frm.add_custom_button(__('Sync Calendar'), function () {
        frappe.show_alert({
          indicator: 'green',
          message: __('Syncing'),
        })
        frappe
          .call({
            method: 'frappe.integrations.doctype.google_calendar.google_calendar.sync',
            args: {
              g_calendar: frm.doc.name,
            },
          })
          .then((r?: any) => {
            frappe.hide_progress()
            frappe.msgprint(r.message)
          })
      })
    }
  },
  authorize_google_calendar_access: function (frm?: any) {
    let reauthorize = 0
    if (frm.doc.authorization_code) {
      reauthorize = 1
    }
    frappe.call({
      method: 'frappe.integrations.doctype.google_calendar.google_calendar.authorize_access',
      args: {
        g_calendar: frm.doc.name,
        reauthorize: reauthorize,
      },
      callback: function (r?: any) {
        if (!r.exc) {
          frm.save()
          window.open(r.message.url)
        }
      },
    })
  },
})
