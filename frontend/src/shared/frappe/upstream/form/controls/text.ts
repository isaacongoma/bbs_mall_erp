import { frappe } from '@/shared/frappe/runtime'
frappe.ui.form.ControlText = class ControlText extends frappe.ui.form.ControlData {
  [key: string]: any
  static html_element = 'textarea'
  static horizontal = false
  make_wrapper(this: any) {
    super.make_wrapper()
    const disp_area = this.$wrapper.find('.like-disabled-input')
    disp_area.addClass('for-description')
    disp_area.css('white-space-collapse', 'preserve')
    if (this.df.max_height) {
      disp_area.css({ 'max-height': this.df.max_height, overflow: 'auto' })
    }
  }
  make_input(this: any) {
    super.make_input()
    this.$input.css({ height: '300px' })
    if (this.df.max_height) {
      this.$input.css({ 'max-height': this.df.max_height })
    }
  }
}
frappe.ui.form.ControlLongText = frappe.ui.form.ControlText
frappe.ui.form.ControlSmallText = class ControlSmallText extends frappe.ui.form.ControlText {
  [key: string]: any
  make_input(this: any) {
    super.make_input()
    this.$input.css({ height: '150px' })
  }
}
