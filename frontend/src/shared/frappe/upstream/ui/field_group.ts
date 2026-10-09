import { $, __, cstr, frappe, is_null } from '@/shared/frappe/runtime'
import '../form/layout'
frappe.provide('frappe.ui')
frappe.ui.FieldGroup = class FieldGroup extends frappe.ui.form.Layout {
  [key: string]: any
  constructor(opts?: any) {
    super(opts)
    this.dirty = false
    this.fetch_dict = {}
    $.each(this.fields || [], function (_i?: any, f?: any) {
      if (!f.fieldname && f.label) {
        f.fieldname = f.label.replace(/ /g, '_').toLowerCase()
      }
    })
    if (this.values) {
      this.set_values(this.values)
    }
  }
  resolve_date_default_keywords(def_value?: any, fieldtype?: any) {
    if (!def_value) return def_value
    def_value = def_value.toLowerCase()
    if (def_value == 'today' && fieldtype == 'Date') {
      return frappe.datetime.get_today()
    }
    if (def_value == 'now') {
      if (fieldtype == 'Datetime') {
        return frappe.datetime.now_datetime()
      }
      if (fieldtype == 'Time') {
        return frappe.datetime.now_time()
      }
    }
    return def_value
  }
  get_field_default_value(this: any, field?: any) {
    let def_value = field.df['default']
    if (def_value == null || (!def_value && !frappe.model.is_numeric_field(field.df.fieldtype))) return
    if (typeof def_value !== 'string') return def_value
    if (['Date', 'Datetime', 'Time'].includes(field.df.fieldtype)) {
      def_value = this.resolve_date_default_keywords(def_value, field.df.fieldtype)
    } else if (def_value == '__user' || def_value.toLowerCase() == 'user') {
      def_value = frappe.session.user
    } else if (def_value == 'user_fullname') {
      def_value = frappe.session.user_fullname
    }
    return def_value
  }
  make(this: any) {
    let me = this
    if (this.fields) {
      super.make()
      this.refresh()
      const is_saved_doc = this.doc?.name && !this.doc.__islocal
      if (!is_saved_doc) {
        let defaults: any = {}
        $.each(this.fields_list, (_i?: any, field?: any) => {
          let def_value = this.get_field_default_value(field)
          if (def_value === undefined) return
          defaults[field.df.fieldname] = def_value
        })
        this.set_values(defaults).then(() => {
          me.refresh_dependency()
        })
      }
      if (!this.no_submit_on_enter) {
        this.catch_enter_as_submit()
      }
      $(this.wrapper)
        .find('input, select')
        .on(
          'change awesomplete-selectcomplete',
          frappe.utils.debounce(() => {
            this.dirty = true
            me.refresh_dependency()
          }, 100),
        )
        .on('input', () => {
          if (!this.dirty) {
            this.dirty = true
          }
        })
    }
  }
  focus_on_first_input(this: any) {
    if (this.no_focus) return
    $.each(this.fields_list, function (_i?: any, f?: any) {
      if (!['Date', 'Datetime', 'Time', 'Check'].includes(f.df.fieldtype) && f.set_focus) {
        f.set_focus()
        return false
      }
    })
  }
  catch_enter_as_submit(this: any) {
    let me = this
    $(this.body)
      .find('input[type="text"], input[type="password"], select')
      .keypress(function (e?: any) {
        if (e.which == 13) {
          if (me.has_primary_action) {
            e.preventDefault()
            frappe.app.trigger_primary_action()
          }
        }
      })
  }
  get_input(this: any, fieldname?: any) {
    let field = this.fields_dict[fieldname]
    if (!field) return ''
    return $(field.txt ? field.txt : field.input)
  }
  get_field(this: any, fieldname?: any) {
    return this.fields_dict[fieldname]
  }
  get_values(this: any, ignore_errors?: any, check_invalid?: any) {
    let ret: any = {}
    let errors: any = []
    let invalid: any = []
    for (let key in this.fields_dict) {
      let f = this.fields_dict[key]
      if (f.get_value) {
        let v = f.get_value()
        if (!v && f.df.include_default) {
          v = f.df.default
        }
        if (f.df.reqd && is_null(typeof v === 'string' ? strip_html(v) : v)) errors.push(__(f.df.label))
        if (f.df.reqd && f.df.fieldtype === 'Text Editor' && is_null(strip_html(cstr(v)))) errors.push(__(f.df.label))
        if (!is_null(v)) ret[f.df.fieldname] = v
      }
      if ((this.is_dialog || this.doctype === 'Web Form') && f.df.reqd && !f.value) {
        f.refresh_input()
      }
      if (f.df.invalid) {
        invalid.push(__(f.df.label))
      }
    }
    if (errors.length && !ignore_errors) {
      frappe.msgprint({
        title: __('Missing Values Required'),
        message: __('Following fields have missing values:') + '<br><br><ul><li>' + errors.join('<li>') + '</ul>',
        indicator: 'orange',
      })
      return null
    }
    if (invalid.length && check_invalid) {
      frappe.msgprint({
        title: __('Invalid Values'),
        message: __('Following fields have invalid values:') + '<br><br><ul><li>' + invalid.join('<li>') + '</ul>',
        indicator: 'orange',
      })
      return null
    }
    return ret
  }
  get_value(this: any, key?: any) {
    let f = this.fields_dict[key]
    return f && (f.get_value ? f.get_value() : null)
  }
  set_value(this: any, key?: any, val?: any) {
    return new Promise((resolve?: any) => {
      let f = this.fields_dict[key]
      if (f) {
        f.set_value(val).then(() => {
          f.set_input?.(val)
          this.refresh_dependency()
          resolve()
        })
      } else {
        resolve()
      }
    })
  }
  has_field(this: any, fieldname?: any) {
    return !!this.fields_dict[fieldname]
  }
  set_input(this: any, key?: any, val?: any) {
    return this.set_value(key, val)
  }
  set_values(this: any, dict?: any) {
    let promises: any = []
    for (let key in dict) {
      if (this.fields_dict[key]) {
        promises.push(this.set_value(key, dict[key]))
      }
    }
    return Promise.all(promises)
  }
  clear(this: any) {
    for (let key in this.fields_dict) {
      let f = this.fields_dict[key]
      if (f && f.set_input) {
        f.set_input(f.df['default'] || '')
      }
    }
  }
  set_df_property(this: any, fieldname?: any, prop?: any, value?: any) {
    if (!fieldname) {
      return
    }
    const field = this.get_field(fieldname)
    field.df[prop] = value
    field.refresh()
  }
  set_query(this: any, fieldname?: any, opt1?: any, opt2?: any) {
    if (opt2) {
      if (this.fields_dict[opt1]) this.fields_dict[opt1].grid.get_field(fieldname).get_query = opt2
    } else {
      if (this.fields_dict[fieldname]) {
        this.fields_dict[fieldname].get_query = opt1
      }
    }
  }
  add_fetch(this: any, link_field?: any, source_field?: any, target_field?: any, target_doctype?: any) {
    if (!target_doctype) target_doctype = '*'
    this.fetch_dict.setDefault(target_doctype, {}).setDefault(link_field, {})[target_field] = source_field
  }
  is_new(this: any) {
    return this.doc.__islocal
  }
}
