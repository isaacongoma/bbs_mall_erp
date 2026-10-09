import { $, __, cint, cstr, erpnext, flt, frappe, locals, moment, precision, refresh_field } from '@/shared/frappe'
frappe.provide('erpnext.accounts.dimensions')
erpnext.accounts.taxes.setup_tax_validations('Payment Entry')
erpnext.accounts.taxes.setup_tax_filters('Advance Taxes and Charges')
frappe.ui.form.on('Payment Entry', {
  onload: function (frm?: any) {
    frm.ignore_doctypes_on_cancel_all = [
      'Sales Invoice',
      'Purchase Invoice',
      'Journal Entry',
      'Repost Payment Ledger',
      'Repost Accounting Ledger',
      'Unreconcile Payment',
      'Unreconcile Payment Entries',
      'Bank Transaction',
    ]
    if (frm.doc.__islocal) {
      if (!frm.doc.paid_from) frm.set_value('paid_from_account_currency', null)
      if (!frm.doc.paid_to) frm.set_value('paid_to_account_currency', null)
    }
    erpnext.accounts.dimensions.setup_dimension_filters(frm, frm.doctype)
    frm.set_query('project', function (doc?: any) {
      const filters: any = {
        company: doc.company,
      }
      if (doc.party_type == 'Customer') filters.customer = doc.party
      return {
        query: 'erpnext.controllers.queries.get_project_name',
        filters,
      }
    })
    if (frm.is_new()) {
      set_default_party_type(frm)
      frm.clear_table('tax_withholding_entries')
    }
  },
  setup: function (frm?: any) {
    frm.cscript.tax_table = 'Advance Taxes and Charges'
    frm.set_query('paid_from', function (doc?: any) {
      frm.events.validate_company(frm)
      const account_types = ['Pay', 'Internal Transfer'].includes(frm.doc.payment_type)
        ? ['Bank', 'Cash']
        : [frappe.boot.party_account_types[frm.doc.party_type]]
      const filters: any = {
        account_type: ['in', account_types],
        is_group: 0,
        company: doc.company,
      }
      if (frm.doc.party_type == 'Shareholder') {
        account_types.push('Equity')
      }
      if (doc.payment_type == 'Internal Transfer' && doc.paid_to) {
        filters.name = ['!=', doc.paid_to]
      }
      return {
        filters,
      }
    })
    frm.set_query('party_type', function () {
      frm.events.validate_company(frm)
      return {
        filters: {
          name: ['in', Object.keys(frappe.boot.party_account_types)],
        },
      }
    })
    frm.set_query('party_bank_account', function () {
      return {
        filters: {
          is_company_account: 0,
          party_type: frm.doc.party_type,
          party: frm.doc.party,
        },
      }
    })
    frm.set_query('bank_account', function () {
      return {
        filters: {
          is_company_account: 1,
          company: frm.doc.company,
        },
      }
    })
    frm.set_query('contact_person', function () {
      if (frm.doc.party) {
        return {
          query: 'frappe.contacts.doctype.contact.contact.contact_query',
          filters: {
            link_doctype: frm.doc.party_type,
            link_name: frm.doc.party,
          },
        }
      }
    })
    frm.set_query('paid_to', function (doc?: any) {
      frm.events.validate_company(frm)
      const account_types = ['Receive', 'Internal Transfer'].includes(frm.doc.payment_type)
        ? ['Bank', 'Cash']
        : [frappe.boot.party_account_types[frm.doc.party_type]]
      const filters: any = {
        account_type: ['in', account_types],
        is_group: 0,
        company: doc.company,
      }
      if (frm.doc.party_type == 'Shareholder') {
        account_types.push('Equity')
      }
      if (doc.payment_type == 'Internal Transfer' && doc.paid_from) {
        filters.name = ['!=', doc.paid_from]
      }
      return {
        filters,
      }
    })
    frm.set_query('account', 'deductions', function () {
      return {
        filters: {
          is_group: 0,
          company: frm.doc.company,
        },
      }
    })
    frm.set_query('advance_tax_account', function () {
      return {
        filters: {
          company: frm.doc.company,
          root_type: ['in', ['Asset', 'Liability']],
          is_group: 0,
        },
      }
    })
    frm.set_query('reference_doctype', 'references', function () {
      let doctypes: any = ['Journal Entry']
      if (frm.doc.party_type == 'Customer') {
        doctypes = ['Sales Order', 'Sales Invoice', 'Journal Entry', 'Dunning']
      } else if (frm.doc.party_type == 'Supplier') {
        doctypes = ['Purchase Order', 'Purchase Invoice', 'Journal Entry']
      }
      return {
        filters: { name: ['in', doctypes] },
      }
    })
    frm.set_query('payment_term', 'references', function (_frm?: any, cdt?: any, cdn?: any) {
      const child = locals[cdt][cdn]
      if (['Purchase Invoice', 'Sales Invoice'].includes(child.reference_doctype) && child.reference_name) {
        return {
          query: 'erpnext.controllers.queries.get_payment_terms_for_references',
          filters: {
            reference: child.reference_name,
          },
        }
      }
    })
    frm.set_query('reference_name', 'references', function (doc?: any, cdt?: any, cdn?: any) {
      const child = locals[cdt][cdn]
      const filters: any = { docstatus: 1, company: doc.company }
      const party_type_doctypes: any = ['Sales Invoice', 'Sales Order', 'Purchase Invoice', 'Purchase Order', 'Dunning']
      if (party_type_doctypes.includes(child.reference_doctype)) {
        filters[doc.party_type.toLowerCase()] = doc.party
      }
      return {
        filters: filters,
      }
    })
    frm.set_query('payment_request', 'references', function (doc?: any, cdt?: any, cdn?: any) {
      const row = frappe.get_doc(cdt, cdn)
      return {
        query: 'erpnext.accounts.doctype.payment_request.payment_request.get_open_payment_requests_query',
        filters: {
          reference_doctype: row.reference_doctype,
          reference_name: row.reference_name,
          company: doc.company,
          status: ['!=', 'Paid'],
          outstanding_amount: ['>', 0],
          docstatus: 1,
        },
      }
    })
    frm.set_query('sales_taxes_and_charges_template', function () {
      return {
        filters: {
          company: frm.doc.company,
          disabled: false,
        },
      }
    })
    frm.set_query('purchase_taxes_and_charges_template', function () {
      return {
        filters: {
          company: frm.doc.company,
          disabled: false,
        },
      }
    })
    frm.add_fetch('payment_request', 'outstanding_amount', 'payment_request_outstanding', 'Payment Entry Reference')
  },
  refresh: function (frm?: any) {
    erpnext.hide_company(frm)
    frm.events.hide_unhide_fields(frm)
    frm.events.set_dynamic_labels(frm)
    frm.events.show_general_ledger(frm)
    erpnext.accounts.ledger_preview.show_accounting_ledger_preview(frm)
    if (
      frm.doc.references &&
      frm.doc.references.find((elem?: any) => {
        return elem.exchange_gain_loss != 0
      })
    ) {
      frm.add_custom_button(
        __('View Exchange Gain/Loss Journals'),
        function () {
          frappe.set_route('List', 'Journal Entry', {
            voucher_type: 'Exchange Gain Or Loss',
            reference_name: frm.doc.name,
          })
        },
        __('Actions'),
      )
    }
    erpnext.accounts.unreconcile_payment.add_unreconcile_btn(frm)
    frappe.flags.allocate_payment_amount = true
  },
  validate: async function (frm?: any) {
    await frm.events.set_exchange_gain_loss_deduction(frm)
  },
  validate_company: (frm?: any) => {
    if (!frm.doc.company) {
      frappe.throw({ message: __('Please select a Company first.'), title: __('Mandatory') })
    }
  },
  company: function (frm?: any) {
    frm.trigger('party')
    frm.events.hide_unhide_fields(frm)
    frm.events.set_dynamic_labels(frm)
    erpnext.accounts.dimensions.update_dimension(frm, frm.doctype)
    erpnext.utils.set_letter_head(frm)
  },
  contact_person: function (frm?: any) {
    frm.set_value('contact_email', '')
    erpnext.utils.get_contact_details(frm)
  },
  hide_unhide_fields: function (frm?: any) {
    const company_currency = frm.doc.company ? frappe.get_doc(':Company', frm.doc.company)?.default_currency : ''
    frm.toggle_display(
      'source_exchange_rate',
      frm.doc.paid_amount && frm.doc.paid_from_account_currency != company_currency,
    )
    frm.toggle_display(
      'target_exchange_rate',
      frm.doc.received_amount &&
        frm.doc.paid_to_account_currency != company_currency &&
        frm.doc.paid_from_account_currency != frm.doc.paid_to_account_currency,
    )
    frm.toggle_display('base_paid_amount', frm.doc.paid_from_account_currency != company_currency)
    if (frm.doc.payment_type == 'Pay') {
      frm.toggle_display(
        'base_total_taxes_and_charges',
        frm.doc.total_taxes_and_charges && frm.doc.paid_to_account_currency != company_currency,
      )
    } else {
      frm.toggle_display(
        'base_total_taxes_and_charges',
        frm.doc.total_taxes_and_charges && frm.doc.paid_from_account_currency != company_currency,
      )
    }
    frm.toggle_display(
      'base_received_amount',
      frm.doc.paid_to_account_currency != company_currency &&
        frm.doc.paid_from_account_currency != frm.doc.paid_to_account_currency &&
        frm.doc.base_paid_amount != frm.doc.base_received_amount,
    )
    frm.toggle_display(
      'received_amount',
      frm.doc.payment_type == 'Internal Transfer' ||
        frm.doc.paid_from_account_currency != frm.doc.paid_to_account_currency,
    )
    frm.toggle_display(
      ['base_total_allocated_amount'],
      frm.doc.paid_amount &&
        frm.doc.received_amount &&
        frm.doc.base_total_allocated_amount &&
        ((frm.doc.payment_type == 'Receive' && frm.doc.paid_from_account_currency != company_currency) ||
          (frm.doc.payment_type == 'Pay' && frm.doc.paid_to_account_currency != company_currency)),
    )
    const party_amount = frm.doc.payment_type == 'Receive' ? frm.doc.paid_amount : frm.doc.received_amount
    frm.toggle_display(
      'write_off_difference_amount',
      frm.doc.difference_amount && frm.doc.party && frm.doc.total_allocated_amount > party_amount,
    )
  },
  set_dynamic_labels: function (frm?: any) {
    const company_currency = frm.doc.company ? frappe.get_doc(':Company', frm.doc.company)?.default_currency : ''
    frm.set_currency_labels(
      [
        'base_paid_amount',
        'base_received_amount',
        'base_total_allocated_amount',
        'difference_amount',
        'base_paid_amount_after_tax',
        'base_received_amount_after_tax',
        'base_total_taxes_and_charges',
      ],
      company_currency,
    )
    frm.set_currency_labels(['paid_amount'], frm.doc.paid_from_account_currency)
    frm.set_currency_labels(['received_amount'], frm.doc.paid_to_account_currency)
    const party_account_currency =
      frm.doc.payment_type == 'Receive' ? frm.doc.paid_from_account_currency : frm.doc.paid_to_account_currency
    frm.set_currency_labels(
      ['total_allocated_amount', 'unallocated_amount', 'total_taxes_and_charges'],
      party_account_currency,
    )
    const currency_field = frm.doc.payment_type == 'Receive' ? 'paid_from_account_currency' : 'paid_to_account_currency'
    frm.set_df_property('total_allocated_amount', 'options', currency_field)
    frm.set_df_property('unallocated_amount', 'options', currency_field)
    frm.set_df_property('total_taxes_and_charges', 'options', currency_field)
    frm.set_currency_labels(
      ['total_amount', 'outstanding_amount', 'allocated_amount'],
      party_account_currency,
      'references',
    )
    frm.set_df_property(
      'source_exchange_rate',
      'description',
      '1 ' + frm.doc.paid_from_account_currency + ' = [?] ' + company_currency,
    )
    frm.set_df_property(
      'target_exchange_rate',
      'description',
      '1 ' + frm.doc.paid_to_account_currency + ' = [?] ' + company_currency,
    )
    frm.refresh_fields()
    const party_currency =
      frm.doc.payment_type === 'Receive' ? 'paid_from_account_currency' : 'paid_to_account_currency'
    const reference_grid = frm.fields_dict['references'].grid
    ;['total_amount', 'outstanding_amount', 'allocated_amount'].forEach((fieldname?: any) => {
      reference_grid.update_docfield_property(fieldname, 'options', party_currency)
    })
    reference_grid.refresh()
  },
  show_general_ledger: function (frm?: any) {
    if (frm.doc.docstatus > 0) {
      frm.add_custom_button(__('Ledger'), function () {
        frappe.route_options = {
          voucher_no: frm.doc.name,
          from_date: frm.doc.posting_date,
          to_date: moment(frm.doc.modified).format('YYYY-MM-DD'),
          company: frm.doc.company,
          categorize_by: '',
          show_cancelled_entries: frm.doc.docstatus === 2,
        }
        frappe.set_route('query-report', 'General Ledger')
      })
    }
  },
  payment_type: function (frm?: any) {
    set_default_party_type(frm)
    if (frm.doc.payment_type == 'Internal Transfer') {
      $.each(
        ['party', 'party_type', 'paid_from', 'paid_to', 'references', 'total_allocated_amount', 'party_name'],
        function (_i?: any, field?: any) {
          frm.set_value(field, null)
        },
      )
    } else {
      if (frm.doc.party) {
        frm.events.party(frm)
      }
      if (frm.doc.mode_of_payment) {
        frm.events.mode_of_payment(frm)
      }
    }
  },
  mode_of_payment: function (frm?: any) {
    erpnext.accounts.pos.get_payment_mode_account(frm, frm.doc.mode_of_payment, function (account?: any) {
      const payment_account_field = frm.doc.payment_type == 'Receive' ? 'paid_to' : 'paid_from'
      frm.set_value(payment_account_field, account)
    })
  },
  party_type: function (frm?: any) {
    const party_types = Object.keys(frappe.boot.party_account_types)
    if (frm.doc.party_type && !party_types.includes(frm.doc.party_type)) {
      frm.set_value('party_type', '')
      frappe.throw(__('Party can only be one of {0}', [party_types.join(', ')]))
    }
    frm.set_query('party', function () {
      if (frm.doc.party_type == 'Employee') {
        return {
          query: 'erpnext.controllers.queries.employee_query',
        }
      } else if (['Customer', 'Supplier'].includes(frm.doc.party_type)) {
        return erpnext.queries.party(frm.doc)
      } else if (frm.doc.party_type == 'Shareholder') {
        return {
          filters: {
            company: frm.doc.company,
          },
        }
      }
    })
    if (frm.doc.party) {
      $.each(
        [
          'party',
          'paid_from',
          'paid_to',
          'paid_from_account_currency',
          'paid_to_account_currency',
          'references',
          'total_allocated_amount',
        ],
        function (_i?: any, field?: any) {
          frm.set_value(field, null)
        },
      )
    }
  },
  party: function (frm?: any) {
    if (frm.doc.contact_email || frm.doc.contact_person) {
      frm.set_value('contact_email', '')
      frm.set_value('contact_person', '')
    }
    if (frm.doc.payment_type && frm.doc.party_type && frm.doc.party && frm.doc.company) {
      if (!frm.doc.posting_date) {
        frappe.msgprint(__('Please select Posting Date before selecting Party'))
        frm.set_value('party', '')
        return
      }
      erpnext.utils.get_employee_contact_details(frm)
      frm.set_party_account_based_on_party = true
      const company_currency = frappe.get_doc(':Company', frm.doc.company).default_currency
      return frappe.call({
        method: 'erpnext.accounts.doctype.payment_entry.payment_entry.get_party_details',
        args: {
          company: frm.doc.company,
          party_type: frm.doc.party_type,
          party: frm.doc.party,
          date: frm.doc.posting_date,
          cost_center: frm.doc.cost_center,
        },
        callback: function (r?: any) {
          if (r.message) {
            frappe.run_serially([
              () => {
                if (frm.doc.payment_type == 'Receive') {
                  frm.set_value('paid_from', r.message.party_account)
                  frm.set_value('paid_from_account_currency', r.message.party_account_currency)
                } else if (frm.doc.payment_type == 'Pay') {
                  frm.set_value('paid_to', r.message.party_account)
                  frm.set_value('paid_to_account_currency', r.message.party_account_currency)
                }
              },
              () => frm.set_value('party_name', r.message.party_name),
              () => frm.clear_table('references'),
              () => frm.clear_table('tax_withholding_entries'),
              () => frm.events.hide_unhide_fields(frm),
              () => frm.events.set_dynamic_labels(frm),
              () => {
                frm.set_party_account_based_on_party = false
                if (r.message.party_bank_account) {
                  frm.set_value('party_bank_account', r.message.party_bank_account)
                }
                if (r.message.bank_account) {
                  frm.set_value('bank_account', r.message.bank_account)
                }
              },
              () =>
                frm.events.set_current_exchange_rate(
                  frm,
                  'source_exchange_rate',
                  frm.doc.paid_from_account_currency,
                  company_currency,
                ),
              () =>
                frm.events.set_current_exchange_rate(
                  frm,
                  'target_exchange_rate',
                  frm.doc.paid_to_account_currency,
                  company_currency,
                ),
            ])
          }
        },
      })
    }
  },
  apply_tds: function (frm?: any) {
    if (!frm.doc.apply_tds) {
      frm.set_value('tax_withholding_category', '')
    } else if (['Customer', 'Supplier'].includes(frm.doc.party_type)) {
      frappe.db.get_value(frm.doc.party_type, frm.doc.party, 'tax_withholding_category', (values?: any) => {
        frm.set_value('tax_withholding_category', values.tax_withholding_category)
      })
    }
    frm.clear_table('tax_withholding_entries')
  },
  paid_from: function (frm?: any) {
    if (frm.set_party_account_based_on_party) return
    frm.events.set_company_bank_account(frm)
    frm.events.set_account_currency_and_balance(
      frm,
      frm.doc.paid_from,
      'paid_from_account_currency',
      function (frm?: any) {
        if (frm.doc.payment_type == 'Pay') {
          frm.events.paid_amount(frm)
        }
        frm.events.paid_from_account_currency(frm)
      },
    )
  },
  paid_to: function (frm?: any) {
    if (frm.set_party_account_based_on_party) return
    frm.events.set_company_bank_account(frm)
    frm.events.set_account_currency_and_balance(frm, frm.doc.paid_to, 'paid_to_account_currency', function (frm?: any) {
      if (frm.doc.payment_type == 'Receive') {
        if (frm.doc.paid_from_account_currency == frm.doc.paid_to_account_currency) {
          if (frm.doc.source_exchange_rate) {
            frm.set_value('target_exchange_rate', frm.doc.source_exchange_rate)
          }
          frm.set_value('received_amount', frm.doc.paid_amount)
        } else {
          frm.events.received_amount(frm)
        }
      }
      frm.events.paid_to_account_currency(frm)
    })
  },
  set_account_currency_and_balance: function (frm?: any, account?: any, currency_field?: any, callback_function?: any) {
    const company_currency = frappe.get_doc(':Company', frm.doc.company).default_currency
    if (frm.doc.posting_date && account) {
      frappe.call({
        method: 'erpnext.accounts.doctype.payment_entry.payment_entry.get_account_details',
        args: {
          account: account,
          date: frm.doc.posting_date,
          cost_center: frm.doc.cost_center,
        },
        callback: function (r?: any) {
          if (r.message) {
            frappe.run_serially([
              () => frm.set_value(currency_field, r.message['account_currency']),
              () => {
                if (frm.doc.payment_type == 'Receive' && currency_field == 'paid_to_account_currency') {
                  frm.toggle_reqd(['reference_no', 'reference_date'], r.message['account_type'] == 'Bank' ? 1 : 0)
                  if (!frm.doc.received_amount && frm.doc.paid_amount) frm.events.paid_amount(frm)
                } else if (frm.doc.payment_type == 'Pay' && currency_field == 'paid_from_account_currency') {
                  frm.toggle_reqd(['reference_no', 'reference_date'], r.message['account_type'] == 'Bank' ? 1 : 0)
                  if (!frm.doc.paid_amount && frm.doc.received_amount) frm.events.received_amount(frm)
                  if (
                    frm.doc.paid_from_account_currency == frm.doc.paid_to_account_currency &&
                    frm.doc.paid_amount != frm.doc.received_amount
                  ) {
                    if (company_currency != frm.doc.paid_from_account_currency && frm.doc.payment_type == 'Pay') {
                      frm.doc.paid_amount = frm.doc.received_amount
                    }
                  }
                }
              },
              () => {
                if (callback_function) callback_function(frm)
                frm.events.hide_unhide_fields(frm)
                frm.events.set_dynamic_labels(frm)
              },
            ])
          }
        },
      })
    }
  },
  paid_from_account_currency: function (frm?: any) {
    if (!frm.doc.paid_from_account_currency || !frm.doc.company) return
    const company_currency = frappe.get_doc(':Company', frm.doc.company).default_currency
    frm.events.set_current_exchange_rate(
      frm,
      'source_exchange_rate',
      frm.doc.paid_from_account_currency,
      company_currency,
    )
  },
  paid_to_account_currency: function (frm?: any) {
    if (!frm.doc.paid_to_account_currency || !frm.doc.company) return
    const company_currency = frappe.get_doc(':Company', frm.doc.company).default_currency
    frm.events.set_current_exchange_rate(
      frm,
      'target_exchange_rate',
      frm.doc.paid_to_account_currency,
      company_currency,
    )
  },
  set_current_exchange_rate: function (frm?: any, exchange_rate_field?: any, from_currency?: any, to_currency?: any) {
    frappe.call({
      method: 'erpnext.setup.utils.get_exchange_rate',
      args: {
        transaction_date: frm.doc.posting_date,
        from_currency: from_currency,
        to_currency: to_currency,
      },
      callback: function (r?: any) {
        const ex_rate = flt(r.message, frm.get_field(exchange_rate_field).get_precision())
        frm.set_value(exchange_rate_field, ex_rate)
      },
    })
  },
  posting_date: function (frm?: any) {
    frm.events.paid_from_account_currency(frm)
    frm.events.paid_to_account_currency(frm)
  },
  source_exchange_rate: function (frm?: any) {
    frm.set_paid_amount_based_on_received_amount = true
    const company_currency = frappe.get_doc(':Company', frm.doc.company).default_currency
    if (frm.doc.paid_amount && frm.doc.source_exchange_rate) {
      frm.set_value('base_paid_amount', flt(frm.doc.paid_amount) * flt(frm.doc.source_exchange_rate))
      frm.set_value('base_received_amount', frm.doc.base_paid_amount)
      if (frm.doc.paid_from_account_currency == frm.doc.paid_to_account_currency) {
        frm.set_value('target_exchange_rate', frm.doc.source_exchange_rate)
        frm.set_value('received_amount', frm.doc.paid_amount)
      } else {
        const target_rate =
          flt(frm.doc.target_exchange_rate) || (company_currency == frm.doc.paid_to_account_currency ? 1 : 0)
        if (target_rate) {
          frm.set_value('received_amount', flt(frm.doc.base_received_amount) / target_rate)
        }
      }
      frm.events.set_total_allocated_amount(frm)
    }
    frm.set_paid_amount_based_on_received_amount = false
    frm.set_df_property('source_exchange_rate', 'read_only', erpnext.stale_rate_allowed() ? 0 : 1)
  },
  target_exchange_rate: function (frm?: any) {
    const company_currency = frappe.get_doc(':Company', frm.doc.company).default_currency
    if (frm.doc.received_amount && frm.doc.target_exchange_rate) {
      frm.set_value('base_received_amount', flt(frm.doc.received_amount) * flt(frm.doc.target_exchange_rate))
      frm.set_value('base_paid_amount', frm.doc.base_received_amount)
      if (frm.doc.paid_from_account_currency == frm.doc.paid_to_account_currency) {
        frm.set_value('source_exchange_rate', frm.doc.target_exchange_rate)
        frm.set_value('paid_amount', frm.doc.received_amount)
      } else {
        const source_rate =
          flt(frm.doc.source_exchange_rate) || (company_currency == frm.doc.paid_from_account_currency ? 1 : 0)
        if (source_rate) {
          frm.set_value('paid_amount', flt(frm.doc.base_paid_amount) / source_rate)
        }
      }
      frm.events.set_total_allocated_amount(frm)
    }
    frm.set_df_property('target_exchange_rate', 'read_only', erpnext.stale_rate_allowed() ? 0 : 1)
  },
  paid_amount: function (frm?: any) {
    frm.set_value('base_paid_amount', flt(frm.doc.paid_amount) * flt(frm.doc.source_exchange_rate))
    const company_currency = frappe.get_doc(':Company', frm.doc.company).default_currency
    if (!frm.doc.received_amount) {
      frm.set_value('base_received_amount', frm.doc.base_paid_amount)
      if (company_currency == frm.doc.paid_to_account_currency) {
        frm.set_value('received_amount', frm.doc.base_paid_amount)
      } else if (frm.doc.target_exchange_rate) {
        frm.set_value('received_amount', flt(frm.doc.base_paid_amount) / flt(frm.doc.target_exchange_rate))
      }
    }
    frm.trigger('reset_received_amount')
    frm.events.hide_unhide_fields(frm)
  },
  received_amount: function (frm?: any) {
    const company_currency = frappe.get_doc(':Company', frm.doc.company).default_currency
    frm.set_paid_amount_based_on_received_amount = true
    frm.set_value('base_received_amount', flt(frm.doc.received_amount) * flt(frm.doc.target_exchange_rate))
    if (!frm.doc.paid_amount) {
      frm.set_value('base_paid_amount', frm.doc.base_received_amount)
      if (company_currency == frm.doc.paid_from_account_currency) {
        frm.set_value('paid_amount', frm.doc.base_received_amount)
      } else if (frm.doc.source_exchange_rate) {
        frm.set_value('paid_amount', flt(frm.doc.base_received_amount) / flt(frm.doc.source_exchange_rate))
      }
    }
    if (frm.doc.payment_type == 'Pay')
      frm.events.allocate_party_amount_against_ref_docs(frm, frm.doc.received_amount, true)
    else frm.events.set_unallocated_amount(frm)
    frm.set_paid_amount_based_on_received_amount = false
    frm.events.hide_unhide_fields(frm)
  },
  reset_received_amount: function (frm?: any) {
    if (
      !frm.set_paid_amount_based_on_received_amount &&
      frm.doc.paid_from_account_currency == frm.doc.paid_to_account_currency
    ) {
      frm.set_value('received_amount', frm.doc.paid_amount)
      if (frm.doc.source_exchange_rate) {
        frm.set_value('target_exchange_rate', frm.doc.source_exchange_rate)
      }
      frm.set_value('base_received_amount', frm.doc.base_paid_amount)
    }
    if (frm.doc.payment_type == 'Receive')
      frm.events.allocate_party_amount_against_ref_docs(frm, frm.doc.paid_amount, true)
    else frm.events.set_unallocated_amount(frm)
  },
  get_outstanding_invoices_or_orders: function (
    frm?: any,
    get_outstanding_invoices?: any,
    get_orders_to_be_billed?: any,
  ) {
    const today = frappe.datetime.get_today()
    let fields: any = [
      { fieldtype: 'Section Break', label: __('Posting Date') },
      {
        fieldtype: 'Date',
        label: __('From Date'),
        fieldname: 'from_posting_date',
        default: frappe.datetime.add_days(today, -30),
      },
      { fieldtype: 'Column Break' },
      { fieldtype: 'Date', label: __('To Date'), fieldname: 'to_posting_date', default: today },
      { fieldtype: 'Section Break', label: __('Due Date') },
      { fieldtype: 'Date', label: __('From Date'), fieldname: 'from_due_date' },
      { fieldtype: 'Column Break' },
      { fieldtype: 'Date', label: __('To Date'), fieldname: 'to_due_date' },
      { fieldtype: 'Section Break', label: __('Outstanding Amount') },
      {
        fieldtype: 'Float',
        label: __('Greater Than Amount'),
        fieldname: 'outstanding_amt_greater_than',
        default: 0,
      },
      { fieldtype: 'Column Break' },
      { fieldtype: 'Float', label: __('Less Than Amount'), fieldname: 'outstanding_amt_less_than' },
    ]
    if (frm.dimension_filters) {
      const column_break_insertion_point = Math.ceil(frm.dimension_filters.length / 2)
      fields.push({ fieldtype: 'Section Break' })
      frm.dimension_filters.map((elem?: any, idx?: any) => {
        fields.push({
          fieldtype: 'Link',
          label: elem.document_type == 'Cost Center' ? 'Cost Center' : elem.label,
          options: elem.document_type,
          fieldname: elem.fieldname || elem.document_type,
        })
        if (idx + 1 == column_break_insertion_point) {
          fields.push({ fieldtype: 'Column Break' })
        }
      })
    }
    fields = fields.concat([
      { fieldtype: 'Section Break' },
      {
        fieldtype: 'Check',
        label: __('Allocate Payment Amount'),
        fieldname: 'allocate_payment_amount',
        default: 1,
      },
    ])
    let btn_text = ''
    if (get_outstanding_invoices) {
      btn_text = 'Get Outstanding Invoices'
    } else if (get_orders_to_be_billed) {
      btn_text = 'Get Outstanding Orders'
    }
    frappe.prompt(
      fields,
      function (filters?: any) {
        frappe.flags.allocate_payment_amount = true
        frm.events.validate_filters_data(frm, filters)
        frm.doc.cost_center = filters.cost_center
        frm.events.get_outstanding_documents(frm, filters, get_outstanding_invoices, get_orders_to_be_billed)
      },
      __('Filters'),
      __(btn_text),
    )
  },
  get_outstanding_invoices: function (frm?: any) {
    frm.events.get_outstanding_invoices_or_orders(frm, true, false)
  },
  get_outstanding_orders: function (frm?: any) {
    frm.events.get_outstanding_invoices_or_orders(frm, false, true)
  },
  validate_filters_data: function (_frm?: any, filters?: any) {
    const fields: any = {
      'Posting Date': ['from_posting_date', 'to_posting_date'],
      'Due Date': ['from_posting_date', 'to_posting_date'],
      'Advance Amount': ['from_posting_date', 'to_posting_date'],
    }
    for (const key in fields) {
      const from_field = fields[key][0]
      const to_field = fields[key][1]
      if (filters[from_field] && !filters[to_field]) {
        frappe.throw(__('Error: {0} is a mandatory field', [to_field.replace(/_/g, ' ')]))
      } else if (filters[from_field] && filters[from_field] > filters[to_field]) {
        frappe.throw(
          __('{0}: {1} must be less than {2}', [key, from_field.replace(/_/g, ' '), to_field.replace(/_/g, ' ')]),
        )
      }
    }
  },
  get_outstanding_documents: function (
    frm?: any,
    filters?: any,
    get_outstanding_invoices?: any,
    get_orders_to_be_billed?: any,
  ) {
    frm.clear_table('references')
    if (!frm.doc.party) {
      return
    }
    frm.events.check_mandatory_to_fetch(frm)
    const company_currency = frappe.get_doc(':Company', frm.doc.company).default_currency
    const args: any = {
      posting_date: frm.doc.posting_date,
      company: frm.doc.company,
      party_type: frm.doc.party_type,
      payment_type: frm.doc.payment_type,
      party: frm.doc.party,
      party_account: frm.doc.payment_type == 'Receive' ? frm.doc.paid_from : frm.doc.paid_to,
      cost_center: frm.doc.cost_center,
    }
    for (const key in filters) {
      args[key] = filters[key]
    }
    if (get_outstanding_invoices) {
      args['get_outstanding_invoices'] = true
    } else if (get_orders_to_be_billed) {
      args['get_orders_to_be_billed'] = true
    }
    if (frm.doc.book_advance_payments_in_separate_party_account) {
      args['book_advance_payments_in_separate_party_account'] = true
    }
    frappe.flags.allocate_payment_amount = filters['allocate_payment_amount']
    return frappe.call({
      method: 'erpnext.accounts.doctype.payment_entry.payment_entry.get_outstanding_reference_documents',
      args: {
        args: args,
      },
      callback: function (r?: any) {
        let total_positive_outstanding: any, total_negative_outstanding: any
        if (r.message) {
          total_positive_outstanding = 0
          total_negative_outstanding = 0
          $.each(r.message, function (_i?: any, d?: any) {
            const c = frm.add_child('references')
            c.reference_doctype = d.voucher_type
            c.reference_name = d.voucher_no
            c.due_date = d.due_date
            c.total_amount = d.invoice_amount
            c.outstanding_amount = d.outstanding_amount
            c.bill_no = d.bill_no
            c.payment_term = d.payment_term
            c.payment_term_outstanding = d.payment_term_outstanding
            c.allocated_amount = d.allocated_amount
            c.account = d.account
            if (!frm.events.get_order_doctypes(frm).includes(d.voucher_type)) {
              if (flt(d.outstanding_amount) > 0) total_positive_outstanding += flt(d.outstanding_amount)
              else total_negative_outstanding += Math.abs(flt(d.outstanding_amount))
            }
            const party_account_currency =
              frm.doc.payment_type == 'Receive' ? frm.doc.paid_from_account_currency : frm.doc.paid_to_account_currency
            if (party_account_currency != company_currency) {
              c.exchange_rate = d.exchange_rate
            } else {
              c.exchange_rate = 1
            }
            if (frm.events.get_invoice_doctypes(frm).includes(d.reference_doctype)) {
              c.due_date = d.due_date
            }
          })
          if (
            (frm.doc.payment_type == 'Receive' && frm.doc.party_type == 'Customer') ||
            (frm.doc.payment_type == 'Pay' && frm.doc.party_type == 'Supplier') ||
            (frm.doc.payment_type == 'Pay' && frm.doc.party_type == 'Employee')
          ) {
            if (total_positive_outstanding > total_negative_outstanding)
              if (!frm.doc.paid_amount)
                frm.set_value('paid_amount', total_positive_outstanding - total_negative_outstanding)
          } else if (total_negative_outstanding && total_positive_outstanding < total_negative_outstanding) {
            if (!frm.doc.received_amount)
              frm.set_value('received_amount', total_negative_outstanding - total_positive_outstanding)
          }
        }
        frm.events.allocate_party_amount_against_ref_docs(
          frm,
          frm.doc.payment_type == 'Receive' ? frm.doc.paid_amount : frm.doc.received_amount,
          false,
        )
      },
    })
  },
  get_order_doctypes: function () {
    return ['Sales Order', 'Purchase Order']
  },
  get_invoice_doctypes: function () {
    return ['Sales Invoice', 'Purchase Invoice']
  },
  allocate_party_amount_against_ref_docs: async function (frm?: any, paid_amount?: any, paid_amount_change?: any) {
    await frm.call('allocate_amount_to_references', {
      paid_amount: flt(paid_amount),
      paid_amount_change: paid_amount_change,
      allocate_payment_amount: frappe.flags.allocate_payment_amount ?? false,
    })
    frm.events.set_total_allocated_amount(frm)
  },
  set_total_allocated_amount: function (frm?: any) {
    let exchange_rate = 1
    if (frm.doc.payment_type == 'Receive') {
      exchange_rate = frm.doc.source_exchange_rate
    } else if (frm.doc.payment_type == 'Pay') {
      exchange_rate = frm.doc.target_exchange_rate
    }
    let total_allocated_amount = 0.0
    let base_total_allocated_amount = 0.0
    $.each(frm.doc.references || [], function (_i?: any, row?: any) {
      if (row.allocated_amount) {
        total_allocated_amount += flt(row.allocated_amount)
        base_total_allocated_amount += flt(
          flt(row.allocated_amount) * flt(exchange_rate),
          precision('base_paid_amount'),
        )
      }
    })
    frm.set_value('total_allocated_amount', Math.abs(total_allocated_amount))
    frm.set_value('base_total_allocated_amount', Math.abs(base_total_allocated_amount))
    frm.events.set_unallocated_amount(frm)
  },
  set_unallocated_amount: function (frm?: any) {
    let unallocated_amount = 0
    let deductions_to_consider = 0
    for (const row of frm.doc.deductions || []) {
      if (!row.is_exchange_gain_loss) deductions_to_consider += flt(row.amount)
    }
    const included_taxes = get_included_taxes(frm)
    if (frm.doc.party) {
      if (
        frm.doc.payment_type == 'Receive' &&
        frm.doc.base_total_allocated_amount < frm.doc.base_paid_amount + deductions_to_consider
      ) {
        unallocated_amount =
          (frm.doc.base_paid_amount + deductions_to_consider - frm.doc.base_total_allocated_amount - included_taxes) /
          frm.doc.source_exchange_rate
      } else if (
        frm.doc.payment_type == 'Pay' &&
        frm.doc.base_total_allocated_amount < frm.doc.base_received_amount - deductions_to_consider
      ) {
        unallocated_amount =
          (frm.doc.base_received_amount -
            deductions_to_consider -
            frm.doc.base_total_allocated_amount -
            included_taxes) /
          frm.doc.target_exchange_rate
      }
    }
    frm.set_value('unallocated_amount', unallocated_amount)
    frm.trigger('set_difference_amount')
  },
  set_difference_amount: function (frm?: any) {
    let difference_amount = 0
    const base_unallocated_amount =
      flt(frm.doc.unallocated_amount) *
      (frm.doc.payment_type == 'Receive' ? frm.doc.source_exchange_rate : frm.doc.target_exchange_rate)
    const base_party_amount = flt(frm.doc.base_total_allocated_amount) + base_unallocated_amount
    if (frm.doc.payment_type == 'Receive') {
      difference_amount = base_party_amount - flt(frm.doc.base_received_amount)
    } else if (frm.doc.payment_type == 'Pay') {
      difference_amount = flt(frm.doc.base_paid_amount) - base_party_amount
    } else {
      difference_amount = flt(frm.doc.base_paid_amount) - flt(frm.doc.base_received_amount)
    }
    const total_deductions = frappe.utils.sum(
      $.map(frm.doc.deductions || [], function (d?: any) {
        return flt(d.amount)
      }),
    )
    frm.set_value('difference_amount', difference_amount - total_deductions + flt(frm.doc.base_total_taxes_and_charges))
    frm.events.hide_unhide_fields(frm)
  },
  unallocated_amount: function (frm?: any) {
    frm.trigger('set_difference_amount')
  },
  check_mandatory_to_fetch: function (frm?: any) {
    $.each(['Company', 'Party Type', 'Party', 'payment_type'], function (_i?: any, field?: any) {
      if (!frm.doc[frappe.model.scrub(field)]) {
        frappe.msgprint(__('Please select {0} first', [field]))
        return false
      }
    })
  },
  validate_reference_document: function (frm?: any, row?: any) {
    const _validate = function (_i?: any, row?: any) {
      if (!row.reference_doctype) {
        return
      }
      if (
        frm.doc.party_type == 'Customer' &&
        !['Sales Order', 'Sales Invoice', 'Journal Entry', 'Dunning'].includes(row.reference_doctype)
      ) {
        frappe.model.set_value(row.doctype, row.name, 'reference_doctype', null)
        frappe.msgprint(
          __('Row #{0}: Reference Document Type must be one of Sales Order, Sales Invoice, Journal Entry or Dunning', [
            row.idx,
          ]),
        )
        return false
      }
      if (
        frm.doc.party_type == 'Supplier' &&
        !['Purchase Order', 'Purchase Invoice', 'Journal Entry'].includes(row.reference_doctype)
      ) {
        frappe.model.set_value(row.doctype, row.name, 'against_voucher_type', null)
        frappe.msgprint(
          __('Row #{0}: Reference Document Type must be one of Purchase Order, Purchase Invoice or Journal Entry', [
            row.idx,
          ]),
        )
        return false
      }
    }
    if (row) {
      _validate(0, row)
    } else {
      $.each(frm.doc.vouchers || [], _validate)
    }
  },
  write_off_difference_amount: function (frm?: any) {
    frm.events.set_write_off_deduction(frm)
  },
  base_paid_amount: function (frm?: any) {
    frm.events.set_exchange_gain_loss_deduction(frm)
  },
  base_received_amount: function (frm?: any) {
    frm.events.set_exchange_gain_loss_deduction(frm)
  },
  set_exchange_gain_loss_deduction: async function (frm?: any) {
    await frappe.after_ajax()
    const base_paid_amount = frm.doc.base_paid_amount || 0
    const base_received_amount = frm.doc.base_received_amount || 0
    let other_deductions = 0
    if (frm.doc.payment_type === 'Internal Transfer') {
      other_deductions = (frm.doc.deductions || [])
        .filter((row?: any) => !row.is_exchange_gain_loss)
        .reduce((sum?: any, row?: any) => sum + flt(row.amount), 0)
    }
    const exchange_gain_loss = flt(
      base_paid_amount - base_received_amount - other_deductions,
      get_deduction_amount_precision(),
    )
    if (!exchange_gain_loss) {
      frm.events.delete_exchange_gain_loss(frm)
      return
    }
    const account_fieldname = 'exchange_gain_loss_account'
    let row = (frm.doc.deductions || []).find((t?: any) => t.is_exchange_gain_loss)
    if (!row) {
      const company_defaults = frappe.get_doc(':Company', frm.doc.company)
      const is_single_currency = frm.doc.paid_from_account_currency === frm.doc.paid_to_account_currency
      const account =
        (is_single_currency && company_defaults?.bank_charges_account) ||
        company_defaults?.[account_fieldname] ||
        (await prompt_for_missing_account(frm, account_fieldname))
      row = frm.add_child('deductions')
      row.account = account
      row.cost_center = company_defaults?.cost_center
      row.is_exchange_gain_loss = 1
    }
    row.amount = exchange_gain_loss
    frm.refresh_field('deductions')
    frm.events.set_unallocated_amount(frm)
  },
  delete_exchange_gain_loss: function (frm?: any) {
    const exchange_gain_loss_row = (frm.doc.deductions || []).find((row?: any) => row.is_exchange_gain_loss)
    if (!exchange_gain_loss_row) return
    exchange_gain_loss_row.amount = 0
    frm.get_field('deductions').grid.grid_rows[exchange_gain_loss_row.idx - 1].remove()
    frm.refresh_field('deductions')
  },
  set_write_off_deduction: async function (frm?: any) {
    const difference_amount = flt(frm.doc.difference_amount, get_deduction_amount_precision())
    if (!difference_amount) return
    const account_fieldname = 'write_off_account'
    const response = await get_company_defaults(frm.doc.company)
    const write_off_account =
      response.message?.[account_fieldname] || (await prompt_for_missing_account(frm, account_fieldname))
    if (!write_off_account) return
    let row = (frm.doc['deductions'] || []).find((t?: any) => t.account == write_off_account)
    if (!row) {
      row = frm.add_child('deductions')
      row.account = write_off_account
      row.cost_center = response.message?.cost_center
    }
    row.amount = flt(row.amount) + difference_amount
    frm.refresh_field('deductions')
    frm.events.set_unallocated_amount(frm)
  },
  bank_account: function (frm?: any) {
    if (frm.set_company_bank_account_based_on_coa) return
    const field = frm.doc.payment_type == 'Pay' ? 'paid_from' : 'paid_to'
    if (frm.doc.bank_account && ['Pay', 'Receive'].includes(frm.doc.payment_type)) {
      frappe.call({
        method: 'erpnext.accounts.doctype.bank_account.bank_account.get_bank_account_details',
        args: {
          bank_account: frm.doc.bank_account,
        },
        callback: function (r?: any) {
          if (r.message) {
            if (!frm.doc.mode_of_payment) {
              frm.set_value(field, r.message.account)
            } else {
              frappe.call({
                method: 'frappe.client.get_value',
                args: {
                  doctype: 'Mode of Payment Account',
                  filters: {
                    parent: frm.doc.mode_of_payment,
                    company: frm.doc.company,
                  },
                  fieldname: 'default_account',
                  parent: 'Mode of Payment',
                },
                callback: function (res?: any) {
                  if (!res.message.default_account) {
                    frm.set_value(field, r.message.account)
                  }
                },
              })
            }
            frm.set_value('bank', r.message.bank)
            frm.set_value('bank_account_no', r.message.bank_account_no)
          }
        },
      })
    }
  },
  set_company_bank_account: function (frm?: any) {
    if (!['Pay', 'Receive'].includes(frm.doc.payment_type)) return
    const field = frm.doc.payment_type == 'Pay' ? 'paid_from' : 'paid_to'
    if (!frm.doc.company || !frm.doc[field]) return
    frm.set_company_bank_account_based_on_coa = true
    frappe.call({
      method: 'frappe.client.get_value',
      args: {
        doctype: 'Bank Account',
        filters: {
          company: frm.doc.company,
          account: frm.doc[field],
          disabled: 0,
        },
        fieldname: ['name'],
      },
      callback: async function (r?: any) {
        if (r.message) await frm.set_value('bank_account', r.message.name)
        frm.set_company_bank_account_based_on_coa = false
      },
    })
  },
  sales_taxes_and_charges_template: function (frm?: any) {
    frm.trigger('fetch_taxes_from_template')
  },
  purchase_taxes_and_charges_template: function (frm?: any) {
    frm.trigger('fetch_taxes_from_template')
  },
  fetch_taxes_from_template: function (frm?: any) {
    let master_doctype = ''
    let taxes_and_charges = ''
    if (frm.doc.party_type == 'Supplier') {
      master_doctype = 'Purchase Taxes and Charges Template'
      taxes_and_charges = frm.doc.purchase_taxes_and_charges_template
    } else if (frm.doc.party_type == 'Customer') {
      master_doctype = 'Sales Taxes and Charges Template'
      taxes_and_charges = frm.doc.sales_taxes_and_charges_template
    }
    if (!taxes_and_charges) {
      return
    }
    frappe.call({
      method: 'erpnext.controllers.accounts_controller.get_taxes_and_charges',
      args: {
        master_doctype: master_doctype,
        master_name: taxes_and_charges,
      },
      callback: function (r?: any) {
        if (!r.exc && r.message) {
          const taxes = r.message
          taxes.forEach((tax?: any) => {
            if (tax.charge_type === 'On Net Total') {
              tax.charge_type = 'On Paid Amount'
            }
          })
          frm.set_value('taxes', taxes)
          frm.events.apply_taxes(frm)
          frm.events.set_unallocated_amount(frm)
        }
      },
    })
  },
  apply_taxes: function (frm?: any) {
    frm.events.initialize_taxes(frm)
    frm.events.determine_exclusive_rate(frm)
    frm.events.calculate_taxes(frm)
  },
  initialize_taxes: function (frm?: any) {
    $.each(frm.doc['taxes'] || [], function (_i?: any, tax?: any) {
      frm.events.validate_taxes_and_charges(tax)
      frm.events.validate_inclusive_tax(tax)
      const tax_fields: any = ['total', 'tax_fraction_for_current_item', 'grand_total_fraction_for_current_item']
      if (cstr(tax.charge_type) != 'Actual') {
        tax_fields.push('tax_amount')
      }
      $.each(tax_fields, function (_i?: any, fieldname?: any) {
        tax[fieldname] = 0.0
      })
      frm.doc.paid_amount_after_tax = frm.doc.base_paid_amount
    })
  },
  validate_taxes_and_charges: function (d?: any) {
    let msg = ''
    if (d.account_head && !d.description) {
      d.description = d.account_head.split(' - ').slice(0, -1).join(' - ')
    }
    if (!d.charge_type && (d.row_id || d.rate || d.tax_amount)) {
      msg = __('Please select Charge Type first')
      d.row_id = ''
      d.rate = d.tax_amount = 0.0
    } else if (
      (d.charge_type == 'Actual' || d.charge_type == 'On Net Total' || d.charge_type == 'On Paid Amount') &&
      d.row_id
    ) {
      msg = __("Can refer row only if the charge type is 'On Previous Row Amount' or 'Previous Row Total'")
      d.row_id = ''
    } else if (d.charge_type == 'On Previous Row Amount' || d.charge_type == 'On Previous Row Total') {
      if (d.idx == 1) {
        msg = __("Cannot select charge type as 'On Previous Row Amount' or 'On Previous Row Total' for first row")
        d.charge_type = ''
      } else if (!d.row_id) {
        d.row_id = d.idx - 1
      } else if (d.row_id && d.row_id >= d.idx) {
        msg = __('Cannot refer row number greater than or equal to current row number for this Charge type')
        d.row_id = ''
      }
    }
    if (msg) {
      frappe.validated = false
      refresh_field('taxes')
      frappe.throw(msg)
    }
  },
  validate_inclusive_tax: function (this: any, tax?: any) {
    const actual_type_error = function () {
      const msg = __('Actual type tax cannot be included in Item rate in row {0}', [tax.idx])
      frappe.throw(msg)
    }
    const on_previous_row_error = function (row_range?: any) {
      const msg = __('For row {0} in {1}. To include {2} in Item rate, rows {3} must also be included', [
        tax.idx,
        __(tax.doctype),
        tax.charge_type,
        row_range,
      ])
      frappe.throw(msg)
    }
    if (cint(tax.included_in_paid_amount)) {
      if (tax.charge_type == 'Actual') {
        actual_type_error()
      } else if (
        tax.charge_type == 'On Previous Row Amount' &&
        !cint(this.frm.doc['taxes'][tax.row_id - 1].included_in_paid_amount)
      ) {
        on_previous_row_error(tax.row_id)
      } else if (tax.charge_type == 'On Previous Row Total') {
        const taxes_not_included = $.map(this.frm.doc['taxes'].slice(0, tax.row_id), function (t?: any) {
          return cint(t.included_in_paid_amount) ? null : t
        })
        if (taxes_not_included.length > 0) {
          on_previous_row_error(tax.row_id == 1 ? '1' : '1 - ' + tax.row_id)
        }
      }
    }
  },
  determine_exclusive_rate: function (frm?: any) {
    let has_inclusive_tax = false
    $.each(frm.doc['taxes'] || [], function (_i?: any, row?: any) {
      if (cint(row.included_in_paid_amount)) has_inclusive_tax = true
    })
    if (has_inclusive_tax == false) return
    let cumulated_tax_fraction = 0.0
    $.each(frm.doc['taxes'] || [], function (i?: any, tax?: any) {
      tax.tax_fraction_for_current_item = frm.events.get_current_tax_fraction(frm, tax)
      if (i == 0) {
        tax.grand_total_fraction_for_current_item = 1 + tax.tax_fraction_for_current_item
      } else {
        tax.grand_total_fraction_for_current_item =
          frm.doc['taxes'][i - 1].grand_total_fraction_for_current_item + tax.tax_fraction_for_current_item
      }
      cumulated_tax_fraction += tax.tax_fraction_for_current_item
      frm.doc.paid_amount_after_tax = flt(frm.doc.base_paid_amount / (1 + cumulated_tax_fraction))
    })
  },
  get_current_tax_fraction: function (frm?: any, tax?: any) {
    let current_tax_fraction = 0.0
    if (cint(tax.included_in_paid_amount)) {
      const tax_rate = tax.rate
      if (tax.charge_type == 'On Paid Amount') {
        current_tax_fraction = tax_rate / 100.0
      } else if (tax.charge_type == 'On Previous Row Amount') {
        current_tax_fraction = (tax_rate / 100.0) * frm.doc['taxes'][cint(tax.row_id) - 1].tax_fraction_for_current_item
      } else if (tax.charge_type == 'On Previous Row Total') {
        current_tax_fraction =
          (tax_rate / 100.0) * frm.doc['taxes'][cint(tax.row_id) - 1].grand_total_fraction_for_current_item
      }
    }
    if (tax.add_deduct_tax && tax.add_deduct_tax == 'Deduct') {
      current_tax_fraction *= -1
    }
    return current_tax_fraction
  },
  calculate_taxes: function (frm?: any) {
    frm.doc.total_taxes_and_charges = 0.0
    frm.doc.base_total_taxes_and_charges = 0.0
    const actual_tax_dict: any = {}
    $.each(frm.doc['taxes'] || [], function (_i?: any, tax?: any) {
      if (tax.charge_type == 'Actual') {
        actual_tax_dict[tax.idx] = flt(tax.tax_amount, precision('tax_amount', tax))
      }
    })
    $.each(frm.doc['taxes'] || [], function (i?: any, tax?: any) {
      let current_tax_amount = frm.events.get_current_tax_amount(frm, tax)
      if (tax.charge_type == 'Actual') {
        actual_tax_dict[tax.idx] -= current_tax_amount
        if (i == frm.doc['taxes'].length - 1) {
          current_tax_amount += actual_tax_dict[tax.idx]
        }
      }
      tax.base_tax_amount = current_tax_amount
      current_tax_amount *= tax.add_deduct_tax == 'Deduct' ? -1.0 : 1.0
      if (i == 0) {
        tax.total = flt(frm.doc.paid_amount_after_tax + current_tax_amount, precision('total', tax))
      } else {
        tax.total = flt(frm.doc['taxes'][i - 1].total + current_tax_amount, precision('total', tax))
      }
      tax.base_total = tax.total
      if (frm.doc.payment_type == 'Pay') {
        if (tax.currency != frm.doc.paid_to_account_currency) {
          frm.doc.total_taxes_and_charges += flt(current_tax_amount / frm.doc.target_exchange_rate)
        } else {
          frm.doc.total_taxes_and_charges += current_tax_amount
        }
      } else if (frm.doc.payment_type == 'Receive') {
        if (tax.currency != frm.doc.paid_from_account_currency) {
          frm.doc.total_taxes_and_charges += flt(current_tax_amount / frm.doc.source_exchange_rate)
        } else {
          frm.doc.total_taxes_and_charges += current_tax_amount
        }
      }
      frm.doc.base_total_taxes_and_charges += tax.base_tax_amount
      frm.refresh_field('taxes')
      frm.refresh_field('total_taxes_and_charges')
      frm.refresh_field('base_total_taxes_and_charges')
    })
  },
  get_current_tax_amount: function (frm?: any, tax?: any) {
    const tax_rate = tax.rate
    let current_tax_amount = 0.0
    if (['On Previous Row Amount', 'On Previous Row Total'].includes(tax.charge_type)) {
      if (tax.idx === 1) {
        frappe.throw(
          __("Cannot select charge type as 'On Previous Row Amount' or 'On Previous Row Total' for first row"),
        )
      }
    }
    if (tax.charge_type == 'Actual') {
      current_tax_amount = flt(tax.tax_amount, precision('tax_amount', tax))
    } else if (tax.charge_type == 'On Paid Amount') {
      current_tax_amount = flt((tax_rate / 100.0) * frm.doc.paid_amount_after_tax)
    } else if (tax.charge_type == 'On Previous Row Amount') {
      current_tax_amount = flt((tax_rate / 100.0) * frm.doc['taxes'][cint(tax.row_id) - 1].tax_amount)
    } else if (tax.charge_type == 'On Previous Row Total') {
      current_tax_amount = flt((tax_rate / 100.0) * frm.doc['taxes'][cint(tax.row_id) - 1].total)
    }
    return current_tax_amount
  },
  after_save: function (frm?: any) {
    const { matched_payment_requests } = frappe.last_response
    if (!matched_payment_requests) return
    const COLUMN_LABEL: any = [
      [__('Reference DocType'), __('Reference Name'), __('Allocated Amount'), __('Payment Request')],
    ]
    frappe.msgprint({
      title: __('Unset Matched Payment Request'),
      message: COLUMN_LABEL.concat(matched_payment_requests),
      as_table: true,
      wide: true,
      primary_action: {
        label: __('Allocate Payment Request'),
        action() {
          frappe.hide_msgprint()
          frm.call('set_matched_payment_requests', { matched_payment_requests }, () => {
            frm.dirty()
          })
        },
      },
    })
  },
  before_cancel: function (frm?: any) {
    return new Promise((resolve?: any, reject?: any) => {
      frappe.call({
        method: 'erpnext.accounts.doctype.payment_entry.payment_entry.get_linked_bank_transactions',
        args: { payment_entry: frm.doc.name },
        callback: function (r?: any) {
          const linked = r.message || []
          if (!linked.length) {
            resolve()
            return
          }
          const bt_links = linked
            .map((name?: any) => frappe.utils.get_form_link('Bank Transaction', name, true))
            .join(', ')
          frappe.confirm(
            __(
              'This Payment Entry is reconciled with {0}. Cancelling will automatically unreconcile it. Do you want to proceed?',
              [bt_links],
            ),
            () => resolve(),
            () => reject(),
            __('Yes'),
            __('No'),
          )
        },
      })
    })
  },
})
frappe.ui.form.on('Payment Entry Reference', {
  reference_doctype: function (frm?: any, cdt?: any, cdn?: any) {
    const row = locals[cdt][cdn]
    frm.events.validate_reference_document(frm, row)
  },
  reference_name: function (frm?: any, cdt?: any, cdn?: any) {
    const row = locals[cdt][cdn]
    if (row.reference_name && row.reference_doctype) {
      return frappe.call({
        method: 'erpnext.accounts.doctype.payment_entry.payment_entry.get_reference_details',
        args: {
          reference_doctype: row.reference_doctype,
          reference_name: row.reference_name,
          party_account_currency:
            frm.doc.payment_type == 'Receive' ? frm.doc.paid_from_account_currency : frm.doc.paid_to_account_currency,
          party_type: frm.doc.party_type,
          party: frm.doc.party,
        },
        callback: function (r?: any) {
          if (r.message) {
            $.each(r.message, function (field?: any, value?: any) {
              frappe.model.set_value(cdt, cdn, field, value)
            })
            const allocated_amount =
              frm.doc.unallocated_amount > row.outstanding_amount ? row.outstanding_amount : frm.doc.unallocated_amount
            frappe.model.set_value(cdt, cdn, 'allocated_amount', allocated_amount)
            frm.refresh_fields()
          }
        },
      })
    }
  },
  allocated_amount: function (frm?: any) {
    frm.events.set_total_allocated_amount(frm)
  },
  references_remove: function (frm?: any) {
    frm.events.set_total_allocated_amount(frm)
  },
})
frappe.ui.form.on('Advance Taxes and Charges', {
  rate: function (frm?: any) {
    frm.events.apply_taxes(frm)
    frm.events.set_unallocated_amount(frm)
  },
  tax_amount: function (frm?: any) {
    frm.events.apply_taxes(frm)
    frm.events.set_unallocated_amount(frm)
  },
  row_id: function (frm?: any) {
    frm.events.apply_taxes(frm)
    frm.events.set_unallocated_amount(frm)
  },
  taxes_remove: function (frm?: any) {
    frm.events.apply_taxes(frm)
    frm.events.set_unallocated_amount(frm)
  },
  included_in_paid_amount: function (frm?: any) {
    frm.events.apply_taxes(frm)
    frm.events.set_unallocated_amount(frm)
  },
  charge_type: function (frm?: any) {
    frm.events.apply_taxes(frm)
    frm.events.set_unallocated_amount(frm)
  },
})
frappe.ui.form.on('Payment Entry Deduction', {
  before_deductions_remove: function (_doc?: any, cdt?: any, cdn?: any) {
    const row = frappe.get_doc(cdt, cdn)
    if (row.is_exchange_gain_loss && row.amount) {
      frappe.throw(__('Cannot delete a system-generated deduction row'))
    }
  },
  amount: function (frm?: any) {
    if (frm.doc.payment_type === 'Internal Transfer') {
      frm.events.set_exchange_gain_loss_deduction(frm)
    } else {
      frm.events.set_unallocated_amount(frm)
    }
  },
  deductions_remove: function (frm?: any) {
    if (frm.doc.payment_type === 'Internal Transfer') {
      frm.events.set_exchange_gain_loss_deduction(frm)
    } else {
      frm.events.set_unallocated_amount(frm)
    }
  },
})
function set_default_party_type(frm?: any) {
  if (frm.doc.party) return
  let party_type: any
  if (frm.doc.payment_type == 'Receive') {
    party_type = 'Customer'
  } else if (frm.doc.payment_type == 'Pay') {
    party_type = 'Supplier'
  }
  if (party_type) frm.set_value('party_type', party_type)
}
function get_included_taxes(frm?: any) {
  let included_taxes = 0
  for (const tax of frm.doc.taxes) {
    if (!tax.included_in_paid_amount) continue
    if (tax.add_deduct_tax == 'Add') {
      included_taxes += tax.base_tax_amount
    } else {
      included_taxes -= tax.base_tax_amount
    }
  }
  return included_taxes
}
function get_company_defaults(company?: any) {
  return frappe.call({
    method: 'erpnext.accounts.doctype.payment_entry.payment_entry.get_company_defaults',
    args: {
      company: company,
    },
  })
}
function prompt_for_missing_account(frm?: any, account?: any) {
  return new Promise((resolve?: any) => {
    frappe.prompt(
      {
        label: __(frappe.unscrub(account)),
        fieldname: account,
        fieldtype: 'Link',
        options: 'Account',
        get_query: () => ({
          filters: {
            company: frm.doc.company,
          },
        }),
      },
      (values?: any) => resolve(values?.[account]),
      __('Please Specify Account'),
    )
  })
}
function get_deduction_amount_precision() {
  return frappe.meta.get_field_precision(frappe.meta.get_field('Payment Entry Deduction', 'amount'))
}
