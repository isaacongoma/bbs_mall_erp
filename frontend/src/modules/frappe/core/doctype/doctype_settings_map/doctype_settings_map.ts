import { __, frappe, locals } from '@/shared/frappe'
frappe.ui.form.on('DocType Settings Map', {
  refresh(frm?: any) {
    frm.set_query('settings_doctype', 'mappings', () => ({
      filters: { issingle: 1 },
    }))
  },
  applies_to_doctype(frm?: any) {
    if (!frm.doc.applies_to_doctype) {
      frm.set_value('module', null)
      return
    }
    frappe.db.get_value('DocType', frm.doc.applies_to_doctype, 'module').then((r?: any) => {
      frm.set_value('module', (r.message && r.message.module) || null)
    })
  },
})
frappe.ui.form.on('DocType Settings Map Item', {
  form_render(frm?: any, _cdt?: any, cdn?: any) {
    set_setting_field_options(frm, cdn)
  },
  settings_doctype(frm?: any, cdt?: any, cdn?: any) {
    frappe.model.set_value(cdt, cdn, 'setting_field', '')
    set_setting_field_options(frm, cdn)
  },
})
function set_setting_field_options(frm?: any, cdn?: any) {
  const row = locals['DocType Settings Map Item'][cdn]
  const grid_row = frm.fields_dict.mappings.grid.grid_rows_by_docname[cdn]
  const control = grid_row && grid_row.get_field && grid_row.get_field('setting_field')
  if (!control) return
  if (!row.settings_doctype) {
    control.set_data([])
    return
  }
  frappe.model.with_doctype(row.settings_doctype, () => {
    const data = frappe.meta
      .get_docfields(row.settings_doctype)
      .filter((df?: any) => df.fieldname && !frappe.model.no_value_type.includes(df.fieldtype))
      .map((df?: any) => ({
        value: df.fieldname,
        label: `${__(df.label || df.fieldname)} (${df.fieldname})`,
      }))
    control.set_data(data)
  })
}
