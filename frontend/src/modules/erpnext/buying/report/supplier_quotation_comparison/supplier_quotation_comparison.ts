import { $, __, frappe } from '@/shared/frappe'
frappe.query_reports['Supplier Quotation Comparison'] = {
  filters: [
    {
      fieldtype: 'Link',
      label: __('Company'),
      options: 'Company',
      fieldname: 'company',
      default: frappe.defaults.get_user_default('Company'),
      reqd: 1,
    },
    {
      fieldname: 'from_date',
      label: __('From Date'),
      fieldtype: 'Date',
      width: '80',
      reqd: 1,
      default: frappe.datetime.add_months(frappe.datetime.get_today(), -1),
    },
    {
      fieldname: 'to_date',
      label: __('To Date'),
      fieldtype: 'Date',
      width: '80',
      reqd: 1,
      default: frappe.datetime.get_today(),
    },
    {
      default: '',
      options: 'Item',
      label: __('Item'),
      fieldname: 'item_code',
      fieldtype: 'Link',
      get_query: () => {
        let quote = frappe.query_report.get_filter_value('supplier_quotation')
        if (quote != '') {
          return {
            query: 'erpnext.stock.doctype.quality_inspection.quality_inspection.item_query',
            filters: {
              from: 'Supplier Quotation Item',
              parent: quote,
            },
          }
        }
      },
    },
    {
      fieldname: 'supplier',
      label: __('Supplier'),
      fieldtype: 'MultiSelectList',
      options: 'Supplier',
      get_data: function (txt?: any) {
        return frappe.db.get_link_options('Supplier', txt)
      },
    },
    {
      fieldtype: 'MultiSelectList',
      label: __('Supplier Quotation'),
      fieldname: 'supplier_quotation',
      options: 'Supplier Quotation',
      default: '',
      get_data: function (txt?: any) {
        return frappe.db.get_link_options('Supplier Quotation', txt, { docstatus: ['<', 2] })
      },
    },
    {
      fieldtype: 'Link',
      label: __('Request for Quotation'),
      options: 'Request for Quotation',
      fieldname: 'request_for_quotation',
      default: '',
      get_query: () => {
        return { filters: { docstatus: ['<', 2] } }
      },
    },
    {
      fieldname: 'categorize_by',
      label: __('Categorize by'),
      fieldtype: 'Select',
      options: [
        { label: __('Categorize by Supplier'), value: 'Categorize by Supplier' },
        { label: __('Categorize by Item'), value: 'Categorize by Item' },
      ],
      default: __('Categorize by Supplier'),
    },
    {
      fieldname: 'status',
      label: __('Status'),
      fieldtype: 'Select',
      options: [
        { label: '', value: '' },
        { label: __('Draft'), value: 'Draft' },
        { label: __('Submitted'), value: 'Submitted' },
      ],
      default: 'Submitted',
    },
    {
      fieldname: 'order_status',
      label: __('Order Status'),
      fieldtype: 'Select',
      options: [
        { label: '', value: '' },
        { label: __('Not Ordered'), value: 'Not Ordered' },
        { label: __('Partially Ordered'), value: 'Partially Ordered' },
        { label: __('Ordered'), value: 'Ordered' },
      ],
    },
    {
      fieldtype: 'Check',
      label: __('Include Expired'),
      fieldname: 'include_expired',
      default: 0,
    },
  ],
  formatter: (value?: any, row?: any, column?: any, data?: any, default_formatter?: any) => {
    value = default_formatter(value, row, column, data)
    if (column.fieldname === 'valid_till' && data.valid_till) {
      if (frappe.datetime.get_diff(data.valid_till, frappe.datetime.nowdate()) <= 1) {
        value = `<div style="color:red">${value}</div>`
      } else if (frappe.datetime.get_diff(data.valid_till, frappe.datetime.nowdate()) <= 7) {
        value = `<div style="color:darkorange">${value}</div>`
      }
    }
    if (column.fieldname === 'price_per_unit' && data.price_per_unit && data.min && data.min === 1) {
      value = `<div style="color:green">${value}</div>`
    }
    return value
  },
  onload: (report?: any) => {
    report.page.add_inner_button(
      __('Select Default Supplier'),
      () => {
        let reporter = frappe.query_reports['Supplier Quotation Comparison']
        reporter.make_default_supplier_dialog(report)
      },
      __('Tools'),
    )
  },
  make_default_supplier_dialog: (report?: any) => {
    if (!report.data) return
    let filters = report.get_values()
    let suppliers = $.map(report.data, (row?: any) => {
      return row.supplier_name
    })
    let items: any = []
    report.data.forEach((d?: any) => {
      if (!items.includes(d.item_code)) {
        items.push(d.item_code)
      }
    })
    let dialog = new frappe.ui.Dialog({
      title: __('Select Default Supplier'),
      fields: [
        {
          reqd: 1,
          label: 'Supplier',
          fieldtype: 'Link',
          options: 'Supplier',
          fieldname: 'supplier',
          get_query: () => {
            return {
              filters: {
                name: ['in', suppliers],
              },
            }
          },
        },
        {
          reqd: 1,
          label: 'Item',
          fieldtype: 'Link',
          options: 'Item',
          fieldname: 'item_code',
          get_query: () => {
            return {
              filters: {
                name: ['in', items],
              },
            }
          },
        },
      ],
    })
    dialog.set_primary_action(__('Set Default Supplier'), () => {
      let values = dialog.get_values()
      if (values) {
        frappe.call({
          method:
            'erpnext.buying.report.supplier_quotation_comparison.supplier_quotation_comparison.set_default_supplier',
          args: {
            item_code: values.item_code,
            supplier: values.supplier,
            company: filters.company,
          },
          freeze: true,
          callback: () => {
            frappe.msgprint(__('Successfully Set Supplier'))
            dialog.hide()
          },
        })
      }
    })
    dialog.show()
  },
}
