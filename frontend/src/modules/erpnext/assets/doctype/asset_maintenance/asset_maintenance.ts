import { $, __, frappe, locals } from '@/shared/frappe'
frappe.ui.form.on('Asset Maintenance', {
  setup: (frm?: any) => {
    frm.set_query('asset_name', function () {
      return {
        filters: {
          company: frm.doc.company,
          docstatus: 1,
        },
      }
    })
    frm.set_query('assign_to', 'asset_maintenance_tasks', function (doc?: any) {
      return {
        query: 'erpnext.assets.doctype.asset_maintenance.asset_maintenance.get_team_members',
        filters: {
          maintenance_team: doc.maintenance_team,
        },
      }
    })
    frm.set_indicator_formatter('maintenance_status', function (doc?: any) {
      let indicator = 'blue'
      if (doc.maintenance_status == 'Overdue') {
        indicator = 'orange'
      }
      if (doc.maintenance_status == 'Cancelled') {
        indicator = 'red'
      }
      return indicator
    })
  },
  refresh: (frm?: any) => {
    if (!frm.is_new()) {
      frm.trigger('make_dashboard')
    }
  },
  make_dashboard: (frm?: any) => {
    if (!frm.is_new()) {
      frappe.call({
        method: 'erpnext.assets.doctype.asset_maintenance.asset_maintenance.get_maintenance_log',
        args: { asset_name: frm.doc.asset_name },
        callback: (r?: any) => {
          if (!r.message) {
            return
          }
          const section = frm.dashboard.add_section('', __('Maintenance Log'))
          const rows = $('<div></div>').appendTo(section)
          ;(r.message || []).forEach(function (d?: any) {
            $(`<div class='row' style='margin-bottom: 10px;'>
							<div class='col-sm-3 small'>
								<a onclick="frappe.set_route('List', 'Asset Maintenance Log',
									{'asset_name': '${d.asset_name}','maintenance_status': '${d.maintenance_status}' });">
									${__(d.maintenance_status)} <span class="badge">${d.count}</span>
								</a>
							</div>
						</div>`).appendTo(rows)
          })
          frm.dashboard.show()
        },
      })
    }
  },
})
frappe.ui.form.on('Asset Maintenance Task', {
  start_date: (frm?: any, cdt?: any, cdn?: any) => {
    get_next_due_date(frm, cdt, cdn)
  },
  periodicity: (frm?: any, cdt?: any, cdn?: any) => {
    get_next_due_date(frm, cdt, cdn)
  },
  last_completion_date: (frm?: any, cdt?: any, cdn?: any) => {
    get_next_due_date(frm, cdt, cdn)
  },
  end_date: (frm?: any, cdt?: any, cdn?: any) => {
    get_next_due_date(frm, cdt, cdn)
  },
})
const get_next_due_date = function (_frm?: any, cdt?: any, cdn?: any) {
  const d = locals[cdt][cdn]
  if (d.start_date && d.periodicity) {
    return frappe.call({
      method: 'erpnext.assets.doctype.asset_maintenance.asset_maintenance.calculate_next_due_date',
      args: {
        start_date: d.start_date,
        periodicity: d.periodicity,
        end_date: d.end_date,
        last_completion_date: d.last_completion_date,
        next_due_date: d.next_due_date,
      },
      callback: function (r?: any) {
        if (r.message) {
          frappe.model.set_value(cdt, cdn, 'next_due_date', r.message)
        } else {
          frappe.model.set_value(cdt, cdn, 'next_due_date', '')
        }
      },
    })
  }
}
