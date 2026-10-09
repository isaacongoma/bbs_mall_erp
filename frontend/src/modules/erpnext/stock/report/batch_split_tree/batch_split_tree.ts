import { __, erpnext, frappe } from '@/shared/frappe'
frappe.query_reports['Batch Split Tree'] = {
  export_hidden_cols: true,
  formatter: erpnext.utils.format_serial_batch_number,
  filters: [
    {
      fieldname: 'batch',
      label: __('Parent Batch'),
      fieldtype: 'Link',
      options: 'Batch',
    },
    {
      fieldname: 'item_code',
      label: __('Item Code'),
      fieldtype: 'Link',
      options: 'Item',
    },
  ],
  initial_depth: 5,
}
