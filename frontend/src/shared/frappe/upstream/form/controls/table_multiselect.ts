import { $, __, cstr, frappe } from '@/shared/frappe/runtime'
frappe.ui.form.ControlTableMultiSelect = class ControlTableMultiSelect extends frappe.ui.form.ControlLink {
  [key: string]: any
  static horizontal = false
  make(this: any) {
    super.make()
    const link_field = this.get_link_field()
    if (link_field?.ignore_user_permissions) {
      this.df.ignore_user_permissions = true
    }
  }
  make_input(this: any) {
    super.make_input()
    this.$input_area.addClass('form-control table-multiselect')
    this.$input.removeClass('form-control')
    this.$input.on('awesomplete-selectcomplete', () => {
      this.$input.val('').focus()
    })
    this.rows = this._get_rows() || []
    this._rows_list = []
    this.$input_area.on('click', (e?: any) => {
      if (e.target === this.$input_area.get(0)) {
        this.$input.focus()
      }
    })
    this.$input_area.on('mousedown', '.btn-remove', (e?: any) => e.preventDefault())
    this.$input_area.on('click', '.btn-remove', (e?: any) => {
      e.preventDefault()
      e.stopPropagation()
      const $target = $(e.currentTarget)
      const $value = $target.closest('.tb-selected-value')
      const index = this.$input_area.find('.tb-selected-value').index($value)
      const current_rows = this._get_rows() || []
      const removed_row = current_rows[index]
      const rows = current_rows.filter((_?: any, row_index?: any) => row_index !== index)
      if (!this.frm) {
        this.set_model_value(rows).then(() => this.awesomplete.evaluate())
        return
      }
      if (removed_row) {
        frappe.run_serially([
          () => {
            return this.frm?.script_manager.trigger(
              `before_${this.df.fieldname}_remove`,
              this.df.options,
              removed_row.name,
            )
          },
          async () => {
            frappe.model.clear_doc(this.df.options, removed_row.name)
            await this.set_model_value(rows)
            this.frm?.dirty()
            this.refresh()
            if (this.$input.is(':focus')) this.awesomplete.evaluate()
            return this.frm?.script_manager.trigger(`${this.df.fieldname}_remove`, this.df.options, removed_row.name)
          },
        ])
      }
      this._update_rows(rows)
    })
    this.$input_area.on('click', '.btn-link-to-form', (e?: any) => {
      const $target = $(e.currentTarget)
      const $value = $target.closest('.tb-selected-value')
      const value = decodeURIComponent($value.data().value)
      const link_field = this.get_link_field()
      frappe.set_route('Form', link_field.options, value)
    })
    this.$input.on('keydown', (e?: any) => {
      if (e.keyCode == frappe.ui.keyCode.BACKSPACE && e.target.value === '') {
        const rows = this._get_rows().slice(0, -1)
        this.set_model_value(rows).then(() => this.awesomplete.evaluate())
      }
    })
  }
  _get_rows(this: any) {
    return this.get_model_value() || this.rows
  }
  _update_rows(this: any, rows?: any) {
    this.rows = rows
    const link_fieldname = this.get_link_field().fieldname
    this._rows_list = rows.map((row?: any) => row[link_fieldname])
    return rows
  }
  setup_buttons(this: any) {
    this.$input_area.find('.link-btn').remove()
  }
  parse(this: any, value?: any) {
    let rows = this._get_rows()
    if (typeof value == 'object' || !rows) {
      return value
    }
    const link_field = this.get_link_field()
    value = cstr(value).trim()
    if (!value) return rows
    this.set_input_value('')
    if (rows.some((row?: any) => cstr(row[link_field.fieldname]) === value)) return rows
    if (this.rows?.some((row?: any) => cstr(row[link_field.fieldname]) === value)) return this.rows
    let new_row: any
    if (this.frm) {
      new_row = frappe.model.add_child(this.frm.doc, this.df.options, this.df.fieldname)
      new_row[link_field.fieldname] = value
      rows = this.get_model_value()
      rows.pop()
    } else {
      new_row = {
        [link_field.fieldname]: value,
      }
    }
    const new_rows: any = [...rows, new_row]
    this._update_rows(new_rows)
    return new_rows
  }
  async validate(this: any, value?: any) {
    const rows = (value || []).slice()
    if (rows.length === 0) {
      return rows
    }
    const all_rows_except_last = rows.slice(0, rows.length - 1)
    const last_row = rows[rows.length - 1]
    const link_field = this.get_link_field()
    const link_value = last_row[link_field.fieldname]
    if (
      frappe.utils.is_empty(link_value) ||
      all_rows_except_last.some((row?: any) => cstr(row[link_field.fieldname]) === cstr(link_value))
    ) {
      return all_rows_except_last
    }
    if (!this.df.ignore_link_validation) {
      const validated_value = await this.validate_link_and_fetch(link_value)
      if (frappe.utils.is_empty(validated_value)) {
        return all_rows_except_last
      }
      last_row[link_field.fieldname] = validated_value
    }
    return rows
  }
  async set_model_value(this: any, value?: any) {
    const old_length = this._get_rows()?.length || 0
    const new_length = value?.length || 0
    const result = super.set_model_value(...arguments)
    this._update_rows(value)
    if (new_length - old_length === 1 && this.frm) {
      const new_row = value[value.length - 1]
      await this.frm.script_manager.trigger(`${this.df.fieldname}_add`, this.df.options, new_row.name)
    }
    return result
  }
  set_formatted_input(this: any, value?: any) {
    this._update_rows(value || [])
    const link_field = this.get_link_field()
    const values = (value || []).map((row?: any) => row[link_field.fieldname])
    this.set_pill_html(values)
  }
  set_pill_html(this: any, values?: any) {
    const html = values.map((value?: any) => this.get_pill_html(value)).join('')
    this.$input_area.find('.tb-selected-value').remove()
    this.$input_area.prepend(html)
  }
  get_pill_html(this: any, value?: any) {
    const link_field = this.get_link_field()
    const encoded_value = encodeURIComponent(value)
    const pill_name = frappe.utils.get_link_title(link_field.options, value) || value
    return `
			<button type="button" class="data-pill btn tb-selected-value" data-value="${encoded_value}">
				<span class="btn-link-to-form">${__(frappe.utils.escape_html(pill_name))}</span>
				<span class="btn-remove">${frappe.utils.icon('x')}</span>
			</button>
		`
  }
  get_options(this: any) {
    return (this.get_link_field() || {}).options
  }
  on_input(this: any, e?: any) {
    if (!this.df.is_web_form) {
      return super.on_input(e)
    }
    const term = (e ? e.target.value : this.$input.val()) || ''
    this.awesomplete.list = this.filter_web_form_options(term)
  }
  filter_web_form_options(this: any, term?: any) {
    if (!this._web_form_options) {
      let options = this.get_link_field().link_options || []
      if (typeof options === 'string') {
        options = options[0] === '[' ? JSON.parse(options) : options.split('\n')
      }
      this._web_form_options = options
        .filter(Boolean)
        .map((o?: any) => (typeof o === 'string' ? { value: o, label: o } : o))
    }
    const limit = 50
    const query = term.toLowerCase()
    if (!query) return this._web_form_options.slice(0, limit)
    const matches: any = []
    for (const o of this._web_form_options) {
      if (o.value.toLowerCase().includes(query) || (o.label || '').toLowerCase().includes(query)) {
        matches.push(o)
      }
      if (matches.length === limit) break
    }
    return matches
  }
  get_link_field(this: any) {
    if (!this._link_field) {
      const meta = frappe.get_meta(this.df.options)
      const fields = meta?.fields?.length ? meta.fields : this.df.fields || []
      this._link_field = fields.find((df?: any) => df.fieldtype === 'Link')
      if (!this._link_field) {
        throw new Error('Table MultiSelect requires a Table with atleast one Link field')
      }
    }
    return this._link_field
  }
  custom_awesomplete_filter(this: any, awesomplete?: any) {
    let me = this
    awesomplete.filter = function (item?: any) {
      if (me._rows_list.includes(item.value)) {
        return false
      }
      return true
    }
  }
  get_input_value(this: any) {
    return this.$input ? this.$input.val() : undefined
  }
  update_value(this: any) {
    let value = this.get_input_value()
    if (value !== this.last_value) {
      this.parse_validate_and_set_in_model(value)
    }
  }
}
