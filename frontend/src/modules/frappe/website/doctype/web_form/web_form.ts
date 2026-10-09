import { $, __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Web Form', {
  setup: function () {
    frappe.meta.docfield_map['Web Form Field'].fieldtype.formatter = (value?: any) => {
      const prefix: any = {
        'Page Break': '--red-600',
        'Section Break': '--blue-600',
        'Column Break': '--yellow-600',
      }
      if (prefix[value]) {
        value = `<span class="bold" style="color: var(${prefix[value]})">${value}</span>`
      }
      return value
    }
    frappe.meta.docfield_map['Web Form Field'].fieldname.formatter = (value?: any) => {
      if (!value) return
      return frappe.unscrub(value)
    }
    frappe.meta.docfield_map['Web Form List Column'].fieldname.formatter = (value?: any) => {
      if (!value) return
      return frappe.unscrub(value)
    }
  },
  refresh: function (frm?: any) {
    add_embed_link(frm)
    if (frm.doc.is_standard && !frappe.boot.developer_mode) {
      frm.disable_form()
      frappe.show_alert(__('Standard Web Forms can not be modified, duplicate the Web Form instead.'))
    }
    on_controlled_access_change(frm)
    frm.trigger('set_fields')
    frm.trigger('add_get_fields_button')
    frm.trigger('add_publish_button')
    frm.trigger('render_condition_table')
    frm.trigger('render_dynamic_filters_table')
    render_form_builder(frm)
    sync_form_sidebar(frm)
  },
  on_tab_change: function (frm?: any) {
    const on_builder_tab = frm.get_active_tab()?.df?.fieldname === 'form_builder_tab'
    frm.footer?.wrapper.toggle(!on_builder_tab)
    frm.form_wrapper.find('.form-message').toggle(!on_builder_tab)
    frm.form_wrapper.toggleClass('mb-1', on_builder_tab)
    sync_form_sidebar(frm)
  },
  login_required: on_controlled_access_change,
  key_required: on_controlled_access_change,
  anonymous: function (frm?: any) {
    if (frm.doc.anonymous) {
      frm.set_value('login_required', 0)
    }
  },
  validate: function (frm?: any) {
    flush_form_builder(frm)
    !frm.doc.allow_multiple && frm.set_value('allow_delete', 0)
    frm.doc.allow_multiple && frm.set_value('show_list', 1)
    const page_breaks = frm.doc.web_form_fields?.filter((f?: any) => f.fieldtype == 'Page Break') ?? []
    validate_page_break_limit(page_breaks.length)
  },
  add_publish_button(frm?: any) {
    frm.add_custom_button(frm.doc.published ? __('Unpublish') : __('Publish'), () => {
      frm.set_value('published', !frm.doc.published)
      frm.save()
    })
  },
  add_get_fields_button(frm?: any) {
    frm.add_custom_button(__('Get Fields'), () => {
      flush_form_builder(frm)
      get_fields_for_doctype(frm.doc.doc_type).then((fields?: any) => new GetFieldsDialog(frm, fields))
    })
  },
  set_fields(frm?: any) {
    let doc = frm.doc
    let as_select_option = (df?: any) => ({
      label: df.label,
      value: df.fieldname,
    })
    let update_options = (fields?: any) => {
      frm.fields_dict.web_form_fields.grid.update_docfield_property(
        'fieldname',
        'options',
        fields.map(as_select_option),
      )
      frm.fields_dict.list_columns.grid.update_docfield_property(
        'fieldname',
        'options',
        fields
          .filter((df?: any) => !frappe.model.no_value_type.includes(df.fieldtype) && df.is_virtual !== 1)
          .map(as_select_option),
      )
    }
    if (!doc.doc_type) {
      update_options([])
      frm.set_df_property('amount_field', 'options', [])
      return
    }
    update_options([{ label: __('Fetching fields from {0}...', [doc.doc_type]), fieldname: '' }])
    get_fields_for_doctype(doc.doc_type).then((fields?: any) => {
      update_options(fields)
      let currency_fields = fields
        .filter((df?: any) => ['Currency', 'Float'].includes(df.fieldtype))
        .map(as_select_option)
      if (!currency_fields.length) {
        currency_fields = [
          {
            label: __('No currency fields in {0}', [doc.doc_type]),
            value: '',
            disabled: true,
          },
        ]
      }
      frm.set_df_property('amount_field', 'options', currency_fields)
    })
  },
  title: function (frm?: any) {
    let page_name: any
    if (frm.doc.__islocal) {
      page_name = frm.doc.title.toLowerCase().replace(/ /g, '-')
      frm.set_value('route', page_name)
    }
  },
  doc_type: function (frm?: any) {
    frm.trigger('set_fields')
    render_form_builder(frm)
  },
  allow_multiple: function (frm?: any) {
    frm.doc.allow_multiple && frm.set_value('show_list', 1)
  },
  before_save: function (frm?: any) {
    let dynamic_filters = JSON.parse(frm.doc.dynamic_filters_json || 'null')
    let static_filters = JSON.parse(frm.doc.condition_json || '[]')
    static_filters = frappe.dashboard_utils.remove_common_static_filter_values(static_filters, dynamic_filters)
    frm.set_value('condition_json', JSON.stringify(static_filters))
    frm.trigger('render_condition_table')
    frm.trigger('render_dynamic_filters_table')
  },
  render_condition_table: function (frm?: any) {
    let wrapper = $(frm.get_field('condition_json').wrapper).empty()
    let table = $(`
			<style>
			.table-bordered th, .table-bordered td {
				border: none;
				border-right: 1px solid var(--border-color);
			}
			.table-bordered td {
				border-top: 1px solid var(--border-color);
			}
			.table thead th {
				border-bottom: none;
				font-weight: var(--weight-regular);
			}
			tr th:last-child, tr td:last-child{
				border-right: none;
			}
			thead {
				font-size: var(--text-sm);
				color: var(--gray-600);
				background-color: var(--subtle-fg);
			}
			thead th:first-child {
				border-top-left-radius: 9px;
			}
			thead th:last-child {
				border-top-right-radius: 9px;
			}
			</style>

			<table class="table table-bordered" style="cursor:pointer; margin:0px; border-radius: 10px; border-spacing: 0; border-collapse: separate;">
			<thead>
				<tr>
					<th>${__('Filter')}</th>
					<th style="width: 20%">${__('Condition')}</th>
					<th>${__('Value')}</th>
				</tr>
			</thead>
			<tbody></tbody>
		</table>`).appendTo(wrapper)
    $(`<p class="text-muted small mt-2">${__('Click table to edit')}</p>`).appendTo(wrapper)
    let filters = JSON.parse(frm.doc.condition_json || '[]')
    let filters_set = false
    let fields: any = [
      {
        fieldtype: 'HTML',
        fieldname: 'filter_area',
      },
    ]
    if (filters?.length) {
      filters.forEach((filter?: any) => {
        const filter_row = $(`<tr>
							<td>${filter[1]}</td>
							<td>${filter[2] || ''}</td>
							<td>${filter[3]}</td>
						</tr>`)
        table.find('tbody').append(filter_row)
      })
      filters_set = true
    }
    if (!filters_set) {
      const filter_row = $(`<tr><td colspan="3" class="text-muted text-center">
				${__('Click to Set Filters')}</td></tr>`)
      table.find('tbody').append(filter_row)
    }
    table.on('click', () => {
      let dialog = new frappe.ui.Dialog({
        title: __('Set Filters'),
        fields: fields,
        primary_action: function (this: any) {
          let values = this.get_values()
          if (values) {
            this.hide()
            let filters = frm.filter_group.get_filters()
            frm.set_value('condition_json', JSON.stringify(filters))
            frm.trigger('render_condition_table')
          }
        },
        primary_action_label: 'Set',
      })
      frm.filter_group = new frappe.ui.FilterGroup({
        parent: dialog.get_field('filter_area').$wrapper,
        doctype: frm.doc.doc_type,
        on_change: () => {},
      })
      filters && frm.filter_group.add_filters_to_filter_group(filters)
      dialog.show()
      dialog.set_values(filters)
    })
  },
  render_dynamic_filters_table(frm?: any) {
    let wrapper = $(frm.get_field('dynamic_filters_json').wrapper).empty()
    frm.dynamic_filter_table =
      $(`<table class="table table-bordered" style="cursor:${frm.has_perm('write') ? 'pointer' : 'default'}; margin: 0 0 var(--margin-lg); border-radius: 10px; border-spacing: 0; border-collapse: separate;">
			<thead>
				<tr>
					<th>${__('Filter')}</th>
					<th style="width: 20%">${__('Condition')}</th>
					<th>${__('Value')}</th>
				</tr>
			</thead>
			<tbody></tbody>
		</table>`).appendTo(wrapper)
    frm.dynamic_filters =
      frm.doc.dynamic_filters_json && frm.doc.dynamic_filters_json.length > 2
        ? JSON.parse(frm.doc.dynamic_filters_json)
        : null
    frm.trigger('set_dynamic_filters_in_table')
    let filters = JSON.parse(frm.doc.condition_json || '[]')
    let fields = frappe.dashboard_utils.get_fields_for_dynamic_filter_dialog(true, filters, frm.dynamic_filters)
    let desc_field = fields.find((f?: any) => f.fieldname === 'description')
    if (desc_field) {
      desc_field.options = `<div>
				<p>${__('Set dynamic filter values as Python expressions.')}</p>
				<p>${__('For example:')}
					<code>frappe.session.user</code> ${__('or')}
					<code>frappe.utils.now()</code>
				</p>
			</div>`
    }
    frm.dynamic_filter_table.on('click', () => {
      if (!frm.has_perm('write')) {
        return
      }
      if (!frappe.boot.developer_mode && frm.doc.is_standard) {
        frappe.throw(__('Cannot edit filters for standard Web Forms'))
      }
      let dialog = new frappe.ui.Dialog({
        title: __('Set Dynamic Filters'),
        fields: fields,
        primary_action: () => {
          let values = dialog.get_values()
          dialog.hide()
          let dynamic_filters: any = []
          for (let key of Object.keys(values)) {
            let [doctype, fieldname] = key.split(':')
            dynamic_filters.push([doctype, fieldname, '=', values[key]])
          }
          frm.set_value('dynamic_filters_json', JSON.stringify(dynamic_filters))
          frm.trigger('set_dynamic_filters_in_table')
        },
        primary_action_label: __('Set'),
      })
      dialog.show()
      if (frm.dynamic_filters) {
        let filter_values: any = {}
        frm.dynamic_filters.forEach((f?: any) => {
          filter_values[f[0] + ':' + f[1]] = f[3]
        })
        dialog.set_values(filter_values)
      }
    })
  },
  set_dynamic_filters_in_table: function (frm?: any) {
    frm.dynamic_filters =
      frm.doc.dynamic_filters_json && frm.doc.dynamic_filters_json.length > 2
        ? JSON.parse(frm.doc.dynamic_filters_json)
        : null
    if (!frm.dynamic_filters) {
      const filter_row = $(`<tr><td colspan="3" class="text-muted text-center">
				${__('Click to Set Dynamic Filters')}</td></tr>`)
      frm.dynamic_filter_table.find('tbody').html(filter_row)
    } else {
      let filter_rows = ''
      frm.dynamic_filters.forEach((filter?: any) => {
        filter_rows += `<tr>
						<td>${filter[1]}</td>
						<td>${filter[2] || ''}</td>
						<td>${filter[3]}</td>
					</tr>`
      })
      frm.dynamic_filter_table.find('tbody').html(filter_rows)
    }
  },
})
frappe.ui.form.on('Web Form List Column', {
  fieldname: function (frm?: any, doctype?: any, name?: any) {
    let doc = frappe.get_doc(doctype, name)
    let df = frappe.meta.get_docfield(frm.doc.doc_type, doc.fieldname)
    if (!df) return
    doc.fieldtype = df.fieldtype
    doc.label = df.label
    doc.options = df.options
    frm.refresh_field('list_columns')
  },
})
frappe.ui.form.on('Web Form Field', {
  fieldtype: function (frm?: any, doctype?: any, name?: any) {
    let doc = frappe.get_doc(doctype, name)
    if (doc.fieldtype == 'Page Break') {
      validate_page_break_limit(frm.doc.web_form_fields.filter((f?: any) => f.fieldtype == 'Page Break').length)
    }
    if (['Section Break', 'Column Break', 'Page Break'].includes(doc.fieldtype)) {
      doc.fieldname = ''
      doc.label = ''
      doc.options = ''
      frm.refresh_field('web_form_fields')
    }
  },
  fieldname: function (frm?: any, doctype?: any, name?: any) {
    let doc = frappe.get_doc(doctype, name)
    let df = frappe.meta.get_docfield(frm.doc.doc_type, doc.fieldname)
    if (!df) return
    doc.label = df.label
    doc.fieldtype = df.fieldtype
    doc.options = df.options
    doc.reqd = df.reqd
    doc.default = df.default
    doc.read_only = df.read_only
    doc.depends_on = df.depends_on
    doc.placeholder = df.placeholder
    doc.description = df.description
    doc.mandatory_depends_on = df.mandatory_depends_on
    doc.max_length = df.length
    doc.read_only_depends_on = df.read_only_depends_on
    frm.refresh_field('web_form_fields')
  },
})
class GetFieldsDialog {
  [key: string]: any
  constructor(frm?: any, fields?: any) {
    this.frm = frm
    const fieldtypes = frappe.meta.get_field('Web Form Field', 'fieldtype').options.split('\n')
    this.doctype_fields = fields.filter((df?: any) => fieldtypes.includes(get_web_form_fieldtype(df)) && !df.hidden)
    this.fields = this.doctype_fields.filter((df?: any) => !is_layout_field(df))
    this.fields_by_name = Object.fromEntries(this.fields.map((df?: any) => [df.fieldname, df]))
    this.existing_rows = (frm.doc.web_form_fields || []).filter((d?: any) => d.fieldname && !is_layout_field(d))
    this.existing_fieldnames = this.existing_rows.map((d?: any) => d.fieldname)
    this.stale_fieldnames = new Set(
      this.existing_fieldnames.filter((fieldname?: any) => !this.fields_by_name[fieldname]),
    )
    if (!this.fields.length && !this.existing_rows.length) {
      frappe.msgprint(__('No fields are available from {0}.', [frm.doc.doc_type]))
      return
    }
    this.make_dialog()
  }
  make_dialog(this: any) {
    this.dialog = new frappe.ui.Dialog({
      title: __('Get Fields from {0}', [this.frm.doc.doc_type]),
      fields: [
        { fieldtype: 'HTML', fieldname: 'picker_header' },
        {
          fieldname: 'fields',
          fieldtype: 'MultiCheck',
          columns: 2,
          sort_options: false,
          options: this.get_options(),
        },
      ],
      primary_action_label: __('Update'),
      primary_action: () => this.update(),
      on_page_show: () => {
        this.freeze_list_height()
        frappe.utils.setup_search(this.dialog.$body, '.unit-checkbox', '.label-area')
      },
    })
    this.make_header()
    !this.existing_rows.length && this.select_mandatory()
    const $fields = this.dialog.get_field('fields').$wrapper
    $fields.addClass('max-h-80 overflow-y-auto')
    $fields.find('.checkbox-options').css('padding', 0)
    this.dialog.show()
  }
  make_header(this: any) {
    const $header = $(`
			<div class="filters-search">
				<input
					type="text"
					placeholder="${__('Search')}"
					data-element="search"
					class="form-control input-xs"
				>
			</div>
			<div class="flex flex-wrap gap-2 mt-3 mb-3">
				<button class="btn btn-default btn-xs" data-action="select_all">${__('Select All')}</button>
				<button class="btn btn-default btn-xs" data-action="select_mandatory">
					${__('Select Mandatory')}
				</button>
				<button class="btn btn-default btn-xs" data-action="unselect_all">${__('Unselect All')}</button>
			</div>
		`)
    frappe.utils.bind_actions_with_object($header, this)
    this.dialog.get_field('picker_header').$wrapper.html($header)
  }
  get_options(this: any) {
    const fieldnames = new Set([...this.existing_fieldnames, ...this.fields.map((df?: any) => df.fieldname)])
    return [...fieldnames].map((fieldname?: any) => {
      const df = this.fields_by_name[fieldname]
      const is_stale = this.stale_fieldnames.has(fieldname)
      const warning_title = is_stale ? this.get_stale_warning_title(fieldname) : get_condition_warning_title(df)
      return {
        label_class: is_stale ? 'text-muted' : '',
        label: frappe.utils.escape_html(this.get_label(fieldname)),
        value: fieldname,
        checked: this.existing_fieldnames.includes(fieldname),
        description: df?.fieldtype,
        danger: !!df?.reqd,
        warning: !!warning_title,
        warning_title,
      }
    })
  }
  update(this: any) {
    const selected = this.dialog.get_value('fields')
    const [first_added] = this.get_new_fields(selected)
    const all_ticked = selected.length === this.dialog.get_field('fields').options.length
    all_ticked && first_added ? this.rebuild_layout(selected) : this.add_and_remove(selected)
    this.frm.refresh_field('web_form_fields')
    get_builder_tab(this.frm)?.set_active()
    this.dialog.hide()
    refresh_form_builder(this.frm)?.then(() => reveal_in_form_builder(this.frm, first_added?.fieldname))
  }
  get_new_fields(this: any, selected?: any) {
    return this.fields.filter(
      (df?: any) => selected.includes(df.fieldname) && !this.existing_fieldnames.includes(df.fieldname),
    )
  }
  add_and_remove(this: any, selected?: any) {
    const removed = this.existing_rows.filter((d?: any) => !selected.includes(d.fieldname))
    removed.forEach((d?: any) => frappe.model.clear_doc(d.doctype, d.name))
    this.get_new_fields(selected).forEach((df?: any) => this.insert_row(df, selected))
    removed.length && this.frm.dirty()
  }
  insert_row(this: any, df?: any, fieldnames?: any) {
    const at = this.get_insert_index(df)
    this.add_row(df, fieldnames)
    const rows = this.frm.doc.web_form_fields
    if (at < rows.length - 1) {
      rows.splice(at, 0, rows.pop())
      rows.forEach((d?: any, i?: any) => (d.idx = i + 1))
    }
  }
  get_insert_index(this: any, df?: any) {
    const rows = this.frm.doc.web_form_fields
    const position = this.fields.indexOf(df)
    const row_index = (fieldname?: any) => rows.findIndex((d?: any) => d.fieldname === fieldname)
    for (let i = position - 1; i >= 0; i--) {
      const at = row_index(this.fields[i].fieldname)
      if (at !== -1) return at + 1
    }
    for (let i = position + 1; i < this.fields.length; i++) {
      const at = row_index(this.fields[i].fieldname)
      if (at !== -1) return at
    }
    return rows.length
  }
  rebuild_layout(this: any, selected?: any) {
    const ordered = this.get_ordered_rows(selected)
    ;(this.frm.doc.web_form_fields || [])
      .filter((d?: any) => !ordered.includes(d))
      .forEach((d?: any) => frappe.model.clear_doc(d.doctype, d.name))
    this.frm.doc.web_form_fields = ordered
    ordered.forEach((d?: any, i?: any) => (d.idx = i + 1))
    this.frm.dirty()
  }
  get_ordered_rows(this: any, selected?: any) {
    const rows = this.doctype_fields
      .filter((df?: any) => is_layout_field(df) || selected.includes(df.fieldname))
      .map(
        (df?: any) => this.existing_rows.find((d?: any) => d.fieldname === df.fieldname) || this.add_row(df, selected),
      )
    const stale_rows = this.existing_rows.filter(
      (d?: any) => this.stale_fieldnames.has(d.fieldname) && selected.includes(d.fieldname),
    )
    return [...this.drop_empty_leading_pages(rows), ...stale_rows]
  }
  drop_empty_leading_pages(rows?: any) {
    const first_field = rows.findIndex((d?: any) => !is_layout_field(d))
    const leading = first_field === -1 ? rows.length : first_field
    return rows.filter((d?: any, i?: any) => i >= leading || d.fieldtype !== 'Page Break')
  }
  add_row(this: any, df?: any, fieldnames?: any) {
    return this.frm.add_child('web_form_fields', get_web_form_field_values(df, fieldnames))
  }
  get_stale_warning_title(this: any, fieldname?: any) {
    const docfield = frappe.meta.get_docfield(this.frm.doc.doc_type, fieldname)
    if (!docfield) {
      return __('Not a field in {0}. Unselect to remove it.', [this.frm.doc.doc_type])
    }
    if (docfield.hidden) {
      return __('Hidden in {0}. If you unselect it, Get Fields cannot add it back.', [this.frm.doc.doc_type])
    }
    return __('A Web Form cannot show this {0} field. Unselect to remove it.', [__(get_web_form_fieldtype(docfield))])
  }
  get_label(this: any, fieldname?: any) {
    const row = this.existing_rows.find((d?: any) => d.fieldname === fieldname)
    const label = row?.label || this.fields_by_name[fieldname]?.label
    return label ? __(label) : frappe.unscrub(fieldname)
  }
  select_all(this: any) {
    this.set_all_checked(true)
  }
  select_mandatory(this: any) {
    const checkboxes = this.dialog
      .get_field('fields')
      .options.filter((option?: any) => option.danger)
      .map((option?: any) => option.$checkbox.find(':checkbox').get(0))
    $(checkboxes).prop('checked', true).trigger('change')
  }
  unselect_all(this: any) {
    this.set_all_checked(false)
  }
  set_all_checked(this: any, checked?: any) {
    this.dialog.get_field('fields').$wrapper.find(':checkbox').prop('checked', checked).trigger('change')
  }
  freeze_list_height(this: any) {
    const $wrapper = this.dialog.get_field('fields').$wrapper
    $wrapper.height($wrapper.height())
  }
}
function get_web_form_field_values(df?: any, fieldnames?: any) {
  return {
    fieldname: df.fieldname,
    label: df.label,
    fieldtype: get_web_form_fieldtype(df),
    options: df.options,
    reqd: df.reqd,
    default: df.default,
    read_only: df.read_only,
    precision: df.precision,
    placeholder: df.placeholder,
    max_length: df.length,
    description: df.description,
    ...resolve_field_dependencies(df, fieldnames),
  }
}
function validate_page_break_limit(page_break_count?: any) {
  if (page_break_count >= 10) {
    frappe.throw({
      title: __('Too Many Pages'),
      message: __('There can be only 9 Page Break fields in a Web Form'),
    })
  }
}
function get_fields_for_doctype(doctype?: any) {
  return new Promise((resolve?: any) => frappe.model.with_doctype(doctype, resolve)).then(() => {
    return frappe.meta.get_docfields(doctype).filter(is_web_form_field)
  })
}
function is_web_form_field(df?: any) {
  return (
    (frappe.model.is_value_type(df.fieldtype) && !['lft', 'rgt'].includes(df.fieldname)) ||
    ['Table', 'Table MultiSelect'].includes(df.fieldtype) ||
    frappe.model.layout_fields.includes(df.fieldtype)
  )
}
function on_controlled_access_change(frm?: any) {
  const has_controlled_access = frm.doc.login_required || frm.doc.key_required
  if (!has_controlled_access) {
    frm.set_value('allow_multiple', 0)
    frm.set_value('allow_edit', 0)
    frm.set_value('allow_delete', 0)
    frm.set_value('show_list', 0)
  }
  render_list_settings_message(frm)
}
function flush_form_builder(frm?: any) {
  const builder = get_form_builder(frm)
  if (!builder) return
  const result = builder.store.update_fields()
  if (typeof result === 'string') {
    frappe.throw(result)
  }
}
function refresh_form_builder(frm?: any) {
  return get_form_builder(frm)?.store.fetch()
}
function reveal_in_form_builder(frm?: any, fieldname?: any) {
  const store = get_form_builder(frm)?.store
  if (!store || !fieldname) return
  const found = find_builder_field(store, fieldname)
  if (!found) return
  store.activate_tab(found.tab)
  store.form.selected_field = found.field.df
  scroll_to_builder_field(fieldname)
}
function find_builder_field(store?: any, fieldname?: any) {
  for (const tab of store.form.layout?.tabs || []) {
    for (const section of tab.sections || []) {
      for (const column of section.columns || []) {
        const field = column.fields?.find((f?: any) => f.df.fieldname === fieldname)
        if (field) return { tab, field }
      }
    }
  }
}
function scroll_to_builder_field(fieldname?: any, attempts: any = 10) {
  const field = $(`.form-builder-container [data-fieldname="${fieldname}"]`).closest('.field')[0]
  if (!field) {
    attempts && setTimeout(() => scroll_to_builder_field(fieldname, attempts - 1), 50)
    return
  }
  field.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
function add_embed_link(frm?: any) {
  if (!frm.sidebar) return
  frm.embed_link?.closest('.user-action-row').remove()
  frm.embed_link = frm.sidebar
    .add_user_action(__('Copy embed code'))
    .attr('href', '#')
    .on('click', () => {
      const url = frappe.urllib.get_full_url(frm.doc.route)
      const code = `<iframe src="${url}" style="border: none; width: 100%; height: inherit;"></iframe>`
      frappe.utils.copy_to_clipboard(code, __('Embed code copied'))
    })
}
function is_builder_read_only(frm?: any) {
  return (frm.doc.is_standard && !frappe.boot.developer_mode) || !frm.has_perm('write')
}
function render_form_builder(frm?: any) {
  const builder = frappe.web_form_builder
  const mounted_here = !!get_form_builder(frm)
  if (!frm.doc.doc_type && !mounted_here) return
  if (mounted_here) {
    builder.docname = frm.doc.name
    builder.doctype = frm.doc.doc_type
    builder.force_read_only = is_builder_read_only(frm)
    builder.update_store()
    builder.setup_page_actions()
    builder.store.fetch()
    return
  }
  if (!frm.fields_dict.form_builder) {
    return
  }
  const wrapper = $(frm.fields_dict['form_builder'].wrapper)
  if (builder) {
    builder.$wrapper = wrapper
    builder.frm = frm
    builder.page = frm.page
    builder.docname = frm.doc.name
    builder.doctype = frm.doc.doc_type
    builder.is_web_form = true
    builder.force_read_only = is_builder_read_only(frm)
    builder.init(true)
    builder.store.fetch()
    return
  }
  if (frm._web_form_builder_loading) return
  frm._web_form_builder_loading = true
  frappe
    .require('form_builder.bundle.js')
    .then(() => {
      frappe.web_form_builder = new frappe.ui.FormBuilder({
        wrapper: wrapper,
        frm: frm,
        doctype: frm.doc.doc_type,
        customize: false,
        is_web_form: true,
        tab_fieldname: 'form_builder_tab',
        get_source_field_values: get_web_form_field_values,
        is_source_field: is_web_form_field,
        validate_page_limit: validate_page_break_limit,
        force_read_only: is_builder_read_only(frm),
      })
      frappe.web_form_builder.docname = frm.doc.name
    })
    .finally(() => (frm._web_form_builder_loading = false))
}
function sync_form_sidebar(frm?: any) {
  if (!frm.page?.sidebar || frm.page.hide_sidebar || !frappe.boot.desk_settings?.form_sidebar) {
    return
  }
  const on_builder_tab = frm.get_active_tab()?.df?.fieldname === 'form_builder_tab'
  frm.page.sidebar.toggleClass('hide-sidebar', on_builder_tab || Boolean(frm.is_new()))
}
function get_form_builder(frm?: any) {
  const builder = frappe.web_form_builder
  return builder?.store && builder.frm === frm ? builder : null
}
function get_builder_tab(frm?: any) {
  return frm.layout?.tabs?.find((t?: any) => t.df.fieldname === 'form_builder_tab')
}
function get_condition_warning_title(df?: any) {
  const conditions = [...new Set([df.depends_on, df.mandatory_depends_on, df.read_only_depends_on])].filter(Boolean)
  return conditions.length ? __('Depends on: {0}', [conditions.join(', ')]) : ''
}
function get_web_form_fieldtype(df?: any) {
  return df.fieldtype == 'Tab Break' ? 'Page Break' : df.fieldtype
}
function is_layout_field(df?: any) {
  return ['Section Break', 'Column Break', 'Page Break'].includes(get_web_form_fieldtype(df))
}
function resolve_field_dependencies(df?: any, selected_fieldnames?: any) {
  const result: any = {}
  for (const key of ['depends_on', 'mandatory_depends_on', 'read_only_depends_on']) {
    if (condition_survives(df[key], selected_fieldnames)) {
      result[key] = df[key]
    }
  }
  return result
}
function condition_survives(condition?: any, selected_fieldnames?: any) {
  if (!condition || condition.startsWith('fn:')) return false
  return get_referenced_fieldnames(condition).every((f?: any) => selected_fieldnames.includes(f))
}
function get_referenced_fieldnames(condition?: any) {
  if (!condition.startsWith('eval:')) return [condition]
  const refs = condition.matchAll(/\bdoc(?:\.(\w+)|\[["'](\w+)["']\])/g)
  return [...refs].map((m?: any) => m[1] || m[2])
}
function render_list_settings_message(frm?: any) {
  if (frm.fields_dict['list_setting_message'] && !frm.doc.login_required && !frm.doc.key_required) {
    const go_to_access_fields = `
			<code class="pointer" title="${__('Go to Access Control section')}">
				${__('Login Required')}
			</code>
			${__('or')}
			<code class="pointer" title="${__('Go to Access Control section')}">
				${__('Key Required')}
			</code>
		`
    let message = __('Login or a request key is required to see web form list view. Enable {0} to see list settings', [
      go_to_access_fields,
    ])
    $(frm.fields_dict['list_setting_message'].wrapper)
      .html($(`<div class="form-message blue">${message}</div>`))
      .find('code')
      .click(() => frm.scroll_to_field('access_control_section'))
  } else {
    $(frm.fields_dict['list_setting_message'].wrapper).empty()
  }
}
