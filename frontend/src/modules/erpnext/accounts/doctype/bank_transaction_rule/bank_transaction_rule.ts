import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Bank Transaction Rule', {
  refresh: function (frm?: any) {
    frm.set_query('account', function () {
      return {
        filters: {
          company: frm.doc.company,
        },
      }
    })
    frm.set_intro(
      __(
        "Go to the <a href='/banking' target='_blank' style='text-decoration: underline;'>Banking module</a> to setup this rule.",
      ),
    )
  },
})
