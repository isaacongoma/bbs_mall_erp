import { $, frappe, set_field_options } from '@/shared/frappe'
frappe.ui.form.on('Promotional Scheme', {
  setup: function (frm?: any) {
    frm.set_query('for_price_list', 'price_discount_slabs', (doc?: any) => {
      return {
        filters: {
          selling: doc.selling,
          buying: doc.buying,
          currency: doc.currency,
        },
      }
    })
  },
  refresh: function (frm?: any) {
    frm.trigger('set_options_for_applicable_for')
    frm.trigger('toggle_reqd_apply_on')
  },
  selling: function (frm?: any) {
    frm.trigger('set_options_for_applicable_for')
    frm.toggle_enable('buying', !frm.doc.selling)
  },
  buying: function (frm?: any) {
    frm.trigger('set_options_for_applicable_for')
    frm.toggle_enable('selling', !frm.doc.buying)
  },
  set_options_for_applicable_for: function (frm?: any) {
    let options: any = ['']
    let applicable_for = frm.doc.applicable_for
    if (frm.doc.selling) {
      options = $.merge(options, ['Customer', 'Customer Group', 'Territory', 'Sales Partner', 'Campaign'])
    }
    if (frm.doc.buying) {
      $.merge(options, ['Supplier', 'Supplier Group'])
    }
    set_field_options('applicable_for', options.join('\n'))
    if (!options.includes(applicable_for)) applicable_for = null
    frm.set_value('applicable_for', applicable_for)
  },
  apply_on: function (frm?: any) {
    frm.trigger('toggle_reqd_apply_on')
  },
  toggle_reqd_apply_on: function (frm?: any) {
    const fields: any = {
      'Item Code': 'items',
      'Item Group': 'item_groups',
      Brand: 'brands',
    }
    for (const key in fields) {
      frm.toggle_reqd(fields[key], frm.doc.apply_on === key ? 1 : 0)
    }
  },
})
