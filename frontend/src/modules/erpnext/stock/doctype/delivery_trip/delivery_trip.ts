import { $, __, erpnext, frappe, locals } from '@/shared/frappe'
frappe.ui.form.on('Delivery Trip', {
  setup: function (frm?: any) {
    frm.set_indicator_formatter('customer', (stop?: any) => (stop.visited ? 'green' : 'orange'))
    frm.set_query('driver', function () {
      return {
        filters: {
          status: 'Active',
        },
      }
    })
    frm.set_query('address', 'delivery_stops', function (_doc?: any, cdt?: any, cdn?: any) {
      const row = locals[cdt][cdn]
      if (row.customer) {
        return {
          query: 'frappe.contacts.doctype.address.address.address_query',
          filters: {
            link_doctype: 'Customer',
            link_name: row.customer,
          },
        }
      }
    })
    frm.set_query('contact', 'delivery_stops', function (_doc?: any, cdt?: any, cdn?: any) {
      const row = locals[cdt][cdn]
      if (row.customer) {
        return {
          query: 'frappe.contacts.doctype.contact.contact.contact_query',
          filters: {
            link_doctype: 'Customer',
            link_name: row.customer,
          },
        }
      }
    })
  },
  refresh: function (frm?: any) {
    frm.ignore_doctypes_on_cancel_all = ['Delivery Note']
    if (frm.doc.docstatus == 1 && frm.doc.delivery_stops.length > 0) {
      frm.add_custom_button(__('Notify Customers via Email'), function () {
        frm.trigger('notify_customers')
      })
    }
    if (frm.doc.docstatus === 0) {
      frm.add_custom_button(
        __('Delivery Note'),
        () => {
          erpnext.utils.map_current_doc({
            method: 'erpnext.stock.doctype.delivery_note.mapper.make_delivery_trip',
            source_doctype: 'Delivery Note',
            target: frm,
            date_field: 'posting_date',
            setters: {
              company: frm.doc.company,
              customer: null,
            },
            get_query_filters: {
              company: frm.doc.company,
              status: ['Not In', ['Completed', 'Cancelled']],
            },
          })
        },
        __('Get stops from'),
      )
    }
    frm.add_custom_button(
      __('Delivery Notes'),
      function () {
        frappe.set_route('List', 'Delivery Note', {
          name: [
            'in',
            frm.doc.delivery_stops.map((stop?: any) => {
              return stop.delivery_note
            }),
          ],
        })
      },
      __('View'),
    )
  },
  calculate_arrival_time: function (frm?: any) {
    if (!frm.doc.driver_address) {
      frappe.throw(__('Cannot calculate arrival time as the driver address is missing.'))
    }
    frappe.show_alert({
      message: __('Calculating arrival times'),
      indicator: 'orange',
    })
    frm.call(
      'process_route',
      {
        optimize: false,
      },
      () => {
        frm.reload_doc()
      },
    )
  },
  driver: function (frm?: any) {
    if (frm.doc.driver) {
      frappe.call({
        method: 'erpnext.stock.doctype.delivery_trip.delivery_trip.get_driver_email',
        args: {
          driver: frm.doc.driver,
        },
        callback: (data?: any) => {
          frm.set_value('driver_email', data.message.email)
        },
      })
    }
  },
  optimize_route: function (frm?: any) {
    if (!frm.doc.driver_address) {
      frappe.throw(__('Cannot optimize route as the driver address is missing.'))
    }
    frappe.show_alert({
      message: __('Optimizing route'),
      indicator: 'orange',
    })
    frm.call(
      'process_route',
      {
        optimize: true,
      },
      () => {
        frm.reload_doc()
      },
    )
  },
  notify_customers: function (frm?: any) {
    $.each(frm.doc.delivery_stops || [], function (_i?: any, delivery_stop?: any) {
      if (!delivery_stop.delivery_note) {
        frappe.msgprint({
          message: __('No Delivery Note selected for Customer {0}', [delivery_stop.customer]),
          title: __('Warning'),
          indicator: 'orange',
          alert: 1,
        })
      }
    })
    frappe.db.get_value('Delivery Settings', { name: 'Delivery Settings' }, 'dispatch_template', (r?: any) => {
      if (!r.dispatch_template) {
        frappe.throw(__('Missing email template for dispatch. Please set one in Delivery Settings.'))
      } else {
        frappe.confirm(__('Do you want to notify all the customers by email?'), function () {
          frappe.call({
            method: 'erpnext.stock.doctype.delivery_trip.delivery_trip.notify_customers',
            args: {
              delivery_trip: frm.doc.name,
            },
            callback: function (r?: any) {
              if (!r.exc) {
                frm.doc.email_notification_sent = true
                frm.refresh_field('email_notification_sent')
              }
            },
          })
        })
      }
    })
  },
})
frappe.ui.form.on('Delivery Stop', {
  customer: function (_frm?: any, cdt?: any, cdn?: any) {
    const row = locals[cdt][cdn]
    if (row.customer) {
      frappe.call({
        method: 'erpnext.stock.doctype.delivery_trip.delivery_trip.get_contact_and_address',
        args: { name: row.customer },
        callback: function (r?: any) {
          if (r.message) {
            if (r.message['shipping_address']) {
              frappe.model.set_value(cdt, cdn, 'address', r.message['shipping_address'].parent)
            } else {
              frappe.model.set_value(cdt, cdn, 'address', '')
            }
            if (r.message['contact_person']) {
              frappe.model.set_value(cdt, cdn, 'contact', r.message['contact_person'].parent)
            } else {
              frappe.model.set_value(cdt, cdn, 'contact', '')
            }
          } else {
            frappe.model.set_value(cdt, cdn, 'address', '')
            frappe.model.set_value(cdt, cdn, 'contact', '')
          }
        },
      })
    }
  },
  address: function (_frm?: any, cdt?: any, cdn?: any) {
    const row = locals[cdt][cdn]
    if (row.address) {
      frappe.call({
        method: 'frappe.contacts.doctype.address.address.get_address_display',
        args: { address_dict: row.address },
        callback: function (r?: any) {
          if (r.message) {
            frappe.model.set_value(cdt, cdn, 'customer_address', r.message)
          }
        },
      })
    } else {
      frappe.model.set_value(cdt, cdn, 'customer_address', '')
    }
  },
  contact: function (_frm?: any, cdt?: any, cdn?: any) {
    const row = locals[cdt][cdn]
    if (row.contact) {
      frappe.call({
        method: 'erpnext.stock.doctype.delivery_trip.delivery_trip.get_contact_display',
        args: { contact: row.contact },
        callback: function (r?: any) {
          if (r.message) {
            frappe.model.set_value(cdt, cdn, 'customer_contact', r.message)
          }
        },
      })
    } else {
      frappe.model.set_value(cdt, cdn, 'customer_contact', '')
    }
  },
})
