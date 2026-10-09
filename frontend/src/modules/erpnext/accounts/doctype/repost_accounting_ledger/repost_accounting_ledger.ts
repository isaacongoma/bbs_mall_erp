import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Repost Accounting Ledger', {
  setup: function (frm?: any) {
    frm.fields_dict['vouchers'].grid.get_field('voucher_type').get_query = function () {
      return {
        query: 'erpnext.accounts.doctype.repost_accounting_ledger.repost_accounting_ledger.get_repost_allowed_types',
      }
    }
    frm.fields_dict['vouchers'].grid.get_field('voucher_no').get_query = function (doc?: any) {
      if (doc.company) {
        return {
          filters: {
            company: doc.company,
            docstatus: 1,
          },
        }
      }
    }
  },
  refresh: function (frm?: any) {
    if (frm.doc.docstatus == 1 && !['Completed', 'Cancelled'].includes(frm.doc.status)) {
      frm.add_custom_button(__('Start Reposting'), () => {
        frm.events.start_repost(frm)
      })
    }
    if (frm.doc.docstatus != 2) {
      frm.add_custom_button(__('Show Preview'), () => {
        frm.events.generate_preview(frm)
      })
    }
  },
  generate_preview: function (frm?: any) {
    frm.call({
      method: 'generate_preview',
      doc: frm.doc,
      freeze: true,
      freeze_message: __('Generating Preview'),
      callback: function (r?: any) {
        if (r && r.message) {
          const content = r.message
          const opts: any = {
            title: 'Preview',
            subtitle: 'preview',
            content: content,
            print_settings: { orientation: 'landscape' },
            columns: [],
            data: [],
          }
          frappe.render_grid(opts)
        }
      },
    })
  },
  start_repost: function (frm?: any) {
    frm.call({
      method: 'start_repost',
      doc: frm.doc,
      callback: function () {
        frm.reload_doc()
      },
    })
  },
})
