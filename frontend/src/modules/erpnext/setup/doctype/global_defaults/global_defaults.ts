import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Global Defaults', {
  onload: function (frm?: any) {
    frm.trigger('get_distance_uoms')
  },
  validate: function (frm?: any) {
    frm.call('get_defaults', null, (r?: any) => {
      frappe.sys_defaults = r.message
    })
  },
  get_distance_uoms: function (frm?: any) {
    const units: any = []
    frappe.call({
      method: 'frappe.client.get_list',
      args: {
        doctype: 'UOM Conversion Factor',
        filters: { category: 'Length' },
        fields: ['to_uom'],
        limit_page_length: 500,
      },
      callback: function (r?: any) {
        r.message.forEach((row?: any) => units.push(row.to_uom))
      },
    })
    frm.set_query('default_distance_unit', function () {
      return { filters: { name: ['IN', units] } }
    })
  },
})
