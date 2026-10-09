import { $, cint, frappe } from '@/shared/frappe/runtime'

frappe.provide('frappe.ui')
frappe.ui.split_view_enabled = function () {
  if (frappe.is_mobile()) return false
  const enabled = frappe.boot.desk_settings?.report_split_view
  return enabled === undefined || cint(enabled) === 1
}
frappe.ui.handle_link_cell_click = function (e: any, datatable: any) {
  if (!frappe.ui.split_view_enabled()) return false
  if (e.which !== 1 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return false
  const link = e.currentTarget
  const { doctype, name } = link.dataset
  if (!doctype || !name) return false
  const col_index = $(link).closest('.dt-cell').attr('data-col-index')
  if (col_index == null) return false
  const column = datatable.getColumn(Number(col_index))
  const fieldtype = column?.docfield?.fieldtype ?? column?.fieldtype
  if (!['Link', 'Dynamic Link'].includes(fieldtype)) return false
  e.preventDefault()
  e.stopPropagation()
  frappe.require('side_panel.bundle.js').then(() => {
    frappe.ui.get_side_panel().open(doctype, name)
  })
  return true
}
