import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Process Period Closing Voucher', {
  refresh(frm?: any) {
    if (frm.doc.docstatus == 1 && ['Queued'].find((x?: any) => x == frm.doc.status)) {
      const execute_btn = __('Start')
      frm.add_custom_button(execute_btn, () => {
        frm
          .call({
            method:
              'erpnext.accounts.doctype.process_period_closing_voucher.process_period_closing_voucher.start_pcv_processing',
            args: {
              docname: frm.doc.name,
            },
          })
          .then((r?: any) => {
            if (!r.exc) {
              frappe.show_alert(__('Job Started'))
              frm.reload_doc()
            }
          })
      })
    }
    if (frm.doc.docstatus == 1 && ['Running'].find((x?: any) => x == frm.doc.status)) {
      const execute_btn = __('Pause')
      frm.add_custom_button(execute_btn, () => {
        frm
          .call({
            method:
              'erpnext.accounts.doctype.process_period_closing_voucher.process_period_closing_voucher.pause_pcv_processing',
            args: {
              docname: frm.doc.name,
            },
          })
          .then((r?: any) => {
            if (!r.exc) {
              frappe.show_alert(__('PCV Paused'))
              frm.reload_doc()
            }
          })
      })
    }
    if (frm.doc.docstatus == 1 && ['Paused'].find((x?: any) => x == frm.doc.status)) {
      const execute_btn = __('Resume')
      frm.add_custom_button(execute_btn, () => {
        frm
          .call({
            method:
              'erpnext.accounts.doctype.process_period_closing_voucher.process_period_closing_voucher.resume_pcv_processing',
            args: {
              docname: frm.doc.name,
            },
          })
          .then((r?: any) => {
            if (!r.exc) {
              frappe.show_alert(__('PCV Resumed'))
              frm.reload_doc()
            }
          })
      })
    }
    let progress = 0
    const normal_finished = frm.doc.normal_balances.filter((x?: any) => x.status == 'Completed').length
    const opening_finished = frm.doc.z_opening_balances.filter((x?: any) => x.status == 'Completed').length
    progress =
      ((normal_finished + opening_finished) / (frm.doc.normal_balances.length + frm.doc.z_opening_balances.length)) *
      100
    frm.dashboard.add_progress('Books closure progress', progress, '')
  },
})
