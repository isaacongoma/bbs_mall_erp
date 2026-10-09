import { $, __, erpnext, flt, format_currency, frappe } from '@/shared/frappe'
frappe.ui.form.on('Sales Order', {
  refresh(frm?: any) {
    erpnext.proforma.toggle_tab(frm, false)
    if (frm.doc.docstatus === 0) return
    frappe.db.get_single_value('Selling Settings', 'enable_proforma_invoice').then((enabled?: any) => {
      if (!enabled) return
      if (frm.doc.docstatus === 1) {
        setTimeout(() => {
          frm.add_custom_button(__('Proforma Invoice'), () => erpnext.proforma.open_dialog(frm), __('Create'))
        }, 0)
      }
      erpnext.proforma.render_list(frm)
    })
  },
})
frappe.provide('erpnext.proforma')
Object.assign(erpnext.proforma, {
  toggle_tab(frm?: any, show?: any) {
    const tab = frm.get_field('proforma_html')?.tab
    if (tab) {
      tab.df.hidden = show ? 0 : 1
      tab.toggle(show)
    } else {
      frm.set_df_property('proforma_tab', 'hidden', show ? 0 : 1)
    }
  },
  open_dialog(this: any, frm?: any) {
    frappe.call({
      method: 'erpnext.selling.doctype.proforma_invoice.proforma_invoice.get_sales_order_items',
      args: { sales_order: frm.doc.name },
      callback: (r?: any) => this.show_dialog(frm, r.message || []),
    })
  },
  show_dialog(this: any, frm?: any, so_items?: any) {
    frappe.model.with_doctype('Proforma Invoice', () => {
      const series = frappe.meta.get_docfield('Proforma Invoice', 'naming_series')
      frappe.db
        .get_single_value('Selling Settings', 'default_proforma_print_format')
        .then((default_print_format?: any) => {
          this.build_dialog(frm, so_items, series ? series.options : '', default_print_format)
        })
    })
  },
  build_dialog(this: any, frm?: any, so_items?: any, series_options?: any, default_print_format?: any) {
    const dialog = new frappe.ui.Dialog({
      title: __('Create Proforma Invoice'),
      size: 'large',
      fields: [
        {
          fieldname: 'naming_series',
          fieldtype: 'Select',
          label: __('Series'),
          options: series_options,
          default: (series_options || '').split('\n')[0],
          reqd: 1,
        },
        { fieldname: 'cb_series', fieldtype: 'Column Break' },
        {
          fieldname: 'print_format',
          fieldtype: 'Link',
          label: __('Print Format'),
          options: 'Print Format',
          default: default_print_format,
          get_query: () => ({ filters: { doc_type: 'Sales Order' } }),
        },
        {
          fieldname: 'letter_head',
          fieldtype: 'Link',
          label: __('Letter Head'),
          options: 'Letter Head',
        },
        { fieldname: 'items_section', fieldtype: 'Section Break', label: __('Items') },
        {
          fieldname: 'based_on',
          fieldtype: 'Select',
          label: __('Based On'),
          options: ['Quantity', 'Amount'],
          default: 'Quantity',
          onchange: () => this.toggle_basis(dialog),
        },
        {
          fieldname: 'hide_item_qty',
          fieldtype: 'Check',
          label: __('Hide Item Quantity in Print'),
          depends_on: 'eval:doc.based_on=="Amount"',
        },
        {
          fieldname: 'items',
          fieldtype: 'Table',
          cannot_add_rows: true,
          data: so_items.map((row?: any) => ({
            ...row,
            qty: Math.max(0, flt(row.qty) - flt(row.proformed_qty)),
            amount: Math.max(0, flt(row.amount) - flt(row.proformed_amount)),
          })),
          fields: [
            {
              fieldname: 'item_code',
              fieldtype: 'Data',
              label: __('Item'),
              read_only: 1,
              in_list_view: 1,
            },
            {
              fieldname: 'description',
              fieldtype: 'Text Editor',
              label: __('Description'),
              in_list_view: 1,
            },
            {
              fieldname: 'qty',
              fieldtype: 'Float',
              label: __('Qty'),
              in_list_view: 1,
              onchange: function () {
                if (dialog.get_value('based_on') === 'Quantity') {
                  const grid = dialog.get_field('items').grid
                  ;(grid.grid_rows || []).forEach((row?: any) => {
                    if (row.doc) row.doc.amount = flt(row.doc.qty) * flt(row.doc.rate)
                  })
                  grid.refresh()
                }
                erpnext.proforma.update_warning(dialog)
              },
            },
            {
              fieldname: 'amount',
              fieldtype: 'Currency',
              label: __('Amount'),
              in_list_view: 1,
              read_only: 1,
              onchange: () => this.update_warning(dialog),
            },
            { fieldname: 'item_name', fieldtype: 'Data', hidden: 1 },
            { fieldname: 'rate', fieldtype: 'Currency', hidden: 1 },
            { fieldname: 'so_detail', fieldtype: 'Data', hidden: 1 },
          ],
        },
        { fieldname: 'warning_html', fieldtype: 'HTML' },
      ],
      primary_action_label: __('Create'),
      primary_action: (values?: any) => this.create(frm, dialog, values),
    })
    dialog._so_items = so_items
    dialog.show()
    this.update_warning(dialog)
  },
  toggle_basis(this: any, dialog?: any) {
    const by_amount = dialog.get_value('based_on') === 'Amount'
    const grid = dialog.get_field('items').grid
    grid.toggle_enable('qty', true)
    grid.toggle_enable('amount', by_amount)
    this.update_warning(dialog)
  },
  update_warning(dialog?: any) {
    const by_amount = dialog.get_value('based_on') === 'Amount'
    const field = by_amount ? 'amount' : 'qty'
    const proformed_field = by_amount ? 'proformed_amount' : 'proformed_qty'
    const so_item: any = {}
    ;(dialog._so_items || []).forEach((row?: any) => (so_item[row.so_detail] = row))
    const exceeded: any = []
    ;(dialog.get_value('items') || []).forEach((row?: any) => {
      const item = so_item[row.so_detail]
      if (!item) return
      const ordered = flt(by_amount ? item.amount : item.qty)
      const total = flt(item[proformed_field]) + flt(row[field])
      if (total > ordered + 0.0001) exceeded.push(item.item_code)
    })
    const $wrapper = dialog.get_field('warning_html').$wrapper
    if (!exceeded.length) {
      $wrapper.empty()
      return
    }
    const basis = by_amount ? __('amount') : __('quantity')
    $wrapper.html(
      `<div class="text-danger small" style="margin-top: 8px;">${__('Total proforma {0} (including past proformas) exceeds the ordered {0} for: {1}', [basis, frappe.utils.escape_html(exceeded.join(', '))])}</div>`,
    )
  },
  create(frm?: any, dialog?: any, values?: any) {
    const by_amount = values.based_on === 'Amount'
    const items = (values.items || [])
      .filter((row?: any) => flt(by_amount ? row.amount : row.qty) > 0)
      .map((row?: any) => ({
        so_detail: row.so_detail,
        description: row.description,
        qty: row.qty,
        amount: row.amount,
      }))
    if (!items.length) {
      frappe.msgprint(__('Please enter a quantity or amount for at least one item.'))
      return
    }
    frappe.call({
      method: 'erpnext.selling.doctype.proforma_invoice.proforma_invoice.make_proforma_invoice',
      args: {
        sales_order: frm.doc.name,
        items: JSON.stringify(items),
        based_on: values.based_on,
        hide_item_qty: values.hide_item_qty ? 1 : 0,
        naming_series: values.naming_series,
        print_format: values.print_format,
        letter_head: values.letter_head,
      },
      freeze: true,
      freeze_message: __('Creating Proforma Invoice...'),
      callback: (r?: any) => {
        if (!r.message) return
        dialog.hide()
        frappe.show_alert({
          message: __('Proforma Invoice {0} created', [r.message]),
          indicator: 'green',
        })
        frm._activate_proforma_tab = true
        frm.reload_doc()
      },
    })
  },
  render_list(this: any, frm?: any) {
    frappe.require('embedded_list.bundle.js', () => this.build_list(frm))
  },
  build_list(this: any, frm?: any) {
    const container = frm.get_field('proforma_html').$wrapper.empty()
    const list = new frappe.ui.EmbeddedList({
      wrapper: $('<div></div>').appendTo(container),
      doctype: 'Proforma Invoice',
      filters: { sales_order: frm.doc.name, docstatus: ['in', [1, 2]] },
      fields: ['name', 'proforma_date', 'grand_total', 'status', 'proforma_pdf', 'sent_on', 'currency'],
      order_by: 'creation desc',
      empty_message: __('No proforma invoices yet.'),
      after_render(this: any) {
        const has_proformas = (this._all_data || []).length > 0
        erpnext.proforma.toggle_tab(frm, has_proformas)
        if (has_proformas && frm._activate_proforma_tab) {
          frm._activate_proforma_tab = false
          frm.get_field('proforma_html')?.tab?.set_active()
        }
      },
      columns: [
        {
          label: __('Proforma No'),
          type: 'link',
          fieldname: 'name',
          route: (row?: any) => ['Form', 'Proforma Invoice', row.name],
        },
        {
          label: __('Date'),
          fieldname: 'proforma_date',
          render: (row?: any) => frappe.datetime.str_to_user(row.proforma_date),
        },
        {
          label: __('Grand Total'),
          fieldname: 'grand_total',
          render: (row?: any) => format_currency(row.grand_total, row.currency),
        },
        {
          label: __('Status'),
          type: 'badge',
          fieldname: 'status',
          color: (row?: any) => (row.status === 'Cancelled' ? 'red' : 'green'),
        },
        {
          type: 'actions',
          actions: [
            {
              icon: 'printer',
              label: __('View PDF'),
              action: (row?: any) => row.proforma_pdf && window.open(row.proforma_pdf, '_blank'),
            },
            {
              icon: 'mail',
              label: __('Send Email'),
              action: (row?: any, refresh?: any) => {
                if (row.status === 'Cancelled') {
                  frappe.msgprint(__('A cancelled Proforma Invoice cannot be emailed.'))
                  return
                }
                this.send_email(frm, row.name, refresh)
              },
            },
          ],
        },
      ],
    })
    list.refresh()
    if (frm.doc.docstatus !== 1) return
    frappe.ui
      .button({
        label: __('New Proforma Invoice'),
        icon: 'plus',
        variant: 'subtle',
        size: 'sm',
        onclick: () => this.open_dialog(frm),
      })
      .appendTo($('<div class="flex justify-end" style="margin: 10px 0 20px;"></div>').appendTo(container))
  },
  send_email(this: any, frm?: any, proforma_name?: any, refresh?: any) {
    frappe.prompt(
      [
        {
          fieldname: 'recipients',
          fieldtype: 'Data',
          label: __('Recipients'),
          reqd: 1,
          default: frm.doc.contact_email,
          description: __('Comma separated email addresses'),
        },
      ],
      (values?: any) => {
        frappe.call({
          method: 'erpnext.selling.doctype.proforma_invoice.proforma_invoice.send_proforma_email',
          args: { proforma_name, recipients: values.recipients },
          freeze: true,
          callback: () => {
            frappe.show_alert({ message: __('Proforma emailed'), indicator: 'green' })
            ;(refresh || (() => this.render_list(frm)))()
          },
        })
      },
      __('Send Proforma Invoice'),
      __('Send'),
    )
  },
})
