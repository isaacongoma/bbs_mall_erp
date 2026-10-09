import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Subcontracting BOM', {
  setup: (frm?: any) => {
    frm.trigger('set_queries')
  },
  set_queries: (frm?: any) => {
    frm.set_query('finished_good', () => {
      return {
        query: 'erpnext.controllers.queries.subcontracted_item_query',
      }
    })
    frm.set_query('finished_good_bom', () => {
      return {
        query: 'erpnext.subcontracting.doctype.subcontracting_bom.subcontracting_bom.finished_good_bom_query',
        filters: {
          finished_good: frm.doc.finished_good,
        },
      }
    })
    frm.set_query('service_item', () => {
      return {
        filters: {
          disabled: 0,
          is_stock_item: 0,
        },
      }
    })
  },
})
