import { $, __, cstr, frappe } from '@/shared/frappe/runtime'
import Awesomplete from '../../ui/awesomplete'
frappe.ui.form.ControlAutocomplete = class ControlAutoComplete extends frappe.ui.form.ControlData {
  [key: string]: any
  static trigger_change_on_input_event = false
  make_input(this: any) {
    super.make_input()
    this.setup_awesomplete()
    this.set_options()
  }
  set_options(this: any) {
    if (this.df.options) {
      let options = this.df.options || []
      if (options == 'Installed Applications') {
        this.load_installed_apps()
      }
      this.set_data(options)
    }
  }
  format_for_input(this: any, value?: any) {
    if (value == null) {
      return ''
    } else if (this._data && this._data.length) {
      const item = this._data.find((i?: any) => i.value == value)
      return item ? item.label : value
    } else {
      return value
    }
  }
  get_input_value(this: any) {
    if (this.$input) {
      const label = this.$input.val()
      const item = this._data?.find((i?: any) => i.label == label)
      return item ? item.value : label
    }
  }
  get_awesomplete_settings(this: any) {
    let me = this
    return {
      tabSelect: false,
      minChars: 0,
      maxItems: this.df.max_items || 99,
      autoFirst: true,
      list: this.get_data(),
      data: function (item?: any) {
        let d: any
        if (typeof item !== 'object') {
          d = { value: item }
          item = d
        }
        return {
          label: item.label || item.value,
          value: item.value,
        }
      },
      filter: function (this: any, item?: any, input?: any) {
        const d = this.get_item(item.value)
        const hay = d.description ? d.label + d.description + d.value : d.label + d.value
        return Awesomplete.FILTER_CONTAINS(hay, input)
      },
      item: function (this: any, item?: any) {
        let d = this.get_item(item.value)
        if (!d) {
          d = item
        }
        if (!d.label) {
          d.label = d.value
        }
        let _label = me.translate_values ? __(d.label, null, d.parent) : d.label
        let html = '<strong>' + _label + '</strong>'
        if (d.description) {
          html += '<br><span class="small">' + __(d.description) + '</span>'
        }
        return $('<li></li>')
          .data('item.autocomplete', d)
          .prop('aria-selected', 'false')
          .html('<a><p>' + html + '</p></a>')
          .get(0)
      },
      sort: () => {
        return 0
      },
    }
  }
  setup_awesomplete(this: any) {
    this.awesomplete = new Awesomplete(this.input, this.get_awesomplete_settings())
    $(this.input_area).find('.awesomplete ul').css('min-width', '100%')
    this.$input.on('input', (e?: any) => {
      if (this.get_query || this.df.get_query) {
        this.execute_query_if_exists(e.target.value)
      } else {
        this.awesomplete.list = this.get_data()
      }
    })
    this.$input.on('focus', () => {
      if (!this.$input.val()) {
        this.$input.val('')
        this.$input.trigger('input')
      }
    })
    this.$input.on('blur', () => {
      if (this.selected) {
        this.selected = false
        return
      }
      let value = this.get_input_value()
      if (value !== this.last_value) {
        this.parse_validate_and_set_in_model(value)
      }
    })
    this.$input.on('awesomplete-open', () => {
      this.autocomplete_open = true
    })
    this.$input.on('awesomplete-close', () => {
      this.autocomplete_open = false
    })
    this.$input.on('awesomplete-selectcomplete', () => {
      this.$input.trigger('change')
    })
  }
  validate(this: any, value?: any) {
    if (this.df.ignore_validation) {
      return value || ''
    }
    let valid_values = this.awesomplete._list.map((d?: any) => d.value)
    if (!valid_values.length) {
      return value
    }
    if (valid_values.includes(value)) {
      return value
    } else {
      return ''
    }
  }
  parse_options(options?: any) {
    if (typeof options === 'string' && options[0] === '[') {
      options = frappe.utils.parse_json(options)
    }
    if (typeof options === 'string') {
      options = options.split('\n')
    }
    if (typeof options[0] === 'string') {
      options = options.map((o?: any) => ({ label: o, value: o }))
    }
    options = options.map((o?: any) => {
      if (typeof o !== 'string') {
        o.label = __(cstr(o.label)) || cstr(o.value)
        o.value = cstr(o.value)
      }
      return o
    })
    return options
  }
  execute_query_if_exists(this: any, term?: any) {
    let q: any
    const args: any = { txt: term }
    let get_query = this.get_query || this.df.get_query
    if (!get_query) {
      return
    }
    let set_nulls = function (obj?: any) {
      $.each(obj, function (key?: any, value?: any) {
        if (value !== undefined) {
          obj[key] = value
        }
      })
      return obj
    }
    let process_query_object = function (this: any, obj?: any) {
      if (obj.query) {
        args.query = obj.query
      }
      if (obj.params) {
        set_nulls(obj.params)
        Object.assign(args, obj.params)
      }
      if (obj.translate_values !== undefined) {
        this.translate_values = obj.translate_values
      }
    }
    if ($.isPlainObject(get_query)) {
      process_query_object(get_query)
    } else if (typeof get_query === 'string') {
      args.query = get_query
    } else {
      q = get_query((this.frm && this.frm.doc) || this.doc, this.doctype, this.docname, this.frm)
      if (typeof q === 'string') {
        args.query = q
      } else if ($.isPlainObject(q)) {
        process_query_object(q)
      }
    }
    if (args.query) {
      frappe.call({
        method: args.query,
        args: args,
        callback: ({ message }: any) => {
          if (!this.$input.is(':focus')) {
            return
          }
          this.set_data(message)
        },
      })
    }
  }
  get_data(this: any) {
    return this._data || []
  }
  set_data(this: any, data?: any) {
    data = this.parse_options(data)
    if (this.awesomplete) {
      this.awesomplete.list = data
    }
    this._data = data
  }
  async load_installed_apps(this: any) {
    const me = this
    await frappe.call({
      method: 'frappe.desk.desktop.get_installed_apps',
      callback: function (r?: any) {
        if (r.message) {
          me.set_data(r.message)
        }
      },
    })
  }
}
