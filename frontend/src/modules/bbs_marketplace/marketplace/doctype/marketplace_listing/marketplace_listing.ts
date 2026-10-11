import { __, frappe } from '@/shared/frappe'
import { indicate, listButton, listingStatusAction, viewButton } from '../../actions'

frappe.ui.form.on('Marketplace Listing', {
  setup(frm: any) {
    frm.set_query('item', () => ({ filters: { disabled: 0, is_sales_item: 1 } }))
    frm.set_query('seller', () => ({ filters: { status: 'Active' } }))
  },

  refresh(frm: any) {
    if (frm.is_new()) return
    indicate(frm)
    const status = frm.doc.status
    if (status === 'Draft' || status === 'Rejected') listingStatusAction(frm, 'Submit for Review', 'Pending Approval', 'Status')
    if (status === 'Pending Approval') {
      listingStatusAction(frm, 'Approve', 'Approved')
      listingStatusAction(frm, 'Reject', 'Rejected', 'Moderation', true)
    }
    if (status === 'Approved' || status === 'Paused') listingStatusAction(frm, 'Publish', 'Published', 'Status')
    if (status === 'Published') listingStatusAction(frm, 'Pause', 'Paused', 'Status')
    if (status !== 'Archived') listingStatusAction(frm, 'Archive', 'Archived', 'Status')
    if (['Draft', 'Rejected', 'Paused', 'Approved', 'Published'].includes(status)) {
      frm.add_custom_button(
        __('Generate Variants'),
        () => {
          frappe.prompt(
            [
              { label: __('Attribute 1'), fieldname: 'a1', fieldtype: 'Link', options: 'Item Attribute', reqd: 1 },
              { label: __('Values 1 (comma separated)'), fieldname: 'v1', fieldtype: 'Small Text', reqd: 1 },
              { label: __('Attribute 2'), fieldname: 'a2', fieldtype: 'Link', options: 'Item Attribute' },
              { label: __('Values 2 (comma separated)'), fieldname: 'v2', fieldtype: 'Small Text' },
              { label: __('Attribute 3'), fieldname: 'a3', fieldtype: 'Link', options: 'Item Attribute' },
              { label: __('Values 3 (comma separated)'), fieldname: 'v3', fieldtype: 'Small Text' },
            ],
            (values: Record<string, string>) => {
              const attributes: Record<string, string> = {}
              ;[1, 2, 3].forEach((n) => {
                if (values[`a${n}`] && values[`v${n}`]) attributes[values[`a${n}`] as string] = values[`v${n}`] as string
              })
              frm.call({
                doc: frm.doc,
                method: 'generate_variants',
                args: { attributes },
                freeze: true,
                callback: () => frm.reload_doc(),
              })
            },
            __('Create a variant for every combination'),
            __('Generate'),
          )
        },
        __('Status'),
      )
    }
    viewButton(frm, 'Item', 'Item', frm.doc.item)
    viewButton(frm, 'Seller', 'Marketplace Seller', frm.doc.seller)
    listButton(frm, 'Order Lines', 'Marketplace Order Item', { listing: frm.doc.name })
    frm.add_custom_button(
      __('Stock Ledger'),
      () => frappe.set_route('query-report', 'Stock Ledger', { item_code: frm.doc.item }),
      __('View'),
    )
  },
})
