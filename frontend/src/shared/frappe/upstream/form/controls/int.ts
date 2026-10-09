import { cint, frappe } from '@/shared/frappe/runtime'
frappe.ui.form.ControlInt = class ControlInt extends frappe.ui.form.ControlData {
  [key: string]: any
  static trigger_change_on_input_event = false
  static trigger_dirty_on_input_event = true
  static input_mode = 'numeric'
  make() {
    super.make()
  }
  make_input(this: any) {
    super.make_input()
    this.$input.on('focus', () => {
      ;(document.activeElement as any)?.select?.()
      return false
    })
  }
  validate(this: any, value?: any) {
    return this.parse(value)
  }
  eval_expression(value?: any, number_format?: any) {
    return typeof value === 'string' ? frappe.utils.eval_expression(value, number_format) : value
  }
  parse(this: any, value?: any) {
    return cint(this.eval_expression(value), null)
  }
}
frappe.ui.form.ControlLongInt = frappe.ui.form.ControlInt
