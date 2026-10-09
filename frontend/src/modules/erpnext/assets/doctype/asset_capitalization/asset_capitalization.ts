import { $, __, cstr, erpnext, flt, frappe, locals, precision, refresh_field } from '@/shared/frappe'
frappe.provide('erpnext.assets')
erpnext.assets.AssetCapitalization = class AssetCapitalization extends erpnext.stock.StockController {
  [key: string]: any
  setup(this: any) {
    this.frm.ignore_doctypes_on_cancel_all = ['Serial and Batch Bundle', 'Asset Movement']
    this.setup_posting_date_time_check()
  }
  onload(this: any) {
    this.setup_queries()
    erpnext.accounts.dimensions.setup_dimension_filters(this.frm, this.frm.doctype)
  }
  refresh(this: any) {
    this.show_general_ledger()
    erpnext.toggle_serial_batch_fields(this.frm)
    if (this.frm.doc.stock_items && this.frm.doc.stock_items.length) {
      this.show_stock_ledger()
    }
  }
  setup_queries(this: any) {
    const me = this
    me.setup_warehouse_query()
    me.frm.set_query('target_item_code', function () {
      return erpnext.queries.item({ is_stock_item: 0, is_fixed_asset: 1 })
    })
    me.frm.set_query('target_asset', function () {
      return {
        filters: { asset_type: 'Composite Asset', docstatus: 0 },
      }
    })
    me.frm.set_query('asset', 'asset_items', function () {
      const filters: any = {
        status: ['not in', ['Draft', 'Scrapped', 'Sold', 'Capitalized']],
        docstatus: 1,
      }
      if (me.frm.doc.target_asset) {
        filters['name'] = ['!=', me.frm.doc.target_asset]
      }
      return {
        filters: filters,
      }
    })
    me.frm.set_query('serial_and_batch_bundle', 'stock_items', (doc?: any, cdt?: any, cdn?: any) => {
      const row = locals[cdt][cdn]
      return {
        filters: {
          item_code: row.item_code,
          voucher_type: doc.doctype,
          voucher_no: ['in', [doc.name, '']],
          is_cancelled: 0,
        },
      }
    })
    me.frm.set_query('item_code', 'stock_items', function () {
      return erpnext.queries.item({ is_stock_item: 1 })
    })
    me.frm.set_query('item_code', 'service_items', function () {
      return erpnext.queries.item({ is_stock_item: 0, is_fixed_asset: 0 })
    })
    me.frm.set_query('batch_no', 'stock_items', function (_doc?: any, cdt?: any, cdn?: any) {
      let filters: any
      const item = locals[cdt][cdn]
      if (!item.item_code) {
        frappe.throw(__('Please enter Item Code to get Batch Number'))
      } else {
        filters = {
          item_code: item.item_code,
          posting_date: me.frm.doc.posting_date || frappe.datetime.nowdate(),
          warehouse: item.warehouse,
        }
        return {
          query: 'erpnext.controllers.queries.get_batch_no',
          filters: filters,
        }
      }
    })
    me.frm.set_query('expense_account', 'service_items', function () {
      return {
        filters: {
          account_type: [
            'in',
            [
              'Tax',
              'Expense Account',
              'Income Account',
              'Expenses Included In Valuation',
              'Expenses Included In Asset Valuation',
            ],
          ],
          is_group: 0,
          company: me.frm.doc.company,
        },
      }
    })
    const sbb_field = me.frm.get_docfield('stock_items', 'serial_and_batch_bundle')
    if (sbb_field) {
      sbb_field.get_route_options_for_new_doc = (row?: any) => {
        return {
          item_code: row.doc.item_code,
          warehouse: row.doc.warehouse,
          voucher_type: me.frm.doc.doctype,
        }
      }
    }
  }
  target_item_code(this: any) {
    return this.get_target_item_details()
  }
  target_asset(this: any) {
    if (this.frm.doc.target_asset) {
      this.set_consumed_stock_items_tagged_to_wip_composite_asset(this.frm.doc.target_asset)
      this.get_target_asset_details()
    }
  }
  set_consumed_stock_items_tagged_to_wip_composite_asset(this: any, target_asset?: any) {
    const me = this
    if (target_asset) {
      return me.frm.call({
        method:
          'erpnext.assets.doctype.asset_capitalization.asset_capitalization.get_items_tagged_to_wip_composite_asset',
        args: {
          params: {
            target_asset: target_asset,
            finance_book: me.frm.doc.finance_book,
            posting_date: me.frm.doc.posting_date,
            posting_time: me.frm.doc.posting_time,
          },
        },
        callback: function (r?: any) {
          if (!r.exc && r.message) {
            if (r.message[0] && r.message[0].length) {
              me.frm.clear_table('stock_items')
              for (const item of r.message[0]) {
                me.frm.add_child('stock_items', item)
              }
              refresh_field('stock_items')
            }
            if (r.message[1] && r.message[1].length) {
              me.frm.clear_table('asset_items')
              for (const item of r.message[1]) {
                me.frm.add_child('asset_items', item)
              }
              me.frm.refresh_field('asset_items')
            }
            me.calculate_totals()
          }
        },
      })
    }
  }
  item_code(this: any, _doc?: any, cdt?: any, cdn?: any) {
    const row = frappe.get_doc(cdt, cdn)
    if (cdt === 'Asset Capitalization Stock Item') {
      this.get_consumed_stock_item_details(row)
    } else if (cdt == 'Asset Capitalization Service Item') {
      this.get_service_item_details(row)
    }
  }
  warehouse(this: any, _doc?: any, cdt?: any, cdn?: any) {
    const row = frappe.get_doc(cdt, cdn)
    if (cdt === 'Asset Capitalization Stock Item') {
      this.get_warehouse_details(row)
    }
  }
  serial_and_batch_bundle(this: any, _doc?: any, cdt?: any, cdn?: any) {
    const row = frappe.get_doc(cdt, cdn)
    if (cdt === 'Asset Capitalization Stock Item') {
      this.get_warehouse_details(row)
    }
  }
  asset(this: any, _doc?: any, cdt?: any, cdn?: any) {
    const row = frappe.get_doc(cdt, cdn)
    if (cdt === 'Asset Capitalization Asset Item') {
      this.get_consumed_asset_details(row)
    }
  }
  posting_date(this: any) {
    if (this.frm.doc.posting_date) {
      frappe.run_serially([() => this.get_all_item_warehouse_details(), () => this.get_all_asset_values()])
    }
  }
  posting_time(this: any) {
    if (this.frm.doc.posting_time) {
      this.get_all_item_warehouse_details()
    }
  }
  finance_book(this: any, _doc?: any, cdt?: any, cdn?: any) {
    let row: any
    if (cdt === 'Asset Capitalization Asset Item') {
      row = frappe.get_doc(cdt, cdn)
      this.get_consumed_asset_details(row)
    } else {
      this.get_all_asset_values()
    }
  }
  stock_qty(this: any) {
    this.calculate_totals()
  }
  qty(this: any) {
    this.calculate_totals()
  }
  rate(this: any) {
    this.calculate_totals()
  }
  company(this: any) {
    const me = this
    if (me.frm.doc.company) {
      frappe.model.set_value(me.frm.doc.doctype, me.frm.doc.name, 'cost_center', null)
      $.each(me.frm.doc.stock_items || [], function (_i?: any, d?: any) {
        frappe.model.set_value(d.doctype, d.name, 'cost_center', null)
      })
      $.each(me.frm.doc.asset_items || [], function (_i?: any, d?: any) {
        frappe.model.set_value(d.doctype, d.name, 'cost_center', null)
      })
      $.each(me.frm.doc.service_items || [], function (_i?: any, d?: any) {
        frappe.model.set_value(d.doctype, d.name, 'cost_center', null)
      })
    }
    erpnext.accounts.dimensions.update_dimension(me.frm, me.frm.doctype)
  }
  stock_items_add(this: any, _doc?: any, cdt?: any, cdn?: any) {
    erpnext.accounts.dimensions.copy_dimension_from_first_row(this.frm, cdt, cdn, 'stock_items')
  }
  asset_items_add(this: any, _doc?: any, cdt?: any, cdn?: any) {
    erpnext.accounts.dimensions.copy_dimension_from_first_row(this.frm, cdt, cdn, 'asset_items')
  }
  serivce_items_add(this: any, _doc?: any, cdt?: any, cdn?: any) {
    erpnext.accounts.dimensions.copy_dimension_from_first_row(this.frm, cdt, cdn, 'service_items')
  }
  get_target_item_details(this: any) {
    const me = this
    if (me.frm.doc.target_item_code) {
      return me.frm.call({
        method: 'erpnext.assets.doctype.asset_capitalization.asset_capitalization.get_target_item_details',
        args: {
          item_code: me.frm.doc.target_item_code,
          company: me.frm.doc.company,
        },
        callback: function (r?: any) {
          if (!r.exc) {
            me.frm.refresh_fields()
          }
        },
      })
    }
  }
  get_target_asset_details(this: any) {
    const me = this
    if (me.frm.doc.target_asset) {
      return me.frm.call({
        method: 'erpnext.assets.doctype.asset_capitalization.asset_capitalization.get_target_asset_details',
        args: {
          asset: me.frm.doc.target_asset,
          company: me.frm.doc.company,
        },
        callback: function (r?: any) {
          if (!r.exc) {
            me.frm.refresh_fields()
          }
        },
      })
    }
  }
  get_consumed_stock_item_details(this: any, row?: any) {
    const me = this
    if (row && row.item_code) {
      return me.frm.call({
        method: 'erpnext.assets.doctype.asset_capitalization.asset_capitalization.get_consumed_stock_item_details',
        child: row,
        args: {
          ctx: {
            item_code: row.item_code,
            warehouse: row.warehouse,
            stock_qty: flt(row.stock_qty),
            doctype: me.frm.doc.doctype,
            name: me.frm.doc.name,
            company: me.frm.doc.company,
            posting_date: me.frm.doc.posting_date,
            posting_time: me.frm.doc.posting_time,
          },
        },
        callback: function (r?: any) {
          if (!r.exc) {
            me.calculate_totals()
          }
        },
      })
    }
  }
  get_consumed_asset_details(this: any, row?: any) {
    const me = this
    if (row && row.asset) {
      return me.frm.call({
        method: 'erpnext.assets.doctype.asset_capitalization.asset_capitalization.get_consumed_asset_details',
        child: row,
        args: {
          ctx: {
            asset: row.asset,
            doctype: me.frm.doc.doctype,
            name: me.frm.doc.name,
            company: me.frm.doc.company,
            finance_book: row.finance_book || me.frm.doc.finance_book,
            posting_date: me.frm.doc.posting_date,
            posting_time: me.frm.doc.posting_time,
          },
        },
        callback: function (r?: any) {
          if (!r.exc) {
            me.calculate_totals()
          }
        },
      })
    }
  }
  get_service_item_details(this: any, row?: any) {
    const me = this
    if (row && row.item_code) {
      return me.frm.call({
        method: 'erpnext.assets.doctype.asset_capitalization.asset_capitalization.get_service_item_details',
        child: row,
        args: {
          ctx: {
            item_code: row.item_code,
            qty: flt(row.qty),
            expense_account: row.expense_account,
            company: me.frm.doc.company,
          },
        },
        callback: function (r?: any) {
          if (!r.exc) {
            me.calculate_totals()
          }
        },
      })
    }
  }
  get_warehouse_details(this: any, item?: any) {
    const me = this
    if (item.item_code && item.warehouse) {
      me.frm.call({
        method: 'erpnext.assets.doctype.asset_capitalization.asset_capitalization.get_warehouse_details',
        child: item,
        args: {
          ctx: {
            item_code: item.item_code,
            warehouse: cstr(item.warehouse),
            qty: -1 * flt(item.stock_qty),
            serial_no: item.serial_no,
            posting_date: me.frm.doc.posting_date,
            posting_time: me.frm.doc.posting_time,
            company: me.frm.doc.company,
            voucher_type: me.frm.doc.doctype,
            voucher_no: me.frm.doc.name,
            allow_zero_valuation: 1,
            serial_and_batch_bundle: item.serial_and_batch_bundle,
          },
        },
        callback: function (r?: any) {
          if (!r.exc) {
            me.calculate_totals()
          }
        },
      })
    }
  }
  get_all_item_warehouse_details(this: any) {
    const me = this
    return me.frm.call({
      method: 'set_warehouse_details',
      doc: me.frm.doc,
      callback: function (r?: any) {
        if (!r.exc) {
          me.calculate_totals()
        }
      },
    })
  }
  get_all_asset_values(this: any) {
    const me = this
    return me.frm.call({
      method: 'set_asset_values',
      doc: me.frm.doc,
      callback: function (r?: any) {
        if (!r.exc) {
          me.calculate_totals()
        }
      },
    })
  }
  calculate_totals(this: any) {
    const me = this
    me.frm.doc.stock_items_total = 0
    me.frm.doc.asset_items_total = 0
    me.frm.doc.service_items_total = 0
    $.each(me.frm.doc.stock_items || [], function (_i?: any, d?: any) {
      d.amount = flt(flt(d.stock_qty) * flt(d.valuation_rate), precision('amount', d))
      me.frm.doc.stock_items_total += d.amount
    })
    $.each(me.frm.doc.asset_items || [], function (_i?: any, d?: any) {
      d.asset_value = flt(flt(d.asset_value), precision('asset_value', d))
      me.frm.doc.asset_items_total += d.asset_value
    })
    $.each(me.frm.doc.service_items || [], function (_i?: any, d?: any) {
      d.amount = flt(flt(d.qty) * flt(d.rate), precision('amount', d))
      me.frm.doc.service_items_total += d.amount
    })
    me.frm.doc.stock_items_total = flt(me.frm.doc.stock_items_total, precision('stock_items_total'))
    me.frm.doc.asset_items_total = flt(me.frm.doc.asset_items_total, precision('asset_items_total'))
    me.frm.doc.service_items_total = flt(me.frm.doc.service_items_total, precision('service_items_total'))
    me.frm.doc.total_value =
      me.frm.doc.stock_items_total + me.frm.doc.asset_items_total + me.frm.doc.service_items_total
    me.frm.doc.total_value = flt(me.frm.doc.total_value, precision('total_value'))
    me.frm.doc.target_incoming_rate = me.frm.doc.total_value
    me.frm.refresh_fields()
  }
}
frappe.ui.form.set_controller('Asset Capitalization', erpnext.assets.AssetCapitalization)
