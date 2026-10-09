import { __, frappe } from '@/shared/frappe/runtime'
frappe.ui.form.ControlHeading = class ControlHeading extends frappe.ui.form.ControlHTML {
  [key: string]: any
  get_content(this: any) {
    return '<h4>' + __(this.df.label, null, this.df.parent) + '</h4>'
  }
}
