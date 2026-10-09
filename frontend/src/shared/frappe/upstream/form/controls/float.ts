import { cint, flt, format_number, frappe } from '@/shared/frappe/runtime'
frappe.ui.form.ControlFloat = class ControlFloat extends frappe.ui.form.ControlInt {
  [key: string]: any
  static input_mode = 'decimal'
  parse(this: any, value?: any) {
    value = this.eval_expression(value)
    return isNaN(parseFloat(value)) ? null : flt(value, this.get_precision())
  }
  eval_expression(this: any, value?: any) {
    return super.eval_expression(value, this.get_number_format())
  }
  format_for_input(this: any, value?: any) {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return ''
    }
    return format_number(value, this.get_number_format(), this.get_precision())
  }
  get_number_format(this: any) {
    if (this.df.fieldtype === 'Rating' || (this.df.fieldtype === 'Float' && !this.df.options?.trim())) return
    const currency = frappe.meta.get_field_currency(this.df, this.get_doc())
    return get_number_format(currency)
  }
  get_precision(this: any) {
    return this.df.precision || cint(frappe.boot.sysdefaults.float_precision, null)
  }
}
