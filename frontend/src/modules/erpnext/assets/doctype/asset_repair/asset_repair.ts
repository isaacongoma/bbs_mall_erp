import { __, erpnext, frappe, locals, moment } from '@/shared/frappe'
frappe.ui.form.on('Asset Repair', {
  setup: function (frm?: any) {
    frm.ignore_doctypes_on_cancel_all = ['Serial and Batch Bundle']
    frm.fields_dict.cost_center.get_query = function (doc?: any) {
      return {
        filters: {
          is_group: 0,
          company: doc.company,
        },
      }
    }
    frm.fields_dict.project.get_query = function (doc?: any) {
      return {
        filters: {
          company: doc.company,
        },
      }
    }
    frm.set_query('asset', function () {
      return {
        filters: {
          company: frm.doc.company,
          docstatus: 1,
        },
      }
    })
    frm.set_query('purchase_invoice', 'invoices', function () {
      return {
        query: 'erpnext.assets.doctype.asset_repair.asset_repair.get_purchase_invoice',
        filters: {
          company: frm.doc.company,
        },
      }
    })
    frm.set_query('expense_account', 'invoices', function (_doc?: any, cdt?: any, cdn?: any) {
      const row = locals[cdt][cdn]
      return {
        query: 'erpnext.assets.doctype.asset_repair.asset_repair.get_expense_accounts',
        filters: {
          purchase_invoice: row.purchase_invoice,
        },
      }
    })
    frm.set_query('warehouse', 'stock_items', function () {
      return {
        filters: {
          is_group: 0,
          company: frm.doc.company,
        },
      }
    })
    frm.set_query('serial_and_batch_bundle', 'stock_items', (doc?: any, cdt?: any, cdn?: any) => {
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
  },
  refresh: function (frm?: any) {
    frm.events.show_general_ledger(frm)
    const sbb_field = frm.get_docfield('stock_items', 'serial_and_batch_bundle')
    if (sbb_field) {
      sbb_field.get_route_options_for_new_doc = (row?: any) => {
        return {
          item_code: row.doc.item_code,
          voucher_type: frm.doc.doctype,
        }
      }
    }
    if (frm.doc.asset) {
      frappe.db.get_value('Asset', frm.doc.asset, 'status').then(({ message }: any) => {
        frm.set_df_property('capitalize_repair_cost', 'read_only', message && message.status === 'Fully Depreciated')
      })
    }
  },
  show_general_ledger: function (frm?: any) {
    if (frm.doc.docstatus > 0) {
      frm.add_custom_button(
        __('Accounting Ledger'),
        function () {
          frappe.route_options = {
            voucher_no: frm.doc.name,
            from_date: frm.doc.completion_date,
            to_date: moment(frm.doc.modified).format('YYYY-MM-DD'),
            company: frm.doc.company,
            categorize_by: '',
            show_cancelled_entries: frm.doc.docstatus === 2,
          }
          frappe.set_route('query-report', 'General Ledger')
        },
        __('View'),
      )
    }
  },
  repair_status: (frm?: any) => {
    if (frm.doc.repair_status == 'Completed' && !frm.doc.completion_date) {
      frm.set_value('completion_date', frappe.datetime.now_datetime())
    }
    frm.events.set_downtime(frm)
  },
  failure_date: (frm?: any) => {
    frm.events.set_downtime(frm)
  },
  completion_date: (frm?: any) => {
    frm.events.set_downtime(frm)
  },
  set_downtime: (frm?: any) => {
    if (frm.doc.repair_status != 'Completed' || !frm.doc.failure_date || !frm.doc.completion_date) {
      frm.set_value('downtime', null)
      return
    }
    frappe.call({
      method: 'erpnext.assets.doctype.asset_repair.asset_repair.get_downtime',
      args: {
        failure_date: frm.doc.failure_date,
        completion_date: frm.doc.completion_date,
      },
      callback: function (r?: any) {
        if (r.message) {
          frm.set_value('downtime', r.message + ' Hrs')
        }
      },
    })
  },
  stock_items_on_form_rendered() {
    erpnext.setup_serial_or_batch_no()
  },
  stock_consumption: function (frm?: any) {
    if (!frm.doc.stock_consumption) {
      frm.clear_table('stock_items')
      frm.refresh_field('stock_items')
    }
  },
})
frappe.ui.form.on('Asset Repair Purchase Invoice', {
  purchase_invoice: function (_frm?: any, cdt?: any, cdn?: any) {
    frappe.model.set_value(cdt, cdn, {
      expense_account: '',
      repair_cost: 0,
    })
  },
  expense_account: function (_frm?: any, cdt?: any, cdn?: any) {
    const row = locals[cdt][cdn]
    if (!row.purchase_invoice || !row.expense_account) {
      frappe.model.set_value(cdt, cdn, 'repair_cost', 0)
      return
    }
    frappe.call({
      method: 'erpnext.assets.doctype.asset_repair.asset_repair.get_unallocated_repair_cost',
      args: {
        purchase_invoice: row.purchase_invoice,
        expense_account: row.expense_account,
      },
      callback: function (r?: any) {
        if (r.message !== undefined) {
          if (r.message > 0) {
            frappe.model.set_value(cdt, cdn, 'repair_cost', r.message)
          } else {
            frappe.model.set_value(cdt, cdn, 'repair_cost', 0)
            const pi_link = frappe.utils.get_form_link('Purchase Invoice', row.purchase_invoice, true)
            frappe.msgprint({
              message: __('Row {0}: The entire expense amount for account {1} in {2} has already been allocated.', [
                row.idx,
                row.expense_account.bold(),
                pi_link,
              ]),
              indicator: 'orange',
            })
          }
        }
      },
    })
  },
})
frappe.ui.form.on('Asset Repair Consumed Item', {
  warehouse: function (frm?: any, cdt?: any, cdn?: any) {
    const item = locals[cdt][cdn]
    if (!item.item_code) {
      frappe.msgprint(__('Please select an item code before setting the warehouse.'))
      frappe.model.set_value(cdt, cdn, 'warehouse', '')
      return
    }
    const item_args: any = {
      item_code: item.item_code,
      warehouse: item.warehouse,
      qty: item.consumed_quantity,
      serial_no: item.serial_no,
      company: frm.doc.company,
    }
    frappe.call({
      method: 'erpnext.stock.utils.get_incoming_rate',
      args: {
        args: item_args,
      },
      callback: function (r?: any) {
        frappe.model.set_value(cdt, cdn, 'valuation_rate', r.message)
      },
    })
  },
  consumed_quantity: function (_frm?: any, cdt?: any, cdn?: any) {
    const row = locals[cdt][cdn]
    frappe.model.set_value(cdt, cdn, 'total_value', row.consumed_quantity * row.valuation_rate)
  },
  pick_serial_and_batch(frm?: any, cdt?: any, cdn?: any) {
    const item = locals[cdt][cdn]
    frappe.db.get_value('Item', item.item_code, ['has_batch_no', 'has_serial_no']).then((r?: any) => {
      if (r.message && (r.message.has_batch_no || r.message.has_serial_no)) {
        item.has_serial_no = r.message.has_serial_no
        item.has_batch_no = r.message.has_batch_no
        item.qty = item.consumed_quantity
        item.type_of_transaction = item.consumed_quantity > 0 ? 'Outward' : 'Inward'
        item.title = item.has_serial_no ? __('Select Serial No') : __('Select Batch No')
        if (item.has_serial_no && item.has_batch_no) {
          item.title = __('Select Serial and Batch')
        }
        frm.doc.posting_date = frappe.datetime.get_today()
        frm.doc.posting_time = frappe.datetime.now_time()
        new erpnext.SerialBatchPackageSelector(frm, item, (r?: any) => {
          if (r) {
            frappe.model.set_value(item.doctype, item.name, {
              serial_and_batch_bundle: r.name,
              use_serial_batch_fields: 0,
              valuation_rate: r.avg_rate,
              consumed_quantity: Math.abs(r.total_qty),
            })
          }
        })
      }
    })
  },
})
