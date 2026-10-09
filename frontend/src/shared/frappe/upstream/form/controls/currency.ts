import { frappe, get_number_format_info } from '@/shared/frappe/runtime'
frappe.ui.form.ControlCurrency = class ControlCurrency extends frappe.ui.form.ControlFloat {
  [key: string]: any
  get_precision(this: any) {
    if (typeof this.df.precision != 'number' && !this.df.precision) {
      if (frappe.boot.sysdefaults.currency_precision) {
        this.df.precision = frappe.boot.sysdefaults.currency_precision
      } else {
        this.df.precision = get_number_format_info(this.get_number_format()).precision
      }
    }
    return this.df.precision
  }
}
