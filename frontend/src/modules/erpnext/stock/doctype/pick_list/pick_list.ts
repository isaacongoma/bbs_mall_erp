import { __, erpnext, flt, frappe, locals, moment, precision, refresh_field } from '@/shared/frappe'
frappe.ui.form.on('Pick List', {
  after_save(frm?: any) {
    setTimeout(() => {
      frm.reload_doc()
    }, 500)
  },
  set_warehouse_query: function (frm?: any, fieldname?: any, parentfield: any = null) {
    const query = () => {
      const filters: any = { company: frm.doc.company }
      frm.doc.consider_rejected_warehouses ? null : (filters.is_rejected_warehouse = 0)
      return { filters }
    }
    if (parentfield) {
      frm.set_query(fieldname, parentfield, query)
    } else {
      frm.set_query(fieldname, query)
    }
  },
  setup: (frm?: any) => {
    frm.ignore_doctypes_on_cancel_all = ['Serial and Batch Bundle']
    frm.set_indicator_formatter('item_code', function (doc?: any) {
      return doc.stock_qty === 0 ? 'red' : 'green'
    })
    frm.custom_make_buttons = {
      'Delivery Note': 'Delivery Note',
      'Stock Entry': 'Stock Entry',
    }
    frm.events.set_warehouse_query(frm, 'warehouse', 'locations')
    frm.events.set_warehouse_query(frm, 'parent_warehouse')
    frm.set_query('work_order', () => {
      return {
        query: 'erpnext.stock.doctype.pick_list.pick_list.get_pending_work_orders',
        filters: {
          company: frm.doc.company,
        },
      }
    })
    frm.set_query('material_request', () => {
      return {
        filters: {
          material_request_type: ['=', frm.doc.purpose],
        },
      }
    })
    frm.set_query('item_code', 'locations', () => {
      return erpnext.queries.item({ is_stock_item: 1 })
    })
    frm.set_query('batch_no', 'locations', (_frm?: any, cdt?: any, cdn?: any) => {
      const row = locals[cdt][cdn]
      return {
        query: 'erpnext.controllers.queries.get_batch_no',
        filters: {
          item_code: row.item_code,
          warehouse: row.warehouse,
        },
      }
    })
    frm.set_query('serial_and_batch_bundle', 'locations', (doc?: any, cdt?: any, cdn?: any) => {
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
  set_item_locations: (frm?: any, save?: any) => {
    if (!(frm.doc.locations && frm.doc.locations.length)) {
      frappe.msgprint(__('Add items in the Item Locations table'))
    } else {
      frappe.call({
        method: 'set_item_locations',
        doc: frm.doc,
        args: {
          save: save,
        },
        freeze: 1,
        freeze_message: __('Setting Item Locations...'),
        callback() {
          refresh_field('locations')
        },
      })
    }
  },
  pick_manually: (frm?: any) => {
    frm.trigger('update_warehouse_property')
  },
  update_warehouse_property: (frm?: any) => {
    frm.fields_dict.locations.grid.update_docfield_property('warehouse', 'read_only', !frm.doc.pick_manually)
  },
  get_item_locations: (frm?: any) => {
    frm.events.set_item_locations(frm, false)
  },
  refresh: (frm?: any) => {
    frm.trigger('add_get_items_button')
    frm.trigger('update_warehouse_property')
    erpnext.toggle_serial_batch_fields(frm)
    if ((frm.doc.locations || []).length && !['Completed', 'Cancelled'].includes(frm.doc.status)) {
      frm.add_custom_button(__('Stock Availability'), () => frm.events.show_stock_availability(frm))
    }
    if (frm.doc.docstatus === 1) {
      const status_completed = frm.doc.status === 'Completed'
      if (!status_completed) {
        frm.add_custom_button(__('Update Current Stock'), () => frm.trigger('update_pick_list_stock'))
        if (frm.doc.purpose === 'Delivery') {
          frm.add_custom_button(
            __('Delivery Note'),
            () => frm.events.create_delivery(frm, 'Delivery Note'),
            __('Create'),
          )
          frm.add_custom_button(
            __('Sales Invoice'),
            () => frm.events.create_delivery(frm, 'Sales Invoice'),
            __('Create'),
          )
        } else {
          frm.add_custom_button(__('Stock Entry'), () => frm.trigger('create_stock_entry'), __('Create'))
        }
      }
      if (frm.doc.purpose === 'Delivery' && frm.doc.status === 'Open') {
        if (frm.doc.__onload && frm.doc.__onload.has_unreserved_stock) {
          frm.add_custom_button(
            __('Reserve'),
            () => frm.events.create_stock_reservation_entries(frm),
            __('Stock Reservation'),
          )
        }
        if (frm.doc.__onload && frm.doc.__onload.has_reserved_stock) {
          frm.add_custom_button(
            __('Unreserve'),
            () => {
              frappe.confirm(__('The reserved stock will be released. Are you certain you wish to proceed?'), () =>
                frm.events.cancel_stock_reservation_entries(frm),
              )
            },
            __('Stock Reservation'),
          )
          frm.add_custom_button(
            __('Reserved Stock'),
            () => frm.events.show_reserved_stock(frm),
            __('Stock Reservation'),
          )
        }
      }
    }
    const sbb_field = frm.get_docfield('locations', 'serial_and_batch_bundle')
    if (sbb_field) {
      sbb_field.get_route_options_for_new_doc = (row?: any) => {
        return {
          item_code: row.doc.item_code,
          warehouse: row.doc.warehouse,
          voucher_type: frm.doc.doctype,
        }
      }
    }
  },
  work_order: (frm?: any) => {
    frappe.db
      .get_value('Work Order', frm.doc.work_order, ['qty', 'material_transferred_for_manufacturing'])
      .then((data?: any) => {
        const qty_data = data.message
        const max = qty_data.qty - qty_data.material_transferred_for_manufacturing
        frappe.prompt(
          {
            fieldtype: 'Float',
            label: __('Qty of Finished Goods Item'),
            fieldname: 'qty',
            description: __('Max: {0}', [max]),
            default: max,
          },
          (data?: any) => {
            frm.set_value('for_qty', data.qty)
            if (data.qty > max) {
              frappe.msgprint(__('Quantity must not be more than {0}', [max]))
              return
            }
            frm.clear_table('locations')
            erpnext.utils.map_current_doc({
              method: 'erpnext.manufacturing.doctype.work_order.mapper.create_pick_list',
              target: frm,
              source_name: frm.doc.work_order,
            })
          },
          __('Select Quantity'),
          __('Get Items'),
        )
      })
  },
  material_request: (frm?: any) => {
    erpnext.utils.map_current_doc({
      method: 'erpnext.stock.doctype.material_request.mapper.create_pick_list',
      target: frm,
      source_name: frm.doc.material_request,
    })
  },
  purpose: (frm?: any) => {
    frm.clear_table('locations')
    frm.trigger('add_get_items_button')
  },
  create_delivery(frm?: any, doctype?: any) {
    frappe.model.open_mapped_doc({
      method: 'erpnext.stock.doctype.pick_list.mapper.create_delivery',
      args: {
        target: doctype,
      },
      frm: frm,
    })
  },
  create_stock_entry: (frm?: any) => {
    frappe
      .xcall('erpnext.stock.doctype.pick_list.mapper.create_stock_entry', {
        pick_list: frm.doc,
      })
      .then((stock_entry?: any) => {
        frappe.model.sync(stock_entry)
        frappe.set_route('Form', 'Stock Entry', stock_entry.name)
      })
  },
  update_pick_list_stock: (frm?: any) => {
    frm.events.set_item_locations(frm, true)
  },
  add_get_items_button: (frm?: any) => {
    const purpose = frm.doc.purpose
    if (purpose != 'Delivery' || frm.doc.docstatus !== 0) return
    const get_query_filters: any = {
      docstatus: 1,
      per_delivered: ['<', 100],
      status: ['!=', ''],
      customer: frm.doc.customer,
    }
    frm.get_items_btn = frm.add_custom_button(__('Get Items'), () => {
      erpnext.utils.map_current_doc({
        method: 'erpnext.selling.doctype.sales_order.mapper.create_pick_list',
        source_doctype: 'Sales Order',
        target: frm,
        setters: {
          company: frm.doc.company,
          customer: frm.doc.customer,
        },
        date_field: 'transaction_date',
        get_query_filters: get_query_filters,
      })
    })
  },
  scan_barcode: (frm?: any) => {
    const opts: any = {
      frm,
      items_table_name: 'locations',
      qty_field: 'picked_qty',
      max_qty_field: 'qty',
      demand_ref_fields: ['sales_order_item', 'material_request_item', 'product_bundle_item'],
      dont_allow_new_row: !frm.doc.pick_manually,
      prompt_qty: frm.doc.prompt_qty,
      serial_no_field: 'not_supported',
    }
    const barcode_scanner = new erpnext.utils.BarcodeScanner(opts)
    barcode_scanner.process_scan()
  },
  create_stock_reservation_entries: (frm?: any) => {
    frappe.call({
      doc: frm.doc,
      method: 'create_stock_reservation_entries',
      args: {
        notify: true,
      },
      freeze: true,
      freeze_message: __('Reserving Stock...'),
      callback: () => {
        frm.doc.__onload.has_unreserved_stock = false
        frm.reload_doc()
      },
    })
  },
  cancel_stock_reservation_entries: (frm?: any) => {
    frappe.call({
      doc: frm.doc,
      method: 'cancel_stock_reservation_entries',
      args: {
        notify: true,
      },
      freeze: true,
      freeze_message: __('Unreserving Stock...'),
      callback: () => {
        frm.doc.__onload.has_reserved_stock = false
        frm.reload_doc()
      },
    })
  },
  show_stock_availability(frm?: any) {
    const seen = new Set()
    const items: any = []
    ;(frm.doc.locations || []).forEach((row?: any) => {
      if (!row.item_code || !row.warehouse) return
      const key = `${row.item_code}||${row.warehouse}`
      if (seen.has(key)) return
      seen.add(key)
      items.push({ item_code: row.item_code, warehouse: row.warehouse })
    })
    if (!items.length) {
      frappe.msgprint(__('Add items with a warehouse in the Item Locations table'))
      return
    }
    frappe
      .xcall('erpnext.stock.doctype.pick_list.pick_list.get_stock_availability', {
        items: items,
        pick_list: frm.doc.name,
      })
      .then((rows?: any) => frm.events.render_stock_availability(rows))
  },
  render_stock_availability(rows?: any) {
    const dialog = new frappe.ui.Dialog({
      title: __('Stock Availability'),
      size: 'extra-large',
    })
    dialog.$body.html(get_availability_html(rows))
    dialog.show()
  },
  show_reserved_stock(frm?: any) {
    const to_date = moment(new Date(Math.max(...frm.doc.locations.map((e?: any) => new Date(e.modified))))).format(
      'YYYY-MM-DD',
    )
    frappe.route_options = {
      company: frm.doc.company,
      from_date: moment(frm.doc.creation).format('YYYY-MM-DD'),
      to_date: to_date,
      voucher_type: 'Sales Order',
      from_voucher_type: 'Pick List',
      from_voucher_no: frm.doc.name,
    }
    frappe.set_route('query-report', 'Reserved Stock')
  },
})
frappe.ui.form.on('Pick List Item', {
  item_code: (frm?: any, cdt?: any, cdn?: any) => {
    const row = frappe.get_doc(cdt, cdn)
    if (row.item_code) {
      get_item_details(row.item_code, row.uom, row.warehouse, frm.doc.company).then((data?: any) => {
        frappe.model.set_value(cdt, cdn, 'uom', data.stock_uom)
        frappe.model.set_value(cdt, cdn, 'stock_uom', data.stock_uom)
        frappe.model.set_value(cdt, cdn, 'conversion_factor', 1)
        frappe.model.set_value(cdt, cdn, 'actual_qty', data.actual_qty)
        frappe.model.set_value(cdt, cdn, 'company_total_stock', data.company_total_stock)
      })
    }
  },
  uom: (_frm?: any, cdt?: any, cdn?: any) => {
    const row = frappe.get_doc(cdt, cdn)
    if (row.uom) {
      get_item_details(row.item_code, row.uom).then((data?: any) => {
        frappe.model.set_value(cdt, cdn, 'conversion_factor', data.conversion_factor)
      })
    }
  },
  warehouse: (frm?: any, cdt?: any, cdn?: any) => {
    const row = frappe.get_doc(cdt, cdn)
    if (!row.item_code || !row.warehouse) return
    get_item_details(row.item_code, row.uom, row.warehouse, frm.doc.company).then((data?: any) => {
      frappe.model.set_value(cdt, cdn, 'actual_qty', data.actual_qty)
      frappe.model.set_value(cdt, cdn, 'company_total_stock', data.company_total_stock)
    })
  },
  qty: (_frm?: any, cdt?: any, cdn?: any) => {
    const row = frappe.get_doc(cdt, cdn)
    frappe.model.set_value(cdt, cdn, 'stock_qty', row.qty * row.conversion_factor)
  },
  conversion_factor: (_frm?: any, cdt?: any, cdn?: any) => {
    const row = frappe.get_doc(cdt, cdn)
    frappe.model.set_value(cdt, cdn, 'stock_qty', row.qty * row.conversion_factor)
  },
  pick_serial_and_batch(frm?: any, cdt?: any, cdn?: any) {
    const item = locals[cdt][cdn]
    frappe.db.get_value('Item', item.item_code, ['has_batch_no', 'has_serial_no']).then((r?: any) => {
      if (r.message && (r.message.has_batch_no || r.message.has_serial_no)) {
        item.has_serial_no = r.message.has_serial_no
        item.has_batch_no = r.message.has_batch_no
        item.type_of_transaction = item.qty > 0 ? 'Outward' : 'Inward'
        item.title = item.has_serial_no ? __('Select Serial No') : __('Select Batch No')
        if (item.has_serial_no && item.has_batch_no) {
          item.title = __('Select Serial and Batch')
        }
        new erpnext.SerialBatchPackageSelector(frm, item, (r?: any) => {
          if (r) {
            const qty = Math.abs(r.total_qty)
            frappe.model.set_value(item.doctype, item.name, {
              serial_and_batch_bundle: r.name,
              use_serial_batch_fields: 0,
              qty: qty / flt(item.conversion_factor || 1, precision('conversion_factor', item)),
            })
          }
        })
      }
    })
  },
})
function format_float(qty?: any) {
  return frappe.format(qty, { fieldtype: 'Float' })
}
function get_availability_html(rows?: any) {
  return `
		${get_availability_cards_html(rows)}
		${get_availability_summary_html(rows)}
		${get_holding_documents_html(rows)}`
}
function get_availability_cards_html(rows?: any) {
  const blocked = rows.filter((row?: any) => row.free_qty <= 0)
  const held = rows.filter((row?: any) => row.pick_lists.length || row.reservations.length)
  const cards: any = [
    { label: __('Items'), value: rows.length, color: 'var(--text-color)' },
    {
      label: __('Held by Other Documents'),
      value: held.length,
      color: held.length ? 'var(--orange-500)' : 'var(--green-500)',
    },
    {
      label: __('Not Free to Pick'),
      value: blocked.length,
      color: blocked.length ? 'var(--red-500)' : 'var(--green-500)',
    },
  ]
  const card_html = cards
    .map(
      (card?: any) => `
			<div style="flex: 1; border: 1px solid var(--border-color); border-radius: var(--border-radius-md); padding: 12px 15px;">
				<div class="text-muted" style="font-size: var(--text-sm); margin-bottom: 4px;">${card.label}</div>
				<div style="font-size: var(--text-2xl); font-weight: 600; color: ${card.color};">${card.value}</div>
			</div>`,
    )
    .join('')
  return `<div style="display: flex; gap: 15px; margin-bottom: 20px;">${card_html}</div>`
}
function get_availability_summary_html(rows?: any) {
  const header = `
		<tr>
			<th>${__('Item')}</th>
			<th>${__('Warehouse')}</th>
			<th class="text-right">${__('Actual Qty')}</th>
			<th class="text-right">${__('Held by Pick Lists')}</th>
			<th class="text-right">${__('Reserved Qty')}</th>
			<th class="text-right">${__('Free to Pick')}</th>
		</tr>`
  const body = rows
    .map((row?: any) => {
      const has_detail = row.pick_lists.length || row.reservations.length
      const color = row.free_qty <= 0 ? 'red' : has_detail ? 'orange' : 'green'
      return `
			<tr>
				<td><span class="indicator ${color}"></span> ${frappe.utils.escape_html(row.item_code)}</td>
				<td>${frappe.utils.escape_html(row.warehouse)}</td>
				<td class="text-right">${format_float(row.actual_qty)}</td>
				<td class="text-right">${format_float(row.picked_qty)}</td>
				<td class="text-right">${format_float(row.reserved_qty)}</td>
				<td class="text-right"><b>${format_float(row.free_qty)}</b></td>
			</tr>`
    })
    .join('')
  return `
		<h5 style="margin-bottom: 10px;">${__('Availability')}</h5>
		<table class="table table-bordered">${header}${body}</table>`
}
function get_holding_documents_html(rows?: any) {
  const with_holders = rows.filter((row?: any) => row.pick_lists.length || row.reservations.length)
  if (!with_holders.length) return ''
  const header = `
		<tr>
			<th style="width: 45%">${__('Item / Document')}</th>
			<th>${__('Status')}</th>
			<th>${__('Batch No')}</th>
			<th class="text-right">${__('Qty')}</th>
		</tr>`
  const body = with_holders.map((row?: any) => get_holding_tree_rows_html(row)).join('')
  return `
		<h5 style="margin: 20px 0 10px;">${__('Stock Held By')}</h5>
		<div class="text-muted" style="font-size: var(--text-sm); margin-bottom: 10px;">
			${__('Cancel or delete these documents to release the stock.')}
		</div>
		<table class="table table-bordered">${header}${body}</table>`
}
function get_holding_tree_rows_html(row?: any) {
  const total = row.picked_qty + row.reserved_qty
  let html = `
		<tr style="background-color: var(--control-bg);">
			<td colspan="3">
				<span class="text-muted">${__('Item')}:</span>
				<b>${frappe.utils.escape_html(row.item_code)}</b>
				<span class="text-muted" style="margin: 0 8px;">·</span>
				<span class="text-muted">${__('Warehouse')}:</span>
				<b>${frappe.utils.escape_html(row.warehouse)}</b>
			</td>
			<td class="text-right"><b>${format_float(total)}</b></td>
		</tr>`
  const child_cell = (content?: any) =>
    `<td style="padding-left: 30px;"><span class="text-muted">└─</span> ${content}</td>`
  row.pick_lists.forEach((d?: any) => {
    html += `
		<tr>
			${child_cell(frappe.utils.get_form_link('Pick List', d.pick_list, true))}
			<td>${__(d.status)}</td>
			<td>${frappe.utils.escape_html(d.batch_id || '')}</td>
			<td class="text-right">${format_float(d.holding_qty)}</td>
		</tr>`
  })
  row.reservations.forEach((d?: any) => {
    const against = frappe.utils.get_form_link(d.voucher_type, d.voucher_no, true)
    const sre_link = frappe.utils.get_form_link('Stock Reservation Entry', d.name, true)
    html += `
		<tr>
			${child_cell(`${sre_link} · ${__('Reserved for {0}', [against])}`)}
			<td>${__(d.status)}</td>
			<td></td>
			<td class="text-right">${format_float(d.reserved_qty)}</td>
		</tr>`
  })
  return html
}
function get_item_details(item_code?: any, uom: any = null, warehouse: any = null, company: any = null) {
  if (item_code) {
    return frappe.xcall('erpnext.stock.doctype.pick_list.pick_list.get_item_details', {
      item_code,
      uom,
      warehouse,
      company,
    })
  }
}
