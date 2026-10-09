import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Item Variant Settings', {
  refresh: function (frm?: any) {
    const allow_fields: any = []
    const existing_fields = frm.doc.fields.map((row?: any) => row.field_name)
    const exclude_fields: any = [
      ...existing_fields,
      'naming_series',
      'item_code',
      'item_name',
      'published_in_website',
      'standard_rate',
      'opening_stock',
      'image',
      'variant_of',
      'valuation_rate',
      'barcodes',
      'has_variants',
      'attributes',
    ]
    const exclude_field_types: any = ['HTML', 'Section Break', 'Column Break', 'Button', 'Read Only']
    frappe.model.with_doctype('Item', () => {
      const field_label_map: any = {}
      frappe.get_meta('Item').fields.forEach((d?: any) => {
        field_label_map[d.fieldname] = __(d.label, null, d.parent) + ` (${d.fieldname})`
        if (!exclude_field_types.includes(d.fieldtype) && !d.no_copy && !exclude_fields.includes(d.fieldname)) {
          allow_fields.push({
            label: field_label_map[d.fieldname],
            value: d.fieldname,
          })
        }
      })
      if (allow_fields.length == 0) {
        allow_fields.push({
          label: __('No additional fields available'),
          value: '',
        })
      }
      frm.fields_dict.fields.grid.update_docfield_property('field_name', 'options', allow_fields)
    })
  },
})
