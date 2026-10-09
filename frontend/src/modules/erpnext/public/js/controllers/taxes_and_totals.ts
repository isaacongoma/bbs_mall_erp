import {
  $,
  __,
  cint,
  cstr,
  erpnext,
  flt,
  frappe,
  precision,
  round_based_on_smallest_currency_fraction,
} from '@/shared/frappe'
const NOT_APPLICABLE_TAX = 'N/A'
erpnext.taxable_base_resolvers = erpnext.taxable_base_resolvers || {}
erpnext.taxes_and_totals = class TaxesAndTotals extends erpnext.payments {
  [key: string]: any
  setup(this: any) {
    this.fetch_round_off_accounts()
  }
  apply_pricing_rule_on_item(item?: any) {
    let effective_item_rate = item.price_list_rate
    if (['Sales Order', 'Quotation'].includes(item.parenttype) && item.blanket_order_rate) {
      effective_item_rate = item.blanket_order_rate
    }
    let rate_with_margin: any
    if (item.margin_type == 'Percentage') {
      rate_with_margin = effective_item_rate * (1 + item.margin_rate_or_amount / 100)
    } else {
      rate_with_margin = effective_item_rate + item.margin_rate_or_amount
    }
    item.rate_with_margin = flt(rate_with_margin, precision('rate_with_margin', item))
    if (item.discount_percentage) {
      item.discount_amount = flt(
        (item.rate_with_margin * item.discount_percentage) / 100,
        precision('discount_amount', item),
      )
    }
    let item_rate = item.rate_with_margin
    if (item.discount_amount) {
      item_rate = item.rate_with_margin - item.discount_amount
    }
    item_rate = flt(item_rate, precision('rate', item))
    frappe.model.set_value(item.doctype, item.name, 'rate', item_rate)
  }
  async calculate_taxes_and_totals(this: any, update_paid_amount?: any) {
    this.discount_amount_applied = false
    this._calculate_taxes_and_totals()
    this.calculate_discount_amount()
    if (this.frm.doc.apply_discount_on == 'Grand Total' && this.frm.doc.is_cash_or_non_trade_discount) {
      this.frm.doc.grand_total -= this.frm.doc.discount_amount
      this.frm.doc.base_grand_total -= this.frm.doc.base_discount_amount
      this.frm.doc.rounding_adjustment = 0
      this.frm.doc.base_rounding_adjustment = 0
      this.set_rounded_total()
    }
    await this.calculate_shipping_charges()
    if (
      ['Sales Invoice', 'POS Invoice', 'Purchase Invoice'].includes(this.frm.doc.doctype) &&
      this.frm.doc.docstatus < 2 &&
      !this.frm.doc.is_return
    ) {
      this.calculate_total_advance(update_paid_amount)
    }
    if (
      ['Sales Invoice', 'POS Invoice'].includes(this.frm.doc.doctype) &&
      this.frm.doc.is_pos &&
      this.frm.doc.is_return
    ) {
      await this.set_total_amount_to_default_mop()
      this.calculate_paid_amount()
    }
    if (['Quotation', 'Sales Order', 'Delivery Note', 'Sales Invoice'].includes(this.frm.doc.doctype)) {
      this.calculate_commission()
      this.calculate_contribution()
    }
    if (
      this.frm.doc.doctype === 'Purchase Invoice' &&
      this.frm.doc.is_return &&
      this.frm.doc.grand_total < 0 &&
      this.frm.doc.grand_total > this.frm.doc.paid_amount
    ) {
      this.frm.doc.paid_amount = flt(this.frm.doc.grand_total, precision('grand_total'))
    }
    this.frm.refresh_fields()
  }
  calculate_discount_amount(this: any) {
    if (frappe.meta.get_docfield(this.frm.doc.doctype, 'discount_amount')) {
      this.set_discount_amount()
      this.apply_discount_amount()
    }
  }
  _calculate_taxes_and_totals(this: any) {
    const is_quotation = this.frm.doc.doctype == 'Quotation'
    this.frm._items = is_quotation ? this.filtered_items() : this.frm.doc.items
    this.validate_conversion_rate()
    this.calculate_item_values()
    this.initialize_taxes()
    this.determine_exclusive_rate()
    this.calculate_net_total()
    this.calculate_taxes()
    this.adjust_grand_total_for_inclusive_tax()
    this.calculate_totals()
    this._cleanup()
  }
  validate_conversion_rate(this: any) {
    this.frm.doc.conversion_rate = flt(
      this.frm.doc.conversion_rate,
      frappe.meta.get_field_precision(this.frm.get_docfield('conversion_rate'), this.frm.doc),
    )
    let conversion_rate_label = frappe.meta.get_translated_label(
      this.frm.doc.doctype,
      'conversion_rate',
      this.frm.doc.name,
    )
    let company_currency = this.get_company_currency()
    if (!this.frm.doc.conversion_rate) {
      if (this.frm.doc.currency == company_currency) {
        this.frm.set_value('conversion_rate', 1)
      } else {
        const subs: any = [conversion_rate_label, this.frm.doc.currency, company_currency]
        const err_message = __('{0} is mandatory. Maybe Currency Exchange record is not created for {1} to {2}', subs)
        frappe.throw(err_message)
      }
    }
  }
  get_item_fields_to_round(this: any) {
    const [item] = this.frm.doc.items || []
    if (!item) {
      return []
    }
    const do_not_round_fields: any = ['conversion_factor']
    return frappe.meta
      .get_fieldnames(item.doctype, item.parent, {
        fieldtype: ['in', ['Currency', 'Float']],
      })
      .filter((fieldname?: any) => !do_not_round_fields.includes(fieldname))
  }
  get_billed_qty(this: any, item?: any) {
    const settings = frappe.boot.sysdefaults || {}
    const is_internal_transfer =
      this.frm.doc.is_internal_supplier && this.frm.doc.represents_company === this.frm.doc.company
    const bills_rejected_quantity =
      this.frm.doc.doctype === 'Purchase Invoice' &&
      this.frm.doc.update_stock &&
      !is_internal_transfer &&
      cint(settings.set_valuation_rate_for_rejected_materials) &&
      cint(settings.bill_for_rejected_quantity_in_purchase_invoice)
    if (!flt(item.rejected_qty) || !bills_rejected_quantity) {
      return flt(item.qty)
    }
    return flt(item.qty) + flt(item.rejected_qty)
  }
  calculate_item_values(this: any) {
    let me = this
    if (!this.discount_amount_applied) {
      const fields_to_round = this.get_item_fields_to_round()
      for (const item of this.frm.doc.items || []) {
        frappe.model.round_floats_in(item, fields_to_round)
        item.net_rate = item.rate
        item.qty = item.qty === undefined ? (me.frm.doc.is_return ? -1 : 1) : item.qty
        if (!(me.frm.doc.is_return || me.frm.doc.is_debit_note)) {
          item.net_amount = item.amount = flt(item.rate * me.get_billed_qty(item), precision('amount', item))
        } else {
          let qty = flt(item.qty)
          if (!qty) {
            qty = me.frm.doc.is_debit_note ? 1 : -1
            if (me.frm.doc.doctype !== 'Purchase Receipt' && me.frm.doc.is_return === 1) {
              qty = flt(item.qty)
            }
          }
          item.net_amount = item.amount = flt(item.rate * qty, precision('amount', item))
        }
        item.item_tax_amount = 0.0
        item.total_weight = flt(item.weight_per_unit * item.stock_qty)
        me.set_in_company_currency(item, ['price_list_rate', 'rate', 'amount', 'net_rate', 'net_amount'])
      }
    }
  }
  set_in_company_currency(this: any, doc?: any, fields?: any) {
    let me = this
    $.each(fields, function (_i?: any, f?: any) {
      doc['base_' + f] = flt(flt(doc[f], precision(f, doc)) * me.frm.doc.conversion_rate, precision('base_' + f, doc))
    })
  }
  initialize_taxes(this: any) {
    let me = this
    $.each(this.frm.doc['taxes'] || [], function (this: any, _i?: any, tax?: any) {
      if (!tax.dont_recompute_tax) {
        tax.item_wise_tax_detail = {}
      }
      let tax_fields: any = [
        'net_amount',
        'total',
        'tax_amount_after_discount_amount',
        'tax_amount_for_current_item',
        'grand_total_for_current_item',
        'tax_fraction_for_current_item',
        'grand_total_fraction_for_current_item',
      ]
      if (
        cstr(tax.charge_type) != 'Actual' &&
        !(me.discount_amount_applied && me.frm.doc.apply_discount_on == 'Grand Total')
      ) {
        tax_fields.push('tax_amount')
      }
      $.each(tax_fields, function (_i?: any, fieldname?: any) {
        tax[fieldname] = 0.0
      })
      if (!this.discount_amount_applied) {
        erpnext.accounts.taxes.validate_taxes_and_charges(tax.doctype, tax.name)
        erpnext.accounts.taxes.validate_inclusive_tax(tax, this.frm)
      }
      frappe.model.round_floats_in(tax)
    })
  }
  fetch_round_off_accounts(this: any) {
    let me = this
    frappe.flags.round_off_applicable_accounts = []
    if (me.frm.doc.company) {
      frappe.call({
        method: 'erpnext.controllers.taxes_and_totals.get_round_off_applicable_accounts',
        args: {
          company: me.frm.doc.company,
          account_list: frappe.flags.round_off_applicable_accounts,
          doc: me.frm.doc,
        },
        callback(r?: any) {
          if (r.message) {
            frappe.flags.round_off_applicable_accounts.push(...r.message)
          }
        },
      })
    }
    frappe.call({
      method: 'erpnext.controllers.taxes_and_totals.get_rounding_tax_settings',
      callback: function (r?: any) {
        frappe.flags.round_off_settings = r.message
      },
    })
  }
  determine_exclusive_rate(this: any) {
    let me = this
    let has_inclusive_tax = false
    $.each(me.frm.doc['taxes'] || [], function (_i?: any, row?: any) {
      if (cint(row.included_in_print_rate)) has_inclusive_tax = true
    })
    if (has_inclusive_tax == false) return
    $.each(this.frm.doc.items || [], function (_n?: any, item?: any) {
      let amount: any
      item._unrounded_net_amount = null
      let item_tax_map = me._load_item_tax_rate(item.item_tax_rate)
      let total_tax_slope = 0.0
      let total_tax_intercept = 0
      $.each(me.frm.doc['taxes'] || [], function (i?: any, tax?: any) {
        let prev: any
        let tax_contribution = me.get_current_tax_fraction(tax, item_tax_map, item)
        tax.tax_fraction_for_current_item = tax_contribution[0]
        let tax_intercept_per_qty = tax_contribution[1]
        tax.inclusive_amount_per_qty = tax_intercept_per_qty
        if (i == 0) {
          tax.grand_total_fraction_for_current_item = 1 + tax.tax_fraction_for_current_item
          tax.grand_total_amount_per_qty = tax_intercept_per_qty
        } else {
          prev = me.frm.doc['taxes'][i - 1]
          tax.grand_total_fraction_for_current_item =
            prev.grand_total_fraction_for_current_item + tax.tax_fraction_for_current_item
          tax.grand_total_amount_per_qty = flt(prev.grand_total_amount_per_qty) + tax_intercept_per_qty
        }
        total_tax_slope += tax.tax_fraction_for_current_item
        total_tax_intercept += tax_intercept_per_qty * flt(item.qty)
      })
      if (!me.discount_amount_applied && item.qty && (total_tax_intercept || total_tax_slope)) {
        amount = flt(item.amount) - total_tax_intercept
        item._unrounded_net_amount = amount / (1 + total_tax_slope)
        item.net_amount = flt(item._unrounded_net_amount, precision('net_amount', item))
        item.net_rate = item.qty ? flt(item.net_amount / item.qty, precision('net_rate', item)) : 0
        me.set_in_company_currency(item, ['net_rate', 'net_amount'])
      }
    })
  }
  get_current_tax_fraction(this: any, tax?: any, item_tax_map?: any, item?: any) {
    let tax_rate: any
    let tax_slope = 0.0
    let tax_intercept = 0
    if (cint(tax.included_in_print_rate)) {
      tax_rate = this._get_tax_rate(tax, item_tax_map)
      if (tax_rate === NOT_APPLICABLE_TAX) {
        return [tax_slope, tax_intercept]
      }
      if (tax.charge_type == 'On Net Total') {
        tax_slope = tax_rate / 100.0
      } else if (tax.charge_type == 'On Previous Row Amount') {
        const row = this.frm.doc['taxes'][cint(tax.row_id) - 1]
        tax_slope = (tax_rate / 100.0) * row.tax_fraction_for_current_item
        tax_intercept = (tax_rate / 100.0) * flt(row.inclusive_amount_per_qty)
      } else if (tax.charge_type == 'On Previous Row Total') {
        const row = this.frm.doc['taxes'][cint(tax.row_id) - 1]
        tax_slope = (tax_rate / 100.0) * row.grand_total_fraction_for_current_item
        tax_intercept = (tax_rate / 100.0) * flt(row.grand_total_amount_per_qty)
      } else if (tax.charge_type == 'On Item Quantity') {
        tax_intercept = flt(tax_rate)
      } else {
        const qty = flt(item.qty) || 1
        const base = this.get_item_taxable_base(item, tax)
        tax_intercept = ((tax_rate / 100.0) * base) / qty
      }
    }
    if (tax.add_deduct_tax && tax.add_deduct_tax == 'Deduct') {
      tax_slope *= -1
      tax_intercept *= -1
    }
    return [tax_slope, tax_intercept]
  }
  get_item_taxable_base(this: any, item?: any, tax?: any) {
    const resolver = erpnext.taxable_base_resolvers[tax.charge_type]
    if (resolver) return flt(resolver(this, item, tax))
    return flt(item.net_amount)
  }
  _get_tax_rate(tax?: any, item_tax_map?: any) {
    if (tax.account_head in item_tax_map) {
      let rate = item_tax_map[tax.account_head]
      if (rate === NOT_APPLICABLE_TAX) {
        return NOT_APPLICABLE_TAX
      }
      return flt(rate, precision('rate', tax))
    }
    return tax.rate
  }
  calculate_net_total(this: any) {
    let me = this
    this.frm.doc.total_qty =
      this.frm.doc.total =
      this.frm.doc.base_total =
      this.frm.doc.net_total =
      this.frm.doc.base_net_total =
        0.0
    $.each(this.frm._items || [], function (_i?: any, item?: any) {
      me.frm.doc.total += item.amount
      me.frm.doc.total_qty += item.qty
      me.frm.doc.base_total += item.base_amount
      me.frm.doc.net_total += item.net_amount
      me.frm.doc.base_net_total += item.base_net_amount
    })
    frappe.model.round_floats_in(this.frm.doc, ['total', 'base_total', 'net_total', 'base_net_total'])
  }
  calculate_shipping_charges(this: any) {
    if (this.frm.doc.is_pos) {
      return
    }
    frappe.model.round_floats_in(this.frm.doc, ['total', 'base_total', 'net_total', 'base_net_total'])
    if (frappe.meta.get_docfield(this.frm.doc.doctype, 'shipping_rule', this.frm.doc.name)) {
      return this.shipping_rule()
    }
  }
  add_taxes_from_item_tax_template(this: any, item_tax_map?: any) {
    let me = this
    if (item_tax_map && cint(frappe.defaults.get_default('add_taxes_from_item_tax_template'))) {
      if (typeof item_tax_map == 'string') {
        item_tax_map = JSON.parse(item_tax_map)
      }
      $.each(item_tax_map, function (tax?: any, rate?: any) {
        if (rate === NOT_APPLICABLE_TAX) {
          return
        }
        let found = (me.frm.doc.taxes || []).find((d?: any) => d.account_head === tax)
        if (!found) {
          let child = frappe.model.add_child(me.frm.doc, 'taxes')
          child.charge_type = 'On Net Total'
          child.account_head = tax
          child.rate = 0
          child.set_by_item_tax_template = true
        }
      })
    }
  }
  calculate_taxes(this: any) {
    this.grand_total_diff = 0
    const doc = this.frm.doc
    if (!doc.taxes?.length) return
    let me = this
    let actual_tax_dict: any = {}
    $.each(doc.taxes, function (_i?: any, tax?: any) {
      if (tax.charge_type == 'Actual') {
        actual_tax_dict[tax.idx] = flt(tax.tax_amount, precision('tax_amount', tax))
      }
    })
    $.each(this.frm._items || [], function (n?: any, item?: any) {
      let item_tax_map = me._load_item_tax_rate(item.item_tax_rate)
      $.each(doc.taxes, function (i?: any, tax?: any) {
        let [current_net_amount, current_tax_amount] = me.get_current_tax_amount(item, tax, item_tax_map)
        if (frappe.flags.round_row_wise_tax) {
          current_tax_amount = flt(current_tax_amount, precision('tax_amount', tax))
          current_net_amount = flt(current_net_amount, precision('net_amount', tax))
        }
        if (tax.charge_type == 'Actual') {
          actual_tax_dict[tax.idx] -= current_tax_amount
          if (n == me.frm._items.length - 1) {
            current_tax_amount += actual_tax_dict[tax.idx]
          }
        }
        if (
          tax.charge_type != 'Actual' &&
          !(me.discount_amount_applied && me.frm.doc.apply_discount_on == 'Grand Total')
        ) {
          tax.tax_amount += current_tax_amount
          tax.net_amount += current_net_amount
        }
        tax.tax_amount_for_current_item = current_tax_amount
        tax.tax_amount_after_discount_amount += current_tax_amount
        if (tax.category) {
          current_tax_amount = tax.category == 'Valuation' ? 0.0 : current_tax_amount
          current_tax_amount *= tax.add_deduct_tax == 'Deduct' ? -1.0 : 1.0
        }
        if (i == 0) {
          tax.grand_total_for_current_item = flt(item.net_amount + current_tax_amount)
        } else {
          tax.grand_total_for_current_item = flt(
            me.frm.doc['taxes'][i - 1].grand_total_for_current_item + current_tax_amount,
          )
        }
      })
    })
    const discount_amount_applied = this.discount_amount_applied
    if (
      doc.apply_discount_on === 'Grand Total' &&
      (discount_amount_applied || doc.discount_amount || doc.additional_discount_percentage)
    ) {
      const tax_amount_precision = precision('tax_amount', doc.taxes[0])
      for (const [i, tax] of doc.taxes.entries()) {
        if (discount_amount_applied)
          tax.tax_amount_after_discount_amount = flt(tax.tax_amount_after_discount_amount, tax_amount_precision)
        this.set_cumulative_total(i, tax)
      }
      if (!this.discount_amount_applied) {
        this.grand_total_for_distributing_discount = doc.taxes[doc.taxes.length - 1].total
      } else {
        this.grand_total_diff = flt(
          this.grand_total_for_distributing_discount - doc.discount_amount - doc.taxes[doc.taxes.length - 1].total,
          precision('grand_total'),
        )
      }
    }
    for (const [i, tax] of doc.taxes.entries()) {
      me.round_off_totals(tax)
      me.set_in_company_currency(tax, ['tax_amount', 'tax_amount_after_discount_amount', 'net_amount'])
      me.round_off_base_values(tax)
      me.set_cumulative_total(i, tax)
      me.set_in_company_currency(tax, ['total'])
    }
  }
  set_cumulative_total(this: any, row_idx?: any, tax?: any) {
    let tax_amount = tax.tax_amount_after_discount_amount
    if (tax.category == 'Valuation') {
      tax_amount = 0
    }
    if (tax.add_deduct_tax == 'Deduct') {
      tax_amount = -1 * tax_amount
    }
    if (row_idx == 0) {
      tax.total = flt(this.frm.doc.net_total + tax_amount, precision('total', tax))
    } else {
      tax.total = flt(this.frm.doc['taxes'][row_idx - 1].total + tax_amount, precision('total', tax))
    }
  }
  _load_item_tax_rate(item_tax_rate?: any) {
    return item_tax_rate ? JSON.parse(item_tax_rate) : {}
  }
  get_current_tax_amount(this: any, item?: any, tax?: any, item_tax_map?: any) {
    let actual: any, net_for_tax: any, resolved_base: any
    let tax_rate = this._get_tax_rate(tax, item_tax_map)
    let current_tax_amount = 0.0
    let current_net_amount = 0.0
    if (tax_rate === NOT_APPLICABLE_TAX) {
      return [current_net_amount, current_tax_amount]
    }
    if (['On Previous Row Amount', 'On Previous Row Total'].includes(tax.charge_type)) {
      if (tax.idx === 1) {
        frappe.throw(
          __("Cannot select charge type as 'On Previous Row Amount' or 'On Previous Row Total' for first row"),
        )
      }
      if (!tax.row_id) {
        tax.row_id = tax.idx - 1
      }
    }
    if (tax.charge_type == 'Actual') {
      current_net_amount = item.net_amount
      actual = flt(tax.tax_amount, precision('tax_amount', tax))
      current_tax_amount = this.frm.doc.net_total ? (item.net_amount / this.frm.doc.net_total) * actual : 0.0
    } else if (tax.charge_type == 'On Net Total') {
      if (tax.account_head in item_tax_map) {
        current_net_amount = item.net_amount
      }
      net_for_tax =
        cint(tax.included_in_print_rate) && !this.discount_amount_applied && item._unrounded_net_amount !== null
          ? item._unrounded_net_amount
          : item.net_amount
      current_tax_amount = (tax_rate / 100.0) * net_for_tax
    } else if (tax.charge_type == 'On Previous Row Amount') {
      current_net_amount = this.frm.doc['taxes'][cint(tax.row_id) - 1].tax_amount_for_current_item
      current_tax_amount = (tax_rate / 100.0) * this.frm.doc['taxes'][cint(tax.row_id) - 1].tax_amount_for_current_item
    } else if (tax.charge_type == 'On Previous Row Total') {
      current_net_amount = this.frm.doc['taxes'][cint(tax.row_id) - 1].grand_total_for_current_item
      current_tax_amount = (tax_rate / 100.0) * this.frm.doc['taxes'][cint(tax.row_id) - 1].grand_total_for_current_item
    } else if (tax.charge_type == 'On Item Quantity') {
      current_tax_amount = tax_rate * item.qty
    } else {
      resolved_base = this.get_item_taxable_base(item, tax)
      current_net_amount = resolved_base
      current_tax_amount = (tax_rate / 100.0) * resolved_base
    }
    return [current_net_amount, current_tax_amount]
  }
  round_off_totals(tax?: any) {
    if (frappe.flags.round_off_applicable_accounts.includes(tax.account_head)) {
      tax.tax_amount = Math.round(tax.tax_amount)
      tax.tax_amount_after_discount_amount = Math.round(tax.tax_amount_after_discount_amount)
    }
    tax.tax_amount = flt(tax.tax_amount, precision('tax_amount', tax))
    tax.net_amount = flt(tax.net_amount, precision('net_amount', tax))
    tax.tax_amount_after_discount_amount = flt(tax.tax_amount_after_discount_amount, precision('tax_amount', tax))
  }
  round_off_base_values(tax?: any) {
    if (frappe.flags.round_off_applicable_accounts.includes(tax.account_head)) {
      tax.base_tax_amount = Math.round(tax.base_tax_amount)
      tax.base_tax_amount_after_discount_amount = Math.round(tax.base_tax_amount_after_discount_amount)
    }
  }
  manipulate_grand_total_for_inclusive_tax(this: any) {
    this.adjust_grand_total_for_inclusive_tax()
  }
  adjust_grand_total_for_inclusive_tax(this: any) {
    let any_inclusive_tax: any, last_tax: any, non_inclusive_tax_amount: any, diff: any
    let me = this
    if (this.frm.doc['taxes'] && this.frm.doc['taxes'].length) {
      any_inclusive_tax = false
      $.each(this.frm.doc.taxes || [], function (_i?: any, d?: any) {
        if (cint(d.included_in_print_rate)) any_inclusive_tax = true
      })
      if (any_inclusive_tax) {
        last_tax = me.frm.doc['taxes'].slice(-1)[0]
        non_inclusive_tax_amount = frappe.utils.sum(
          $.map(this.frm.doc.taxes || [], function (d?: any) {
            if (!d.included_in_print_rate) {
              let tax_amount = d.category === 'Valuation' ? 0 : d.tax_amount_after_discount_amount
              if (d.add_deduct_tax === 'Deduct') tax_amount *= -1
              return tax_amount
            }
          }),
        )
        diff = me.frm.doc.total + non_inclusive_tax_amount - flt(last_tax.total, precision('grand_total'))
        if (me.discount_amount_applied && me.frm.doc.discount_amount) {
          diff -= flt(me.frm.doc.discount_amount)
        }
        diff = flt(diff, precision('rounding_adjustment'))
        if (diff && Math.abs(diff) <= 5.0 / Math.pow(10, precision('tax_amount', last_tax))) {
          me.grand_total_diff = diff
        } else {
          me.grand_total_diff = 0
        }
        if (me.grand_total_for_distributing_discount && !me.discount_amount_applied) {
          me.grand_total_for_distributing_discount += me.grand_total_diff
        }
      }
    }
  }
  calculate_totals(this: any) {
    const me = this
    const tax_count = this.frm.doc.taxes?.length
    const grand_total_diff = this.grand_total_diff
    this.frm.doc.grand_total = flt(
      tax_count ? this.frm.doc['taxes'][tax_count - 1].total + grand_total_diff : this.frm.doc.net_total,
    )
    this.frm.doc.total_taxes_and_charges = flt(
      this.frm.doc.grand_total - this.frm.doc.net_total - grand_total_diff,
      precision('total_taxes_and_charges'),
    )
    if (['Quotation', 'Sales Order', 'Delivery Note', 'Sales Invoice', 'POS Invoice'].includes(this.frm.doc.doctype)) {
      this.frm.doc.base_grand_total = this.frm.doc.total_taxes_and_charges
        ? flt(this.frm.doc.grand_total * this.frm.doc.conversion_rate)
        : this.frm.doc.base_net_total
    } else {
      this.frm.doc.taxes_and_charges_added = this.frm.doc.taxes_and_charges_deducted = 0.0
      if (tax_count) {
        $.each(this.frm.doc['taxes'] || [], function (_i?: any, tax?: any) {
          if (['Valuation and Total', 'Total'].includes(tax.category)) {
            if (tax.add_deduct_tax == 'Add') {
              me.frm.doc.taxes_and_charges_added += flt(tax.tax_amount_after_discount_amount)
            } else {
              me.frm.doc.taxes_and_charges_deducted += flt(tax.tax_amount_after_discount_amount)
            }
          }
        })
        frappe.model.round_floats_in(this.frm.doc, ['taxes_and_charges_added', 'taxes_and_charges_deducted'])
      }
      this.frm.doc.base_grand_total = flt(
        this.frm.doc.taxes_and_charges_added || this.frm.doc.taxes_and_charges_deducted
          ? flt(this.frm.doc.grand_total * this.frm.doc.conversion_rate)
          : this.frm.doc.base_net_total,
      )
      this.set_in_company_currency(this.frm.doc, ['taxes_and_charges_added', 'taxes_and_charges_deducted'])
    }
    this.set_in_company_currency(this.frm.doc, ['total_taxes_and_charges'])
    frappe.model.round_floats_in(this.frm.doc, ['grand_total', 'base_grand_total'])
    this.set_rounded_total()
  }
  set_rounded_total(this: any) {
    let disable_rounded_total = 0
    if (frappe.meta.get_docfield(this.frm.doc.doctype, 'disable_rounded_total', this.frm.doc.name)) {
      disable_rounded_total = this.frm.doc.disable_rounded_total
    } else if (frappe.sys_defaults.disable_rounded_total) {
      disable_rounded_total = frappe.sys_defaults.disable_rounded_total
    }
    if (frappe.meta.get_docfield(this.frm.doc.doctype, 'rounded_total', this.frm.doc.name)) {
      if (cint(disable_rounded_total)) {
        this.frm.doc.rounded_total = 0
        this.frm.doc.rounding_adjustment = 0
      } else {
        this.frm.doc.rounded_total = round_based_on_smallest_currency_fraction(
          this.frm.doc.grand_total,
          this.frm.doc.currency,
          precision('rounded_total'),
        )
        this.frm.doc.rounding_adjustment = flt(
          this.frm.doc.rounded_total - this.frm.doc.grand_total,
          precision('rounding_adjustment'),
        )
      }
      this.set_in_company_currency(this.frm.doc, ['rounding_adjustment', 'rounded_total'])
    }
  }
  _cleanup(this: any) {
    let temporary_fields: any
    this.frm.doc.base_in_words = this.frm.doc.in_words = ''
    let items = this.frm.doc.items
    if (items && items.length) {
      if (!frappe.meta.get_docfield(items[0].doctype, 'item_tax_amount', this.frm.doctype)) {
        $.each(items || [], function (_i?: any, item?: any) {
          delete item['item_tax_amount']
        })
      }
    }
    if (this.frm.doc['taxes'] && this.frm.doc['taxes'].length) {
      temporary_fields = [
        'tax_amount_for_current_item',
        'grand_total_for_current_item',
        'tax_fraction_for_current_item',
        'grand_total_fraction_for_current_item',
      ]
      if (
        !frappe.meta.get_docfield(
          this.frm.doc['taxes'][0].doctype,
          'tax_amount_after_discount_amount',
          this.frm.doctype,
        )
      ) {
        temporary_fields.push('tax_amount_after_discount_amount')
      }
      $.each(this.frm.doc['taxes'] || [], function (_i?: any, tax?: any) {
        $.each(temporary_fields, function (_i?: any, fieldname?: any) {
          delete tax[fieldname]
        })
      })
    }
  }
  set_discount_amount(this: any) {
    if (this.frm.doc.additional_discount_percentage) {
      this.frm.doc.discount_amount = flt(
        (flt(this.frm.doc[frappe.scrub(this.frm.doc.apply_discount_on)]) *
          this.frm.doc.additional_discount_percentage) /
          100,
        precision('discount_amount'),
      )
    }
  }
  apply_discount_amount(this: any) {
    let me = this
    let distributed_amount = 0.0
    this.frm.doc.base_discount_amount = 0.0
    if (this.frm.doc.discount_amount) {
      if (!this.frm.doc.apply_discount_on) frappe.throw(__('Please select Apply Discount On'))
      this.frm.doc.base_discount_amount = flt(
        this.frm.doc.discount_amount * this.frm.doc.conversion_rate,
        precision('base_discount_amount'),
      )
      if (this.frm.doc.apply_discount_on == 'Grand Total' && this.frm.doc.is_cash_or_non_trade_discount) {
        return
      }
      const total_for_discount_amount = this.get_total_for_discount_amount()
      let net_total = 0
      let expected_net_total = 0
      if (total_for_discount_amount) {
        $.each(this.frm._items || [], function (_i?: any, item?: any) {
          distributed_amount = (flt(me.frm.doc.discount_amount) * item.net_amount) / total_for_discount_amount
          const adjusted_net_amount = item.net_amount - distributed_amount
          expected_net_total += adjusted_net_amount
          item.net_amount = flt(adjusted_net_amount, precision('net_amount', item))
          net_total += item.net_amount
          const rounding_difference = flt(expected_net_total - net_total, precision('net_total'))
          if (rounding_difference) {
            item.net_amount = flt(item.net_amount + rounding_difference, precision('net_amount', item))
            net_total += rounding_difference
          }
          item.net_rate = item.qty ? flt(item.net_amount / item.qty, precision('net_rate', item)) : 0
          me.set_in_company_currency(item, ['net_rate', 'net_amount'])
        })
        this.discount_amount_applied = true
        this._calculate_taxes_and_totals()
      }
    }
  }
  get_total_for_discount_amount(this: any) {
    const doc = this.frm.doc
    if (doc.apply_discount_on == 'Net Total' || !doc.taxes?.length) return doc.net_total
    let total_actual_tax = 0.0
    let actual_taxes_dict: any = {}
    function update_actual_taxes_dict(tax?: any, tax_amount?: any) {
      if (tax.add_deduct_tax == 'Deduct') tax_amount *= -1
      if (tax.category != 'Valuation') total_actual_tax += tax_amount
      actual_taxes_dict[tax.idx] = {
        tax_amount: tax_amount,
        cumulative_total: total_actual_tax,
      }
    }
    doc.taxes.forEach((tax?: any) => {
      if (['Actual', 'On Item Quantity'].includes(tax.charge_type)) {
        update_actual_taxes_dict(tax, tax.tax_amount)
        return
      }
      const base_row = actual_taxes_dict[tax.row_id]
      if (!base_row) return
      const base_tax_amount =
        tax.charge_type == 'On Previous Row Amount' ? base_row['tax_amount'] : base_row['cumulative_total']
      update_actual_taxes_dict(tax, (base_tax_amount * tax.rate) / 100)
    })
    return (this.grand_total_for_distributing_discount || doc.grand_total) - total_actual_tax
  }
  calculate_total_advance(this: any, update_paid_amount?: any) {
    let total_allocated_amount = frappe.utils.sum(
      $.map(this.frm.doc['advances'] || [], function (adv?: any) {
        return flt(adv.allocated_amount, precision('allocated_amount', adv))
      }),
    )
    this.frm.doc.total_advance = flt(total_allocated_amount, precision('total_advance'))
    if (this.frm.doc.write_off_outstanding_amount_automatically) {
      this.frm.doc.write_off_amount = 0
    }
    this.calculate_outstanding_amount(update_paid_amount)
    this.calculate_write_off_amount()
  }
  is_internal_invoice(this: any) {
    if (['Sales Invoice', 'Purchase Invoice'].includes(this.frm.doc.doctype)) {
      if (this.frm.doc.company === this.frm.doc.represents_company) {
        return true
      }
    }
    return false
  }
  calculate_outstanding_amount(this: any, update_paid_amount?: any) {
    let paid_amount: any
    if (['Sales Invoice', 'POS Invoice'].includes(this.frm.doc.doctype) && this.frm.doc.is_return) {
      this.calculate_paid_amount()
    }
    if (this.frm.doc.is_return || this.frm.doc.docstatus > 0 || this.is_internal_invoice()) return
    frappe.model.round_floats_in(this.frm.doc, ['grand_total', 'total_advance', 'write_off_amount'])
    if (['Sales Invoice', 'POS Invoice', 'Purchase Invoice'].includes(this.frm.doc.doctype)) {
      let grand_total = this.frm.doc.rounded_total || this.frm.doc.grand_total
      let base_grand_total = this.frm.doc.base_rounded_total || this.frm.doc.base_grand_total
      let total_amount_to_pay: any
      if (this.frm.doc.party_account_currency == this.frm.doc.currency) {
        total_amount_to_pay = flt(
          grand_total - this.frm.doc.total_advance - this.frm.doc.write_off_amount,
          precision('grand_total'),
        )
      } else {
        total_amount_to_pay = flt(
          flt(base_grand_total, precision('base_grand_total')) -
            this.frm.doc.total_advance -
            this.frm.doc.base_write_off_amount,
          precision('base_grand_total'),
        )
      }
      frappe.model.round_floats_in(this.frm.doc, ['paid_amount'])
      this.set_in_company_currency(this.frm.doc, ['paid_amount'])
      if (this.frm.refresh_field) {
        this.frm.refresh_field('paid_amount')
        this.frm.refresh_field('base_paid_amount')
      }
      if (['Sales Invoice', 'POS Invoice'].includes(this.frm.doc.doctype)) {
        let total_amount_for_payment =
          this.frm.doc.redeem_loyalty_points && this.frm.doc.loyalty_amount
            ? flt(total_amount_to_pay - this.frm.doc.loyalty_amount, precision('base_grand_total'))
            : total_amount_to_pay
        this.set_default_payment(total_amount_for_payment, update_paid_amount)
        this.calculate_paid_amount()
      }
      this.calculate_change_amount()
      paid_amount =
        this.frm.doc.party_account_currency == this.frm.doc.currency
          ? this.frm.doc.paid_amount
          : this.frm.doc.base_paid_amount
      this.frm.doc.outstanding_amount = flt(
        total_amount_to_pay - flt(paid_amount) + flt(this.frm.doc.change_amount * this.frm.doc.conversion_rate),
        precision('outstanding_amount'),
      )
    }
  }
  async set_total_amount_to_default_mop(this: any) {
    let grand_total = this.frm.doc.rounded_total || this.frm.doc.grand_total
    let base_grand_total = this.frm.doc.base_rounded_total || this.frm.doc.base_grand_total
    let total_amount_to_pay: any
    if (this.frm.doc.party_account_currency == this.frm.doc.currency) {
      total_amount_to_pay = flt(
        grand_total - this.frm.doc.total_advance - this.frm.doc.write_off_amount,
        precision('grand_total'),
      )
    } else {
      total_amount_to_pay = flt(
        flt(base_grand_total, precision('base_grand_total')) -
          this.frm.doc.total_advance -
          this.frm.doc.base_write_off_amount,
        precision('base_grand_total'),
      )
    }
    let payment_amount = 0
    this.frm.doc.payments.forEach((payment?: any) => {
      payment_amount += payment.amount
    })
    if (payment_amount == total_amount_to_pay) {
      return
    }
    if (this.frm.doc.return_against) {
      let { message: return_against_mop } = await frappe.call({
        method: 'erpnext.controllers.sales_and_purchase_return.get_payment_data',
        args: {
          invoice: this.frm.doc.return_against,
        },
      })
      if (return_against_mop.length === 1) {
        this.frm.doc.payments.forEach((payment?: any) => {
          if (payment.mode_of_payment == return_against_mop[0].mode_of_payment) {
            payment.amount = total_amount_to_pay
          } else {
            payment.amount = 0
          }
        })
        this.frm.refresh_fields()
        return
      }
    }
    this.frm.doc.payments.find((payment?: any) => {
      if (payment.default) {
        payment.amount = total_amount_to_pay
      } else {
        payment.amount = 0
      }
    })
    this.frm.refresh_fields()
  }
  set_default_payment(this: any, total_amount_to_pay?: any, update_paid_amount?: any) {
    let me = this
    let payment_status = true
    if (
      this.frm.doc.is_pos &&
      cint(this.frm.set_default_payment) &&
      (update_paid_amount === undefined || update_paid_amount)
    ) {
      $.each(this.frm.doc['payments'] || [], function (_index?: any, data?: any) {
        if (data.default && payment_status && total_amount_to_pay > 0) {
          let base_amount: any, amount: any
          if (me.frm.doc.party_account_currency == me.frm.doc.currency) {
            base_amount = flt(total_amount_to_pay * me.frm.doc.conversion_rate, precision('base_amount', data))
            amount = flt(total_amount_to_pay, precision('amount', data))
          } else {
            base_amount = flt(total_amount_to_pay, precision('base_amount', data))
            amount = flt(total_amount_to_pay / me.frm.doc.conversion_rate, precision('amount', data))
          }
          frappe.model.set_value(data.doctype, data.name, 'base_amount', base_amount)
          frappe.model.set_value(data.doctype, data.name, 'amount', amount)
          payment_status = false
        } else if (me.frm.doc.paid_amount) {
          frappe.model.set_value(data.doctype, data.name, 'amount', 0.0)
        }
      })
    }
  }
  calculate_paid_amount(this: any) {
    let me = this
    let paid_amount = 0.0
    let base_paid_amount = 0.0
    if (this.frm.doc.is_pos) {
      $.each(this.frm.doc['payments'] || [], function (_index?: any, data?: any) {
        data.base_amount = flt(data.amount * me.frm.doc.conversion_rate, precision('base_amount', data))
        paid_amount += data.amount
        base_paid_amount += data.base_amount
      })
    } else if (!this.frm.doc.is_return) {
      this.frm.doc.payments = []
    }
    if (this.frm.doc.redeem_loyalty_points && this.frm.doc.loyalty_amount) {
      base_paid_amount += this.frm.doc.loyalty_amount
      paid_amount += flt(this.frm.doc.loyalty_amount / me.frm.doc.conversion_rate, precision('paid_amount'))
    }
    this.frm.set_value('paid_amount', flt(paid_amount, precision('paid_amount')))
    this.frm.set_value('base_paid_amount', flt(base_paid_amount, precision('base_paid_amount')))
  }
  calculate_change_amount(this: any) {
    let payment_types: any, grand_total: any, base_grand_total: any
    this.frm.doc.change_amount = 0.0
    this.frm.doc.base_change_amount = 0.0
    if (
      ['Sales Invoice', 'POS Invoice'].includes(this.frm.doc.doctype) &&
      this.frm.doc.paid_amount > this.frm.doc.grand_total &&
      !this.frm.doc.is_return
    ) {
      payment_types = $.map(this.frm.doc.payments, function (d?: any) {
        return d.type
      })
      if (payment_types.includes('Cash')) {
        grand_total = this.frm.doc.rounded_total || this.frm.doc.grand_total
        base_grand_total = this.frm.doc.base_rounded_total || this.frm.doc.base_grand_total
        this.frm.doc.change_amount = flt(this.frm.doc.paid_amount - grand_total, precision('change_amount'))
        this.frm.doc.base_change_amount = flt(
          this.frm.doc.base_paid_amount - base_grand_total,
          precision('base_change_amount'),
        )
      }
    }
  }
  calculate_write_off_amount(this: any) {
    if (this.frm.doc.write_off_outstanding_amount_automatically) {
      this.frm.doc.write_off_amount = flt(this.frm.doc.outstanding_amount, precision('write_off_amount'))
      this.frm.doc.base_write_off_amount = flt(
        this.frm.doc.write_off_amount * this.frm.doc.conversion_rate,
        precision('base_write_off_amount'),
      )
      this.calculate_outstanding_amount(false)
    }
  }
  filtered_items(this: any) {
    return this.frm.doc.items.filter((item?: any) => !item['is_alternative'])
  }
}
