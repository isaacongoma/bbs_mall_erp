import { $, __, cint, cstr, frappe, locals } from '@/shared/frappe/runtime'
import Awesomplete from '../../ui/awesomplete'
frappe.ui.form.recent_link_validations = {}
frappe.ui.form.ControlLink = class ControlLink extends frappe.ui.form.ControlData {
  [key: string]: any
  static trigger_change_on_input_event = false
  make_input(this: any) {
    let me = this
    $(`<div class="link-field ui-front" style="position: relative;">
			<input type="text" class="input-with-feedback form-control">
			<span class="link-btn">
				<a class="btn-clear" style="display: inline-flex;" title="${__('Clear Link')}">
					${frappe.utils.icon('x', 'xs')}
				</a>
				<a class="btn-open" style="display: inline-flex;" title="${__('Open Link')}">
					${frappe.utils.icon('arrow-right', 'xs')}
				</a>
			</span>
		</div>`).prependTo(this.input_area)
    this.$input_area = $(this.input_area)
    this.$input = this.$input_area.find('input')
    this.$link = this.$input_area.find('.link-btn')
    this.$link_clear = this.$input_area.find('.btn-clear')
    this.$link_open = this.$link.find('.btn-open')
    this.set_input_attributes()
    this.$link_clear.on('click', function () {
      me.$link.toggle(false)
      me.$input.val('').focus()
    })
    this.$input.on('focus', function () {
      if (!me.$input.val()) {
        me.$input.val('')
        me.on_input()
      }
      me.show_link_and_clear_buttons()
    })
    this.$input.on('blur', function () {
      setTimeout(function () {
        me.$link.toggle(false)
        me.hide_link_and_clear_buttons()
      }, 250)
    })
    this.$input_area.on('mouseenter', () => {
      this.show_link_and_clear_buttons()
    })
    this.$input_area.on('mouseleave', () => {
      if (!this.$input.is(':focus')) {
        this.hide_link_and_clear_buttons()
      }
    })
    this.$input.attr('data-target', this.df.options)
    this.input = this.$input.get(0)
    this.has_input = true
    this.translate_values = true
    this.setup_buttons()
    this.setup_awesomeplete()
    this.bind_change_event()
  }
  show_link_and_clear_buttons(this: any) {
    if (this.$input.val() && this.get_options()) {
      const doctype = this.get_options()
      const name = this.get_input_value()
      this.$link.toggle(true)
      this.$link_open.attr('href', frappe.utils.get_form_link(doctype, name))
      this.$link_clear.toggle(this.is_clear_button_enabled())
    }
  }
  is_clear_button_enabled() {
    return frappe.defaults.is_enabled('allow_clearing_link_fields')
  }
  hide_link_and_clear_buttons(this: any) {
    this.$link.toggle(false)
    this.$link_clear.toggle(false)
  }
  get_options(this: any) {
    return this.df.options
  }
  get_reference_doctype(this: any) {
    if (this.doctype) return this.doctype
    else {
      return frappe.get_route && frappe.get_route()[0] === 'List' ? frappe.get_route()[1] : null
    }
  }
  setup_buttons(this: any) {
    if (this.only_input && !this.with_link_btn) {
      this.$input_area.find('.link-btn').remove()
    }
  }
  set_formatted_input(this: any, value?: any) {
    super.set_formatted_input(value)
    if (!value) return
    if (!this.title_value_map) {
      this.title_value_map = {}
    }
    this.set_link_title(value)
  }
  get_translated(this: any, value?: any) {
    return this.is_translatable() ? __(value) : value
  }
  is_translatable(this: any) {
    return (frappe.boot?.translated_doctypes || []).includes(this.get_options())
  }
  is_title_link(this: any) {
    return (frappe.boot?.link_title_doctypes || []).includes(this.get_options())
  }
  async set_link_title(this: any, value?: any) {
    const doctype = this.get_options()
    if (!doctype || !this.is_title_link()) {
      this.translate_and_set_input_value(value, value)
      return
    }
    const link_title =
      frappe.utils.get_link_title(doctype, value) || (await frappe.utils.fetch_link_title(doctype, value))
    this.translate_and_set_input_value(link_title, value)
  }
  translate_and_set_input_value(this: any, link_title?: any, value?: any) {
    let translated_link_text = this.get_translated(link_title)
    this.title_value_map[translated_link_text] = value
    this.set_input_value(translated_link_text)
  }
  parse_validate_and_set_in_model(this: any, value?: any, e?: any, label?: any) {
    if (this.parse) value = this.parse(value)
    if (label) {
      this.label = this.get_translated(label)
      frappe.utils.add_link_title(this.get_options(), value, label)
    }
    return this.validate_and_set_in_model(value, e)
  }
  parse(value?: any) {
    return strip_html(value)
  }
  get_input_value(this: any) {
    if (this.$input) {
      const input_value = this.$input.val()
      return this.title_value_map?.[input_value] || input_value
    }
    return null
  }
  get_label_value(this: any) {
    return this.$input?.val() || ''
  }
  set_input_value(this: any, value?: any) {
    this.$input && this.$input.val(value)
  }
  open_advanced_search(this: any) {
    let doctype = this.get_options()
    if (!doctype) return
    new frappe.ui.form.LinkSelector({
      doctype: doctype,
      target: this,
      txt: this.get_input_value(),
    })
    return false
  }
  new_doc(this: any) {
    this.$input._created_new_doc = true
    let doctype = this.get_options()
    let me = this
    if (!doctype) return
    let df = this.df
    if (this.frm && this.frm.doctype !== this.df.parent) {
      df = this.frm.get_docfield(this.doc.parentfield, this.df.fieldname)
    }
    if (df && df.get_route_options_for_new_doc) {
      frappe.route_options = df.get_route_options_for_new_doc(this)
    } else {
      frappe.route_options = {}
    }
    frappe.route_options.name_field = this.get_label_value()
    frappe._from_link = {
      field_obj: this,
      doc: this.doc,
      set_route_args: ['Form', this.frm?.doctype, this.frm?.docname],
      scrollY: $(document).scrollTop(),
    }
    frappe.ui.form.make_quick_entry(doctype, (doc?: any) => {
      return me.set_value(doc.name)
    })
    return false
  }
  setup_awesomeplete(this: any) {
    let me = this
    this.$input.cache = {}
    this.awesomplete = new Awesomplete(me.input, {
      tabSelect: true,
      minChars: 0,
      maxItems: 99,
      autoFirst: true,
      list: [],
      replace: function (this: any, item?: any) {
        this.input.value = me.get_translated(item.label || item.value)
      },
      data: function (item?: any) {
        return {
          label: me.get_translated(item.label || item.value),
          value: item.value,
        }
      },
      filter: function () {
        return true
      },
      item: function (this: any, item?: any) {
        let d = this.get_item(item.value)
        if (!d.label) {
          d.label = d.value
        }
        let _label = frappe.utils.escape_html(me.get_translated(d.label))
        let html = d.html || '<strong>' + _label + '</strong>'
        if (d.description && (me.is_title_link() || d.value !== d.description)) {
          html +=
            '<br><span class="small">' + __(frappe.utils.html2text(frappe.utils.escape_html(d.description))) + '</span>'
        }
        return $(`<div role="option">`)
          .on('click', (event?: any) => {
            me.awesomplete.select(event.currentTarget, event.currentTarget)
            me.show_link_and_clear_buttons()
          })
          .data('item.autocomplete', d)
          .prop('aria-selected', 'false')
          .html(`<p title="${frappe.utils.escape_html(_label)}">${html}</p>`)
          .get(0)
      },
      sort: function () {
        return 0
      },
    })
    this.custom_awesomplete_filter && this.custom_awesomplete_filter(this.awesomplete)
    this._debounced_input_handler = frappe.utils.debounce(this.on_input.bind(this), 500)
    this.$input.on('input', this._debounced_input_handler)
    this.$input.on('blur', function () {
      if (me.selected) {
        me.selected = false
        return
      }
      let value = me.get_input_value()
      let label = me.get_label_value()
      if (value !== (me.value || '')) {
        me.parse_validate_and_set_in_model(value, null, label)
      }
    })
    this.$input.on('awesomplete-open', () => {
      this.autocomplete_open = true
      if (!me.get_label_value()) {
        me.$link.toggle(false)
      }
      const dropdown = this.awesomplete.ul
      const dropdownRect = dropdown.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      if (dropdownRect.right > viewportWidth) {
        dropdown.classList.add('awesomplete-align-right')
      } else {
        dropdown.classList.remove('awesomplete-align-right')
      }
    })
    this.$input.on('awesomplete-close', () => {
      this.autocomplete_open = false
      if (!me.get_label_value()) {
        me.$link.toggle(false)
      }
    })
    this.$input.on('awesomplete-select', function (e?: any) {
      let o = e.originalEvent
      let item = me.awesomplete.get_item(o.text.value)
      me.autocomplete_open = false
      const TABKEY = 9
      const ENTERKEY = 13
      const event = o.originalEvent
      if (event && [TABKEY, ENTERKEY].includes(event.keyCode)) {
        const input = me.get_label_value().toLowerCase()
        if (!input && event.keyCode === TABKEY) {
          e.preventDefault()
          me.awesomplete.close()
          return false
        } else if (input && !me.input_matches_item(input, item)) {
          e.preventDefault()
          if (event.preventDefault) {
            event.preventDefault()
          }
          return false
        }
      }
      if (item.value === 'filter_description__link_option') {
        e.preventDefault()
        return false
      }
      if (item.action) {
        item.value = ''
        item.label = ''
        item.action.apply(me)
      }
      if (me.df.remember_last_selected_value) {
        frappe.boot.user.last_selected_values[me.df.options] = item.value
      }
      me.parse_validate_and_set_in_model(item.value, null, item.label)
    })
    this.$input.on('awesomplete-selectcomplete', function (e?: any) {
      let o = e.originalEvent
      if (cstr(o.text.value).indexOf('__link_option') !== -1) {
        me.$input.val('')
      }
    })
  }
  input_matches_item(this: any, input?: any, item?: any) {
    return (
      input &&
      [this.get_translated(item.label ?? item.value), item.value, item.description].some((value?: any) =>
        cstr(value).toLowerCase().includes(input),
      )
    )
  }
  are_filters_large(filters?: any, max_get_size: any = 2000) {
    if (!filters) return [false, filters]
    let filters_str = filters
    if (typeof filters !== 'string') {
      try {
        filters_str = JSON.stringify(filters)
      } catch (e: any) {
        return [true, filters]
      }
    }
    const estimated_size = filters_str.length * 1.3
    return [estimated_size > max_get_size, filters_str]
  }
  get_search_args(this: any, txt?: any) {
    const doctype = this.get_options()
    if (!doctype) return
    const reference_doctype = this.get_reference_doctype() || ''
    const docfield_parent = this.df?.parent || reference_doctype || (this.frm && this.frm.doctype) || ''
    const meta_df =
      docfield_parent && this.df?.fieldname ? frappe.meta.get_docfield(docfield_parent, this.df.fieldname) : null
    const args: any = {
      txt,
      doctype,
      ignore_user_permissions: this.df?.ignore_user_permissions || meta_df?.ignore_user_permissions,
      reference_doctype,
      page_length: cint(frappe.boot.sysdefaults?.link_field_results_limit) || 10,
      link_fieldname: this.df.fieldname,
    }
    this.set_custom_query(args)
    return args
  }
  on_input(this: any, e?: any) {
    const term = e ? e.target.value : this.$input.val()
    const args = this.get_search_args(term)
    if (!args) return
    const doctype = args.doctype
    const cache = this.$input.cache
    if (!cache[doctype]) {
      cache[doctype] = {}
    }
    if (cache[doctype][term] != null) {
      this.awesomplete.list = cache[doctype][term]
    }
    const filters = args.filters
    let use_get = !term && !this.$input._created_new_doc
    if (use_get) {
      const [are_filters_large, filters_str] = this.are_filters_large(filters)
      use_get = !are_filters_large
      args.filters = filters_str
    }
    frappe.call({
      type: use_get ? 'GET' : 'POST',
      method: 'frappe.desk.search.search_link',
      no_spinner: true,
      cache: use_get,
      args: args,
      callback: async (r?: any) => {
        if (!window.Cypress && !this.$input.is(':focus')) {
          return
        }
        r.message = this.merge_duplicates(r.message)
        let filter_string = this.df.filter_description
          ? this.df.filter_description
          : filters
            ? await this.get_filter_description(filters)
            : null
        if (filter_string) {
          r.message.push({
            html: `<span class="text-muted" style="line-height: 1.5">${filter_string}</span>`,
            value: 'filter_description__link_option',
            action: () => {},
          })
        }
        if (!this.df.only_select) {
          if (frappe.model.can_create(doctype)) {
            r.message.push({
              html:
                "<span class='link-option'>" +
                frappe.utils.icon('plus', 'sm', '', 'margin-right: 5px;') +
                ' ' +
                __('Create a new {0}', [__(this.get_options())]) +
                '</span>',
              label: __('Create a new {0}', [__(this.get_options())]),
              value: 'create_new__link_option',
              action: this.new_doc,
            })
          }
          let custom__link_options =
            frappe.ui.form.ControlLink.link_options && frappe.ui.form.ControlLink.link_options(this)
          if (custom__link_options) {
            r.message = r.message.concat(custom__link_options)
          }
          if (locals && locals['DocType']) {
            r.message.push({
              html:
                "<span class='link-option'>" +
                frappe.utils.icon('search', 'sm', '', 'margin-right: 5px;') +
                ' ' +
                __('Advanced Search') +
                '</span>',
              label: __('Advanced Search'),
              value: 'advanced_search__link_option',
              action: this.open_advanced_search,
            })
          }
        }
        cache[doctype][term] = r.message
        this.awesomplete.list = cache[doctype][term]
        this.toggle_href(doctype)
        r.message.forEach((item?: any) => {
          frappe.utils.add_link_title(doctype, item.value, item.label)
        })
      },
    })
  }
  show_untranslated(this: any) {
    let value = this.get_input_value()
    this.is_translatable() && this.set_input_value(value)
  }
  merge_duplicates(results?: any) {
    return results.reduce((newArr?: any, currElem?: any) => {
      if (newArr.length === 0) return [currElem]
      let element_with_same_value = newArr.find((e?: any) => e.value === currElem.value)
      if (element_with_same_value) {
        if (currElem.description) {
          element_with_same_value.description += `, ${currElem.description}`
        }
        return [...newArr]
      }
      return [...newArr, currElem]
    }, [])
  }
  toggle_href(this: any, doctype?: any) {
    if (frappe.model.can_select(doctype) && !frappe.model.can_read(doctype)) {
      this.$input_area.find('.link-btn').addClass('hide')
    } else {
      this.$input_area.find('.link-btn').removeClass('hide')
    }
  }
  async get_filter_description(this: any, filters?: any) {
    const doctype = this.get_options()
    let filter_array: any = []
    if (!Array.isArray(filters)) {
      for (let fieldname in filters) {
        let value = filters[fieldname]
        if (!Array.isArray(value)) {
          value = ['=', value]
        }
        filter_array.push([doctype, fieldname, ...value])
      }
    } else {
      filter_array = filters.slice()
    }
    filter_array = filter_array.map((f?: any) => (f.length === 3 ? [doctype, ...f] : f))
    function formatValueForDisplay(docfield?: any, val?: any) {
      if (docfield && docfield.fieldtype === 'Check') {
        return val == 1 || val === true ? __('Yes') : __('No')
      }
      if (Array.isArray(val)) {
        const filtered = val.filter((v?: any) => v != null && v !== '')
        const arr = filtered.slice(0, 5).map((v?: any) => {
          if (typeof v === 'string') {
            return `"${String(__(v))}"`
          }
          return String(v)
        })
        if (filtered.length > 5) arr.push('...')
        return arr.join(', ')
      }
      if (val == null || val === '') {
        return __('empty', null, 'Comparison value is empty')
      }
      if (typeof val === 'string') {
        return `"${String(__(val))}"`
      }
      return frappe.format(val, docfield || {}, { inline: true })
    }
    async function describe_filter(filter?: any) {
      const _doctype = filter[0]
      const fieldname = filter[1]
      const operator = filter[2]
      let value = filter[3]
      await frappe.model.with_doctype(_doctype, () => {})
      const docfield = frappe.meta.get_docfield(_doctype, fieldname)
      const label = docfield ? docfield.label : frappe.model.unscrub(fieldname)
      const fieldtype = docfield ? docfield.fieldtype : null
      const labelDisplay = `<i>${String(__(label, null, _doctype))}</i>`
      const valueDisplay = formatValueForDisplay(docfield, value)
      const is_time_like = ['Date', 'Datetime', 'Time'].includes(fieldtype)
      switch (operator) {
        case '=':
          if (fieldtype === 'Check') {
            if (fieldname === 'enabled') {
              return value == 1 ? __('is enabled') : __('is disabled')
            }
            if (fieldname === 'disabled') {
              return value == 1 ? __('is disabled') : __('is enabled')
            }
            return value == 1 ? __('{0} is enabled', [labelDisplay]) : __('{0} is disabled', [labelDisplay])
          }
          return __('{0} equals {1}', [labelDisplay, valueDisplay])
        case '!=':
          if (fieldtype === 'Check') {
            if (fieldname === 'enabled') {
              return value == 1 ? __('is disabled') : __('is enabled')
            }
            if (fieldname === 'disabled') {
              return value == 1 ? __('is enabled') : __('is disabled')
            }
            return value == 1 ? __('{0} is disabled', [labelDisplay]) : __('{0} is enabled', [labelDisplay])
          }
          return __('{0} is not equal to {1}', [labelDisplay, valueDisplay])
        case 'in':
          return __('{0} is one of {1}', [labelDisplay, valueDisplay])
        case 'not in':
          return __('{0} is not one of {1}', [labelDisplay, valueDisplay])
        case 'like':
          return __('{0} contains {1}', [labelDisplay, valueDisplay])
        case 'not like':
          return __('{0} does not contain {1}', [labelDisplay, valueDisplay])
        case '>':
          if (is_time_like) {
            return __('{0} is after {1}', [labelDisplay, valueDisplay])
          }
          return __('{0} is greater than {1}', [labelDisplay, valueDisplay])
        case '<':
          if (is_time_like) {
            return __('{0} is before {1}', [labelDisplay, valueDisplay])
          }
          return __('{0} is less than {1}', [labelDisplay, valueDisplay])
        case '>=':
          if (is_time_like) {
            return __('{0} is on or after {1}', [labelDisplay, valueDisplay])
          }
          return __('{0} is greater than or equal to {1}', [labelDisplay, valueDisplay])
        case '<=':
          if (is_time_like) {
            return __('{0} is on or before {1}', [labelDisplay, valueDisplay])
          }
          return __('{0} is less than or equal to {1}', [labelDisplay, valueDisplay])
        case 'is':
          if (value == 'set') {
            return __('{0} is set', [labelDisplay])
          }
          if (value == 'not set') {
            return __('{0} is not set', [labelDisplay])
          }
          return __('{0} is {1}', [labelDisplay, valueDisplay])
        case 'between':
          if (Array.isArray(value) && value.length === 2) {
            return __('{0} is between {1} and {2}', [
              labelDisplay,
              formatValueForDisplay(docfield, value[0]),
              formatValueForDisplay(docfield, value[1]),
            ])
          }
          return __('{0} is between {1}', [labelDisplay, valueDisplay])
        case 'descendants of':
          return __('{0} is a descendant of {1}', [labelDisplay, valueDisplay])
        case 'ancestors of':
          return __('{0} is an ancestor of {1}', [labelDisplay, valueDisplay])
        case 'not descendants of':
          return __('{0} is not a descendant of {1}', [labelDisplay, valueDisplay])
        case 'not ancestors of':
          return __('{0} is not an ancestor of {1}', [labelDisplay, valueDisplay])
        case 'timespan':
          return __('{0} is within {1}', [labelDisplay, valueDisplay])
        default:
          return [labelDisplay, operator, valueDisplay].join(' ')
      }
    }
    const descriptions = await Promise.all(filter_array.map((filter?: any) => describe_filter(filter)))
    const filter_string = frappe.utils.comma_and(descriptions)
    return __('Filtered by: {0}.', [filter_string])
  }
  set_custom_query(this: any, args?: any) {
    let get_query: any, filters: any, q: any
    const is_valid_value = (value?: any, key?: any) => {
      if (value) return true
      if (this.frm) {
        let field = frappe.meta.get_docfield(this.frm.doctype, key)
        return !field || !['Link', 'Dynamic Link'].includes(field.fieldtype)
      } else {
        return value !== undefined
      }
    }
    const set_nulls = (obj?: any) => {
      $.each(obj, (key?: any, value?: any) => {
        if (!is_valid_value(value, key)) {
          delete obj[key]
        }
      })
      return obj
    }
    if (this.get_query || this.df.get_query) {
      get_query = this.get_query || this.df.get_query
      if ($.isPlainObject(get_query)) {
        filters = null
        if (get_query.filters) {
          filters = get_query.filters
        } else if (get_query.query) {
          args.query = get_query
        } else {
          filters = get_query
        }
        if (filters) {
          filters = set_nulls(filters)
          $.extend(args, filters)
          args.filters = filters
        }
      } else if (typeof get_query === 'string') {
        args.query = get_query
      } else {
        q = get_query((this.frm && this.frm.doc) || this.doc, this.doctype, this.docname, this.frm)
        if (typeof q === 'string') {
          args.query = q
        } else if ($.isPlainObject(q)) {
          if (q.filters) {
            set_nulls(q.filters)
          }
          if (q.translate_values !== undefined) {
            this.translate_values = q.translate_values
          }
          $.extend(args, q)
          args.filters = q.filters
        }
      }
    }
    if (this.df.filters) {
      set_nulls(this.df.filters)
      if (!args.filters) args.filters = {}
      $.extend(args.filters, this.df.filters)
    }
    if (this.df.link_filters && !!this.df.link_filters.length) {
      const link_filters = this.apply_link_field_filters()
      if (Array.isArray(args.filters)) {
        const doctype = this.get_options()
        const fieldnames = Object.keys(link_filters)
        args.filters = args.filters
          .filter((filter?: any) => {
            const [filter_doctype, fieldname] = filter.length >= 4 ? filter : [doctype, filter[0]]
            return filter_doctype !== doctype || !fieldnames.includes(fieldname)
          })
          .concat(fieldnames.map((fieldname?: any) => [fieldname, ...link_filters[fieldname]]))
      } else {
        args.filters = { ...(args.filters || {}), ...link_filters }
      }
    }
  }
  apply_link_field_filters(this: any) {
    try {
      return this.parse_filters(JSON.parse(this.df.link_filters))
    } catch (e: any) {
      console.error('Invalid link_filters JSON:', this.df.link_filters, e)
      return {}
    }
  }
  parse_filters(this: any, link_filters?: any) {
    let filters: any = {}
    link_filters.forEach((filter?: any) => {
      let [, fieldname, operator, value] = filter
      if (value?.startsWith?.('eval:')) {
        value = value.split('eval:')[1]
        let context: any = {
          doc: this.doc,
          parent: this.doc.parenttype ? this.frm.doc : null,
          frappe,
        }
        value = frappe.utils.eval(value, context)
      }
      filters[fieldname] = [operator, value]
    })
    return filters
  }
  validate(this: any, value?: any) {
    if (this._validated || this.df.options == '[Select]' || this.df.ignore_link_validation) {
      return value
    }
    return this.validate_link_and_fetch(value)
  }
  after_set_value(this: any) {
    for (const target_field of Object.keys(this.fetch_map)) {
      this.frm.refresh_field(target_field)
    }
  }
  validate_link_and_fetch(this: any, value?: any) {
    const args = this.get_search_args(value)
    if (!args) return
    const columns_to_fetch = Object.values(this.fetch_map)
    if (!columns_to_fetch.length && this.df.__default_value === value) {
      return value
    }
    const update_dependant_fields = (response?: any) => {
      if (!columns_to_fetch.length) return
      const layout_set_value = this.layout?.set_value
      if (!layout_set_value && (!this.frm || !this.docname)) {
        return
      }
      const has_value = Boolean(response?.name)
      for (const [target_field, source_field] of Object.entries(this.fetch_map)) {
        const field_value = has_value ? response[source_field as string] : ''
        if (layout_set_value) {
          layout_set_value(target_field, field_value)
        } else {
          frappe.model.set_value(this.df.parent, this.docname, target_field, field_value, this.df.fieldtype)
        }
      }
    }
    if (!value) {
      update_dependant_fields()
      return value
    }
    this._debounced_input_handler?.cancel()
    let can_cache = !columns_to_fetch.length
    if (can_cache) {
      const [are_filters_large, filters_str] = this.are_filters_large(args.filters)
      can_cache = !are_filters_large
      args.filters = filters_str
    }
    return frappe
      .xcall(
        'frappe.client.validate_link_and_fetch',
        {
          ...args,
          docname: value,
          fields_to_fetch: columns_to_fetch,
        },
        can_cache ? 'GET' : 'POST',
        { cache: can_cache },
      )
      .then((response?: any) => {
        if (!response) return
        const has_filters = !!(args.filters && Object.keys(args.filters).length)
        if (!response.name && has_filters) {
          frappe.show_alert({
            message: __('{0}: {1} did not match any results.', [__(this.df.label || this.df.fieldname), value]),
            indicator: 'red',
          })
        }
        update_dependant_fields(response)
        return response.name
      })
  }
  fetch_map_for_quick_entry(this: any) {
    let me = this
    let fetch_map: any = {}
    function add_fetch(link_field?: any, source_field?: any, target_field?: any, target_doctype?: any) {
      if (!target_doctype) target_doctype = '*'
      if (!me.layout.fetch_dict) {
        me.layout.fetch_dict = {}
      }
      me.layout.fetch_dict.setDefault(target_doctype, {}).setDefault(link_field, {})[target_field] = source_field
    }
    function setup_add_fetch(df?: any) {
      let parts: any
      let is_read_only_field =
        [
          'Data',
          'Read Only',
          'Text',
          'Small Text',
          'Currency',
          'Check',
          'Text Editor',
          'Attach Image',
          'Code',
          'Link',
          'Float',
          'Int',
          'Date',
          'Datetime',
          'Select',
          'Duration',
          'Time',
          'Percent',
          'Phone',
          'Barcode',
          'Autocomplete',
          'Icon',
          'Color',
          'Rating',
        ].includes(df.fieldtype) ||
        df.read_only == 1 ||
        df.is_virtual == 1
      if (is_read_only_field && df.fetch_from && df.fetch_from.indexOf('.') != -1) {
        parts = df.fetch_from.split('.')
        add_fetch(parts[0], parts[1], df.fieldname, df.parent)
      }
    }
    $.each(this.layout.fields, (_i?: any, field?: any) => setup_add_fetch(field))
    for (const key of ['*', this.df.parent]) {
      if (!this.layout.fetch_dict) {
        this.layout.fetch_dict = {}
      }
      if (this.layout.fetch_dict[key] && this.layout.fetch_dict[key][this.df.fieldname]) {
        Object.assign(fetch_map, this.layout.fetch_dict[key][this.df.fieldname])
      }
    }
    return fetch_map
  }
  get fetch_map() {
    const fetch_map: any = {}
    if (!this.frm && this.layout && this.layout.fields) {
      return this.fetch_map_for_quick_entry()
    }
    if (!this.frm) return fetch_map
    for (const key of ['*', this.df.parent]) {
      if (this.frm.fetch_dict[key] && this.frm.fetch_dict[key][this.df.fieldname]) {
        Object.assign(fetch_map, this.frm.fetch_dict[key][this.df.fieldname])
      }
    }
    return fetch_map
  }
}
if (Awesomplete) {
  Awesomplete.prototype._itemCursor = 0
  Awesomplete.prototype.get_item = function (this: any, value?: any) {
    let matches = this._list.filter(function (item?: any) {
      return item.value === value
    })
    if (matches.length === 0) return null
    let item = matches[this._itemCursor % matches.length]
    this._itemCursor++
    return item
  }
}
