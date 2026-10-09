import {
  __,
  erpnext,
  flt,
  frappe,
  locals,
  moment,
  open_url_post,
  refresh_field,
  set_field_options,
} from '@/shared/frappe'
frappe.ui.form.on('Production Plan', {
  before_save(frm?: any) {
    frm.doc.po_items.forEach((item?: any) => {
      item.temporary_name = item.name
    })
  },
  hide_reserve_stock_button(frm?: any) {
    frm.toggle_display('reserve_stock', false)
    if (frm.doc.__onload?.enable_stock_reservation) {
      frm.toggle_display('reserve_stock', true)
    }
  },
  setup(frm?: any) {
    frm.trigger('setup_queries')
    frm.custom_make_buttons = {
      'Work Order': 'Work Order / Subcontract PO',
      'Material Request': 'Material Request',
    }
    frm.set_df_property('sub_assembly_items', 'cannot_add_rows', true)
    frm.set_df_property('mr_items', 'cannot_add_rows', true)
  },
  setup_queries(frm?: any) {
    frm.set_query('sales_order', 'sales_orders', () => {
      return {
        query: 'erpnext.manufacturing.doctype.production_plan.production_plan.sales_order_query',
        filters: {
          company: frm.doc.company,
          item_code: frm.doc.item_code,
        },
      }
    })
    frm.set_query('for_warehouse', function (doc?: any) {
      if (doc.raw_material_group_warehouse) {
        return {
          query: 'erpnext.manufacturing.doctype.production_plan.production_plan.get_child_warehouses',
          filters: {
            group_warehouse: doc.raw_material_group_warehouse,
            company: doc.company,
          },
        }
      }
      return {
        filters: [
          ['Warehouse', 'company', '=', doc.company],
          ['Warehouse', 'is_group', '=', 0],
        ],
      }
    })
    frm.set_query('raw_material_group_warehouse', function (doc?: any) {
      return {
        filters: {
          company: doc.company,
          is_group: 1,
        },
      }
    })
    frm.set_query('sub_assembly_warehouse', function (doc?: any) {
      return {
        filters: {
          company: doc.company,
        },
      }
    })
    frm.set_query('material_request', 'material_requests', function () {
      return {
        filters: {
          material_request_type: 'Manufacture',
          docstatus: 1,
          status: ['!=', 'Stopped'],
        },
      }
    })
    frm.set_query('item_code', 'po_items', () => {
      return {
        query: 'erpnext.controllers.queries.item_query',
        filters: {
          is_stock_item: 1,
        },
      }
    })
    frm.set_query('bom_no', 'po_items', (_doc?: any, cdt?: any, cdn?: any) => {
      const d = locals[cdt][cdn]
      if (d.item_code) {
        return {
          query: 'erpnext.controllers.queries.bom',
          filters: { item: d.item_code, docstatus: 1 },
        }
      } else frappe.msgprint(__('Please enter Item first'))
    })
    frm.set_query('warehouse', 'mr_items', (doc?: any) => {
      return {
        filters: {
          company: doc.company,
        },
      }
    })
    frm.set_query('warehouse', 'po_items', (doc?: any) => {
      return {
        filters: {
          company: doc.company,
        },
      }
    })
  },
  raw_material_group_warehouse(frm?: any) {
    if (frm.doc.for_warehouse) {
      frm.set_value('for_warehouse', null)
    }
  },
  refresh(frm?: any) {
    if (frm.doc.docstatus === 1) {
      frm.trigger('show_progress')
      frm.add_custom_button(
        __('Production Plan Summary'),
        () => {
          frappe.set_route('query-report', 'Production Plan Summary', {
            production_plan: frm.doc.name,
          })
        },
        __('View'),
      )
      frm.add_custom_button(
        __('Production Schedule'),
        () => {
          frappe.route_options = { production_plan: frm.doc.name }
          frappe.set_route('List', 'Production Plan Schedule', 'Calendar')
        },
        __('View'),
      )
      frm.add_custom_button(
        __('Plan Visualizer'),
        () => {
          frappe.route_options = { production_plan: frm.doc.name }
          frappe.set_route('production-plan-visualizer')
        },
        __('View'),
      )
      if (!['Completed', 'Closed'].includes(frm.doc.status)) {
        frm.add_custom_button(__('Schedule Items'), () => {
          frm.events.show_schedule_dialog(frm)
        })
      }
      let has_create_buttons = false
      if (frm.doc.status !== 'Completed') {
        if (frm.doc.status === 'Closed') {
          frm.add_custom_button(
            __('Re-open'),
            function () {
              frm.events.close_open_production_plan(frm, false)
            },
            __('Status'),
          )
        } else {
          frm.add_custom_button(
            __('Close'),
            function () {
              frm.events.close_open_production_plan(frm, true)
            },
            __('Status'),
          )
        }
        const items = frm.events.get_items_for_work_order(frm)
        if (items?.length && frm.doc.status !== 'Closed') {
          frm.add_custom_button(
            __('Work Order / Subcontract PO'),
            () => {
              frm.trigger('make_work_order')
            },
            __('Create'),
          )
          has_create_buttons = true
        }
        if (frm.doc.mr_items && frm.doc.mr_items.length && !['Material Requested', 'Closed'].includes(frm.doc.status)) {
          frm.add_custom_button(
            __('Material Request'),
            () => {
              frm.trigger('make_material_request')
            },
            __('Create'),
          )
          has_create_buttons = true
        }
      }
      if (has_create_buttons && frm.doc.status !== 'Closed') {
        frm.page.set_inner_btn_group_as_primary(__('Create'))
      }
    }
    frm.trigger('material_requirement')
    frm.trigger('hide_reserve_stock_button')
    frm.trigger('setup_stock_reservation_for_sub_assembly')
    frm.trigger('setup_stock_reservation_for_raw_materials')
    const projected_qty_formula = ` <table class="table table-bordered" style="background-color: var(--scrollbar-track-color);">
			<tr><td style="padding-left:25px">
				<div>
				<h3 style="text-decoration: underline;">
					<a href = "https://erpnext.com/docs/user/manual/en/stock/projected-quantity">
						${__('Projected Quantity Formula')}
					</a>
				</h3>
					<div>
						<h3 style="font-size: 13px">
							(Actual Qty + Planned Qty + Requested Qty + Ordered Qty) - (Reserved Qty + Reserved for Production + Reserved for Subcontract)
						</h3>
					</div>
					<br>
					<div>
						<ul>
							<li>
								${__('Actual Qty: Quantity available in the warehouse.')}
							</li>
							<li>
								${__('Planned Qty: Quantity, for which, Work Order has been raised, but is pending to be manufactured.')}
							</li>
							<li>
								${__('Requested Qty: Quantity requested for purchase, but not ordered.')}
							</li>
							<li>
								${__('Ordered Qty: Quantity ordered for purchase, but not received.')}
							</li>
							<li>
								${__('Reserved Qty: Quantity ordered for sale, but not delivered.')}
							</li>
							<li>
								${__('Reserved Qty for Production: Raw materials quantity to make manufacturing items.')}
							</li>
							<li>
								${__('Reserved Qty for Subcontract: Raw materials quantity to make subcontracted items.')}
							</li>
						</ul>
					</div>
				</div>
			</td></tr>
		</table>`
    set_field_options('projected_qty_formula', projected_qty_formula)
  },
  show_schedule_dialog(frm?: any) {
    const items_data = frm.doc.po_items.map((row?: any) => ({
      plan_row: row.name,
      item_code: row.item_code,
      planned_qty: row.planned_qty,
      start_date: row.planned_start_date,
    }))
    const dialog = new frappe.ui.Dialog({
      title: __('Schedule Production Plan'),
      size: 'large',
      fields: [
        {
          label: __('Start Date'),
          fieldname: 'start_date',
          fieldtype: 'Datetime',
          reqd: 1,
          default: frappe.datetime.now_datetime(),
        },
        {
          label: __('Use Item Wise Start Dates'),
          fieldname: 'use_item_dates',
          fieldtype: 'Check',
          default: 0,
          description: __(
            'Set a start date per assembly item below; its sub-assemblies are scheduled from the same date. The Start Date above is the earliest limit. Rows with a date here keep it as entered; clear a date to let the system schedule that item freely and write back the computed start.',
          ),
        },
        {
          label: __('Item Wise Start Dates'),
          fieldname: 'items',
          fieldtype: 'Table',
          depends_on: 'eval:doc.use_item_dates',
          cannot_add_rows: true,
          cannot_delete_rows: true,
          in_place_edit: true,
          data: items_data,
          get_data: () => items_data,
          fields: [
            {
              fieldname: 'plan_row',
              fieldtype: 'Data',
              hidden: 1,
            },
            {
              label: __('Item'),
              fieldname: 'item_code',
              fieldtype: 'Link',
              options: 'Item',
              in_list_view: 1,
              read_only: 1,
              columns: 3,
            },
            {
              label: __('Planned Qty'),
              fieldname: 'planned_qty',
              fieldtype: 'Float',
              in_list_view: 1,
              read_only: 1,
              columns: 2,
            },
            {
              label: __('Start Date'),
              fieldname: 'start_date',
              fieldtype: 'Datetime',
              in_list_view: 1,
              columns: 4,
            },
          ],
        },
      ],
      primary_action_label: __('Preview'),
      primary_action: (values?: any) => {
        dialog.hide()
        frm.events.fetch_schedule_preview(frm, frm.events.get_schedule_args(frm, values))
      },
    })
    dialog.show()
  },
  get_schedule_args(frm?: any, values?: any) {
    const item_dates: any = {}
    if (values.use_item_dates) {
      ;(values.items || []).forEach((row?: any) => {
        if (row.plan_row && row.start_date) {
          item_dates[row.plan_row] = row.start_date
        }
      })
    }
    return {
      production_plan: frm.doc.name,
      start_date: values.start_date,
      use_item_dates: values.use_item_dates,
      item_dates: item_dates,
    }
  },
  fetch_schedule_preview(frm?: any, args?: any) {
    frappe.call({
      method: 'erpnext.manufacturing.scheduling.plan_adapter.get_schedule_preview',
      type: 'GET',
      args: args,
      freeze: true,
      freeze_message: __('Calculating Schedule...'),
      callback: (r?: any) => {
        if (!r.exc) {
          frm.events.show_schedule_preview(frm, args, r.message)
        }
      },
    })
  },
  show_schedule_preview(frm?: any, values?: any, proposal?: any) {
    const ordered = frm.events.get_ordered_preview_rows(proposal)
    const rows_html = ordered.map((row?: any) => frm.events.get_preview_row_html(row)).join('')
    const unscheduled = Object.entries(proposal.unscheduled || {})
    const warning = unscheduled.length
      ? `<div class="schedule-preview-warning">${__('Could not schedule {0} task(s), so this proposal cannot be applied', [unscheduled.length])}: ${unscheduled
          .map(([key, reason]: any) => `${frappe.utils.escape_html(key)} (${reason})`)
          .join(', ')}</div>`
      : ''
    const locked_note = proposal.orders_exist
      ? `<div class="schedule-preview-warning">${__('Work Orders / Purchase Orders already exist against this plan, so the schedule is locked. Cancel them to re-schedule.')}</div>`
      : ''
    const dialog_options: any = {
      title: __('Schedule Preview'),
      size: 'extra-large',
    }
    if (!unscheduled.length && !proposal.orders_exist) {
      dialog_options.primary_action_label = __('Apply Schedule')
      dialog_options.primary_action = () => {
        dialog.hide()
        frm.events.apply_schedule(frm, values)
      }
    }
    const dialog = new frappe.ui.Dialog(dialog_options)
    dialog.$body.html(`
			${frm.events.get_preview_styles()}
			${frm.events.get_preview_summary_html(proposal, ordered)}
			${locked_note}
			${warning}
			<div class="schedule-preview-table-wrapper">
				<table class="table schedule-preview-table">
					<thead><tr>
						<th>${__('Item')}</th>
						<th>${__('Workstations')}</th>
						<th>${__('Start')}</th>
						<th>${__('End')}</th>
						<th>${__('Starts In')}</th>
					</tr></thead>
					<tbody>${rows_html}</tbody>
				</table>
			</div>
		`)
    dialog.show()
  },
  get_ordered_preview_rows(proposal?: any) {
    const entries = Object.entries(proposal.rows || {}).map(([name, row]: any) => ({ name, ...row }))
    const by_start = (a?: any, b?: any) => (a.start < b.start ? -1 : 1)
    const materials = entries.filter((row?: any) => row.row_type === 'Raw Material').sort(by_start)
    const finished_goods = entries.filter((row?: any) => row.row_type === 'Finished Good').sort(by_start)
    const sub_assemblies = entries
      .filter((row?: any) => !['Finished Good', 'Raw Material'].includes(row.row_type))
      .sort(by_start)
    const used_materials = new Set()
    const materials_for = (consumer?: any, indent?: any) =>
      materials
        .filter((material?: any) => (material.consumers || []).includes(consumer))
        .map((material?: any) => {
          used_materials.add(material.name)
          return { ...material, indent }
        })
    const ordered: any = []
    finished_goods.forEach((fg?: any) => {
      ordered.push(fg)
      const children = [
        ...sub_assemblies.filter((sub?: any) => sub.parent_row === fg.name).map((sub?: any) => ({ ...sub, indent: 1 })),
        ...materials_for(fg.name, 1),
      ].sort(by_start)
      children.forEach((child?: any) => {
        ordered.push(child)
        if (child.row_type !== 'Raw Material') {
          ordered.push(...materials_for(child.name, 2))
        }
      })
    })
    sub_assemblies
      .filter((sub?: any) => !finished_goods.some((fg?: any) => fg.name === sub.parent_row))
      .forEach((sub?: any) => {
        ordered.push(sub)
        ordered.push(...materials_for(sub.name, 1))
      })
    ordered.push(...materials.filter((material?: any) => !used_materials.has(material.name)))
    return ordered
  },
  get_preview_row_html(row?: any) {
    const workstations: any = [...new Set(row.blocks.map((block?: any) => block.workstation).filter(Boolean))]
    const is_fg = row.row_type === 'Finished Good'
    const is_material = row.row_type === 'Raw Material'
    const indent_html = row.indent
      ? `<span class="sub-indent" style="margin-left: ${(row.indent - 1) * 20}px">↳</span>`
      : ''
    const item = `${indent_html}
			<span class="${is_fg ? 'item-fg' : ''}${is_material ? ' text-muted' : ''}">${frappe.utils.escape_html(row.item_code)}</span>`
    const procurement_label = row.supplier
      ? __('Procurement ({0})', [frappe.utils.escape_html(row.supplier)])
      : __('Procurement')
    const detail = is_material
      ? `<span class="text-muted">${procurement_label}</span>`
      : frappe.utils.escape_html(workstations.join(', ') || row.supplier || '-')
    const starts_in = schedule_starts_in(row.start)
    return `<tr>
			<td class="item-cell">${item}</td>
			<td class="text-muted">${detail}</td>
			<td>${format_schedule_date(row.start)}</td>
			<td>${format_schedule_date(row.end)}</td>
			<td class="starts-in">
				<span class="starts-in-pill ${starts_in.color}">${starts_in.label}</span>
			</td>
		</tr>`
  },
  get_preview_summary_html(proposal?: any, ordered?: any) {
    const starts = ordered.map((row?: any) => row.start).sort()
    const total = starts.length ? schedule_duration_label(starts[0], proposal.completion_date) : '-'
    return `<div class="schedule-preview-summary">
			<div class="summary-block">
				<div class="summary-label">${__('Expected Completion')}</div>
				<div class="summary-value">${format_schedule_date(proposal.completion_date)}</div>
			</div>
			<div class="summary-block">
				<div class="summary-label">${__('Total Duration')}</div>
				<div class="summary-value">${total}</div>
			</div>
			<div class="summary-block">
				<div class="summary-label">${__('Items')}</div>
				<div class="summary-value">${Object.keys(proposal.rows || {}).length}</div>
			</div>
		</div>`
  },
  get_preview_styles() {
    return `<style>
			.schedule-preview-summary { display: flex; gap: 12px; margin-bottom: 12px; }
			.schedule-preview-summary .summary-block {
				flex: 1; background-color: var(--bg-color); border: 1px solid var(--border-color);
				border-radius: var(--border-radius-md); padding: 8px 12px;
			}
			.schedule-preview-summary .summary-label { font-size: var(--text-sm); color: var(--text-muted); }
			.schedule-preview-summary .summary-value { font-weight: 600; margin-top: 2px; }
			.schedule-preview-warning {
				background-color: var(--bg-red); color: var(--text-on-red);
				border-radius: var(--border-radius-md); padding: 8px 12px; margin-bottom: 12px;
				font-size: var(--text-sm);
			}
			.schedule-preview-table-wrapper { max-height: 55vh; overflow-y: auto; }
			.schedule-preview-table th { position: sticky; top: 0; background-color: var(--fg-color); }
			.schedule-preview-table td, .schedule-preview-table th { padding: 8px 10px; }
			.schedule-preview-table .item-cell .item-fg { font-weight: 600; }
			.schedule-preview-table .sub-indent { color: var(--text-muted); margin: 0 4px 0 12px; }
			.schedule-preview-table .indicator-pill { margin-left: 6px; }
			.schedule-preview-table .starts-in { white-space: nowrap; }
			.starts-in-pill {
				display: inline-block; padding: 2px 10px; border-radius: 999px;
				font-size: var(--text-sm); font-weight: 500;
			}
			.starts-in-pill.green { background-color: var(--bg-green); color: var(--text-on-green); }
			.starts-in-pill.orange { background-color: var(--bg-orange); color: var(--text-on-orange); }
			.starts-in-pill.gray { background-color: var(--bg-gray); color: var(--text-on-gray); }
		</style>`
  },
  apply_schedule(frm?: any, args?: any) {
    frappe.call({
      method: 'erpnext.manufacturing.scheduling.plan_adapter.apply_schedule',
      args: args,
      freeze: true,
      freeze_message: __('Applying Schedule...'),
      callback: (r?: any) => {
        if (!r.exc) {
          frappe.show_alert({
            message: __('Schedule applied. Expected completion on {0}', [
              frappe.datetime.str_to_user(r.message.completion_date),
            ]),
            indicator: 'green',
          })
          frm.reload_doc()
        }
      },
    })
  },
  get_items_for_work_order(frm?: any) {
    let items = frm.doc.po_items
    if (frm.doc.sub_assembly_items?.length) {
      items = [...items, ...frm.doc.sub_assembly_items]
    }
    const has_items =
      items.filter((item?: any) => {
        const reference_field =
          item.doctype === 'Production Plan Item' ? 'production_plan_item' : 'production_plan_sub_assembly_item'
        const pending_qty = frm.doc.__onload?.pending_work_order_qty?.[reference_field]?.[item.name]
        if (pending_qty !== undefined) {
          return pending_qty > 0
        }
        if (item.planned_qty) {
          return item.planned_qty > item.ordered_qty
        } else {
          return item.qty > (item.received_qty || item.ordered_qty)
        }
      }) || []
    return has_items
  },
  has_unreserved_stock(frm?: any, table?: any, qty_field: any = 'required_qty') {
    const has_unreserved_stock = frm.doc[table].some(
      (item?: any) => flt(item[qty_field]) > flt(item.stock_reserved_qty),
    )
    return has_unreserved_stock
  },
  has_reserved_stock(frm?: any, table?: any) {
    const has_reserved_stock = frm.doc[table].some((item?: any) => flt(item.stock_reserved_qty) > 0)
    return has_reserved_stock
  },
  setup_stock_reservation_for_sub_assembly(frm?: any) {
    if (frm.doc.docstatus === 1 && frm.doc.reserve_stock) {
      if (frm.events.has_unreserved_stock(frm, 'sub_assembly_items')) {
        frm.add_custom_button(
          __('Reserve for Sub-assembly'),
          () => erpnext.stock_reservation.make_entries(frm, 'sub_assembly_items'),
          __('Stock Reservation'),
        )
      }
      if (frm.events.has_reserved_stock(frm, 'sub_assembly_items')) {
        frm.add_custom_button(
          __('Unreserve for Sub-assembly'),
          () => erpnext.stock_reservation.unreserve_stock(frm),
          __('Stock Reservation'),
        )
        frm.add_custom_button(
          __('Reserved Stock for Sub-assembly'),
          () => erpnext.stock_reservation.show_reserved_stock(frm, 'sub_assembly_items'),
          __('Stock Reservation'),
        )
      }
    }
  },
  setup_stock_reservation_for_raw_materials(frm?: any) {
    if (frm.doc.docstatus === 1 && frm.doc.reserve_stock) {
      if (frm.events.has_unreserved_stock(frm, 'mr_items', 'required_bom_qty')) {
        frm.add_custom_button(
          __('Reserve for Raw Materials'),
          () => erpnext.stock_reservation.make_entries(frm, 'mr_items'),
          __('Stock Reservation'),
        )
      }
      if (frm.events.has_reserved_stock(frm, 'mr_items')) {
        frm.add_custom_button(
          __('Unreserve for Raw Materials'),
          () => erpnext.stock_reservation.unreserve_stock(frm),
          __('Stock Reservation'),
        )
        frm.add_custom_button(
          __('Reserved Stock for Raw Materials'),
          () => erpnext.stock_reservation.show_reserved_stock(frm, 'mr_items'),
          __('Stock Reservation'),
        )
      }
    }
  },
  close_open_production_plan(frm?: any, close: any = false) {
    frappe.call({
      method: 'set_status',
      freeze: true,
      doc: frm.doc,
      args: { close: close, update_bin: true },
      callback: function () {
        frm.reload_doc()
      },
    })
  },
  make_work_order(frm?: any) {
    frappe.call({
      method: 'make_work_order',
      freeze: true,
      doc: frm.doc,
      callback: function () {
        frm.reload_doc()
      },
    })
  },
  make_material_request(frm?: any) {
    frappe.confirm(
      __('Do you want to submit the material request'),
      function () {
        frm.events.create_material_request(frm, 1)
      },
      function () {
        frm.events.create_material_request(frm, 0)
      },
    )
  },
  create_material_request(frm?: any, submit?: any) {
    frm.doc.submit_material_request = submit
    frappe.call({
      method: 'make_material_request',
      freeze: true,
      doc: frm.doc,
      callback: function () {
        frm.reload_doc()
      },
    })
  },
  get_sales_orders(frm?: any) {
    frappe.call({
      method: 'get_open_sales_orders',
      doc: frm.doc,
      callback: function () {
        refresh_field('sales_orders')
      },
    })
  },
  get_material_request(frm?: any) {
    frappe.call({
      method: 'get_pending_material_requests',
      doc: frm.doc,
      callback: function () {
        refresh_field('material_requests')
      },
    })
  },
  get_items(frm?: any) {
    frm.clear_table('prod_plan_references')
    frappe.call({
      method: 'get_items',
      freeze: true,
      doc: frm.doc,
      callback: function () {
        refresh_field('po_items')
      },
    })
  },
  combine_items(frm?: any) {
    frm.clear_table('prod_plan_references')
    frappe.call({
      method: 'combine_so_items',
      freeze: true,
      doc: frm.doc,
      callback: function () {
        frm.refresh_field('po_items')
        if (frm.doc.sub_assembly_items.length > 0) {
          frm.trigger('get_sub_assembly_items')
        }
      },
    })
  },
  combine_sub_items(frm?: any) {
    if (frm.doc.sub_assembly_items.length > 0) {
      frm.clear_table('sub_assembly_items')
      frm.trigger('get_sub_assembly_items')
    }
  },
  get_sub_assembly_items(frm?: any) {
    frm.dirty()
    frappe.call({
      method: 'get_sub_assembly_items',
      freeze: true,
      doc: frm.doc,
      callback: function () {
        refresh_field('sub_assembly_items')
      },
    })
  },
  toggle_for_warehouse(frm?: any) {
    frm.toggle_reqd('for_warehouse', true)
  },
  get_items_for_mr(frm?: any) {
    if (!frm.doc.for_warehouse) {
      frm.trigger('toggle_for_warehouse')
      frappe.throw(__('Select the Warehouse'))
    }
    frm.events.get_items_for_material_requests(frm, [
      {
        warehouse: frm.doc.for_warehouse,
      },
    ])
  },
  transfer_materials(frm?: any) {
    let dialog: any
    if (!frm.doc.for_warehouse) {
      frm.trigger('toggle_for_warehouse')
      frappe.throw(__('Select the Warehouse'))
    }
    if (!frm.doc.ignore_existing_ordered_qty) {
      frm.events.get_items_for_material_requests(frm)
    } else {
      const title = __('Transfer Materials For Warehouse {0}', [frm.doc.for_warehouse])
      const source_warehouse = frm.doc.raw_material_group_warehouse
      dialog = new frappe.ui.Dialog({
        title: title,
        fields: [
          {
            label: __('Transfer From Warehouses'),
            fieldtype: 'Table MultiSelect',
            fieldname: 'warehouses',
            options: 'Production Plan Material Request Warehouse',
            default: source_warehouse ? [{ warehouse: source_warehouse }] : [],
            get_query: function () {
              return {
                filters: {
                  company: frm.doc.company,
                },
              }
            },
          },
          {
            label: __('For Warehouse'),
            fieldtype: 'Link',
            fieldname: 'target_warehouse',
            read_only: true,
            default: frm.doc.for_warehouse,
          },
        ],
      })
      dialog.show()
      dialog.set_primary_action(__('Get Items'), () => {
        const warehouses = dialog.get_values().warehouses
        frm.events.get_items_for_material_requests(frm, warehouses)
        dialog.hide()
      })
    }
  },
  get_items_for_material_requests(frm?: any, warehouses?: any) {
    frappe.call({
      method: 'erpnext.manufacturing.doctype.production_plan.production_plan.get_items_for_material_requests',
      freeze: true,
      args: {
        doc: frm.doc,
        warehouses: warehouses || [],
      },
      callback: function (r?: any) {
        if (r.message) {
          frm.set_value('mr_items', [])
          r.message.forEach((row?: any) => {
            const d = frm.add_child('mr_items')
            for (const field in row) {
              if (field !== 'name') {
                d[field] = row[field]
              }
            }
          })
        }
        refresh_field('mr_items')
      },
    })
  },
  download_materials_required(frm?: any) {
    const warehouses_data: any = []
    const availability_warehouse = frm.doc.raw_material_group_warehouse || frm.doc.for_warehouse
    if (availability_warehouse) {
      warehouses_data.push({ warehouse: availability_warehouse })
    }
    const fields: any = [
      {
        fieldname: 'warehouses',
        fieldtype: 'Table MultiSelect',
        label: __('Warehouses'),
        default: warehouses_data,
        options: 'Production Plan Material Request Warehouse',
        reqd: 1,
        get_query: function () {
          return {
            filters: {
              company: frm.doc.company,
            },
          }
        },
      },
    ]
    frappe.prompt(
      fields,
      (row?: any) => {
        const get_template_url = 'erpnext.manufacturing.doctype.production_plan.production_plan.download_raw_materials'
        open_url_post(frappe.request.url, {
          cmd: get_template_url,
          doc: frm.doc,
          warehouses: row.warehouses,
        })
      },
      __('Select Warehouses to get Stock for Materials Planning'),
      __('Get Stock'),
    )
  },
  show_progress(frm?: any) {
    const bars: any = []
    let message = ''
    let title = ''
    const item_wise_qty: any = {}
    frm.doc.po_items.forEach((data?: any) => {
      if (!item_wise_qty[data.item_code]) {
        item_wise_qty[data.item_code] = data.produced_qty
      } else {
        item_wise_qty[data.item_code] += data.produced_qty
      }
    })
    if (item_wise_qty) {
      for (const key in item_wise_qty) {
        title += __('Item {0}: {1} qty produced. ', [key, item_wise_qty[key]])
      }
    }
    bars.push({
      title: title,
      width: (frm.doc.total_produced_qty / frm.doc.total_planned_qty) * 100 + '%',
      progress_class: 'progress-bar-success',
    })
    if (bars[0].width == '0%') {
      bars[0].width = '0.5%'
    }
    message = title
    frm.dashboard.add_progress(__('Status'), bars, message)
  },
})
frappe.ui.form.on('Production Plan Item', {
  item_code(_frm?: any, cdt?: any, cdn?: any) {
    const row = locals[cdt][cdn]
    if (row.item_code) {
      frappe.call({
        method: 'erpnext.manufacturing.doctype.production_plan.production_plan.get_item_data',
        args: {
          item_code: row.item_code,
        },
        callback: function (r?: any) {
          for (const key in r.message) {
            frappe.model.set_value(cdt, cdn, key, r.message[key])
          }
        },
      })
    }
  },
})
frappe.ui.form.on('Material Request Plan Item', {
  warehouse(frm?: any, cdt?: any, cdn?: any) {
    const row = locals[cdt][cdn]
    if (row.warehouse && row.item_code && frm.doc.company) {
      frappe.call({
        method: 'erpnext.manufacturing.doctype.production_plan.production_plan.get_bin_details',
        args: {
          row: row,
          company: frm.doc.company,
          for_warehouse: row.warehouse,
        },
        callback: function (r?: any) {
          if (r.message) {
            const { projected_qty, actual_qty } = r.message[0]
            frappe.model.set_value(cdt, cdn, {
              projected_qty: projected_qty,
              actual_qty: actual_qty,
            })
          }
        },
      })
    }
  },
  material_request_type(_frm?: any, cdt?: any, cdn?: any) {
    const row = locals[cdt][cdn]
    if (row.from_warehouse && row.material_request_type !== 'Material Transfer') {
      frappe.model.set_value(cdt, cdn, 'from_warehouse', '')
    }
  },
})
frappe.ui.form.on('Production Plan Sales Order', {
  sales_order(frm?: any, cdt?: any, cdn?: any) {
    const row = locals[cdt][cdn]
    const sales_order = row.sales_order
    if (!sales_order) {
      return
    }
    if (row.sales_order) {
      frm.call({
        method: 'validate_sales_orders',
        doc: frm.doc,
        args: {
          sales_order: row.sales_order,
        },
        callback() {
          frappe.call({
            method: 'erpnext.manufacturing.doctype.production_plan.production_plan.get_so_details',
            args: { sales_order },
            callback(r?: any) {
              const { transaction_date, customer, grand_total } = r.message
              frappe.model.set_value(cdt, cdn, 'sales_order_date', transaction_date)
              frappe.model.set_value(cdt, cdn, 'customer', customer)
              frappe.model.set_value(cdt, cdn, 'grand_total', grand_total)
            },
          })
        },
      })
    }
  },
})
frappe.ui.form.on('Production Plan Sub Assembly Item', {
  fg_warehouse(frm?: any, cdt?: any, cdn?: any) {
    erpnext.utils.copy_value_in_all_rows(frm.doc, cdt, cdn, 'sub_assembly_items', 'fg_warehouse')
    const row = locals[cdt][cdn]
    if (row.fg_warehouse && row.production_item) {
      const child_row: any = {
        item_code: row.production_item,
        warehouse: row.fg_warehouse,
      }
      frappe.call({
        method: 'erpnext.manufacturing.doctype.production_plan.production_plan.get_bin_details',
        args: {
          row: child_row,
          company: frm.doc.company,
          for_warehouse: row.fg_warehouse,
        },
        callback: function (r?: any) {
          if (r.message && r.message.length) {
            frappe.model.set_value(cdt, cdn, 'actual_qty', r.message[0].actual_qty)
            frappe.model.set_value(cdt, cdn, 'projected_qty', r.message[0].projected_qty)
          }
        },
      })
    }
  },
})
frappe.tour['Production Plan'] = [
  {
    fieldname: 'get_items_from',
    title: 'Get Items From',
    description: __(
      'Select whether to get items from a Sales Order or a Material Request. For now select <b>Sales Order</b>.\n A Production Plan can also be created manually where you can select the Items to manufacture.',
    ),
  },
  {
    fieldname: 'get_sales_orders',
    title: 'Get Sales Orders',
    description: __('Click on Get Sales Orders to fetch sales orders based on the above filters.'),
  },
  {
    fieldname: 'get_items',
    title: 'Get Finished Goods for Manufacture',
    description: __(
      "Click on 'Get Finished Goods for Manufacture' to fetch the items from the above Sales Orders. Items only for which a BOM is present will be fetched.",
    ),
  },
  {
    fieldname: 'po_items',
    title: 'Finished Goods',
    description: __(
      "On expanding a row in the Items to Manufacture table, you'll see an option to 'Include Exploded Items'. Ticking this includes raw materials of the sub-assembly items in the production process.",
    ),
  },
  {
    fieldname: 'include_non_stock_items',
    title: 'Include Non Stock Items',
    description: __(
      "To include non-stock items in the material request planning. i.e. Items for which 'Maintain Stock' checkbox is unticked.",
    ),
  },
  {
    fieldname: 'include_subcontracted_items',
    title: 'Include Subcontracted Items',
    description: __("To add subcontracted Item's raw materials if include exploded items is disabled."),
  },
]
function format_schedule_date(value?: any) {
  if (!value) {
    return '-'
  }
  return moment(value).format('Do MMMM YYYY, h:mm A')
}
function schedule_duration_parts(total_mins?: any) {
  const days = Math.floor(total_mins / 1440)
  const hours = Math.floor((total_mins % 1440) / 60)
  const minutes = Math.round(total_mins % 60)
  const parts: any = []
  if (days) parts.push(__('{0}d', [days]))
  if (hours) parts.push(__('{0}h', [hours]))
  if (!days && minutes) parts.push(__('{0}m', [minutes]))
  return parts.join(' ')
}
function schedule_starts_in(start?: any) {
  const mins = moment(start).diff(moment(), 'minutes')
  if (mins <= 0) {
    return { label: moment(start).fromNow(), color: 'gray' }
  }
  return {
    label: __('in {0}', [schedule_duration_parts(mins) || __('a moment')]),
    color: mins >= 1440 ? 'green' : 'orange',
  }
}
function schedule_duration_label(from_time?: any, to_time?: any) {
  const mins = moment(to_time).diff(moment(from_time), 'minutes')
  return schedule_duration_parts(Math.max(mins, 0)) || '-'
}
