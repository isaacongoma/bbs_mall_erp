import { $, __, erpnext, flt, frappe, locals, moment } from '@/shared/frappe'
frappe.ui.form.on('Timesheet', {
  setup: function (frm?: any) {
    frappe.require('/assets/erpnext/js/projects/timer.js')
    frm.ignore_doctypes_on_cancel_all = ['Sales Invoice']
    frm.fields_dict.employee.get_query = function () {
      return {
        filters: {
          status: 'Active',
        },
      }
    }
    frm.fields_dict['time_logs'].grid.get_field('task').get_query = function (_frm?: any, cdt?: any, cdn?: any) {
      const child = locals[cdt][cdn]
      return {
        filters: {
          project: child.project,
          status: ['!=', 'Cancelled'],
          is_group: 0,
        },
      }
    }
    frm.fields_dict['time_logs'].grid.get_field('project').get_query = function () {
      return {
        filters: {
          company: frm.doc.company,
          status: 'Open',
        },
      }
    }
  },
  onload: function (frm?: any) {
    if (frm.doc.__islocal && frm.doc.time_logs) {
      calculate_time_and_amount(frm)
    }
    if (frm.is_new() && !frm.doc.employee) {
      set_employee_and_company(frm)
    }
  },
  refresh: function (frm?: any) {
    if (frm.doc.docstatus == 1) {
      if (
        frm.doc.per_billed < 100 &&
        frm.doc.total_billable_hours &&
        frm.doc.total_billable_hours > frm.doc.total_billed_hours
      ) {
        frm.add_custom_button(__('Create Sales Invoice'), function () {
          frm.trigger('make_invoice')
        })
      }
    }
    if (frm.doc.docstatus < 1) {
      let button = __('Start Timer')
      $.each(frm.doc.time_logs || [], function (_i?: any, row?: any) {
        if (row.from_time <= frappe.datetime.now_datetime() && !row.completed) {
          button = __('Resume Timer')
        }
      })
      frm
        .add_custom_button(__(button), function () {
          let flag = true
          $.each(frm.doc.time_logs || [], function (_i?: any, row?: any) {
            if (flag && row.activity_type && !row.from_time) {
              erpnext.timesheet.timer(frm, row)
              row.from_time = frappe.datetime.now_datetime()
              frm.refresh_fields('time_logs')
              frm.save()
              flag = false
            }
            if (flag && row.from_time <= frappe.datetime.now_datetime() && !row.completed) {
              const timestamp = moment(frappe.datetime.now_datetime()).diff(moment(row.from_time), 'seconds')
              erpnext.timesheet.timer(frm, row, timestamp)
              flag = false
            }
          })
          if (flag) {
            erpnext.timesheet.timer(frm)
          }
        })
        .addClass('btn-primary')
    }
    if (frm.doc.per_billed > 0) {
      frm.fields_dict['time_logs'].grid.toggle_enable('billing_hours', false)
      frm.fields_dict['time_logs'].grid.toggle_enable('is_billable', false)
    }
    const filters: any = {
      status: 'Open',
    }
    if (frm.doc.customer) {
      filters['customer'] = frm.doc.customer
    }
    frm.set_query('parent_project', function () {
      return {
        filters: filters,
      }
    })
    frm.trigger('setup_filters')
    frm.trigger('set_dynamic_field_label')
    frm.trigger('set_route_options_for_new_task')
  },
  customer: function (frm?: any) {
    frm.set_query('project', 'time_logs', function (doc?: any) {
      return {
        filters: {
          customer: doc.customer,
          status: 'Open',
        },
      }
    })
    frm.refresh()
  },
  currency: function (frm?: any) {
    const base_currency = frappe.defaults.get_global_default('currency')
    if (frm.doc.currency && base_currency != frm.doc.currency) {
      frappe.call({
        method: 'erpnext.setup.utils.get_exchange_rate',
        args: {
          from_currency: frm.doc.currency,
          to_currency: base_currency,
        },
        callback: function (r?: any) {
          if (r.message) {
            frm.set_value('exchange_rate', flt(r.message))
            frm.set_df_property('exchange_rate', 'description', '1 ' + frm.doc.currency + ' = [?] ' + base_currency)
          }
        },
      })
    }
    frm.trigger('set_dynamic_field_label')
  },
  exchange_rate: function (frm?: any) {
    $.each(frm.doc.time_logs, function (_i?: any, d?: any) {
      calculate_billing_costing_amount(frm, d.doctype, d.name)
    })
    calculate_time_and_amount(frm)
  },
  set_dynamic_field_label: function (frm?: any) {
    const base_currency = frappe.defaults.get_global_default('currency')
    frm.set_currency_labels(
      ['base_total_costing_amount', 'base_total_billable_amount', 'base_total_billed_amount'],
      base_currency,
    )
    frm.set_currency_labels(['total_costing_amount', 'total_billable_amount', 'total_billed_amount'], frm.doc.currency)
    frm.toggle_display(
      ['base_total_costing_amount', 'base_total_billable_amount', 'base_total_billed_amount'],
      frm.doc.currency != base_currency,
    )
    if (frm.doc.time_logs.length > 0) {
      frm.set_currency_labels(
        ['base_billing_rate', 'base_billing_amount', 'base_costing_rate', 'base_costing_amount'],
        base_currency,
        'time_logs',
      )
      frm.set_currency_labels(
        ['billing_rate', 'billing_amount', 'costing_rate', 'costing_amount'],
        frm.doc.currency,
        'time_logs',
      )
      const time_logs_grid = frm.fields_dict.time_logs.grid
      $.each(
        ['base_billing_rate', 'base_billing_amount', 'base_costing_rate', 'base_costing_amount'],
        function (_i?: any, d?: any) {
          if (frappe.meta.get_docfield(time_logs_grid.doctype, d))
            time_logs_grid.set_column_disp(d, frm.doc.currency != base_currency)
        },
      )
    }
    frm.refresh_fields()
  },
  set_route_options_for_new_task: (frm?: any) => {
    const task_field = frm.get_docfield('time_logs', 'task')
    if (task_field) {
      task_field.get_route_options_for_new_doc = (row?: any) => ({ project: row.doc.project })
    }
  },
  make_invoice: function (frm?: any) {
    const fields: any = [
      {
        fieldtype: 'Link',
        label: __('Item Code'),
        fieldname: 'item_code',
        options: 'Item',
      },
    ]
    if (!frm.doc.customer) {
      fields.push({
        fieldtype: 'Link',
        label: __('Customer'),
        fieldname: 'customer',
        options: 'Customer',
        default: frm.doc.customer,
      })
    }
    const dialog = new frappe.ui.Dialog({
      title: __('Create Sales Invoice'),
      fields: fields,
    })
    dialog.set_primary_action(__('Create Sales Invoice'), () => {
      const args = dialog.get_values()
      if (!args) return
      dialog.hide()
      return frappe.call({
        type: 'GET',
        method: 'erpnext.projects.doctype.timesheet.timesheet.make_sales_invoice',
        args: {
          source_name: frm.doc.name,
          item_code: args.item_code,
          customer: frm.doc.customer || args.customer,
          currency: frm.doc.currency,
        },
        freeze: true,
        callback: function (r?: any) {
          if (!r.exc) {
            frappe.model.sync(r.message)
            frappe.set_route('Form', r.message.doctype, r.message.name)
          }
        },
      })
    })
    dialog.show()
  },
  parent_project: function (frm?: any) {
    set_project_in_timelog(frm)
  },
  employee: function (frm?: any) {
    if (frm.doc.employee && frm.doc.time_logs) {
      const selected_employee = frm.doc.employee
      frm.doc.time_logs.forEach((row?: any) => {
        if (row.activity_type) {
          frappe.call({
            method: 'erpnext.projects.doctype.timesheet.timesheet.get_activity_cost',
            args: {
              employee: frm.doc.employee,
              activity_type: row.activity_type,
              currency: frm.doc.currency,
            },
            callback: function (r?: any) {
              if (r.message) {
                if (selected_employee !== frm.doc.employee) return
                row.billing_rate = r.message['billing_rate']
                row.costing_rate = r.message['costing_rate']
                frm.refresh_fields('time_logs')
                calculate_billing_costing_amount(frm, row.doctype, row.name)
              }
            },
          })
        }
      })
    }
  },
})
frappe.ui.form.on('Timesheet Detail', {
  time_logs_remove: function (frm?: any) {
    calculate_time_and_amount(frm)
  },
  task: (frm?: any, cdt?: any, cdn?: any) => {
    const row = frm.selected_doc
    if (row.task) {
      frappe.db.get_value('Task', row.task, 'project', (r?: any) => {
        frappe.model.set_value(cdt, cdn, 'project', r.project)
      })
    }
  },
  from_time: function (frm?: any, cdt?: any, cdn?: any) {
    calculate_end_time(frm, cdt, cdn)
  },
  to_time: function (frm?: any, cdt?: any, cdn?: any) {
    const child = locals[cdt][cdn]
    if (frm._setting_hours) return
    const hours = moment(child.to_time).diff(moment(child.from_time), 'seconds') / 3600
    frappe.model.set_value(cdt, cdn, 'hours', hours)
  },
  time_logs_add: function (frm?: any, cdt?: any, cdn?: any) {
    if (frm.doc.parent_project) {
      frappe.model.set_value(cdt, cdn, 'project', frm.doc.parent_project)
    }
  },
  hours: function (frm?: any, cdt?: any, cdn?: any) {
    calculate_end_time(frm, cdt, cdn)
    update_billing_hours(frm, cdt, cdn)
    calculate_billing_costing_amount(frm, cdt, cdn)
    calculate_time_and_amount(frm)
  },
  billing_hours: function (frm?: any, cdt?: any, cdn?: any) {
    calculate_billing_costing_amount(frm, cdt, cdn)
    calculate_time_and_amount(frm)
  },
  billing_rate: function (frm?: any, cdt?: any, cdn?: any) {
    calculate_billing_costing_amount(frm, cdt, cdn)
    calculate_time_and_amount(frm)
  },
  costing_rate: function (frm?: any, cdt?: any, cdn?: any) {
    calculate_billing_costing_amount(frm, cdt, cdn)
    calculate_time_and_amount(frm)
  },
  is_billable: function (frm?: any, cdt?: any, cdn?: any) {
    update_billing_hours(frm, cdt, cdn)
    update_time_rates(frm, cdt, cdn)
    calculate_billing_costing_amount(frm, cdt, cdn)
    calculate_time_and_amount(frm)
  },
  activity_type: function (frm?: any, cdt?: any, cdn?: any) {
    if (!frappe.get_doc(cdt, cdn).activity_type) return
    frappe.call({
      method: 'erpnext.projects.doctype.timesheet.timesheet.get_activity_cost',
      args: {
        employee: frm.doc.employee,
        activity_type: frm.selected_doc.activity_type,
        currency: frm.doc.currency,
      },
      callback: function (r?: any) {
        if (r.message) {
          frappe.model.set_value(cdt, cdn, 'billing_rate', r.message['billing_rate'])
          frappe.model.set_value(cdt, cdn, 'costing_rate', r.message['costing_rate'])
          calculate_billing_costing_amount(frm, cdt, cdn)
        }
      },
    })
  },
})
const calculate_end_time = function (frm?: any, cdt?: any, cdn?: any) {
  const child = locals[cdt][cdn]
  if (!child.from_time) {
    frappe.model.set_value(cdt, cdn, 'from_time', frappe.datetime.get_datetime_as_string())
  }
  const d = moment(child.from_time)
  if (child.hours) {
    d.add(child.hours, 'hours')
    frm._setting_hours = true
    frappe.model.set_value(cdt, cdn, 'to_time', frappe.datetime.get_datetime_as_string(d)).then(() => {
      frm._setting_hours = false
    })
  }
}
const update_billing_hours = function (_frm?: any, cdt?: any, cdn?: any) {
  const child = frappe.get_doc(cdt, cdn)
  if (!child.is_billable) {
    frappe.model.set_value(cdt, cdn, 'billing_hours', 0.0)
  } else {
    frappe.model.set_value(cdt, cdn, 'billing_hours', child.hours)
  }
}
const update_time_rates = function (_frm?: any, cdt?: any, cdn?: any) {
  const child = frappe.get_doc(cdt, cdn)
  if (!child.is_billable) {
    frappe.model.set_value(cdt, cdn, 'billing_rate', 0.0)
  }
}
const calculate_billing_costing_amount = function (frm?: any, cdt?: any, cdn?: any) {
  const row = frappe.get_doc(cdt, cdn)
  let billing_amount = 0.0
  let base_billing_amount = 0.0
  const exchange_rate = flt(frm.doc.exchange_rate)
  frappe.model.set_value(cdt, cdn, 'base_billing_rate', flt(row.billing_rate) * exchange_rate)
  frappe.model.set_value(cdt, cdn, 'base_costing_rate', flt(row.costing_rate) * exchange_rate)
  if (row.billing_hours && row.is_billable) {
    base_billing_amount = flt(row.billing_hours) * flt(row.base_billing_rate)
    billing_amount = flt(row.billing_hours) * flt(row.billing_rate)
  }
  frappe.model.set_value(cdt, cdn, 'base_billing_amount', base_billing_amount)
  frappe.model.set_value(cdt, cdn, 'base_costing_amount', flt(row.base_costing_rate) * flt(row.hours))
  frappe.model.set_value(cdt, cdn, 'billing_amount', billing_amount)
  frappe.model.set_value(cdt, cdn, 'costing_amount', flt(row.costing_rate) * flt(row.hours))
}
const calculate_time_and_amount = function (frm?: any) {
  const tl = frm.doc.time_logs || []
  let total_working_hr = 0
  let total_billing_hr = 0
  let total_billable_amount = 0
  let total_costing_amount = 0
  for (let i = 0; i < tl.length; i++) {
    if (tl[i].hours) {
      total_working_hr += tl[i].hours
      total_billable_amount += tl[i].billing_amount
      total_costing_amount += tl[i].costing_amount
      if (tl[i].is_billable) {
        total_billing_hr += tl[i].billing_hours
      }
    }
  }
  frm.set_value('total_billable_hours', total_billing_hr)
  frm.set_value('total_hours', total_working_hr)
  frm.set_value('total_billable_amount', total_billable_amount)
  frm.set_value('total_costing_amount', total_costing_amount)
}
const set_employee_and_company = function (frm?: any) {
  const options: any = { user_id: frappe.session.user }
  const fields: any = ['name', 'company']
  frappe.db.get_value('Employee', options, fields).then(({ message }: any) => {
    if (message.name && message.company) {
      frm.set_value('employee', message.name)
      frm.set_value('company', message.company)
    }
  })
}
function set_project_in_timelog(frm?: any) {
  if (frm.doc.parent_project) {
    $.each(frm.doc.time_logs || [], function (_i?: any, item?: any) {
      frappe.model.set_value(item.doctype, item.name, 'project', frm.doc.parent_project)
    })
  }
}
