import { $, erpnext, flt, frappe } from '@/shared/frappe'
erpnext.StockGridReport = class StockGridReport extends frappe.views.TreeGridReport {
  [key: string]: any
  get_item_warehouse(this: any, warehouse?: any, item?: any) {
    if (!this.item_warehouse[item]) this.item_warehouse[item] = {}
    if (!this.item_warehouse[item][warehouse])
      this.item_warehouse[item][warehouse] = {
        balance_qty: 0.0,
        balance_value: 0.0,
        fifo_stack: [],
      }
    return this.item_warehouse[item][warehouse]
  }
  get_value_diff(this: any, wh?: any, sl?: any, is_fifo?: any) {
    let fifo_value_diff: any
    let value_diff = 0
    if (sl.qty > 0) {
      let rate = sl.incoming_rate
      let add_qty = sl.qty
      if (wh.balance_qty < 0) {
        add_qty = wh.balance_qty + sl.qty
        if (add_qty < 0) {
          add_qty = 0
        }
      }
      if (sl.serial_no) {
        value_diff = this.get_serialized_value_diff(sl)
      } else {
        value_diff = rate * add_qty
      }
      if (add_qty) wh.fifo_stack.push([add_qty, sl.incoming_rate, sl.posting_date])
    } else {
      fifo_value_diff = this.get_fifo_value_diff(wh, sl)
      if (sl.serial_no) {
        value_diff = -1 * this.get_serialized_value_diff(sl)
      } else if (is_fifo) {
        value_diff = fifo_value_diff
      } else {
        let rate = wh.balance_qty.toFixed(2) == 0.0 ? 0 : flt(wh.balance_value) / flt(wh.balance_qty)
        if ((wh.balance_qty + sl.qty).toFixed(2) >= 0.0) value_diff = rate * sl.qty
        else value_diff = -wh.balance_value
      }
    }
    wh.balance_qty += sl.qty
    wh.balance_value += value_diff
    return value_diff
  }
  get_fifo_value_diff(wh?: any, sl?: any) {
    let batch: any
    let fifo_stack = (wh.fifo_stack || []).reverse()
    let fifo_value_diff = 0.0
    let qty = -sl.qty
    for (let i = 0, j = fifo_stack.length; i < j; i++) {
      batch = fifo_stack.pop()
      if (batch[0] >= qty) {
        batch[0] = batch[0] - qty
        fifo_value_diff += qty * batch[1]
        qty = 0.0
        if (batch[0]) {
          fifo_stack.push(batch)
        }
        break
      } else {
        fifo_value_diff += batch[0] * batch[1]
        qty = qty - batch[0]
      }
    }
    wh.fifo_stack = fifo_stack.reverse()
    return -fifo_value_diff
  }
  get_serialized_value_diff(this: any, sl?: any) {
    let me = this
    let value_diff = 0.0
    $.each(sl.serial_no.trim().split('\n'), function (_i?: any, sr?: any) {
      if (sr) {
        value_diff += flt(me.serialized_buying_rates[sr.trim().toLowerCase()])
      }
    })
    return value_diff
  }
  get_serialized_buying_rates() {
    let serialized_buying_rates: any = {}
    if (frappe.report_dump.data['Serial No']) {
      $.each(frappe.report_dump.data['Serial No'], function (_i?: any, sn?: any) {
        serialized_buying_rates[sn.name.toLowerCase()] = flt(sn.incoming_rate)
      })
    }
    return serialized_buying_rates
  }
}
