import { $, __, copy_dict, erpnext, flt, frappe, repl } from '@/shared/frappe'
erpnext.StockAnalytics = class StockAnalytics extends erpnext.StockGridReport {
  [key: string]: any
  constructor(wrapper?: any, opts?: any) {
    let args: any = {
      title: __('Stock Analytics'),
      parent: $(wrapper).find('.layout-main'),
      page: wrapper.page,
      doctypes: ['Item', 'Item Group', 'Warehouse', 'Stock Ledger Entry', 'Brand', 'Fiscal Year', 'Serial No'],
      tree_grid: {
        show: true,
        parent_field: 'parent_item_group',
        formatter: function (item?: any) {
          if (!item.is_group) {
            return repl(
              '<a \
							onclick=\'frappe.cur_grid_report.show_stock_ledger("%(value)s")\'>\
							%(value)s</a>',
              {
                value: item.name,
              },
            )
          } else {
            return item.name
          }
        },
      },
    }
    if (opts) $.extend(args, opts)
    super(args)
    this.filters = [
      {
        fieldtype: 'Select',
        label: __('Value or Qty'),
        fieldname: 'value_or_qty',
        options: [
          { label: __('Value'), value: 'Value' },
          { label: __('Quantity'), value: 'Quantity' },
        ],
        filter: function (val?: any, item?: any, opts?: any, me?: any) {
          return me.apply_zero_filter(val, item, opts, me)
        },
      },
      {
        fieldtype: 'Select',
        label: __('Brand'),
        link: 'Brand',
        fieldname: 'brand',
        default_value: __('Select Brand...'),
        filter: function (val?: any, item?: any, opts?: any) {
          return val == opts.default_value || item.brand == val || item._show
        },
        link_formatter: { filter_input: 'brand' },
      },
      {
        fieldtype: 'Select',
        label: __('Warehouse'),
        link: 'Warehouse',
        fieldname: 'warehouse',
        default_value: __('Select Warehouse...'),
      },
      { fieldtype: 'Date', label: __('From Date'), fieldname: 'from_date' },
      { fieldtype: 'Date', label: __('To Date'), fieldname: 'to_date' },
      {
        fieldtype: 'Select',
        label: __('Range'),
        fieldname: 'range',
        options: [
          { label: __('Daily'), value: 'Daily' },
          { label: __('Weekly'), value: 'Weekly' },
          { label: __('Monthly'), value: 'Monthly' },
          { label: __('Quarterly'), value: 'Quarterly' },
          { label: __('Yearly'), value: 'Yearly' },
        ],
      },
    ]
  }
  setup_columns(this: any) {
    let std_columns: any = [
      { id: 'name', name: __('Item'), field: 'name', width: 300 },
      { id: 'brand', name: __('Brand'), field: 'brand', width: 100 },
      { id: 'stock_uom', name: __('UOM'), field: 'stock_uom', width: 100 },
      {
        id: 'opening',
        name: __('Opening'),
        field: 'opening',
        hidden: true,
        formatter: this.currency_formatter,
      },
    ]
    this.make_date_range_columns()
    this.columns = std_columns.concat(this.columns)
  }
  setup_filters(this: any) {
    super.setup_filters()
    this.trigger_refresh_on_change(['value_or_qty', 'brand', 'warehouse', 'range'])
    this.show_zero_check()
  }
  init_filter_values(this: any) {
    super.init_filter_values()
    this.filter_inputs.range && this.filter_inputs.range.val('Monthly')
  }
  prepare_data(this: any) {
    let items: any
    let me = this
    if (!this.data) {
      items = this.prepare_tree('Item', 'Item Group')
      me.parent_map = {}
      me.item_by_name = {}
      me.data = []
      $.each(items, function (_i?: any, v?: any) {
        let d = copy_dict(v)
        me.data.push(d)
        me.item_by_name[d.name] = d
        if (d.parent_item_group) {
          me.parent_map[d.name] = d.parent_item_group
        }
        me.reset_item_values(d)
      })
      this.set_indent()
      this.data[0].checked = true
    } else {
      $.each(this.data, function (_i?: any, d?: any) {
        me.reset_item_values(d)
        d['closing_qty_value'] = 0
      })
    }
    this.prepare_balances()
    this.update_groups()
  }
  prepare_balances(this: any) {
    let sl: any, posting_datetime: any, item: any, wh: any, valuation_method: any, is_fifo: any
    let me = this
    let from_date = frappe.datetime.str_to_obj(this.from_date)
    let to_date = frappe.datetime.str_to_obj(this.to_date)
    let data = frappe.report_dump.data['Stock Ledger Entry']
    this.item_warehouse = {}
    this.serialized_buying_rates = this.get_serialized_buying_rates()
    for (let i = 0, j = data.length; i < j; i++) {
      let diff = 0
      sl = data[i]
      sl.posting_datetime = sl.posting_date + ' ' + sl.posting_time
      posting_datetime = frappe.datetime.str_to_obj(sl.posting_datetime)
      if (me.is_default('warehouse') ? true : me.warehouse == sl.warehouse) {
        item = me.item_by_name[sl.item_code]
        if (item.closing_qty_value == undefined) item.closing_qty_value = 0
        if (me.value_or_qty != 'Quantity') {
          wh = me.get_item_warehouse(sl.warehouse, sl.item_code)
          valuation_method = item.valuation_method ? item.valuation_method : frappe.sys_defaults.valuation_method
          is_fifo = valuation_method == 'FIFO'
          if (sl.voucher_type == 'Stock Reconciliation') {
            diff = sl.qty_after_transaction * sl.valuation_rate - item.closing_qty_value
            wh.fifo_stack = [[sl.qty_after_transaction, sl.valuation_rate, sl.posting_date]]
            wh.balance_qty = sl.qty_after_transaction
            wh.balance_value = sl.valuation_rate * sl.qty_after_transaction
          } else {
            diff = me.get_value_diff(wh, sl, is_fifo)
          }
        } else {
          if (sl.voucher_type == 'Stock Reconciliation') {
            diff = sl.qty_after_transaction - item.closing_qty_value
          } else {
            diff = sl.qty
          }
        }
        if (posting_datetime < from_date) {
          item.opening += diff
        } else if (posting_datetime <= to_date) {
          item[me.column_map[sl.posting_date].field] += diff
        } else {
          break
        }
        item.closing_qty_value += diff
      }
    }
  }
  update_groups(this: any) {
    let me = this
    $.each(this.data, function (_i?: any, item?: any) {
      let balance: any, parent: any, parent_group: any
      if (!item.is_group && me.apply_filter(item, 'brand')) {
        balance = item.opening
        $.each(me.columns, function (_i?: any, col?: any) {
          if (col.formatter == me.currency_formatter && !col.hidden) {
            item[col.field] = balance + item[col.field]
            balance = item[col.field]
          }
        })
        parent = me.parent_map[item.name]
        while (parent) {
          parent_group = me.item_by_name[parent]
          $.each(me.columns, function (_c?: any, col?: any) {
            if (col.formatter == me.currency_formatter) {
              parent_group[col.field] = flt(parent_group[col.field]) + flt(item[col.field])
            }
          })
          parent = me.parent_map[parent]
        }
      }
    })
  }
  show_stock_ledger(this: any, item_code?: any) {
    frappe.route_options = {
      item_code: item_code,
      from_date: this.from_date,
      to_date: this.to_date,
    }
    frappe.set_route('query-report', 'Stock Ledger')
  }
}
