import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Coupon Code', {
  setup: function (frm?: any) {
    frm.set_query('pricing_rule', function () {
      return {
        filters: {
          coupon_code_based: 1,
          disable: 0,
        },
      }
    })
  },
  coupon_name: function (frm?: any) {
    if (frm.doc.__islocal === 1) {
      frm.trigger('make_coupon_code')
    }
  },
  coupon_type: function (frm?: any) {
    if (frm.doc.__islocal === 1) {
      frm.trigger('make_coupon_code')
    }
  },
  make_coupon_code: function (frm?: any) {
    let coupon_name = frm.doc.coupon_name
    let coupon_code: any
    if (frm.doc.coupon_type == 'Gift Card') {
      coupon_code = Math.random().toString(12).substring(2, 12).toUpperCase()
    } else if (frm.doc.coupon_type == 'Promotional') {
      coupon_name = coupon_name.replace(/\s/g, '')
      coupon_code = coupon_name.toUpperCase().slice(0, 8)
    }
    frm.doc.coupon_code = coupon_code
    frm.refresh_field('coupon_code')
  },
  refresh: function (frm?: any) {
    if (frm.doc.pricing_rule) {
      frm.add_custom_button(__('Add/Edit Coupon Conditions'), function () {
        frappe.set_route('Form', 'Pricing Rule', frm.doc.pricing_rule)
      })
    }
  },
})
