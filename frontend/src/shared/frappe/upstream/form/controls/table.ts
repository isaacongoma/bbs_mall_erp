import { $, __, cint, flt, frappe, locals } from '@/shared/frappe/runtime'
import Grid from '../grid'
frappe.ui.form.ControlTable = class ControlTable extends frappe.ui.form.Control {
  [key: string]: any
  make(this: any) {
    super.make()
    this.grid = new Grid({
      frm: this.frm,
      df: this.df,
      parent: this.wrapper,
      control: this,
    })
    if (this.frm) {
      this.frm.grids[this.frm.grids.length] = this
    }
    this.$wrapper.on('paste', ':text', async (e?: any) => {
      const table_field = this.df.fieldname
      const grid = this.grid
      const doctype = grid.doctype
      const row_docname = $(e.target).closest('.grid-row').data('name')
      const in_grid_form = $(e.target).closest('.form-in-grid').length
      const value_formatter_map: any = {
        Date: (val?: any) => (val ? frappe.datetime.user_to_str(val) : val),
        Int: (val?: any) => cint(val),
        Check: (val?: any) => cint(val),
        Float: (val?: any) => flt(val),
        Currency: (val?: any) => flt(val),
      }
      let pasted_data = frappe.utils.get_clipboard_data(e)
      if (!pasted_data || in_grid_form) return
      let data = frappe.utils.csv_to_array(pasted_data, '\t')
      if (data.length === 1 && data[0].length === 1) return
      let fieldnames: any = []
      let fieldtypes: any = []
      if (this.get_field(data[0][0])) {
        data[0].forEach((column?: any) => {
          fieldnames.push(this.get_field(column))
          const df = frappe.meta.get_docfield(doctype, this.get_field(column))
          fieldtypes.push(df ? df.fieldtype : '')
        })
        data.shift()
      } else {
        const visible_columns = grid.grid_rows_by_docname[row_docname].get_visible_columns()
        let target_column_matched = false
        visible_columns.forEach((column?: any) => {
          if (target_column_matched || column.fieldname === $(e.target).data('fieldname')) {
            fieldnames.push(column.fieldname)
            const df = frappe.meta.get_docfield(doctype, column.fieldname)
            fieldtypes.push(df ? df.fieldtype : '')
            target_column_matched = true
          }
        })
      }
      let row_idx = locals[doctype][row_docname].idx
      let data_length = data.length
      const total_rows_needed = row_idx - 1 + data.length
      while (this.frm.doc[table_field].length < total_rows_needed) {
        this.grid.add_new_row()
      }
      for (let i = 0; i < data_length; i++) {
        const row = data[i]
        if (!row.filter(Boolean).length) {
          row_idx++
          continue
        }
        const doc = this.frm.doc[table_field][row_idx - 1]
        if (doc) {
          let row_values: any = {}
          row.forEach((value?: any, data_index?: any) => {
            if (fieldnames[data_index]) {
              row_values[fieldnames[data_index]] = value_formatter_map[fieldtypes[data_index]]
                ? value_formatter_map[fieldtypes[data_index]](value)
                : value
            }
          })
          await frappe.model.set_value(doctype, doc.name, row_values)
          if (data_length >= 10) {
            frappe.show_progress(__('Processing'), i + 1, data_length, null, true)
            await new Promise((resolve?: any) => setTimeout(resolve, 10))
          }
        }
        row_idx++
      }
      this.grid.refresh()
      return false
    })
  }
  get_field(this: any, field_name?: any) {
    let fieldname: any
    field_name = field_name.toLowerCase()
    this.grid?.meta?.fields?.some((field?: any) => {
      if (frappe.model.no_value_type.includes(field.fieldtype)) {
        return false
      }
      const is_field_matching = () => {
        return (
          field.fieldname.toLowerCase() === field_name ||
          (field.label || '').toLowerCase() === field_name ||
          (__(field.label, null, field.parent) || '').toLowerCase() === field_name
        )
      }
      if (is_field_matching()) {
        fieldname = field.fieldname
        return true
      }
    })
    return fieldname
  }
  refresh_input(this: any) {
    this.grid.refresh()
  }
  get_value(this: any) {
    if (this.grid) {
      return this.grid.get_data()
    }
  }
  set_input() {}
  validate(this: any) {
    return this.get_value()
  }
  check_all_rows(this: any) {
    this.$wrapper.find('.grid-row-check')[0].click()
  }
}
