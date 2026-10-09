import { $, __, cint, erpnext, flt, frappe, is_null, locals, precision, refresh_field } from '@/shared/frappe'
frappe.provide('erpnext.buying')
erpnext.buying = {
  setup_buying_controller: function () {
    erpnext.buying.BuyingController = class BuyingController extends erpnext.TransactionController {
      [key: string]: any
      setup(this: any) {
        super.setup()
        this.toggle_enable_for_stock_uom('allow_to_edit_stock_uom_qty_for_purchase')
        this.frm.email_field = 'contact_email'
        this.frm.add_fetch('project', 'cost_center', 'cost_center')
      }
      onload(this: any, doc?: any, cdt?: any, cdn?: any) {
        let df: any, disable: any
        this.setup_queries(doc, cdt, cdn)
        super.onload()
        this.frm.set_query('shipping_rule', function () {
          return {
            filters: {
              shipping_rule_type: 'Buying',
            },
          }
        })
        const get_project_filters = () => ({
          query: 'erpnext.controllers.queries.get_project_name',
          filters: {
            company: this.frm.doc.company,
          },
        })
        this.frm.set_query('project', get_project_filters)
        this.frm.set_query('project', 'items', get_project_filters)
        if (this.frm.doc.__islocal && frappe.meta.has_field(this.frm.doc.doctype, 'disable_rounded_total')) {
          df = frappe.meta.get_docfield(this.frm.doc.doctype, 'disable_rounded_total')
          disable = cint(df.default) || cint(frappe.sys_defaults.disable_rounded_total)
          this.frm.set_value('disable_rounded_total', disable)
        }
        if (this.frm.get_field('shipping_address')) {
          this.frm.set_query('shipping_address', (doc?: any, cdt?: any, cdn?: any, frm?: any) => {
            if (this.frm.doc.customer) {
              return {
                query: 'frappe.contacts.doctype.address.address.address_query',
                filters: { link_doctype: 'Customer', link_name: this.frm.doc.customer },
              }
            } else return erpnext.queries.company_address_query(doc, cdt, cdn, frm)
          })
        }
        if (this.frm.get_field('dispatch_address')) {
          this.frm.set_query('dispatch_address', erpnext.queries.address_query)
        }
      }
      setup_queries(this: any) {
        let me = this
        if (this.frm.fields_dict.buying_price_list) {
          this.frm.set_query('buying_price_list', function () {
            return {
              filters: { buying: 1, enabled: 1 },
            }
          })
        }
        if (this.frm.fields_dict.tc_name) {
          this.frm.set_query('tc_name', function () {
            return {
              filters: { buying: 1 },
            }
          })
        }
        me.frm.set_query('supplier', erpnext.queries.supplier)
        me.frm.set_query('contact_person', erpnext.queries.contact_query)
        me.frm.set_query('supplier_address', erpnext.queries.address_query)
        me.frm.set_query('billing_address', erpnext.queries.company_address_query)
        erpnext.accounts.dimensions.setup_dimension_filters(me.frm, me.frm.doctype)
        this.frm.set_query('item_code', 'items', function () {
          let filters: any
          if (me.frm.doc.is_subcontracted) {
            filters = { supplier: me.frm.doc.supplier, company: me.frm.doc.company }
            filters['is_stock_item'] = 0
            return {
              query: 'erpnext.controllers.queries.item_query',
              filters: filters,
            }
          } else {
            return {
              query: 'erpnext.controllers.queries.item_query',
              filters: {
                supplier: me.frm.doc.supplier,
                is_purchase_item: 1,
                has_variants: 0,
                company: me.frm.doc.company,
              },
            }
          }
        })
        this.frm.set_query('manufacturer', 'items', function (_doc?: any, cdt?: any, cdn?: any) {
          const row = locals[cdt][cdn]
          return {
            query: 'erpnext.controllers.queries.item_manufacturer_query',
            filters: { item_code: row.item_code },
          }
        })
        if (this.frm.fields_dict['items'].grid.get_field('item_code')) {
          this.frm.set_query('item_tax_template', 'items', function (doc?: any, cdt?: any, cdn?: any) {
            return me.set_query_for_item_tax_template(doc, cdt, cdn)
          })
        }
      }
      refresh(this: any) {
        frappe.dynamic_link = { doc: this.frm.doc, fieldname: 'supplier', doctype: 'Supplier' }
        this.frm.toggle_display(
          'supplier_name',
          this.frm.doc.supplier_name && this.frm.doc.supplier_name !== this.frm.doc.supplier,
        )
        if (
          this.frm.doc.docstatus == 0 &&
          (this.frm.doctype === 'Purchase Order' || this.frm.doctype === 'Material Request')
        ) {
          this.set_from_product_bundle()
        }
        this.toggle_subcontracting_fields()
        super.refresh()
      }
      toggle_subcontracting_fields(this: any) {
        if (['Purchase Receipt', 'Purchase Invoice'].includes(this.frm.doc.doctype)) {
          this.frm.fields_dict.supplied_items.grid.update_docfield_property(
            'consumed_qty',
            'read_only',
            this.frm.doc.__onload && this.frm.doc.__onload.backflush_based_on === 'BOM',
          )
          this.frm.set_df_property('supplied_items', 'cannot_add_rows', 1)
          this.frm.set_df_property('supplied_items', 'cannot_delete_rows', 1)
        }
      }
      supplier(this: any) {
        let me = this
        erpnext.utils.get_party_details(this.frm, null, null, function () {
          me.apply_price_list()
        })
      }
      company(this: any) {
        super.company()
        if (!frappe.meta.has_field(this.frm.doc.doctype, 'billing_address')) return
        frappe.call({
          method: 'erpnext.setup.doctype.company.company.get_billing_shipping_address',
          args: {
            name: this.frm.doc.company,
            billing_address: this.frm.doc.billing_address,
            shipping_address: this.frm.doc.shipping_address,
          },
          callback: (r?: any) => {
            if (!r.message) return
            this.frm.set_value('billing_address', r.message.primary_address || '')
            const is_drop_ship = this.frm.doc.items.some((item?: any) => item.delivered_by_supplier)
            if (frappe.meta.has_field(this.frm.doc.doctype, 'shipping_address') && !is_drop_ship) {
              this.frm.set_value('shipping_address', r.message.shipping_address || '')
            }
          },
        })
        erpnext.utils.set_letter_head(this.frm)
      }
      supplier_address(this: any) {
        erpnext.utils.get_address_display(this.frm)
        erpnext.utils.set_taxes_from_address(this.frm, 'supplier_address', 'supplier_address', 'supplier_address')
      }
      buying_price_list(this: any) {
        this.apply_price_list()
      }
      discount_percentage(this: any, doc?: any, cdt?: any, cdn?: any) {
        let item = frappe.get_doc(cdt, cdn)
        item.discount_amount = 0.0
        this.price_list_rate(doc, cdt, cdn)
      }
      discount_amount(this: any, doc?: any, cdt?: any, cdn?: any) {
        let item = frappe.get_doc(cdt, cdn)
        item.discount_percentage = 0.0
        this.price_list_rate(doc, cdt, cdn)
      }
      qty(this: any, doc?: any, cdt?: any, cdn?: any) {
        if (doc.doctype == 'Purchase Receipt' || (doc.doctype == 'Purchase Invoice' && doc.update_stock)) {
          this.calculate_received_qty(doc, cdt, cdn)
        }
        super.qty(doc, cdt, cdn)
      }
      rejected_qty(this: any, doc?: any, cdt?: any, cdn?: any) {
        this.calculate_received_qty(doc, cdt, cdn)
      }
      calculate_received_qty(this: any, doc?: any, cdt?: any, cdn?: any) {
        let item = frappe.get_doc(cdt, cdn)
        frappe.model.round_floats_in(item, ['qty', 'rejected_qty'])
        if (!doc.is_return && this.validate_negative_quantity(cdt, cdn, item, ['qty', 'rejected_qty'])) {
          return
        }
        let received_qty = flt(item.qty + item.rejected_qty, precision('received_qty', item))
        let received_stock_qty = flt(item.conversion_factor, precision('conversion_factor', item)) * flt(received_qty)
        frappe.model.set_value(cdt, cdn, 'received_qty', received_qty)
        frappe.model.set_value(cdt, cdn, 'received_stock_qty', received_stock_qty)
      }
      batch_no(doc?: any, cdt?: any, cdn?: any) {
        super.batch_no(doc, cdt, cdn)
      }
      validate_negative_quantity(cdt?: any, cdn?: any, item?: any, fieldnames?: any) {
        if (!item || !fieldnames) {
          return
        }
        let is_negative_qty = false
        for (let i = 0; i < fieldnames.length; i++) {
          if (item[fieldnames[i]] < 0) {
            frappe.msgprint(
              __('Row #{0}: {1} can not be negative for item {2}', [
                item.idx,
                frappe.meta.get_translated_label(cdt, fieldnames[i], cdn),
                item.item_code,
              ]),
            )
            is_negative_qty = true
            break
          }
        }
        return is_negative_qty
      }
      warehouse(this: any, doc?: any, cdt?: any, cdn?: any) {
        let item = frappe.get_doc(cdt, cdn)
        if (item.item_code && item.warehouse) {
          return this.frm.call({
            method: 'erpnext.stock.get_item_details.get_bin_details',
            child: item,
            args: {
              item_code: item.item_code,
              warehouse: item.warehouse,
              company: doc.company,
              include_child_warehouses: true,
            },
          })
        }
      }
      project(this: any, _doc?: any, cdt?: any, cdn?: any) {
        let item = frappe.get_doc(cdt, cdn)
        if (item.project) {
          $.each(this.frm.doc['items'] || [], function (_i?: any, other_item?: any) {
            if (!other_item.project) {
              other_item.project = item.project
              refresh_field('project', other_item.name, other_item.parentfield)
            }
          })
        }
      }
      rejected_warehouse(this: any, doc?: any, cdt?: any) {
        if (['Purchase Invoice', 'Purchase Receipt'].includes(cdt)) {
          this.autofill_warehouse(doc.items, 'rejected_warehouse', doc.rejected_warehouse)
        }
      }
      category(this: any, doc?: any, cdt?: any) {
        if (cdt != doc.doctype) {
          this.calculate_taxes_and_totals()
        }
      }
      add_deduct_tax(this: any) {
        this.calculate_taxes_and_totals()
      }
      set_from_product_bundle(this: any) {
        let me = this
        this.frm.add_custom_button(
          __('Product Bundle'),
          function () {
            erpnext.buying.get_items_from_product_bundle(me.frm)
          },
          __('Get Items From'),
        )
      }
      shipping_address(this: any) {
        erpnext.utils.get_address_display(this.frm, 'shipping_address', 'shipping_address_display', true)
      }
      dispatch_address(this: any) {
        erpnext.utils.get_address_display(this.frm, 'dispatch_address', 'dispatch_address_display', true)
      }
      billing_address(this: any) {
        erpnext.utils.get_address_display(this.frm, 'billing_address', 'billing_address_display', true)
      }
      tc_name(this: any) {
        this.get_terms()
      }
      update_auto_repeat_reference(doc?: any) {
        if (doc.auto_repeat) {
          frappe.call({
            method: 'frappe.automation.doctype.auto_repeat.auto_repeat.update_reference',
            args: {
              docname: doc.auto_repeat,
              reference: doc.name,
            },
            callback: function (r?: any) {
              if (r.message == 'success') {
                frappe.show_alert({
                  message: __('Auto repeat document updated'),
                  indicator: 'green',
                })
              } else {
                frappe.show_alert({
                  message: __('An error occurred during the update process'),
                  indicator: 'red',
                })
              }
            },
          })
        }
      }
      manufacturer(_doc?: any, cdt?: any, cdn?: any) {
        const row = locals[cdt][cdn]
        if (row.manufacturer) {
          frappe.call({
            method: 'erpnext.stock.doctype.item_manufacturer.item_manufacturer.get_item_manufacturer_part_no',
            args: {
              item_code: row.item_code,
              manufacturer: row.manufacturer,
            },
            callback: function (r?: any) {
              if (r.message) {
                frappe.model.set_value(cdt, cdn, 'manufacturer_part_no', r.message)
              }
            },
          })
        }
      }
      manufacturer_part_no(_doc?: any, cdt?: any, cdn?: any) {
        const row = locals[cdt][cdn]
        if (row.manufacturer_part_no) {
          frappe.model.get_value(
            'Item Manufacturer',
            {
              item_code: row.item_code,
              manufacturer: row.manufacturer,
              manufacturer_part_no: row.manufacturer_part_no,
            },
            'name',
            function (data?: any) {
              if (!data) {
                let msg: any = {
                  message: __('Manufacturer Part Number <b>{0}</b> is invalid', [row.manufacturer_part_no]),
                  title: __('Invalid Part Number'),
                }
                frappe.throw(msg)
              }
            },
          )
        }
      }
      add_serial_batch_bundle(this: any, doc?: any, cdt?: any, cdn?: any) {
        let item = locals[cdt][cdn]
        let me = this
        let fields: any = ['has_batch_no', 'has_serial_no']
        frappe.db.get_value('Item', item.item_code, fields).then((r?: any) => {
          if (r.message && (r.message.has_batch_no || r.message.has_serial_no)) {
            fields.forEach((field?: any) => {
              item[field] = r.message[field]
            })
            item.type_of_transaction = item.qty > 0 ? 'Inward' : 'Outward'
            item.is_rejected = false
            new erpnext.SerialBatchPackageSelector(me.frm, item, (r?: any) => {
              if (r) {
                let qty = Math.abs(r.total_qty)
                if (doc.is_return) {
                  qty = qty * -1
                }
                let update_values: any = {
                  serial_and_batch_bundle: r.name,
                  use_serial_batch_fields: 0,
                  qty: qty / flt(item.conversion_factor || 1, precision('conversion_factor', item)),
                }
                if (r.warehouse) {
                  update_values['warehouse'] = r.warehouse
                }
                frappe.model.set_value(item.doctype, item.name, update_values)
              }
            })
          }
        })
      }
      add_serial_batch_for_rejected_qty(this: any, doc?: any, cdt?: any, cdn?: any) {
        let item = locals[cdt][cdn]
        let me = this
        let fields: any = ['has_batch_no', 'has_serial_no']
        frappe.db.get_value('Item', item.item_code, fields).then((r?: any) => {
          if (r.message && (r.message.has_batch_no || r.message.has_serial_no)) {
            fields.forEach((field?: any) => {
              item[field] = r.message[field]
            })
            item.type_of_transaction = (!doc.is_return as unknown as number) > 0 ? 'Inward' : 'Outward'
            item.is_rejected = true
            new erpnext.SerialBatchPackageSelector(me.frm, item, (r?: any) => {
              if (r) {
                let qty = Math.abs(r.total_qty)
                if (doc.is_return) {
                  qty = qty * -1
                }
                let update_values: any = {
                  rejected_serial_and_batch_bundle: r.name,
                  use_serial_batch_fields: 0,
                  rejected_qty: qty / flt(item.conversion_factor || 1, precision('conversion_factor', item)),
                }
                if (r.warehouse) {
                  update_values['rejected_warehouse'] = r.warehouse
                }
                frappe.model.set_value(item.doctype, item.name, update_values)
              }
            })
          }
        })
      }
    }
  },
}
erpnext.buying.link_to_mrs = function (frm?: any) {
  frappe.call({
    method: 'erpnext.buying.utils.get_linked_material_requests',
    args: {
      items: frm.doc.items.map((item?: any) => item.item_code),
    },
    callback: function (r?: any) {
      let qty: any
      if (!r.message || r.message.length == 0) {
        frappe.throw({
          message: __('No pending Material Requests found to link for the given items.'),
          title: __('Note'),
        })
      }
      let item_length = frm.doc.items.length
      for (let item of frm.doc.items) {
        qty = item.qty
        ;(r.message || []).forEach(function (d?: any) {
          let my_qty: any, newrow: any
          if (d.qty > 0 && qty > 0 && item.item_code == d.item_code && !item.material_request_item) {
            item.material_request = d.mr_name
            item.material_request_item = d.mr_item
            my_qty = Math.min(qty, d.qty)
            qty = qty - my_qty
            d.qty = d.qty - my_qty
            item.stock_qty = my_qty * item.conversion_factor
            item.qty = my_qty
            frappe.msgprint(__('Assigning {0} to {1} (row {2})', [d.mr_name, d.item_code, item.idx]))
            if (qty > 0) {
              frappe.msgprint(__('Splitting {0} units of {1}', [qty, d.item_code]))
              newrow = frappe.model.add_child(frm.doc, item.doctype, 'items')
              item_length++
              for (let key in item) {
                newrow[key] = item[key]
              }
              newrow.idx = item_length
              newrow['stock_qty'] = newrow.conversion_factor * qty
              newrow['qty'] = qty
              newrow['material_request'] = ''
              newrow['material_request_item'] = ''
            }
          }
        })
      }
      refresh_field('items')
    },
  })
}
erpnext.buying.get_default_bom = function (frm?: any) {
  $.each(frm.doc['items'] || [], function (_i?: any, d?: any) {
    if (d.item_code && d.bom === '') {
      return frappe.call({
        type: 'GET',
        method: 'erpnext.stock.get_item_details.get_default_bom',
        args: {
          item_code: d.item_code,
        },
        callback: function (r?: any) {
          if (r) {
            frappe.model.set_value(d.doctype, d.name, 'bom', r.message)
          }
        },
      })
    }
  })
}
erpnext.buying.get_items_from_product_bundle = function (frm?: any) {
  let dialog = new frappe.ui.Dialog({
    title: __('Get Items from Product Bundle'),
    fields: [
      {
        fieldtype: 'Link',
        label: __('Product Bundle'),
        fieldname: 'product_bundle',
        options: 'Product Bundle',
        reqd: 1,
        get_query: () => {
          return { filters: { docstatus: 1, disabled: 0 } }
        },
      },
      {
        fieldtype: 'Currency',
        label: __('Quantity'),
        fieldname: 'quantity',
        reqd: 1,
        default: 1,
      },
    ],
    primary_action_label: 'Get Items',
    primary_action(args?: any) {
      if (!args) return
      dialog.hide()
      return frappe.call({
        type: 'GET',
        method: 'erpnext.stock.doctype.packed_item.packed_item.get_items_from_product_bundle',
        args: {
          row: {
            product_bundle: args.product_bundle,
            quantity: args.quantity,
            parenttype: frm.doc.doctype,
            parent: frm.doc.name,
            supplier: frm.doc.supplier,
            currency: frm.doc.currency,
            conversion_rate: frm.doc.conversion_rate,
            price_list: frm.doc.buying_price_list,
            price_list_currency: frm.doc.price_list_currency,
            plc_conversion_rate: frm.doc.plc_conversion_rate,
            company: frm.doc.company,
            is_subcontracted: frm.doc.is_subcontracted,
            transaction_date: frm.doc.transaction_date || frm.doc.posting_date,
            ignore_pricing_rule: frm.doc.ignore_pricing_rule,
            doctype: frm.doc.doctype,
          },
        },
        freeze: true,
        callback: function (r?: any) {
          let d: any, item: any
          const first_row_is_empty = function (child_table?: any) {
            if ($.isArray(child_table) && child_table.length > 0) {
              return !child_table[0].item_code
            }
            return false
          }
          const remove_empty_first_row = function (frm?: any) {
            if (first_row_is_empty(frm.doc.items)) {
              frm.doc.items = frm.doc.items.splice(1)
            }
          }
          if (!r.exc && r.message) {
            remove_empty_first_row(frm)
            for (let i = 0; i < r.message.length; i++) {
              d = frm.add_child('items')
              item = r.message[i]
              for (let key in item) {
                if (!is_null(item[key]) && key !== 'doctype') {
                  d[key] = item[key]
                }
              }
              if (frappe.meta.get_docfield(d.doctype, 'price_list_rate', d.name)) {
                frm.script_manager.trigger('price_list_rate', d.doctype, d.name)
              }
            }
            frm.refresh_field('items')
          }
        },
      })
    },
  })
  dialog.show()
}
erpnext.buying.prevent_past_schedule_dates = function (frm?: any) {
  if (frm.doc.transaction_date) {
    frm.fields_dict['schedule_date'].datepicker?.update({
      minDate: new Date(frm.doc.transaction_date),
    })
  }
}
