import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Item Standard Cost', {
  setup(frm?: any) {
    frm.set_query('item_code', () => {
      return {
        query: 'erpnext.stock.doctype.item_standard_cost.item_standard_cost.get_standard_cost_items',
        filters: {
          company: frm.doc.company,
        },
      }
    })
  },
  refresh(frm?: any) {
    frm.trigger('show_backdated_block_warning')
  },
  item_code(frm?: any) {
    frm.trigger('show_backdated_block_warning')
  },
  effective_date(frm?: any) {
    frm.trigger('show_backdated_block_warning')
  },
  show_backdated_block_warning(frm?: any) {
    if (frm.doc.docstatus !== 0 || !frm.doc.item_code || !frm.doc.effective_date) {
      frm.set_intro('')
      return
    }
    frm.set_intro(
      __(
        'On submission, stock transactions for Item {0} cannot be posted with a date before {1} — backdated entries will be blocked.',
        [
          frappe.utils.escape_html(frm.doc.item_code).bold(),
          frappe.datetime.str_to_user(frm.doc.effective_date).bold(),
        ],
      ),
      'yellow',
    )
  },
})
