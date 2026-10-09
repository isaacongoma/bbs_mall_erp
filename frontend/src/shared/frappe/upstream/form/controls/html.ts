import { __, frappe } from '@/shared/frappe/runtime'
frappe.ui.form.ControlHTML = class ControlHTML extends frappe.ui.form.Control {
  [key: string]: any
  make(this: any) {
    super.make()
    this.disp_area = this.wrapper
  }
  refresh_input(this: any) {
    const content = this.get_content()
    if (content) {
      this._set_html(content)
    }
  }
  get_content(this: any) {
    let content = this.df.options || ''
    content = __(content)
    try {
      return frappe.render(content, this)
    } catch (e: any) {
      return content
    }
  }
  html(this: any, html?: any) {
    this._set_html(html || this.get_content())
  }
  set_value(this: any, html?: any) {
    if (html.appendTo) {
      html.appendTo(this.$wrapper.empty())
    } else {
      this.df.options = html
      this.html(html)
    }
    return Promise.resolve()
  }
  _set_html(this: any, html?: any) {
    this.$wrapper.html(html)
    if (typeof html === 'string' && /<pre[\s>]/i.test(html)) {
      frappe.utils.highlight_pre(this.$wrapper)
    }
  }
}
