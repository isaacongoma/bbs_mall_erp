import {
  __,
  cint,
  erpnext,
  flt,
  frappe,
  hide_field,
  locals,
  precision,
  refresh_field,
  unhide_field,
} from '@/shared/frappe'
frappe.provide('erpnext.accounts')
erpnext.accounts.taxes.setup_tax_validations('Sales Invoice')
erpnext.accounts.payment_triggers.setup('Sales Invoice')
erpnext.accounts.pos.setup('Sales Invoice')
erpnext.accounts.taxes.setup_tax_filters('Sales Taxes and Charges')
erpnext.sales_common.setup_selling_controller()
erpnext.accounts.SalesInvoiceController = class SalesInvoiceController extends erpnext.selling.SellingController {
  [key: string]: any
  setup(this: any, doc?: any) {
    this.setup_accounting_dimension_triggers()
    this.setup_posting_date_time_check()
    super.setup(doc)
    this.frm.make_methods = {
      Dunning: this.make_dunning.bind(this),
      'Invoice Discounting': this.make_invoice_discounting.bind(this),
    }
  }
  company(this: any) {
    super.company()
    erpnext.accounts.dimensions.update_dimension(this.frm, this.frm.doctype)
    this.frm.clear_table('tax_withholding_entries')
  }
  onload(this: any) {
    const me = this
    super.onload()
    this.frm.ignore_doctypes_on_cancel_all = [
      'POS Invoice',
      'Timesheet',
      'POS Invoice Merge Log',
      'POS Closing Entry',
      'Journal Entry',
      'Payment Entry',
      'Repost Payment Ledger',
      'Repost Accounting Ledger',
      'Unreconcile Payment',
      'Unreconcile Payment Entries',
      'Serial and Batch Bundle',
      'Bank Transaction',
      'Packing Slip',
    ]
    if (!this.frm.doc.__islocal && !this.frm.doc.customer && this.frm.doc.debit_to) {
      this.frm.set_df_property('debit_to', 'print_hide', 0)
    }
    erpnext.queries.setup_queries(this.frm, 'Warehouse', function () {
      return erpnext.queries.warehouse(me.frm.doc)
    })
    if (this.frm.doc.__islocal && this.frm.doc.is_pos) {
      me.frm.script_manager.trigger('is_pos')
      me.frm.refresh_fields()
      frappe.db.get_value('POS Profile', this.frm.doc.pos_profile, 'set_grand_total_to_default_mop').then((r?: any) => {
        if (!r.exc) {
          me.frm.set_default_payment = r.message.set_grand_total_to_default_mop
        }
      })
    }
    erpnext.queries.setup_warehouse_query(this.frm)
  }
  refresh(this: any, doc?: any) {
    let is_delivered_by_supplier: any
    const me = this
    super.refresh()
    if (this.frm?.msgbox && this.frm.msgbox.$wrapper.is(':visible')) {
      this.frm.msgbox.hide()
    }
    this.frm.toggle_reqd('due_date', !this.frm.doc.is_return)
    if (this.frm.doc.is_return) {
      this.frm.return_print_format = 'Sales Invoice Return'
    }
    this.show_general_ledger()
    erpnext.accounts.ledger_preview.show_accounting_ledger_preview(this.frm)
    if (doc.update_stock) {
      this.show_stock_ledger()
      erpnext.accounts.ledger_preview.show_stock_ledger_preview(this.frm)
    }
    if (doc.docstatus == 1 && doc.outstanding_amount != 0 && frappe.model.can_create('Payment Entry')) {
      this.frm.add_custom_button(__('Payment'), () => this.make_payment_entry(), __('Create'))
      this.frm.page.set_inner_btn_group_as_primary(__('Create'))
    }
    if (doc.docstatus == 1 && !doc.is_return) {
      is_delivered_by_supplier = false
      is_delivered_by_supplier = this.frm.doc.items.some(function (item?: any) {
        return item.is_delivered_by_supplier ? true : false
      })
      if (
        frappe.model.can_create('Sales Invoice') &&
        (doc.outstanding_amount >= 0 || Math.abs(flt(doc.outstanding_amount)) < flt(doc.grand_total))
      ) {
        this.frm.add_custom_button(__('Return / Credit Note'), this.make_sales_return.bind(this), __('Create'))
        this.frm.page.set_inner_btn_group_as_primary(__('Create'))
      }
      if (cint(doc.update_stock) != 1 && frappe.model.can_create('Delivery Note')) {
        if (!is_delivered_by_supplier) {
          const should_create_delivery_note = doc.items.some(
            (item?: any) =>
              item.qty - item.delivered_qty > 0 && !item.scio_detail && !item.dn_detail && !item.delivered_by_supplier,
          )
          if (should_create_delivery_note) {
            this.frm.add_custom_button(__('Delivery Note'), () => this.make_delivery_note(), __('Create'))
          }
        }
      }
      if (doc.outstanding_amount > 0) {
        if (frappe.boot.user.in_create.includes('Payment Request')) {
          this.frm.add_custom_button(
            __('Payment Request'),
            function () {
              me.make_payment_request_with_schedule()
            },
            __('Create'),
          )
        }
        if (frappe.model.can_create('Invoice Discounting')) {
          this.frm.add_custom_button(__('Invoice Discounting'), this.make_invoice_discounting.bind(this), __('Create'))
        }
        const payment_is_overdue = doc.payment_schedule
          .map((row?: any) => Date.parse(row.due_date) < Date.now())
          .reduce((prev?: any, current?: any) => prev || current, false)
        if (payment_is_overdue && frappe.model.can_create('Dunning')) {
          this.frm.add_custom_button(__('Dunning'), this.make_dunning.bind(this), __('Create'))
        }
      }
      if (doc.docstatus === 1 && frappe.model.can_create('Maintenance Schedule')) {
        this.frm.add_custom_button(__('Maintenance Schedule'), this.make_maintenance_schedule.bind(this), __('Create'))
      }
    }
    this.toggle_get_items()
    this.set_default_print_format()
    if (doc.docstatus == 1 && !doc.inter_company_invoice_reference && frappe.model.can_create('Purchase Invoice')) {
      const internal = me.frm.doc.is_internal_customer
      if (internal) {
        const button_label =
          me.frm.doc.company === me.frm.doc.represents_company
            ? 'Internal Purchase Invoice'
            : 'Inter Company Purchase Invoice'
        me.frm.add_custom_button(
          __(button_label),
          function () {
            me.make_inter_company_invoice()
          },
          __('Create'),
        )
        frappe.call({
          method: 'erpnext.accounts.doctype.sales_invoice.mapper.get_received_items',
          args: {
            reference_name: me.frm.doc.name,
            doctype: 'Purchase Invoice',
            reference_fieldname: 'sales_invoice_item',
          },
          callback: function (r?: any) {
            if (r.exc) return
            const received_items = r.message || {}
            const has_pending_qty = me.frm.doc.items.some(
              (item?: any) => flt(item.qty) - flt(received_items[item.name] || 0) > 0,
            )
            if (!has_pending_qty) {
              me.frm.remove_custom_button(__(button_label), __('Create'))
            }
          },
        })
      }
    }
    erpnext.accounts.unreconcile_payment.add_unreconcile_btn(me.frm)
    if (this.frm.doc.is_created_using_pos && !this.frm.doc.is_return) {
      erpnext.accounts.dimensions.update_dimension(this.frm, this.frm.doctype)
    }
  }
  make_invoice_discounting(this: any) {
    frappe.model.open_mapped_doc({
      method: 'erpnext.accounts.doctype.sales_invoice.mapper.create_invoice_discounting',
      frm: this.frm,
    })
  }
  make_dunning(this: any) {
    frappe.model.open_mapped_doc({
      method: 'erpnext.accounts.doctype.sales_invoice.mapper.create_dunning',
      frm: this.frm,
    })
  }
  make_maintenance_schedule(this: any) {
    frappe.model.open_mapped_doc({
      method: 'erpnext.accounts.doctype.sales_invoice.mapper.make_maintenance_schedule',
      frm: this.frm,
    })
  }
  on_submit(this: any, doc?: any) {
    super.on_submit()
    if (frappe.get_route()[0] != 'Form') {
      return
    }
    doc.items.forEach((row?: any) => {
      if (row.delivery_note) frappe.model.clear_doc('Delivery Note', row.delivery_note)
    })
  }
  set_default_print_format(this: any) {
    if (this.frm.doc.is_pos) {
      if (this.frm.pos_print_format) {
        this.frm.meta._default_print_format = this.frm.meta.default_print_format
        this.frm.meta.default_print_format = this.frm.pos_print_format
      }
    } else if (this.frm.doc.is_return && !this.frm.meta.default_print_format) {
      if (this.frm.return_print_format) {
        this.frm.meta._default_print_format = this.frm.meta.default_print_format
        this.frm.meta.default_print_format = this.frm.return_print_format
      }
    } else {
      if (this.frm.meta._default_print_format) {
        this.frm.meta.default_print_format = this.frm.meta._default_print_format
        this.frm.meta._default_print_format = null
      } else if (
        [this.frm.pos_print_format, this.frm.return_print_format].includes(this.frm.meta.default_print_format)
      ) {
        this.frm.meta.default_print_format = null
        this.frm.meta._default_print_format = null
      }
    }
  }
  toggle_get_items(this: any) {
    const buttons: any = ['Sales Order', 'Quotation', 'Timesheet', 'Delivery Note']
    buttons.forEach((label?: any) => {
      this.frm.remove_custom_button(label, 'Get Items From')
    })
    if (cint(this.frm.doc.docstatus) !== 0 || this.frm.page.current_view_name === 'pos') {
      return
    }
    if (!this.frm.doc.is_return) {
      this.frm.cscript.sales_order_btn()
      this.frm.cscript.quotation_btn()
      this.frm.cscript.timesheet_btn()
    }
    this.frm.cscript.delivery_note_btn()
  }
  timesheet_btn(this: any) {
    const me = this
    me.frm.add_custom_button(
      __('Timesheet'),
      function () {
        const d = new frappe.ui.Dialog({
          title: __('Fetch Timesheet'),
          fields: [
            {
              label: __('From'),
              fieldname: 'from_time',
              fieldtype: 'Date',
              reqd: 1,
            },
            {
              label: __('Item Code'),
              fieldname: 'item_code',
              fieldtype: 'Link',
              options: 'Item',
              get_query: () => {
                return {
                  query: 'erpnext.controllers.queries.item_query',
                  filters: {
                    is_sales_item: 1,
                    customer: me.frm.doc.customer,
                    has_variants: 0,
                  },
                }
              },
            },
            {
              fieldtype: 'Column Break',
              fieldname: 'col_break_1',
            },
            {
              label: __('To'),
              fieldname: 'to_time',
              fieldtype: 'Date',
              reqd: 1,
            },
            {
              label: __('Project'),
              fieldname: 'project',
              fieldtype: 'Link',
              options: 'Project',
              default: me.frm.doc.project,
            },
          ],
          primary_action: function () {
            const data = d.get_values()
            me.frm.events.add_timesheet_data(me.frm, {
              from_time: data.from_time,
              to_time: data.to_time,
              project: data.project,
              item_code: data.item_code,
            })
            d.hide()
          },
          primary_action_label: __('Get Timesheets'),
        })
        d.show()
      },
      __('Get Items From'),
    )
  }
  sales_order_btn(this: any) {
    const me = this
    const filters: any = {
      docstatus: 1,
      status: ['not in', ['Closed', 'On Hold']],
      company: me.frm.doc.company,
    }
    if (me.frm.doc.has_subcontracted) {
      filters.is_subcontracted = 1
    }
    this.$sales_order_btn = this.frm.add_custom_button(
      __('Sales Order'),
      function () {
        erpnext.utils.map_current_doc({
          method: 'erpnext.selling.doctype.sales_order.mapper.make_sales_invoice',
          source_doctype: 'Sales Order',
          target: me.frm,
          setters: {
            customer: me.frm.doc.customer || undefined,
          },
          get_query_filters: filters,
          get_query_method: 'erpnext.selling.doctype.sales_order.sales_order.get_potentially_billable_sales_orders',
          allow_child_item_selection: true,
          child_fieldname: 'items',
          child_columns: ['item_code', 'item_name', 'qty', 'amount', 'billed_amt'],
        })
      },
      __('Get Items From'),
    )
  }
  quotation_btn(this: any) {
    const me = this
    this.$quotation_btn = this.frm.add_custom_button(
      __('Quotation'),
      function () {
        erpnext.utils.map_current_doc({
          method: 'erpnext.selling.doctype.quotation.mapper.make_sales_invoice',
          source_doctype: 'Quotation',
          target: me.frm,
          setters: [
            {
              fieldtype: 'Link',
              label: __('Customer'),
              options: 'Customer',
              fieldname: 'party_name',
              default: me.frm.doc.customer,
            },
          ],
          get_query_filters: {
            docstatus: 1,
            status: ['!=', 'Lost'],
            company: me.frm.doc.company,
          },
          allow_child_item_selection: true,
          child_fieldname: 'items',
          child_columns: ['item_code', 'item_name', 'qty', 'rate', 'amount'],
        })
      },
      __('Get Items From'),
    )
  }
  delivery_note_btn(this: any) {
    const me = this
    this.$delivery_note_btn = this.frm.add_custom_button(
      __('Delivery Note'),
      function () {
        if (!me.frm.doc.customer) {
          frappe.throw({
            title: __('Mandatory'),
            message: __('Please select a Customer'),
          })
        }
        erpnext.utils.map_current_doc({
          method: 'erpnext.stock.doctype.delivery_note.mapper.make_sales_invoice',
          source_doctype: 'Delivery Note',
          target: me.frm,
          date_field: 'posting_date',
          setters: {
            customer: me.frm.doc.customer || undefined,
          },
          get_query: function () {
            const filters: any = {
              docstatus: 1,
              company: me.frm.doc.company,
              is_return: me.frm.doc.is_return,
            }
            if (me.frm.doc.customer) filters['customer'] = me.frm.doc.customer
            return {
              query: 'erpnext.controllers.queries.get_delivery_notes_to_be_billed',
              filters: filters,
            }
          },
          allow_child_item_selection: true,
          child_fieldname: 'items',
          child_columns: ['item_code', 'item_name', 'qty', 'amount', 'billed_amt'],
        })
      },
      __('Get Items From'),
    )
  }
  tc_name(this: any) {
    this.get_terms()
  }
  customer(this: any) {
    let pos_profile: any
    if (this.frm.doc.is_pos) {
      pos_profile = this.frm.doc.pos_profile
    }
    const me = this
    if (this.frm.updating_party_details) return
    if (this.frm.doc.__onload && this.frm.doc.__onload.load_after_mapping) return
    erpnext.utils.get_party_details(
      this.frm,
      'erpnext.accounts.party.get_party_details',
      {
        posting_date: this.frm.doc.posting_date,
        party: this.frm.doc.customer,
        party_type: 'Customer',
        account: this.frm.doc.debit_to,
        price_list: this.frm.doc.selling_price_list,
        pos_profile: pos_profile,
        fetch_payment_terms_template: cint(
          Number(this.frm.doc.is_return == 0) & Number(!this.frm.doc.ignore_default_payment_terms_template),
        ),
      },
      function () {
        me.frm.doc.apply_tds = me.frm.tax_withholding_category || me.frm.tax_withholding_group ? 1 : 0
        me.frm.clear_table('tax_withholding_entries')
        me.apply_pricing_rule()
      },
    )
    if (this.frm.doc.customer) {
      frappe.call({
        method: 'erpnext.accounts.doctype.sales_invoice.sales_invoice.get_loyalty_programs',
        args: {
          customer: this.frm.doc.customer,
        },
        callback: function (r?: any) {
          if (r.message && r.message.length > 1) {
            select_loyalty_program(me.frm, r.message)
          }
        },
      })
    }
  }
  make_inter_company_invoice(this: any) {
    const me = this
    frappe.model.open_mapped_doc({
      method: 'erpnext.accounts.doctype.sales_invoice.mapper.make_inter_company_purchase_invoice',
      frm: me.frm,
    })
  }
  debit_to(this: any) {
    const me = this
    if (this.frm.doc.debit_to) {
      me.frm.call({
        method: 'frappe.client.get_value',
        args: {
          doctype: 'Account',
          fieldname: 'account_currency',
          filters: { name: me.frm.doc.debit_to },
        },
        callback: function (r?: any) {
          if (r.message) {
            me.frm.set_value('party_account_currency', r.message.account_currency)
            me.set_dynamic_labels()
          }
        },
      })
    }
  }
  allocated_amount(this: any) {
    this.calculate_total_advance()
    this.frm.refresh_fields()
  }
  write_off_outstanding_amount_automatically(this: any) {
    if (cint(this.frm.doc.write_off_outstanding_amount_automatically)) {
      frappe.model.round_floats_in(this.frm.doc, ['grand_total', 'paid_amount'])
      this.frm.set_value(
        'write_off_amount',
        flt(
          this.frm.doc.grand_total - this.frm.doc.paid_amount - this.frm.doc.total_advance,
          precision('write_off_amount'),
        ),
      )
    }
    this.calculate_outstanding_amount(false)
    this.frm.refresh_fields()
  }
  write_off_amount(this: any) {
    this.set_in_company_currency(this.frm.doc, ['write_off_amount'])
    this.write_off_outstanding_amount_automatically()
  }
  items_add(this: any, doc?: any, cdt?: any, cdn?: any) {
    const row = frappe.get_doc(cdt, cdn)
    const field_copy: any = ['income_account', 'discount_account', 'cost_center']
    if (doc.project) {
      frappe.model.set_value(cdt, cdn, 'project', doc.project)
    } else {
      field_copy.push('project')
    }
    this.frm.script_manager.copy_from_first_row('items', row, field_copy)
  }
  set_dynamic_labels(this: any) {
    super.set_dynamic_labels()
    this.frm.events.hide_fields(this.frm)
    const hide_update_stock = cint(this.frm.doc.is_debit_note) || cint(this.frm.doc.has_subcontracted)
    const hidden_by_customization = cint(frappe.meta.get_docfield('Sales Invoice', 'update_stock')?.hidden)
    this.frm.set_df_property('update_stock', 'hidden', hide_update_stock || hidden_by_customization)
  }
  items_on_form_rendered() {
    erpnext.setup_serial_or_batch_no()
  }
  packed_items_on_form_rendered() {
    erpnext.setup_serial_or_batch_no()
  }
  make_sales_return(this: any) {
    frappe.model.open_mapped_doc({
      method: 'erpnext.accounts.doctype.sales_invoice.mapper.make_sales_return',
      frm: this.frm,
    })
  }
  asset(frm?: any, cdt?: any, cdn?: any) {
    const row = locals[cdt][cdn]
    if (row.asset) {
      frappe.call({
        method: erpnext.assets.doctype.asset.depreciation.get_disposal_account_and_cost_center,
        args: {
          company: frm.doc.company,
        },
        callback: function (r?: any) {
          frappe.model.set_value(cdt, cdn, 'income_account', r.message[0])
          frappe.model.set_value(cdt, cdn, 'cost_center', r.message[1])
        },
      })
    }
  }
  is_pos(this: any) {
    this.set_pos_data()
  }
  pos_profile(this: any) {
    this.frm.doc.taxes = []
    this.set_pos_data()
  }
  set_pos_data(this: any) {
    let me: any
    if (this.frm.doc.is_pos) {
      this.frm.set_value('allocate_advances_automatically', 0)
      if (!this.frm.doc.company) {
        this.frm.set_value('is_pos', 0)
        frappe.msgprint(__('Please specify Company to proceed'))
      } else {
        me = this
        const for_validate = me.frm.doc.is_return ? true : false
        return this.frm.call({
          doc: me.frm.doc,
          method: 'set_missing_values',
          args: {
            for_validate: for_validate,
          },
          callback: function (r?: any) {
            if (!r.exc) {
              if (r.message) {
                me.frm.pos_print_format = r.message.print_format
                me.frm.set_default_payment = r.message.set_default_payment
              }
              me.frm.trigger('update_stock')
              if (me.frm.doc.taxes_and_charges) {
                me.frm.script_manager.trigger('taxes_and_charges')
              }
              frappe.model.set_default_values(me.frm.doc)
              me.set_dynamic_labels()
              me.calculate_taxes_and_totals()
            }
          },
        })
      }
    } else this.frm.trigger('refresh')
  }
  amount(this: any) {
    this.write_off_outstanding_amount_automatically()
  }
  change_amount(this: any) {
    if (this.frm.doc.paid_amount > this.frm.doc.grand_total) {
      this.calculate_write_off_amount()
    } else {
      this.frm.set_value('change_amount', 0.0)
      this.frm.set_value('base_change_amount', 0.0)
    }
    this.frm.refresh_fields()
  }
  loyalty_amount(this: any) {
    this.calculate_outstanding_amount()
    this.frm.refresh_field('outstanding_amount')
    this.frm.refresh_field('paid_amount')
    this.frm.refresh_field('base_paid_amount')
  }
  currency(this: any) {
    const me = this
    super.currency()
    if (this.frm.doc.timesheets) {
      this.frm.doc.timesheets.forEach((d?: any) => {
        const row = frappe.get_doc(d.doctype, d.name)
        set_timesheet_detail_rate(row.doctype, row.name, me.frm.doc.currency, row.timesheet_detail)
      })
      this.frm.trigger('calculate_timesheet_totals')
    }
  }
  is_cash_or_non_trade_discount(this: any) {
    this.frm.set_df_property('additional_discount_account', 'hidden', 1 - this.frm.doc.is_cash_or_non_trade_discount)
    this.frm.set_df_property('additional_discount_account', 'reqd', this.frm.doc.is_cash_or_non_trade_discount)
    if (!this.frm.doc.is_cash_or_non_trade_discount) {
      this.frm.set_value('additional_discount_account', '')
    }
    this.calculate_taxes_and_totals()
  }
  apply_tds(this: any) {
    this.frm.clear_table('tax_withholding_entries')
  }
  is_return(this: any) {
    this.toggle_get_items()
  }
  make_delivery_note(this: any) {
    frappe.model.open_mapped_doc({
      method: 'erpnext.accounts.doctype.sales_invoice.mapper.make_delivery_note',
      frm: this.frm,
    })
  }
}
frappe.ui.form.set_controller('Sales Invoice', erpnext.accounts.SalesInvoiceController)
frappe.ui.form.on('Sales Invoice Item', {
  income_account: function (frm?: any, cdt?: any, cdn?: any) {
    erpnext.utils.copy_value_in_all_rows(frm.doc, cdt, cdn, 'items', 'income_account')
  },
  expense_account: function (frm?: any, cdt?: any, cdn?: any) {
    erpnext.utils.copy_value_in_all_rows(frm.doc, cdt, cdn, 'items', 'expense_account')
  },
})
frappe.ui.form.on('Sales Invoice', {
  setup: function (frm?: any) {
    frm.cscript.tax_table = 'Sales Taxes and Charges'
    frm.add_fetch('customer', 'tax_id', 'tax_id')
    frm.add_fetch('payment_term', 'invoice_portion', 'invoice_portion')
    frm.add_fetch('payment_term', 'description', 'description')
    frm.set_df_property('packed_items', 'cannot_add_rows', true)
    frm.set_df_property('packed_items', 'cannot_delete_rows', true)
    frm.set_query('cash_bank_account', function (doc?: any) {
      return {
        filters: [
          ['Account', 'account_type', 'in', ['Cash', 'Bank']],
          ['Account', 'root_type', '=', 'Asset'],
          ['Account', 'is_group', '=', 0],
          ['Account', 'company', '=', doc.company],
        ],
      }
    })
    frm.set_query('write_off_account', function (doc?: any) {
      return {
        filters: {
          report_type: 'Profit and Loss',
          is_group: 0,
          company: doc.company,
        },
      }
    })
    frm.set_query('write_off_cost_center', function (doc?: any) {
      return {
        filters: {
          is_group: 0,
          company: doc.company,
        },
      }
    })
    frm.set_query('cost_center', 'items', function (doc?: any) {
      return {
        filters: {
          company: doc.company,
          is_group: 0,
        },
      }
    })
    frm.set_query('debit_to', function (doc?: any) {
      return {
        filters: {
          account_type: 'Receivable',
          is_group: 0,
          company: doc.company,
        },
      }
    })
    frm.set_query('asset', 'items', function (doc?: any, cdt?: any, cdn?: any) {
      const row = locals[cdt][cdn]
      return {
        filters: [
          ['Asset', 'item_code', '=', row.item_code],
          ['Asset', 'docstatus', '=', 1],
          ['Asset', 'status', 'in', ['Submitted', 'Partially Depreciated', 'Fully Depreciated']],
          ['Asset', 'company', '=', doc.company],
        ],
      }
    })
    frm.set_query('account_for_change_amount', function (doc?: any) {
      return {
        filters: {
          account_type: ['in', ['Cash', 'Bank']],
          company: doc.company,
          is_group: 0,
        },
      }
    })
    frm.set_query('unrealized_profit_loss_account', function (doc?: any) {
      return {
        filters: {
          company: doc.company,
          is_group: 0,
          root_type: 'Liability',
        },
      }
    })
    frm.set_query('adjustment_against', function (doc?: any) {
      return {
        filters: {
          company: doc.company,
          customer: doc.customer,
          docstatus: 1,
        },
      }
    })
    frm.set_query('additional_discount_account', function (doc?: any) {
      return {
        filters: {
          company: doc.company,
          is_group: 0,
          report_type: 'Profit and Loss',
        },
      }
    })
    frm.set_query('income_account', 'items', function (doc?: any) {
      return {
        query: 'erpnext.controllers.queries.get_income_account',
        filters: {
          company: doc.company,
          disabled: 0,
        },
      }
    })
    frm.custom_make_buttons = {
      'Delivery Note': 'Delivery',
      'Sales Invoice': 'Return / Credit Note',
      'Payment Request': 'Payment Request',
      'Payment Entry': 'Payment',
    }
    frm.set_query('time_sheet', 'timesheets', function (doc?: any) {
      return {
        query: 'erpnext.projects.doctype.timesheet.timesheet.get_timesheet',
        filters: { project: doc.project },
      }
    })
    frm.set_query('discount_account', 'items', function (doc?: any) {
      return {
        filters: {
          report_type: 'Profit and Loss',
          company: doc.company,
          is_group: 0,
        },
      }
    })
    frm.set_query('deferred_revenue_account', 'items', function (doc?: any) {
      return {
        filters: {
          root_type: 'Liability',
          company: doc.company,
          is_group: 0,
        },
      }
    })
    frm.set_query('pos_profile', function (doc?: any) {
      if (!doc.company) {
        frappe.throw(__('Please set Company'))
      }
      return {
        query: 'erpnext.accounts.doctype.pos_profile.pos_profile.pos_profile_query',
        filters: {
          company: doc.company,
        },
      }
    })
    frm.set_query('loyalty_redemption_account', function () {
      return {
        filters: {
          company: frm.doc.company,
          is_group: 0,
        },
      }
    })
    frm.set_query('loyalty_redemption_cost_center', function () {
      return {
        filters: {
          company: frm.doc.company,
          is_group: 0,
        },
      }
    })
    frm.set_query('sales_person', 'sales_team', function () {
      return {
        filters: {
          is_group: 0,
          enabled: 1,
        },
      }
    })
  },
  onload: function (frm?: any) {
    frm.redemption_conversion_factor = null
    if (frm.doc.__onload && frm.doc.customer) {
      if (frm.is_new()) {
        frm.doc.apply_tds = frm.doc.__onload.apply_tds ? 1 : 0
      }
    }
    if (frm.is_new()) {
      frm.clear_table('tax_withholding_entries')
    }
  },
  update_stock: function (frm?: any) {
    frm.events.hide_fields(frm)
    frm.trigger('reset_posting_time')
  },
  redeem_loyalty_points: function (frm?: any) {
    frm.events.get_loyalty_details(frm)
  },
  loyalty_points: function (frm?: any) {
    if (frm.redemption_conversion_factor) {
      frm.events.set_loyalty_points(frm)
    } else {
      frappe.call({
        method: 'erpnext.accounts.doctype.loyalty_program.loyalty_program.get_redeemption_factor',
        args: {
          loyalty_program: frm.doc.loyalty_program,
        },
        callback: function (r?: any) {
          if (r) {
            frm.redemption_conversion_factor = r.message
            frm.events.set_loyalty_points(frm)
          }
        },
      })
    }
  },
  hide_fields: function (frm?: any) {
    let docfield: any
    const doc = frm.doc
    const parent_fields: any = [
      'project',
      'due_date',
      'is_opening',
      'utm_source',
      'utm_campaign',
      'utm_medium',
      'total_advance',
      'get_advances',
      'advances',
      'from_date',
      'to_date',
    ]
    if (cint(doc.is_pos) == 1) {
      hide_field(parent_fields)
    } else {
      for (const i in parent_fields) {
        docfield = frappe.meta.docfield_map[doc.doctype][parent_fields[i]]
        if (!docfield.hidden) unhide_field(parent_fields[i])
      }
    }
    frm.refresh_fields()
  },
  get_loyalty_details: function (frm?: any) {
    if (frm.doc.customer && frm.doc.redeem_loyalty_points) {
      frappe.call({
        method: 'erpnext.accounts.doctype.loyalty_program.loyalty_program.get_loyalty_program_details',
        args: {
          customer: frm.doc.customer,
          loyalty_program: frm.doc.loyalty_program,
          expiry_date: frm.doc.posting_date,
          company: frm.doc.company,
        },
        callback: function (r?: any) {
          if (r) {
            frm.set_value('loyalty_redemption_account', r.message.expense_account)
            frm.set_value('loyalty_redemption_cost_center', r.message.cost_center)
            frm.redemption_conversion_factor = r.message.conversion_factor
          }
        },
      })
    }
  },
  set_loyalty_points: function (frm?: any) {
    let remaining_amount: any
    if (frm.redemption_conversion_factor) {
      const loyalty_amount = flt(
        frm.redemption_conversion_factor * flt(frm.doc.loyalty_points),
        precision('loyalty_amount'),
      )
      remaining_amount = flt(frm.doc.grand_total) - flt(frm.doc.total_advance) - flt(frm.doc.write_off_amount)
      if (frm.doc.grand_total && remaining_amount < loyalty_amount) {
        const redeemable_points = parseInt(String(remaining_amount / frm.redemption_conversion_factor))
        frappe.throw(__('You can only redeem max {0} points in this order.', [redeemable_points]))
      }
      frm.set_value('loyalty_amount', loyalty_amount)
    }
  },
  project: function (frm?: any) {
    if (frm.doc.project) {
      frappe.call({
        method: 'is_auto_fetch_timesheet_enabled',
        doc: frm.doc,
        callback: function (r?: any) {
          if (cint(r.message)) {
            frm.events.add_timesheet_data(frm, {
              project: frm.doc.project,
            })
          }
        },
      })
    }
  },
  async add_timesheet_data(frm?: any, kwargs?: any) {
    if (kwargs === 'Sales Invoice') {
      kwargs = Object()
    }
    if (!Object.prototype.hasOwnProperty.call(kwargs, 'project') && frm.doc.project) {
      kwargs.project = frm.doc.project
    }
    const timesheets = await frm.events.get_timesheet_data(frm, kwargs)
    if (kwargs.item_code) {
      frm.events.add_timesheet_item(frm, kwargs.item_code, timesheets)
    }
    return frm.events.set_timesheet_data(frm, timesheets)
  },
  add_timesheet_item: function (frm?: any, item_code?: any, timesheets?: any) {
    const row = frm.add_child('items')
    frappe.model.set_value(row.doctype, row.name, 'item_code', item_code)
    frappe.model.set_value(
      row.doctype,
      row.name,
      'qty',
      timesheets.reduce((a?: any, b?: any) => a + (b['billing_hours'] || 0.0), 0.0),
    )
  },
  async get_timesheet_data(_frm?: any, kwargs?: any) {
    return frappe
      .call({
        method: 'erpnext.projects.doctype.timesheet.timesheet.get_projectwise_timesheet_data',
        args: kwargs,
      })
      .then((r?: any) => {
        if (!r.exc && r.message.length > 0) {
          return r.message
        } else {
          return []
        }
      })
  },
  set_timesheet_data: function (frm?: any, timesheets?: any) {
    frm.clear_table('timesheets')
    timesheets.forEach(async (timesheet?: any) => {
      if (frm.doc.currency != timesheet.currency) {
        const exchange_rate = await frm.events.get_exchange_rate(frm, timesheet.currency, frm.doc.currency)
        frm.events.append_time_log(frm, timesheet, exchange_rate)
      } else {
        frm.events.append_time_log(frm, timesheet, 1.0)
      }
    })
    frm.trigger('calculate_timesheet_totals')
    frm.refresh()
  },
  async get_exchange_rate(frm?: any, from_currency?: any, to_currency?: any) {
    if (frm.exchange_rates && frm.exchange_rates[from_currency] && frm.exchange_rates[from_currency][to_currency]) {
      return frm.exchange_rates[from_currency][to_currency]
    }
    return frappe.call({
      method: 'erpnext.setup.utils.get_exchange_rate',
      args: {
        from_currency,
        to_currency,
      },
      callback: function (r?: any) {
        if (r.message) {
          frm.exchange_rates = frm.exchange_rates || {}
          frm.exchange_rates[from_currency] = frm.exchange_rates[from_currency] || {}
          frm.exchange_rates[from_currency][to_currency] = r.message
        }
      },
    })
  },
  append_time_log: function (frm?: any, time_log?: any, exchange_rate?: any) {
    const row = frm.add_child('timesheets')
    row.activity_type = time_log.activity_type
    row.description = time_log.description
    row.time_sheet = time_log.time_sheet
    row.from_time = time_log.from_time
    row.to_time = time_log.to_time
    row.billing_hours = time_log.billing_hours
    row.billing_amount = flt(time_log.billing_amount) * flt(exchange_rate)
    row.timesheet_detail = time_log.name
    row.project_name = time_log.project_name
  },
  calculate_timesheet_totals: function (frm?: any) {
    frm.set_value(
      'total_billing_amount',
      frm.doc.timesheets.reduce((a?: any, b?: any) => a + (b['billing_amount'] || 0.0), 0.0),
    )
    frm.set_value(
      'total_billing_hours',
      frm.doc.timesheets.reduce((a?: any, b?: any) => a + (b['billing_hours'] || 0.0), 0.0),
    )
  },
  is_debit_note: function (frm?: any) {
    if (frm.doc.is_debit_note) {
      frm.set_value('update_stock', 0)
    }
    frm.cscript.set_dynamic_labels()
  },
  refresh: function (frm?: any) {
    if (frm.doc.is_debit_note) {
      frm.set_df_property('return_against', 'label', __('Adjustment Against'))
    }
    frm.set_df_property('update_stock', 'read_only', frm.doc.has_subcontracted)
  },
})
frappe.ui.form.on('Sales Invoice Timesheet', {
  timesheets_remove(frm?: any) {
    frm.trigger('calculate_timesheet_totals')
  },
})
frappe.ui.form.on('Sales Invoice Payment', {
  mode_of_payment: function (frm?: any) {
    frappe.call({
      doc: frm.doc,
      method: 'set_account_for_mode_of_payment',
      callback: function () {
        refresh_field('payments')
      },
    })
  },
})
const set_timesheet_detail_rate = function (cdt?: any, cdn?: any, currency?: any, timelog?: any) {
  frappe.call({
    method: 'erpnext.projects.doctype.timesheet.timesheet.get_timesheet_detail_rate',
    args: {
      timelog: timelog,
      currency: currency,
    },
    callback: function (r?: any) {
      if (!r.exc && r.message) {
        frappe.model.set_value(cdt, cdn, 'billing_amount', r.message)
      }
    },
  })
}
const select_loyalty_program = function (frm?: any, loyalty_programs?: any) {
  const dialog = new frappe.ui.Dialog({
    title: __('Select Loyalty Program'),
    fields: [
      {
        label: __('Loyalty Program'),
        fieldname: 'loyalty_program',
        fieldtype: 'Select',
        options: loyalty_programs,
        default: loyalty_programs[0],
      },
    ],
  })
  dialog.set_primary_action(__('Set Loyalty Program'), function () {
    dialog.hide()
    return frappe.call({
      method: 'frappe.client.set_value',
      args: {
        doctype: 'Customer',
        name: frm.doc.customer,
        fieldname: 'loyalty_program',
        value: dialog.get_value('loyalty_program'),
      },
      callback: function () {},
    })
  })
  dialog.show()
}
