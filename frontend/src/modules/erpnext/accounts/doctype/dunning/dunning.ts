import { __, erpnext, flt, frappe, moment, precision } from '@/shared/frappe'
frappe.ui.form.on('Dunning', {
  setup: function (frm?: any) {
    frm.set_query('sales_invoice', 'overdue_payments', () => {
      return {
        filters: {
          docstatus: 1,
          company: frm.doc.company,
          customer: frm.doc.customer,
          outstanding_amount: ['>', 0],
          status: 'Overdue',
        },
      }
    })
    frm.set_query('income_account', () => {
      return {
        filters: {
          company: frm.doc.company,
          root_type: 'Income',
          is_group: 0,
        },
      }
    })
    frm.set_query('cost_center', () => {
      return {
        filters: {
          company: frm.doc.company,
          is_group: 0,
        },
      }
    })
    frm.set_query('contact_person', erpnext.queries.contact_query)
    frm.set_query('customer_address', erpnext.queries.address_query)
    frm.set_query('company_address', erpnext.queries.company_address_query)
    frm.set_df_property('overdue_payments', 'cannot_add_rows', true)
  },
  refresh: function (frm?: any) {
    frm.set_df_property('company', 'read_only', frm.doc.__islocal ? 0 : 1)
    if (frm.doc.docstatus === 1 && frm.doc.status === 'Unresolved') {
      frm.add_custom_button(__('Resolve'), () => {
        frm.set_value('status', 'Resolved')
      })
    }
    if (frm.doc.docstatus === 1 && frm.doc.status !== 'Resolved') {
      frm.add_custom_button(
        __('Payment'),
        function () {
          frm.events.make_payment_entry(frm)
        },
        __('Create'),
      )
      frm.page.set_inner_btn_group_as_primary(__('Create'))
    }
    if (frm.doc.docstatus === 0) {
      frm.add_custom_button(__('Fetch Overdue Payments'), () => {
        erpnext.utils.map_current_doc({
          method: 'erpnext.accounts.doctype.sales_invoice.mapper.create_dunning',
          source_doctype: 'Sales Invoice',
          date_field: 'due_date',
          target: frm,
          setters: {
            customer: frm.doc.customer || undefined,
          },
          get_query_filters: {
            docstatus: 1,
            status: 'Overdue',
            company: frm.doc.company,
          },
          allow_child_item_selection: true,
          child_fieldname: 'payment_schedule',
          child_columns: ['due_date', 'outstanding'],
        })
      })
    }
    frappe.dynamic_link = { doc: frm.doc, fieldname: 'customer', doctype: 'Customer' }
    frm.toggle_display('customer_name', frm.doc.customer_name && frm.doc.customer_name !== frm.doc.customer)
  },
  company: function (frm?: any) {
    if (frm.doc.company) {
      frappe.call({
        method: 'erpnext.setup.doctype.company.company.get_default_company_address',
        args: { name: frm.doc.company, existing_address: frm.doc.company_address || '' },
        debounce: 2000,
        callback: function (r?: any) {
          frm.set_value('company_address', (r && r.message) || '')
        },
      })
      if (frm.fields_dict.currency) {
        const company_currency = erpnext.get_currency(frm.doc.company)
        if (!frm.doc.currency) {
          frm.set_value('currency', company_currency)
        }
        if (frm.doc.currency == company_currency) {
          frm.set_value('conversion_rate', 1.0)
        }
      }
      const company_doc = frappe.get_doc(':Company', frm.doc.company)
      if (company_doc.default_letter_head) {
        if (frm.fields_dict.letter_head) {
          frm.set_value('letter_head', company_doc.default_letter_head)
        }
      }
    }
  },
  currency: function (frm?: any) {
    const company_currency = erpnext.get_currency(frm.doc.company)
    if (frm.doc.currency && frm.doc.currency !== company_currency) {
      frappe.call({
        method: 'erpnext.setup.utils.get_exchange_rate',
        args: {
          transaction_date: frm.doc.posting_date,
          from_currency: frm.doc.currency,
          to_currency: company_currency,
          args: 'for_selling',
        },
        freeze: true,
        freeze_message: __('Fetching exchange rates ...'),
        callback: function (r?: any) {
          const exchange_rate = flt(r.message)
          if (exchange_rate != frm.doc.conversion_rate) {
            frm.set_value('conversion_rate', exchange_rate)
          }
        },
      })
    } else {
      frm.trigger('conversion_rate')
    }
  },
  customer: (frm?: any) => {
    erpnext.utils.get_party_details(frm)
  },
  conversion_rate: function (frm?: any) {
    if (frm.doc.currency === erpnext.get_currency(frm.doc.company)) {
      frm.set_value('conversion_rate', 1.0)
    }
    frm.set_df_property('conversion_rate', 'read_only', erpnext.stale_rate_allowed() ? 0 : 1)
  },
  customer_address: function (frm?: any) {
    erpnext.utils.get_address_display(frm, 'customer_address')
  },
  company_address: function (frm?: any) {
    erpnext.utils.get_address_display(frm, 'company_address')
  },
  dunning_type: function (frm?: any) {
    frm.trigger('get_dunning_letter_text')
  },
  language: function (frm?: any) {
    frm.trigger('get_dunning_letter_text')
  },
  get_dunning_letter_text: function (frm?: any) {
    if (frm.doc.dunning_type) {
      frm.call('get_dunning_letter_text').then((r?: any) => {
        if (!r.exc) {
          frm.refresh_fields()
        }
      })
    }
  },
  posting_date: function (frm?: any) {
    frm.trigger('calculate_overdue_days')
  },
  rate_of_interest: function (frm?: any) {
    frm.trigger('calculate_interest')
  },
  dunning_fee: function (frm?: any) {
    frm.trigger('calculate_totals')
  },
  overdue_payments_add: function (frm?: any) {
    frm.trigger('calculate_totals')
  },
  overdue_payments_remove: function (frm?: any) {
    frm.trigger('calculate_totals')
  },
  calculate_overdue_days: function (frm?: any) {
    frm.doc.overdue_payments.forEach((row?: any) => {
      if (frm.doc.posting_date && row.due_date) {
        const overdue_days = moment(frm.doc.posting_date).diff(row.due_date, 'days')
        frappe.model.set_value(row.doctype, row.name, 'overdue_days', overdue_days)
      }
    })
  },
  calculate_interest: function (frm?: any) {
    frm.doc.overdue_payments.forEach((row?: any) => {
      const interest_per_day = frm.doc.rate_of_interest / 100 / 365
      const interest = flt(interest_per_day * row.overdue_days * row.outstanding, precision('interest', row))
      frappe.model.set_value(row.doctype, row.name, 'interest', interest)
    })
  },
  calculate_totals: function (frm?: any) {
    const total_interest = frm.doc.overdue_payments.reduce((prev?: any, cur?: any) => prev + cur.interest, 0)
    const total_outstanding = frm.doc.overdue_payments.reduce((prev?: any, cur?: any) => prev + cur.outstanding, 0)
    const dunning_amount = total_interest + frm.doc.dunning_fee
    const base_dunning_amount = dunning_amount * frm.doc.conversion_rate
    const grand_total = total_outstanding + dunning_amount
    function setWithPrecison(field?: any, value?: any) {
      frm.set_value(field, flt(value, precision(field)))
    }
    setWithPrecison('total_outstanding', total_outstanding)
    setWithPrecison('total_interest', total_interest)
    setWithPrecison('dunning_amount', dunning_amount)
    setWithPrecison('base_dunning_amount', base_dunning_amount)
    setWithPrecison('grand_total', grand_total)
  },
  make_payment_entry: function (frm?: any) {
    return frappe.call({
      method: 'erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry',
      args: {
        dt: frm.doc.doctype,
        dn: frm.doc.name,
      },
      callback: function (r?: any) {
        let doc: any
        if (!r.exc) {
          doc = frappe.model.sync(r.message)
          frappe.set_route('Form', doc[0].doctype, doc[0].name)
        }
      },
    })
  },
})
frappe.ui.form.on('Overdue Payment', {
  interest: function (frm?: any) {
    frm.trigger('calculate_totals')
  },
})
