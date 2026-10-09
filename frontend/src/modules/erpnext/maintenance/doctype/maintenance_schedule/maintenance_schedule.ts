import { __, erpnext, frappe, locals } from '@/shared/frappe'
frappe.provide('erpnext.maintenance')
frappe.ui.form.on('Maintenance Schedule', {
  setup: function (frm?: any) {
    frm.set_query('contact_person', erpnext.queries.contact_query)
    frm.set_query('customer_address', erpnext.queries.address_query)
    frm.set_query('customer', erpnext.queries.customer)
    frm.set_query('serial_and_batch_bundle', 'items', (doc?: any, cdt?: any, cdn?: any) => {
      const item = locals[cdt][cdn]
      return {
        filters: {
          item_code: item.item_code,
          voucher_type: 'Maintenance Schedule',
          type_of_transaction: 'Maintenance',
          company: doc.company,
        },
      }
    })
  },
  onload: function (frm?: any) {
    if (!frm.doc.status) {
      frm.set_value({ status: 'Draft' })
    }
    if (frm.doc.__islocal) {
      frm.set_value({ transaction_date: frappe.datetime.get_today() })
    }
  },
  refresh: function (frm?: any) {
    setTimeout(() => {
      frm.toggle_display('generate_schedule', !(frm.is_new() || frm.doc.docstatus))
      frm.toggle_display('schedule', !frm.is_new())
    }, 10)
  },
  customer: function (frm?: any) {
    erpnext.utils.get_party_details(frm)
  },
  customer_address: function (frm?: any) {
    erpnext.utils.get_address_display(frm, 'customer_address', 'address_display')
  },
  contact_person: function (frm?: any) {
    erpnext.utils.get_contact_details(frm)
  },
  generate_schedule: function (frm?: any) {
    if (frm.is_new()) {
      frappe.msgprint(__('Please save first'))
    } else {
      frm.call('generate_schedule')
    }
  },
})
erpnext.maintenance.MaintenanceSchedule = class MaintenanceSchedule extends frappe.ui.form.Controller {
  [key: string]: any
  refresh(this: any) {
    frappe.dynamic_link = { doc: this.frm.doc, fieldname: 'customer', doctype: 'Customer' }
    const me = this
    if (this.frm.doc.docstatus === 0) {
      this.frm.add_custom_button(
        __('Sales Order'),
        function () {
          erpnext.utils.map_current_doc({
            method: 'erpnext.selling.doctype.sales_order.mapper.make_maintenance_schedule',
            source_doctype: 'Sales Order',
            target: me.frm,
            setters: {
              customer: me.frm.doc.customer || undefined,
            },
            get_query_filters: {
              docstatus: 1,
              company: me.frm.doc.company,
            },
          })
        },
        __('Get Items From'),
      )
    } else if (this.frm.doc.docstatus === 1) {
      const schedules = me.frm.doc.schedules
      const flag = schedules.some((schedule?: any) => schedule.completion_status === 'Pending')
      if (flag) {
        this.frm.add_custom_button(
          __('Maintenance Visit'),
          function () {
            let options = ''
            me.frm.call('get_pending_data', { data_type: 'items' }).then((r?: any) => {
              options = r.message
              let schedule_id = ''
              const d = new frappe.ui.Dialog({
                title: __('Enter Visit Details'),
                fields: [
                  {
                    fieldtype: 'Select',
                    fieldname: 'item_name',
                    label: __('Item Name'),
                    options: options,
                    reqd: 1,
                    onchange: function (this: any) {
                      const field = d.get_field('scheduled_date')
                      me.frm
                        .call('get_pending_data', {
                          item_name: this.value,
                          data_type: 'date',
                        })
                        .then((r?: any) => {
                          field.df.options = r.message
                          field.refresh()
                        })
                    },
                  },
                  {
                    label: __('Scheduled Date'),
                    fieldname: 'scheduled_date',
                    fieldtype: 'Select',
                    options: '',
                    reqd: 1,
                    onchange: function (this: any) {
                      const field = d.get_field('item_name')
                      me.frm
                        .call('get_pending_data', {
                          item_name: field.value,
                          s_date: this.value,
                          data_type: 'id',
                        })
                        .then((r?: any) => {
                          schedule_id = r.message
                        })
                    },
                  },
                ],
                primary_action_label: 'Create Visit',
                primary_action(values?: any) {
                  frappe.call({
                    method:
                      'erpnext.maintenance.doctype.maintenance_schedule.maintenance_schedule.make_maintenance_visit',
                    args: {
                      item_name: values.item_name,
                      s_id: schedule_id,
                      source_name: me.frm.doc.name,
                    },
                    callback: function (r?: any) {
                      if (!r.exc) {
                        frappe.model.sync(r.message)
                        frappe.set_route('Form', r.message.doctype, r.message.name)
                      }
                    },
                  })
                  d.hide()
                },
              })
              d.show()
            })
          },
          __('Create'),
        )
      }
    }
  }
}
frappe.ui.form.set_controller('Maintenance Schedule', erpnext.maintenance.MaintenanceSchedule)
