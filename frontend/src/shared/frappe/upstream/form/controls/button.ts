import { $, __, frappe } from '@/shared/frappe/runtime'
frappe.ui.form.ControlButton = class ControlButton extends frappe.ui.form.ControlData {
  [key: string]: any
  can_write() {
    return true
  }
  make_input(this: any) {
    let me = this
    let btn_type = 'btn-default'
    if (this.df.button_color) {
      const color_map: any = {
        Default: 'btn-default',
        Primary: 'btn-primary',
        Info: 'btn-info',
        Success: 'btn-success',
        Warning: 'btn-warning',
        Danger: 'btn-danger',
      }
      btn_type = color_map[this.df.button_color] || 'btn-default'
    } else if (this.df.primary) {
      btn_type = 'btn-primary'
    }
    const btn_size = this.df.btn_size ? `btn-${this.df.btn_size}` : 'btn-xs'
    this.$input = $(`<button type="button"
				class="btn ${frappe.utils.escape_html(btn_size)} ${frappe.utils.escape_html(btn_type)}"
				title="${this.df.title || frappe.utils.escape_html(this.df.label)}"
			>`)
      .prependTo(me.input_area)
      .on('click', function () {
        me.onclick()
      })
    this.input = this.$input.get(0)
    this.set_input_attributes()
    this.has_input = true
    this.toggle_label(false)
  }
  onclick(this: any) {
    if (this.frm && this.frm.doc) {
      if (this.frm.script_manager.has_handlers(this.df.fieldname, this.doctype)) {
        this.frm.script_manager.trigger(this.df.fieldname, this.doctype, this.docname)
      } else {
        if (this.df.options) {
          this.run_server_script()
        }
      }
    } else if (this.df.click) {
      this.df.click()
    }
  }
  run_server_script(this: any) {
    let me = this
    if (this.frm && this.frm.docname) {
      frappe.call({
        method: 'run_doc_method',
        args: { docs: this.frm.doc, method: this.df.options },
        btn: this.$input,
        callback: function (r?: any) {
          if (!r.exc) {
            me.frm.refresh_fields()
          }
        },
      })
    }
  }
  hide(this: any) {
    this.$input.hide()
  }
  set_input_areas(this: any) {
    super.set_input_areas()
    $(this.disp_area).removeClass().addClass('hide')
  }
  set_empty_description(this: any) {
    this.$wrapper.find('.help-box').empty().toggle(false)
  }
  set_label(this: any, label?: any) {
    if (label) {
      this.df.label = label
    }
    label = (this.df.icon ? frappe.utils.icon(this.df.icon) : '') + __(this.df.label, null, this.df.parent)
    $(this.label_span).html('&nbsp;')
    this.$input && this.$input.html(label)
  }
}
