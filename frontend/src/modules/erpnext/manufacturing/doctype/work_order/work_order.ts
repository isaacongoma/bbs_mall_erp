import { $, __, cstr, erpnext, flt, frappe, locals, precision, refresh_field } from '@/shared/frappe'
frappe.ui.form.on('Work Order', {
  setup: function (frm?: any) {
    frm.custom_make_buttons = {
      'Stock Entry': 'Start',
      'Pick List': 'Pick List',
      'Job Card': 'Create Job Card',
    }
    frm.ignore_doctypes_on_cancel_all = ['Serial and Batch Bundle']
    frm.events.set_company_filters(frm, 'wip_warehouse')
    frm.events.set_company_filters(frm, 'source_warehouse')
    frm.events.set_company_filters(frm, 'fg_warehouse')
    frm.events.set_company_filters(frm, 'scrap_warehouse')
    frm.set_query('source_warehouse', 'required_items', function () {
      return {
        filters: {
          company: frm.doc.company,
        },
      }
    })
    frm.set_query('sales_order', function () {
      return {
        filters: {
          status: ['not in', ['Closed', 'On Hold']],
        },
      }
    })
    frm.set_query('bom_no', function () {
      if (frm.doc.production_item) {
        return {
          query: 'erpnext.controllers.queries.bom',
          filters: { item: cstr(frm.doc.production_item) },
        }
      } else {
        frappe.msgprint(__('Please enter Production Item first'))
      }
    })
    frm.set_query('production_item', function () {
      return {
        query: 'erpnext.controllers.queries.item_query',
        filters: {
          is_stock_item: 1,
        },
      }
    })
    frm.set_query('project', function () {
      return {
        filters: [['Project', 'status', 'not in', 'Completed, Cancelled']],
      }
    })
    frm.set_query('operation', 'required_items', function () {
      return {
        query: 'erpnext.manufacturing.doctype.work_order.work_order.get_bom_operations',
        filters: {
          parent: frm.doc.bom_no,
          parenttype: 'BOM',
        },
      }
    })
    frm.set_query('sales_order', function () {
      if (frm.doc.production_item) {
        return {
          query: 'erpnext.manufacturing.doctype.work_order.work_order.query_sales_order',
          filters: {
            production_item: frm.doc.production_item,
          },
        }
      }
    })
    frm.set_indicator_formatter('operation', function (doc?: any) {
      return frm.doc.qty == doc.completed_qty ? 'green' : 'orange'
    })
    frm.fields_dict['non_stock_items'].grid.set_column_disp_in_list_view('secondary_item_type', false)
    frm.fields_dict['secondary_items'].grid.set_column_disp_in_list_view('rate', false)
  },
  set_company_filters(frm?: any, fieldname?: any) {
    frm.set_query(fieldname, () => {
      return {
        filters: {
          company: frm.doc.company,
        },
      }
    })
  },
  onload: function (frm?: any) {
    if (!frm.doc.status) frm.doc.status = 'Draft'
    frm.add_fetch('sales_order', 'project', 'project')
    if (frm.doc.__islocal) {
      frm.set_value({
        actual_start_date: '',
        actual_end_date: '',
      })
      erpnext.work_order.set_default_warehouse(frm)
    }
    if (frm.doc.docstatus == 0 && frm.doc.bom_no) {
      frappe.call({
        method: 'erpnext.manufacturing.doctype.work_order.work_order.check_if_scrap_warehouse_mandatory',
        args: {
          bom_no: frm.doc.bom_no,
        },
        callback: function (r?: any) {
          if (r.message['set_scrap_wh_mandatory']) {
            frm.toggle_reqd('scrap_warehouse', true)
          }
        },
      })
    }
  },
  onload_post_render(frm?: any) {
    const label = frm.doc.__onload?.secondary_items_generated
      ? __('Secondary Items (as per Manufacture Entries)')
      : __('Secondary Items (as per BOM)')
    frm.set_df_property('secondary_items', 'label', label)
    frm.fields_dict['secondary_items'].grid.wrapper?.find('> .control-label').text(label)
  },
  company: function (frm?: any) {
    erpnext.work_order.set_default_warehouse(frm)
  },
  source_warehouse: function (frm?: any) {
    const transaction_controller = new erpnext.TransactionController()
    transaction_controller.autofill_warehouse(frm.doc.required_items, 'source_warehouse', frm.doc.source_warehouse)
  },
  allow_alternative_item: function (frm?: any) {
    let has_alternative = false
    if (frm.doc.required_items) {
      has_alternative = frm.doc.required_items.find((i?: any) => i.allow_alternative_item === 1)
    }
    if (frm.doc.allow_alternative_item && frm.doc.docstatus === 0 && has_alternative) {
      frm.add_custom_button(__('Alternate Item'), () => {
        erpnext.utils.select_alternate_items({
          frm: frm,
          child_docname: 'required_items',
          warehouse_field: 'source_warehouse',
          child_doctype: 'Work Order Item',
          original_item_field: 'original_item',
          condition: (d?: any) => {
            if (d.allow_alternative_item) {
              return true
            }
          },
        })
      })
    } else {
      frm.remove_custom_button(__('Alternate Item'))
    }
  },
  refresh: function (frm?: any) {
    erpnext.toggle_naming_series(frm)
    erpnext.work_order.set_custom_buttons(frm)
    frm.set_intro('')
    frm.toggle_enable('use_multi_level_bom', !frm.doc.track_semi_finished_goods)
    if (frm.doc.docstatus === 0 && !frm.is_new()) {
      frm.set_intro(__('Submit this Work Order for further processing.'))
    } else {
      frm.trigger('show_progress_for_items')
      frm.trigger('show_progress_for_operations')
    }
    if (frm.doc.status != 'Closed') {
      if (
        frm.doc.docstatus === 1 &&
        frm.doc.status !== 'Completed' &&
        frm.doc.operations &&
        frm.doc.operations.length
      ) {
        if (frm.doc.__onload?.show_create_job_card_button) {
          frm.add_custom_button(
            __('Create Job Card'),
            () => {
              frm.trigger('make_job_card')
            },
            __('Create'),
          )
        }
      }
    }
    const pending_ops = frm.doc?.operations?.filter((op?: any) => op.completed_qty < frm.doc.qty)
    if (frm.doc.docstatus === 1 && frm.doc.status !== 'Closed' && pending_ops && pending_ops.length > 0) {
      frm.add_custom_button(__('Operator Dashboard'), () => {
        frappe.route_options = { work_order: frm.doc.name }
        frappe.set_route('shop-floor')
      })
    }
    erpnext.work_order.add_start_button(frm)
    if (frm.doc.status == 'Completed') {
      if (frm.doc.__onload.backflush_raw_materials_based_on == 'Material Transferred for Manufacture') {
        frm.add_custom_button(
          __('BOM'),
          () => {
            frm.trigger('make_bom')
          },
          __('Create'),
        )
      }
    }
    if (
      frm.doc.docstatus === 1 &&
      ['Closed', 'Completed'].includes(frm.doc.status) &&
      frm.doc.produced_qty > 0 &&
      frm.doc.produced_qty > frm.doc.disassembled_qty
    ) {
      frm.add_custom_button(
        __('Disassemble Order'),
        () => {
          frm.trigger('make_disassembly_order')
        },
        __('Create'),
      )
    }
    frm.trigger('add_custom_button_to_return_components')
    frm.trigger('add_change_finished_item_button')
    frm.trigger('allow_alternative_item')
    frm.trigger('hide_reserve_stock_button')
    frm.trigger('toggle_items_editable')
    frm.trigger('set_fg_warehouse_mandatory')
    frm.trigger('toggle_hide_fields')
    erpnext.work_order.render_linked_lists(frm)
  },
  on_tab_change(frm?: any) {
    frm.wo_linked_lists && frm.wo_linked_lists.load_active_tab()
  },
  toggle_hide_fields(frm?: any) {
    frm.toggle_display('operations', frm.doc?.operations && frm.doc.operations.length > 0)
  },
  skip_transfer(frm?: any) {
    frm.trigger('set_fg_warehouse_mandatory')
  },
  toggle_items_editable(frm?: any) {
    let allow_edit = true
    if (!frm.doc.__onload?.allow_editing_items) allow_edit = false
    frm.set_df_property('required_items', 'cannot_delete_rows', !allow_edit)
    frm.set_df_property('required_items', 'cannot_add_rows', !allow_edit)
    const grid = frm.fields_dict['required_items'].grid
    grid.update_docfield_property('item_code', 'read_only', !allow_edit)
    grid.update_docfield_property('required_qty', 'read_only', !allow_edit)
    grid.refresh()
  },
  hide_reserve_stock_button(frm?: any) {
    frm.toggle_display('reserve_stock', false)
    if (frm.doc.__onload?.enable_stock_reservation) {
      frm.toggle_display('reserve_stock', true)
    }
  },
  has_unreserved_stock(frm?: any) {
    const has_unreserved_stock = frm.doc.required_items.some(
      (item?: any) => flt(item.required_qty) > flt(item.stock_reserved_qty),
    )
    return has_unreserved_stock
  },
  has_reserved_stock(frm?: any) {
    const has_reserved_stock = frm.doc.required_items.some((item?: any) => flt(item.stock_reserved_qty) > 0)
    return has_reserved_stock
  },
  set_fg_warehouse_mandatory(frm?: any) {
    const mandatory = frm.doc.skip_transfer === 1 || frm.doc.track_semi_finished_goods === 1 ? false : true
    frm.toggle_reqd('fg_warehouse', mandatory)
  },
  add_custom_button_to_return_components: function (frm?: any) {
    if (frm.doc.docstatus === 1 && ['Closed', 'Completed'].includes(frm.doc.status)) {
      const non_consumed_items = frm.doc.required_items.filter((d?: any) => {
        return flt(d.consumed_qty) < flt(d.transferred_qty - d.returned_qty)
      })
      if (non_consumed_items && non_consumed_items.length) {
        frm.add_custom_button(__('Return Components'), function () {
          frm.trigger('create_stock_return_entry')
        })
      }
    }
  },
  add_change_finished_item_button: function (frm?: any) {
    if (
      frm.doc.docstatus !== 1 ||
      ['Stopped', 'Closed'].includes(frm.doc.status) ||
      !frm.doc.__onload?.allow_alternative_finished_goods ||
      !frm.doc.__onload?.has_alternative_finished_goods ||
      !flt(frm.doc.produced_qty)
    ) {
      return
    }
    frm.add_custom_button(__('Change Finished Item'), () => {
      frm.trigger('change_finished_item')
    })
  },
  change_finished_item: function (frm?: any) {
    frappe.call({
      method: 'erpnext.manufacturing.doctype.work_order.mapper.get_fg_conversion_details',
      args: { work_order: frm.doc.name },
      callback: function (r?: any) {
        if (!r.message.alternative_items.length) {
          frappe.msgprint(
            __('Please create Item Alternative records for the item {0} to change the finished item.', [
              frappe.utils.get_form_link('Item', frm.doc.production_item, true),
            ]),
          )
          return
        }
        if (!flt(r.message.available_qty)) {
          frappe.msgprint(
            __('The produced qty of the item {0} has already been converted in full.', [
              frm.doc.production_item.bold(),
            ]),
          )
          return
        }
        frm.events.show_change_finished_item_dialog(frm, r.message)
      },
    })
  },
  show_change_finished_item_dialog: function (frm: any, { alternative_items, available_qty }: any) {
    const dialog = new frappe.ui.Dialog({
      title: __('Change Finished Item'),
      fields: [
        {
          fieldtype: 'Link',
          fieldname: 'item_code',
          label: __('Actual Finished Item'),
          options: 'Item',
          reqd: 1,
          default: alternative_items.length === 1 ? alternative_items[0] : undefined,
          get_query: () => {
            return { filters: { name: ['in', alternative_items] } }
          },
        },
        {
          fieldtype: 'Float',
          fieldname: 'qty',
          label: __('Qty to Convert'),
          reqd: 1,
          default: available_qty,
          description: __('Available produced qty of the item {0} is {1}.', [
            frm.doc.production_item.bold(),
            cstr(available_qty).bold(),
          ]),
        },
      ],
      primary_action_label: __('Create Stock Entry'),
      primary_action: (values?: any) => {
        dialog.hide()
        frappe.call({
          method: 'erpnext.manufacturing.doctype.work_order.mapper.make_fg_conversion_entry',
          args: {
            work_order: frm.doc.name,
            item_code: values.item_code,
            qty: values.qty,
          },
          callback: function (r?: any) {
            if (!r.exc) {
              const doc = frappe.model.sync(r.message)
              frappe.set_route('Form', doc[0].doctype, doc[0].name)
            }
          },
        })
      },
    })
    dialog.show()
  },
  create_stock_return_entry: function (frm?: any) {
    frappe.call({
      method: 'erpnext.manufacturing.doctype.work_order.mapper.make_stock_return_entry',
      args: {
        work_order: frm.doc.name,
      },
      callback: function (r?: any) {
        if (!r.exc) {
          const doc = frappe.model.sync(r.message)
          frappe.set_route('Form', doc[0].doctype, doc[0].name)
        }
      },
    })
  },
  make_job_card: function (frm?: any) {
    const operations_data: any = []
    const dialog = frappe.prompt(
      {
        fieldname: 'operations',
        fieldtype: 'Table',
        label: __('Operations'),
        fields: [
          {
            fieldtype: 'Link',
            fieldname: 'operation',
            label: __('Operation'),
            read_only: 1,
            in_list_view: 1,
          },
          {
            fieldtype: 'Link',
            fieldname: 'workstation',
            label: __('Workstation'),
            read_only: 1,
            in_list_view: 1,
          },
          {
            fieldtype: 'Data',
            fieldname: 'name',
            label: __('Operation ID'),
          },
          {
            fieldtype: 'Float',
            fieldname: 'pending_qty',
            label: __('Pending Qty'),
          },
          {
            fieldtype: 'Float',
            fieldname: 'qty',
            label: __('Quantity to Manufacture'),
            read_only: 0,
            in_list_view: 1,
          },
          {
            fieldtype: 'Float',
            fieldname: 'batch_size',
            label: __('Batch Size'),
            read_only: 1,
          },
          {
            fieldtype: 'Int',
            fieldname: 'sequence_id',
            label: __('Sequence Id'),
            read_only: 1,
          },
          {
            fieldtype: 'Check',
            fieldname: 'skip_material_transfer',
            label: __('Skip Material Transfer'),
            read_only: 1,
          },
          {
            fieldtype: 'Check',
            fieldname: 'backflush_from_wip_warehouse',
            label: __('Backflush Materials From WIP Warehouse'),
            read_only: 1,
          },
        ],
        data: operations_data,
        in_place_edit: true,
        get_data: function () {
          return operations_data
        },
      },
      function () {
        const selected_rows = dialog.fields_dict['operations'].grid.get_selected_children()
        if (selected_rows.length == 0) {
          frappe.msgprint(__('Please select at least one operation to create Job Card'))
          return
        }
        frappe.call({
          method: 'erpnext.manufacturing.doctype.work_order.work_order.make_job_card',
          freeze: true,
          args: {
            work_order: frm.doc.name,
            operations: selected_rows,
            parent_bom: frm.doc.bom_no,
          },
          callback: function () {
            frm.reload_doc()
          },
        })
      },
      __('Job Card'),
      __('Create'),
    )
    dialog.fields_dict['operations'].grid.grid_buttons.hide()
    let pending_qty = 0
    frm.doc.operations.forEach((data?: any) => {
      if (data.completed_qty + data.process_loss_qty != frm.doc.qty) {
        pending_qty = frm.doc.qty - flt(data.completed_qty) - flt(data.process_loss_qty)
        if (pending_qty) {
          dialog.fields_dict.operations.df.data.push({
            __checked: 1,
            name: data.name,
            operation: data.operation,
            workstation: data.workstation,
            batch_size: data.batch_size,
            qty: pending_qty,
            pending_qty: pending_qty,
            sequence_id: data.sequence_id,
            skip_material_transfer: data.skip_material_transfer,
            backflush_from_wip_warehouse: data.backflush_from_wip_warehouse,
            time_in_mins: data.time_in_mins,
          })
        }
      }
    })
    dialog.fields_dict.operations.grid.refresh()
  },
  make_bom: function (frm?: any) {
    frappe.call({
      method: 'make_bom',
      doc: frm.doc,
      callback: function (r?: any) {
        let doc: any
        if (r.message) {
          doc = frappe.model.sync(r.message)[0]
          frappe.set_route('Form', doc.doctype, doc.name)
        }
      },
    })
  },
  make_disassembly_order(frm?: any) {
    erpnext.work_order
      .show_disassembly_prompt(frm)
      .then((data?: any) => {
        if (flt(data.qty) <= 0) {
          frappe.msgprint(__('Disassemble Qty cannot be less than or equal to <b>0</b>.'))
          return
        }
        return frappe.xcall('erpnext.manufacturing.doctype.work_order.mapper.make_stock_entry', {
          work_order_id: frm.doc.name,
          purpose: 'Disassemble',
          qty: data.qty,
          source_stock_entry: data.source_stock_entry,
        })
      })
      .then((stock_entry?: any) => {
        if (stock_entry) {
          frappe.model.sync(stock_entry)
          frappe.set_route('Form', stock_entry.doctype, stock_entry.name)
        }
      })
  },
  show_progress_for_items: function (frm?: any) {
    let pending_complete: any, width: any, process_loss_width: any, disassembled_width: any
    const bars: any = []
    let message = ''
    let added_min: any = false
    const produced_qty = frm.doc.produced_qty - frm.doc.disassembled_qty
    let title = __('{0} items produced', [produced_qty])
    bars.push({
      title: title,
      width: (flt(produced_qty) / frm.doc.qty) * 100 + '%',
      progress_class: 'progress-bar-success',
    })
    if (bars[0].width == '0%') {
      bars[0].width = '0.5%'
      added_min = 0.5
    }
    message = title
    if (!frm.doc.skip_transfer) {
      pending_complete =
        frm.doc.material_transferred_for_manufacturing - frm.doc.produced_qty - frm.doc.process_loss_qty
      if (pending_complete > 0) {
        width = (pending_complete / frm.doc.qty) * 100 - added_min
        title = __('{0} items in progress', [pending_complete])
        let progress_class = 'progress-bar-warning'
        if (frm.doc.status == 'Closed') {
          if (frm.doc.required_items.find((d?: any) => d.returned_qty > 0)) {
            title = __('{0} items returned', [pending_complete])
            progress_class = 'progress-bar-warning'
          } else {
            title = __('{0} items to return', [pending_complete])
            progress_class = 'progress-bar-info'
          }
        }
        bars.push({
          title: title,
          width: (width > 100 ? '99.5' : width) + '%',
          progress_class: progress_class,
        })
        message = message + '. ' + title
      }
    }
    if (frm.doc.process_loss_qty) {
      process_loss_width = (frm.doc.process_loss_qty / frm.doc.qty) * 100
      title = __('{0} items lost during process.', [frm.doc.process_loss_qty])
      bars.push({
        title: title,
        width: process_loss_width + '%',
        progress_class: 'progress-bar-danger',
      })
      message = message + '. ' + title
    }
    if (frm.doc.disassembled_qty) {
      disassembled_width = (frm.doc.disassembled_qty / frm.doc.qty) * 100
      title = __('{0} items disassembled', [frm.doc.disassembled_qty])
      bars.push({
        title: title,
        width: disassembled_width + '%',
        progress_class: 'progress-bar-secondary',
      })
      message = message + '. ' + title
    }
    frm.dashboard.add_progress(__('Status'), bars, message)
  },
  show_progress_for_operations: function (frm?: any) {
    if (frm.doc.operations && frm.doc.operations.length) {
      const progress_class: any = {
        'Work in Progress': 'progress-bar-warning',
        Completed: 'progress-bar-success',
      }
      const bars: any = []
      let message = ''
      let title = ''
      const status_wise_oprtation_data: any = {}
      const total_completed_qty = frm.doc.qty * frm.doc.operations.length
      frm.doc.operations.forEach((d?: any) => {
        if (!status_wise_oprtation_data[d.status]) {
          status_wise_oprtation_data[d.status] = [d.completed_qty, d.operation]
        } else {
          status_wise_oprtation_data[d.status][0] += d.completed_qty
          status_wise_oprtation_data[d.status][1] += ', ' + d.operation
        }
      })
      for (const key in status_wise_oprtation_data) {
        title = __('{0} Operations: {1}', [key, status_wise_oprtation_data[key][1].bold()])
        bars.push({
          title: title,
          width: (status_wise_oprtation_data[key][0] / total_completed_qty) * 100 + '%',
          progress_class: progress_class[key],
        })
        message += title + '. '
      }
      frm.dashboard.add_progress(__('Status'), bars, message)
    }
  },
  production_item: function (frm?: any) {
    if (frm.doc.production_item) {
      frappe.call({
        method: 'erpnext.manufacturing.doctype.work_order.work_order.get_item_details',
        args: {
          item: frm.doc.production_item,
          project: frm.doc.project,
        },
        freeze: true,
        callback: function (r?: any) {
          if (r.message) {
            frm.set_value('sales_order', '')
            erpnext.in_production_item_onchange = true
            $.each(
              [
                'description',
                'stock_uom',
                'project',
                'bom_no',
                'allow_alternative_item',
                'transfer_material_against',
                'item_name',
              ],
              function (_i?: any, field?: any) {
                frm.set_value(field, r.message[field])
              },
            )
            if (r.message['set_scrap_wh_mandatory']) {
              frm.toggle_reqd('scrap_warehouse', true)
            }
            erpnext.in_production_item_onchange = false
          }
        },
      })
    }
  },
  project: function (frm?: any) {
    if (!erpnext.in_production_item_onchange && !frm.doc.bom_no) {
      frm.trigger('production_item')
    }
  },
  bom_no: function (frm?: any) {
    return frm.call({
      doc: frm.doc,
      method: 'get_items_and_operations_from_bom',
      freeze: true,
      callback: function (r?: any) {
        if (r.message['set_scrap_wh_mandatory']) {
          frm.toggle_reqd('scrap_warehouse', true)
        }
        frm.trigger('toggle_hide_fields')
      },
    })
  },
  use_multi_level_bom: function (frm?: any) {
    if (frm.doc.bom_no) {
      frm.trigger('bom_no')
    }
  },
  qty: function (frm?: any) {
    frm.trigger('bom_no')
  },
  before_submit: function (frm?: any) {
    frm.fields_dict.required_items.grid.toggle_reqd('source_warehouse', true)
    frm.toggle_reqd('transfer_material_against', frm.doc.operations && frm.doc.operations.length > 0)
  },
  additional_operating_cost: function (frm?: any) {
    erpnext.work_order.calculate_cost(frm.doc)
    erpnext.work_order.calculate_total_cost(frm)
  },
  on_submit() {
    frappe.route_hooks.after_submit = (frm?: any) => {
      frm.reload_doc()
    }
  },
})
frappe.ui.form.on('Work Order Item', {
  allow_alternative_item(frm?: any) {
    frm.trigger('allow_alternative_item')
  },
  source_warehouse: function (_frm?: any, cdt?: any, cdn?: any) {
    const row = locals[cdt][cdn]
    if (!row.item_code) {
      frappe.throw(__('Please set the Item Code first'))
    } else if (row.source_warehouse) {
      frappe.call({
        method: 'erpnext.stock.utils.get_latest_stock_qty',
        args: {
          item_code: row.item_code,
          warehouse: row.source_warehouse,
        },
        callback: function (r?: any) {
          frappe.model.set_value(row.doctype, row.name, 'available_qty_at_source_warehouse', r.message)
        },
      })
    }
  },
  item_code: function (frm?: any, cdt?: any, cdn?: any) {
    const row = locals[cdt][cdn]
    if (row.item_code) {
      frappe.call({
        method: 'erpnext.stock.doctype.item.item.get_item_details',
        args: {
          item_code: row.item_code,
          company: frm.doc.company,
        },
        callback: function (r?: any) {
          if (r.message) {
            frappe.model.set_value(cdt, cdn, {
              required_qty: row.required_qty || 1,
              item_name: r.message.item_name,
              description: r.message.description,
              source_warehouse:
                r.message.is_customer_provided_item && frm.doc.subcontracting_inward_order_item
                  ? frm.doc.source_warehouse
                  : r.message.default_warehouse,
              allow_alternative_item: r.message.allow_alternative_item,
              include_item_in_manufacturing: r.message.include_item_in_manufacturing,
            })
          }
        },
      })
    }
  },
})
frappe.ui.form.on('Work Order Operation', {
  workstation: function (frm?: any, cdt?: any, cdn?: any) {
    const d = locals[cdt][cdn]
    if (d.workstation) {
      frappe.call({
        method: 'frappe.client.get',
        args: {
          doctype: 'Workstation',
          name: d.workstation,
        },
        callback: function (data?: any) {
          frappe.model.set_value(d.doctype, d.name, 'hour_rate', data.message.hour_rate)
          erpnext.work_order.calculate_cost(frm.doc)
          erpnext.work_order.calculate_total_cost(frm)
        },
      })
    }
  },
  time_in_mins: function (frm?: any) {
    erpnext.work_order.calculate_cost(frm.doc)
    erpnext.work_order.calculate_total_cost(frm)
  },
})
erpnext.work_order = {
  set_custom_buttons: function (frm?: any) {
    let counter: any, tbl: any, tbl_lenght: any
    const doc = frm.doc
    frm.has_start_btn = false
    if (doc.docstatus === 1 && !['Closed', 'Completed'].includes(doc.status)) {
      frm.add_custom_button(
        __('Close'),
        function () {
          frappe.confirm(__('Once the Work Order is Closed, it cannot be resumed.'), () => {
            erpnext.work_order.change_work_order_status(frm, 'Closed')
          })
        },
        __('Status'),
      )
      if (doc.status != 'Stopped' && doc.status != 'Completed') {
        frm.add_custom_button(
          __('Stop'),
          function () {
            erpnext.work_order.change_work_order_status(frm, 'Stopped')
          },
          __('Status'),
        )
      } else if (doc.status == 'Stopped') {
        frm.add_custom_button(
          __('Re-open'),
          function () {
            erpnext.work_order.change_work_order_status(frm, 'Resumed')
          },
          __('Status'),
        )
      }
      if (!frm.doc.track_semi_finished_goods) {
        const show_start_btn = frm.doc.skip_transfer || frm.doc.transfer_material_against == 'Job Card' ? 0 : 1
        if (show_start_btn) {
          const pending_to_transfer = frm.doc.required_items.some(
            (item?: any) => flt(item.transferred_qty) < flt(item.required_qty),
          )
          const transfer_extra_materials_percentage = frm.doc.__onload?.transfer_extra_materials_percentage
          let allowed_qty = 0
          let transfer_extra_materials = false
          if (!pending_to_transfer && transfer_extra_materials_percentage) {
            allowed_qty = frm.doc.qty + (transfer_extra_materials_percentage / 100) * frm.doc.qty
            if (allowed_qty > frm.doc.material_transferred_for_manufacturing) {
              transfer_extra_materials = true
            }
          }
          if (pending_to_transfer && frm.doc.status != 'Stopped') {
            frm.has_start_btn = true
            frm.add_custom_button(
              __('Pick List'),
              function () {
                erpnext.work_order.create_pick_list(frm)
              },
              __('Create'),
            )
            frm.add_custom_button(
              __('Material Request'),
              function () {
                erpnext.work_order.make_material_request(frm)
              },
              __('Create'),
            )
          } else if (transfer_extra_materials && allowed_qty) {
            const qty =
              allowed_qty -
              flt(flt(frm.doc.material_transferred_for_manufacturing) + flt(frm.doc.additional_transferred_qty))
            if (qty > 0) {
              frm.add_custom_button(
                __('Additional Material Transfer'),
                function () {
                  const purpose = 'Material Transfer for Manufacture'
                  erpnext.work_order
                    .show_prompt_for_qty_input(frm, purpose, {
                      qty: qty,
                      additional_transfer_entry: 1,
                    })
                    .then((data?: any) => {
                      return frappe.xcall('erpnext.manufacturing.doctype.work_order.mapper.make_stock_entry', {
                        work_order_id: frm.doc.name,
                        purpose: purpose,
                        qty: data.qty,
                        is_additional_transfer_entry: 1,
                      })
                    })
                    .then((stock_entry?: any) => {
                      frappe.model.sync(stock_entry)
                      frappe.set_route('Form', stock_entry.doctype, stock_entry.name)
                    })
                },
                __('Create'),
              )
            }
          }
        }
      }
      if (frm.doc.status != 'Stopped' && !frm.doc.track_semi_finished_goods) {
        if (frm.doc.__onload && frm.doc.__onload.material_consumption == 1) {
          if (flt(doc.material_transferred_for_manufacturing) > 0 || frm.doc.skip_transfer) {
            counter = 0
            tbl = frm.doc.required_items || []
            tbl_lenght = tbl.length
            for (let i = 0, len = tbl_lenght; i < len; i++) {
              const wo_item_qty = frm.doc.required_items[i].transferred_qty || frm.doc.required_items[i].required_qty
              if (flt(wo_item_qty) > flt(frm.doc.required_items[i].consumed_qty)) {
                counter += 1
              }
            }
            if (counter > 0) {
              frm.add_custom_button(
                __('Material Consumption'),
                function () {
                  const backflush_raw_materials_based_on = frm.doc.__onload.backflush_raw_materials_based_on
                  erpnext.work_order.make_consumption_se(frm, backflush_raw_materials_based_on)
                },
                __('Create'),
              )
            }
          }
        }
        if (!frm.doc.skip_transfer) {
          if (flt(doc.material_transferred_for_manufacturing) > 0) {
            if (flt(doc.produced_qty) < flt(doc.material_transferred_for_manufacturing)) {
              frm.has_finish_btn = true
              const finish_btn = frm.add_custom_button(__('Finish'), function () {
                erpnext.work_order.make_se(frm, 'Manufacture')
              })
              if (doc.material_transferred_for_manufacturing >= doc.qty) {
                finish_btn.addClass('btn-primary')
              }
            } else if (frm.doc.__onload && frm.doc.__onload.overproduction_percentage) {
              const allowance_percentage = frm.doc.__onload.overproduction_percentage
              if (allowance_percentage > 0) {
                const allowed_qty = frm.doc.qty + (allowance_percentage / 100) * frm.doc.qty
                if (flt(doc.produced_qty) < allowed_qty) {
                  frm.add_custom_button(__('Finish'), function () {
                    erpnext.work_order.make_se(frm, 'Manufacture')
                  })
                }
              }
            }
          }
        } else {
          if (flt(doc.produced_qty) < flt(doc.qty)) {
            const finish_btn = frm.add_custom_button(__('Finish'), function () {
              erpnext.work_order.make_se(frm, 'Manufacture')
            })
            finish_btn.addClass('btn-primary')
          }
        }
      }
    }
    erpnext.work_order.setup_stock_reservation(frm)
  },
  add_start_button(frm?: any) {
    if (!frm.has_start_btn) {
      return
    }
    const start_btn = frm.add_custom_button(__('Start'), () => {
      erpnext.work_order.make_se(frm, 'Material Transfer for Manufacture')
    })
    start_btn.addClass('btn-primary')
  },
  setup_stock_reservation(frm?: any) {
    if (frm.doc.docstatus === 1 && frm.doc.reserve_stock) {
      if (
        !['Closed', 'Completed'].includes(frm.doc.status) &&
        frm.events.has_unreserved_stock(frm) &&
        (frm.doc.skip_transfer || frm.doc.material_transferred_for_manufacturing < frm.doc.qty)
      ) {
        frm.add_custom_button(
          __('Reserve'),
          () => erpnext.stock_reservation.make_entries(frm, 'required_items'),
          __('Stock Reservation'),
        )
      }
      if (frm.events.has_reserved_stock(frm)) {
        frm.add_custom_button(
          __('Unreserve'),
          () => erpnext.stock_reservation.unreserve_stock(frm),
          __('Stock Reservation'),
        )
        frm.add_custom_button(
          __('Reserved Stock'),
          () => erpnext.stock_reservation.show_reserved_stock(frm, 'required_items'),
          __('Stock Reservation'),
        )
      }
    }
  },
  calculate_cost: function (doc?: any) {
    let op: any, planned_operating_cost: any
    if (doc.operations) {
      op = doc.operations
      doc.planned_operating_cost = 0.0
      for (let i = 0; i < op.length; i++) {
        planned_operating_cost = flt((flt(op[i].hour_rate) * flt(op[i].time_in_mins)) / 60, 2)
        frappe.model.set_value('Work Order Operation', op[i].name, 'planned_operating_cost', planned_operating_cost)
        doc.planned_operating_cost += planned_operating_cost
      }
      refresh_field('planned_operating_cost')
    }
  },
  calculate_total_cost: function (frm?: any) {
    const variable_cost = flt(frm.doc.actual_operating_cost) || flt(frm.doc.planned_operating_cost)
    frm.set_value('total_operating_cost', flt(frm.doc.additional_operating_cost) + variable_cost)
  },
  set_default_warehouse: function (frm?: any) {
    if (frm.doc.company && !(frm.doc.wip_warehouse || frm.doc.fg_warehouse)) {
      const company = frm.doc.company
      frappe.call({
        method: 'erpnext.manufacturing.doctype.work_order.work_order.get_default_warehouse',
        args: {
          company: company,
        },
        callback: function (r?: any) {
          if (!r.exe && frm.doc.company === company) {
            frm.set_value('wip_warehouse', r.message.wip_warehouse)
            frm.set_value('fg_warehouse', r.message.fg_warehouse)
            frm.set_value('scrap_warehouse', r.message.scrap_warehouse)
          }
        },
      })
    }
  },
  get_max_transferable_qty: (frm?: any, purpose?: any) => {
    let max = 0
    if (purpose === 'Disassemble') {
      return flt(frm.doc.produced_qty - frm.doc.disassembled_qty)
    }
    if (frm.doc.skip_transfer) {
      max = flt(frm.doc.qty) - flt(frm.doc.produced_qty)
    } else {
      if (purpose === 'Manufacture') {
        max = flt(frm.doc.material_transferred_for_manufacturing) - flt(frm.doc.produced_qty)
      } else {
        max = flt(frm.doc.qty) - flt(frm.doc.material_transferred_for_manufacturing)
      }
    }
    return flt(max, precision('qty'))
  },
  get_pending_operation_process_loss: (frm?: any) => {
    if (!(frm.doc.operations || []).length) {
      return 0
    }
    const total_loss = Math.max(...frm.doc.operations.map((row?: any) => flt(row.process_loss_qty)))
    return flt(Math.max(total_loss - flt(frm.doc.process_loss_qty), 0), precision('qty'))
  },
  get_max_requestable_qty: (frm?: any) => {
    const required: any = {}
    const covered: any = {}
    ;(frm.doc.required_items || []).forEach((row?: any) => {
      required[row.item_code] = (required[row.item_code] || 0) + flt(row.required_qty)
      if (!(row.item_code in covered)) {
        covered[row.item_code] = flt(row.transferred_qty) + flt(row.requested_qty) + flt(row.picked_qty)
      }
    })
    let max_fraction = 0
    Object.keys(required).forEach((item_code?: any) => {
      if (required[item_code] <= 0) return
      const pending = required[item_code] - covered[item_code]
      max_fraction = Math.max(max_fraction, pending / required[item_code])
    })
    return flt(max_fraction * flt(frm.doc.qty), precision('qty'))
  },
  show_disassembly_prompt: function (frm?: any) {
    const max_qty = flt(frm.doc.produced_qty - frm.doc.disassembled_qty)
    const fields: any = [
      {
        fieldtype: 'Link',
        label: __('Source Manufacture Entry'),
        fieldname: 'source_stock_entry',
        options: 'Stock Entry',
        description: __('Optional. Select a specific manufacture entry to reverse.'),
        get_query: () => {
          return {
            filters: {
              work_order: frm.doc.name,
              purpose: 'Manufacture',
              docstatus: 1,
            },
          }
        },
        onchange: async function (this: any) {
          if (!frm.disassembly_prompt) return
          const se_name = this.value
          let qty = max_qty
          if (se_name) {
            qty = await frappe.xcall(
              'erpnext.manufacturing.doctype.work_order.work_order.get_disassembly_available_qty',
              { stock_entry_name: se_name },
            )
          }
          frm.disassembly_prompt.set_value('qty', qty)
          frm.disassembly_prompt.fields_dict.qty.set_description(__('Max: {0}', [qty]))
        },
      },
      {
        fieldtype: 'Float',
        label: __('Qty for {0}', [__('Disassemble')]),
        fieldname: 'qty',
        description: __('Max: {0}', [max_qty]),
        default: max_qty,
      },
    ]
    return new Promise((resolve?: any) => {
      frm.disassembly_prompt = frappe.prompt(fields, (data?: any) => resolve(data), __('Disassemble'), __('Create'))
    })
  },
  show_prompt_for_qty_input: function (this: any, frm?: any, purpose?: any, { qty, target }: any = {}) {
    let max = qty == null ? this.get_max_transferable_qty(frm, purpose) : qty
    if (purpose === 'Manufacture') {
      max = flt(Math.max(max - flt(frm.doc.process_loss_qty), 0), precision('qty'))
    }
    const pending_process_loss = purpose === 'Manufacture' ? this.get_pending_operation_process_loss(frm) : 0
    const fields: any = [
      {
        fieldtype: 'Float',
        label: __('Qty for {0}', [target || __(purpose)]),
        fieldname: 'qty',
        description: __('Max: {0}', [max]),
        default: max,
        onchange: function (this: any) {
          if (pending_process_loss && frm.qty_prompt) {
            frm.qty_prompt.set_value(
              'finished_good_qty',
              flt(Math.max(flt(this.value) - pending_process_loss, 0), precision('qty')),
            )
          }
        },
      },
    ]
    if (pending_process_loss) {
      fields.push(
        {
          fieldtype: 'Float',
          label: __('Process Loss Qty'),
          fieldname: 'process_loss_qty',
          default: pending_process_loss,
          read_only: 1,
          description: __('Process loss booked against the operations of this work order.'),
        },
        {
          fieldtype: 'Float',
          label: __('Finished Good Qty'),
          fieldname: 'finished_good_qty',
          default: flt(Math.max(max - pending_process_loss, 0), precision('qty')),
          read_only: 1,
          description: __('Actual quantity of the finished good that will be manufactured.'),
        },
      )
    }
    return new Promise((resolve?: any, reject?: any) => {
      frm.qty_prompt = frappe.prompt(
        fields,
        (data?: any) => {
          max += (frm.doc.qty * (frm.doc.__onload.overproduction_percentage || 0.0)) / 100
          if (!data.qty || data.qty <= 0) {
            frappe.msgprint(__('Quantity must be greater than zero.'))
            reject()
            return
          }
          if (data.qty > max) {
            frappe.msgprint(__('Quantity must not be more than {0}', [max]))
            reject()
            return
          }
          if (pending_process_loss && flt(flt(data.qty) - pending_process_loss, precision('qty')) <= 0) {
            frappe.msgprint(
              __('Qty for Manufacture must be greater than the process loss of {0} to produce a finished good.', [
                pending_process_loss,
              ]),
            )
            reject()
            return
          }
          data.purpose = purpose
          resolve(data)
        },
        __('Select Quantity'),
        __('Create'),
      )
    })
  },
  make_se: function (this: any, frm?: any, purpose?: any, qty?: any, is_additional_transfer_entry?: any) {
    if (qty) {
      frappe
        .xcall('erpnext.manufacturing.doctype.work_order.mapper.make_stock_entry', {
          work_order_id: frm.doc.name,
          purpose: purpose,
          qty: qty,
          is_additional_transfer_entry: is_additional_transfer_entry || 0,
        })
        .then((stock_entry?: any) => {
          frappe.model.sync(stock_entry)
          frappe.set_route('Form', stock_entry.doctype, stock_entry.name)
        })
    } else {
      this.show_prompt_for_qty_input(frm, purpose)
        .then((data?: any) => {
          return frappe.xcall('erpnext.manufacturing.doctype.work_order.mapper.make_stock_entry', {
            work_order_id: frm.doc.name,
            purpose: purpose,
            qty: data.qty,
          })
        })
        .then((stock_entry?: any) => {
          frappe.model.sync(stock_entry)
          frappe.set_route('Form', stock_entry.doctype, stock_entry.name)
        })
    }
  },
  make_material_request: function (this: any, frm?: any, purpose: any = 'Material Transfer for Manufacture') {
    const max = this.get_max_requestable_qty(frm)
    if (max <= 0) {
      frappe.msgprint(__('All required items have already been transferred, requested or picked.'))
      return
    }
    const get_material_request = (for_qty?: any) =>
      frappe.model.open_mapped_doc({
        method: 'erpnext.manufacturing.doctype.work_order.mapper.make_material_request',
        frm,
        args: { for_qty: for_qty },
      })
    this.show_prompt_for_qty_input(frm, purpose, {
      qty: max,
      target: __('Material Request'),
    }).then((data?: any) => get_material_request(data.qty))
  },
  create_pick_list: function (this: any, frm?: any, purpose: any = 'Material Transfer for Manufacture') {
    const max = this.get_max_requestable_qty(frm)
    if (max <= 0) {
      frappe.msgprint(__('All required items have already been transferred, requested or picked.'))
      return
    }
    const get_pick_list = (for_qty?: any) =>
      frappe
        .xcall('erpnext.manufacturing.doctype.work_order.mapper.create_pick_list', {
          source_name: frm.doc.name,
          for_qty: for_qty,
        })
        .then((pick_list?: any) => {
          frappe.model.sync(pick_list)
          frappe.set_route('Form', pick_list.doctype, pick_list.name)
        })
    this.show_prompt_for_qty_input(frm, purpose, {
      qty: max,
      target: __('Pick List'),
    }).then((data?: any) => get_pick_list(data.qty))
  },
  make_consumption_se: function (frm?: any, backflush_raw_materials_based_on?: any) {
    let max = 0
    if (!frm.doc.skip_transfer) {
      max =
        backflush_raw_materials_based_on === 'Material Transferred for Manufacture'
          ? flt(frm.doc.material_transferred_for_manufacturing) - flt(frm.doc.produced_qty)
          : flt(frm.doc.qty) - flt(frm.doc.produced_qty)
    } else {
      max = flt(frm.doc.qty) - flt(frm.doc.produced_qty)
    }
    frappe.call({
      method: 'erpnext.manufacturing.doctype.work_order.mapper.make_stock_entry',
      args: {
        work_order_id: frm.doc.name,
        purpose: 'Material Consumption for Manufacture',
        qty: max,
      },
      callback: function (r?: any) {
        const doclist = frappe.model.sync(r.message)
        frappe.set_route('Form', doclist[0].doctype, doclist[0].name)
      },
    })
  },
  change_work_order_status: function (frm?: any, status?: any) {
    const method_name = status == 'Closed' ? 'close_work_order' : 'stop_unstop'
    frappe.call({
      method: `erpnext.manufacturing.doctype.work_order.work_order.${method_name}`,
      freeze: true,
      freeze_message: __('Updating Work Order status'),
      args: {
        work_order: frm.doc.name,
        status: status,
      },
      callback: function (r?: any) {
        if (r.message) {
          frm.set_value('status', r.message)
          frm.reload_doc()
        }
      },
    })
  },
}
frappe.tour['Work Order'] = [
  {
    fieldname: 'production_item',
    title: 'Item to Manufacture',
    description: __('Select the Item to be manufactured.'),
  },
  {
    fieldname: 'bom_no',
    title: 'BOM No',
    description: __('The default BOM for that item will be fetched by the system. You can also change the BOM.'),
  },
  {
    fieldname: 'qty',
    title: 'Qty to Manufacture',
    description: __('Enter the quantity to manufacture. Raw material Items will be fetched only when this is set.'),
  },
  {
    fieldname: 'use_multi_level_bom',
    title: 'Use Multi-Level BOM',
    description: __(
      "This is enabled by default. If you want to plan materials for sub-assemblies of the Item you're manufacturing leave this enabled. If you plan and manufacture the sub-assemblies separately, you can disable this checkbox.",
    ),
  },
  {
    fieldname: 'source_warehouse',
    title: 'Source Warehouse',
    description: __(
      'The warehouse where you store your raw materials. Each required item can have a separate source warehouse. Group warehouse also can be selected as source warehouse. On submission of the Work Order, the raw materials will be reserved in these warehouses for production usage.',
    ),
  },
  {
    fieldname: 'fg_warehouse',
    title: 'Target Warehouse',
    description: __('The warehouse where you store finished Items before they are shipped.'),
  },
  {
    fieldname: 'wip_warehouse',
    title: 'Work-in-Progress Warehouse',
    description: __(
      'The warehouse where your Items will be transferred when you begin production. Group Warehouse can also be selected as a Work in Progress warehouse.',
    ),
  },
  {
    fieldname: 'scrap_warehouse',
    title: 'Scrap Warehouse',
    description: __('If the BOM results in Scrap material, the Scrap Warehouse needs to be selected.'),
  },
  {
    fieldname: 'required_items',
    title: 'Required Items',
    description: __(
      'All the required items (raw materials) will be fetched from BOM and populated in this table. Here you can also change the Source Warehouse for any item. And during the production, you can track transferred raw materials from this table.',
    ),
  },
  {
    fieldname: 'planned_start_date',
    title: 'Planned Start Date',
    description: __('Set the Planned Start Date (an Estimated Date at which you want the Production to begin)'),
  },
  {
    fieldname: 'operations',
    title: 'Operations',
    description: __(
      'If the selected BOM has Operations mentioned in it, the system will fetch all Operations from BOM, these values can be changed.',
    ),
  },
]
erpnext.work_order.render_linked_lists = function (frm?: any) {
  if (!frm.wo_linked_lists) {
    frm.wo_linked_lists = new erpnext.work_order.LinkedLists(frm)
  }
  frm.wo_linked_lists.render()
}
erpnext.work_order.can_create_material_request = function (frm?: any) {
  const doc = frm.doc
  if (doc.docstatus !== 1) return false
  if (['Closed', 'Completed', 'Stopped'].includes(doc.status)) return false
  if (doc.track_semi_finished_goods) return false
  if (doc.skip_transfer || doc.transfer_material_against === 'Job Card') return false
  return (doc.required_items || []).some((item?: any) => flt(item.transferred_qty) < flt(item.required_qty))
}
erpnext.work_order.get_embedded_list_class = function () {
  if (erpnext.work_order._EmbeddedListWithEmptyAction) {
    return erpnext.work_order._EmbeddedListWithEmptyAction
  }
  erpnext.work_order._EmbeddedListWithEmptyAction = class extends frappe.ui.EmbeddedList {
    [key: string]: any
    toggle_result_area(this: any) {
      super.toggle_result_area()
      const has_rows = this.data.length > 0
      const searched = this._all_data && this._all_data.length > 0
      if (has_rows || searched || !this.empty_state_action) return
      const $empty = frappe.ui.empty_state({
        icon: this.empty_icon,
        title: this.empty_message,
        description: this.empty_description,
        actions: [this.empty_state_action],
      })
      this.$no_result.replaceWith($empty)
      this.$no_result = $empty
      this.$no_result.toggle(true)
    }
  }
  return erpnext.work_order._EmbeddedListWithEmptyAction
}
erpnext.work_order.LinkedLists = class WorkOrderLinkedLists {
  [key: string]: any
  constructor(frm?: any) {
    this.frm = frm
    this.lists = {}
    this.tabs = {
      job_card_tab: {
        html_field: 'job_card_list_html',
        doctype: 'Job Card',
        fields: ['name', 'status', 'docstatus', 'operation', 'workstation', 'for_quantity'],
        columns: [
          {
            label: __('Job Card'),
            fieldname: 'name',
            type: 'link',
            route: (row?: any) => ['Form', 'Job Card', row.name],
          },
          { label: __('Operation'), fieldname: 'operation' },
          { label: __('Workstation'), fieldname: 'workstation' },
          { label: __('For Qty'), fieldname: 'for_quantity', align: 'right' },
          {
            label: __('Status'),
            render: (row?: any) => {
              const [label, color] = frappe.get_indicator(row, 'Job Card') || [row.status, 'gray']
              return frappe.ui.badge.html({ label, theme: color })
            },
          },
        ],
      },
      material_request_tab: {
        html_field: 'material_request_list_html',
        doctype: 'Material Request',
        fields: ['name', 'status', 'material_request_type', 'transaction_date'],
        empty_message: __('No Material Request created'),
        empty_description: __('Create your first Material Request to get started.'),
        can_add: (frm?: any) => erpnext.work_order.can_create_material_request(frm),
        empty_state_action: {
          label: __('Create Material Request'),
          icon: 'plus',
          onclick: () => erpnext.work_order.make_material_request(this.frm),
        },
        columns: [
          {
            label: __('Material Request'),
            fieldname: 'name',
            type: 'link',
            route: (row?: any) => ['Form', 'Material Request', row.name],
          },
          { label: __('Type'), fieldname: 'material_request_type' },
          {
            label: __('Date'),
            render: (row?: any) => frappe.format(row.transaction_date, { fieldtype: 'Date' }),
          },
          { label: __('Status'), fieldname: 'status', type: 'badge' },
        ],
      },
      stock_entry_tab: {
        html_field: 'stock_entry_list_html',
        doctype: 'Stock Entry',
        fields: ['name', 'stock_entry_type', 'posting_date', 'docstatus'],
        columns: [
          {
            label: __('Stock Entry'),
            fieldname: 'name',
            type: 'link',
            route: (row?: any) => ['Form', 'Stock Entry', row.name],
          },
          { label: __('Purpose'), fieldname: 'stock_entry_type' },
          {
            label: __('Date'),
            render: (row?: any) => frappe.format(row.posting_date, { fieldtype: 'Date' }),
          },
          {
            label: __('Status'),
            render: (row?: any) =>
              frappe.ui.badge.html({
                label: ({ 0: __('Draft'), 1: __('Submitted'), 2: __('Cancelled') } as any)[row.docstatus],
                theme: ({ 0: 'gray', 1: 'green', 2: 'red' } as any)[row.docstatus],
              }),
          },
        ],
      },
    }
  }
  render(this: any) {
    if (this.frm.is_new()) {
      Object.values(this.tabs).forEach((cfg?: any) => {
        const wrapper = this.frm.fields_dict[cfg.html_field]?.$wrapper
        wrapper &&
          wrapper
            .empty()
            .append($('<div class="text-muted">').text(__('Save the Work Order to view linked documents.')))
      })
      return
    }
    frappe
      .require('embedded_list.bundle.js')
      .then(() => {
        this._loaded = true
        this.lists = {}
        this.load_active_tab()
      })
      .catch((e?: any) => {
        console.error('Work Order: failed to load embedded_list.bundle.js', e)
      })
  }
  build(this: any, tab_fieldname?: any) {
    const cfg = this.tabs[tab_fieldname]
    if (!cfg) return
    if (this.lists[tab_fieldname]) return
    const wrapper = this.frm.fields_dict[cfg.html_field]?.$wrapper
    if (!wrapper) return
    wrapper.empty()
    const can_add = !cfg.can_add || cfg.can_add(this.frm)
    const opts: any = {
      wrapper,
      doctype: cfg.doctype,
      filters: { work_order: this.frm.doc.name },
      fields: cfg.fields,
      columns: cfg.columns,
      order_by: 'creation desc',
      add_button: can_add ? cfg.add_button : undefined,
      empty_state_action: can_add ? cfg.empty_state_action : undefined,
      empty_description: cfg.empty_description,
      empty_message: cfg.empty_message || __('No {0} linked to this Work Order.', [__(cfg.doctype)]),
    }
    const ListClass = erpnext.work_order.get_embedded_list_class()
    const list = new ListClass(opts)
    this.lists[tab_fieldname] = list
    if (tab_fieldname === 'job_card_tab') {
      frappe.model.with_doctype('Job Card', () => list.refresh())
      return
    }
    list.refresh()
  }
  load_active_tab(this: any) {
    if (!this._loaded || this.frm.is_new()) return
    const active = this.frm.get_active_tab && this.frm.get_active_tab()
    const fieldname = active?.df?.fieldname
    if (fieldname && this.tabs[fieldname]) {
      this.build(fieldname)
    }
  }
}
