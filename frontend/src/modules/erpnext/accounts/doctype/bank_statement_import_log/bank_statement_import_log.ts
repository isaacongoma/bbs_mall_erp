import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Bank Statement Import Log', {
  refresh(frm?: any) {
    frm.set_intro(
      __(
        "Go to <a href='/banking/statement-importer' target='_blank' style='text-decoration: underline;'>Bank Statement Importer</a> in the Banking module to use this importer.",
      ),
    )
  },
})
