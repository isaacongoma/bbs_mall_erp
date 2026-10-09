import Sortable from 'sortablejs'
import { $, __, cint, cstr, cur_frm, frappe, locals } from '@/shared/frappe/runtime'
import GridRowForm from './grid_row_form'
const DEPENDENCY_PROPERTIES: any = [
  { expr: 'depends_on', prop: 'hidden_due_to_dependency', negate: true },
  { expr: 'mandatory_depends_on', prop: 'reqd', negate: false },
  { expr: 'read_only_depends_on', prop: 'read_only', negate: false },
]
export default class GridRow {
  [key: string]: any
  constructor(opts?: any) {
    this.on_grid_fields_dict = {}
    this.on_grid_fields = []
    $.extend(this, opts)
    this.set_docfields()
    this.columns = {}
    this.columns_list = []
    this.row_check_html = '<input type="checkbox" class="grid-row-check" tabIndex="-1">'
    this.default_rows_threshold_for_grid_search = 20
    this.make()
  }
  make(this: any) {
    let me = this
    let render_row = true
    this.wrapper = $('<div class="grid-row"></div>')
    this.row = $('<div class="data-row row m-0"></div>')
      .appendTo(this.wrapper)
      .on('click', function (e?: any) {
        if (
          $(e.target).hasClass('grid-row-check') ||
          $(e.target).hasClass('row-index') ||
          $(e.target).parent().hasClass('row-index')
        ) {
          return
        }
        if (me.grid.allow_on_grid_editing() && me.grid.is_editable()) {
        } else {
          me.toggle_view()
          return false
        }
      })
    if (this.grid.template && !this.grid.meta.editable_grid) {
      this.render_template()
    } else {
      render_row = this.render_row()
    }
    if (!render_row) return
    this.set_data()
    this.wrapper.appendTo(this.parent)
  }
  set_docfields(this: any) {
    if (this.doc && this.parent_df.options) {
      this.docfields = frappe.meta.get_docfields(this.parent_df.options, this.doc.name, null, this.grid.docfields)
    }
  }
  set_data(this: any) {
    this.wrapper.data({
      grid_row: this,
      doc: this.doc || '',
    })
  }
  set_row_index(this: any) {
    if (this.doc) {
      this.wrapper
        .attr('data-name', this.doc.name)
        .attr('data-idx', this.doc.idx)
        .find('.row-index span, .grid-form-row-index')
        .html(this.doc.idx)
    }
  }
  select(this: any, checked?: any) {
    this.doc.__checked = checked ? 1 : 0
  }
  refresh_check(this: any) {
    this.wrapper.find('.grid-row-check').prop('checked', this.doc ? !!this.doc.__checked : false)
    this.grid.debounced_refresh_remove_rows_button()
  }
  remove(this: any) {
    if (this.grid.is_editable()) {
      if (this.get_open_form()) {
        this.hide_form()
      }
      if (this.frm) {
        frappe
          .run_serially([
            () => {
              return this.frm.script_manager.trigger(
                'before_' + this.grid.df.fieldname + '_remove',
                this.doc.doctype,
                this.doc.name,
              )
            },
            () => {
              frappe.model.clear_doc(this.doc.doctype, this.doc.name)
              this.frm.script_manager.trigger(this.grid.df.fieldname + '_remove', this.doc.doctype, this.doc.name)
              this.frm.dirty()
              this.grid.refresh()
            },
          ])
          .catch((e?: any) => {
            console.trace(e)
          })
      } else {
        const data = this.grid.get_data()
        this.grid.df.data = data
        const index = data.findIndex((d?: any) => d.name === this.doc.name)
        if (index > -1) {
          data.splice(index, 1)
        }
        data.forEach((d?: any, i?: any) => {
          d.idx = i + 1
        })
        this.grid.refresh()
      }
    }
  }
  insert(this: any, show?: any, below?: any, duplicate?: any) {
    let idx = this.doc.idx
    const copy_doc = duplicate ? this.doc : null
    if (below) idx++
    this.toggle_view(false)
    this.grid.add_new_row(idx, null, show, copy_doc)
  }
  move(this: any) {
    let me = this
    frappe.prompt(
      {
        fieldname: 'move_to',
        label: __('Move to Row Number'),
        fieldtype: 'Int',
        reqd: 1,
        default: this.doc.idx,
      },
      function (values?: any) {
        if (me.doc._sortable === false) {
          frappe.msgprint(__('Cannot move row'))
          return
        }
        let data = me.grid.get_data()
        data.move(me.doc.idx - 1, values.move_to - 1)
        me.frm.dirty()
        for (let i = 0; i < data.length; i++) {
          data[i].idx = i + 1
        }
        me.toggle_view(false)
        me.grid.refresh()
        $(me.frm.wrapper).trigger('grid-move-row', [me.frm, me])
      },
      __('Move To'),
      'Update',
    )
  }
  refresh(this: any) {
    if (this.frm && this.doc) {
      this.doc = locals[this.doc.doctype][this.doc.name]
    }
    if (this.grid.template && !this.grid.meta.editable_grid) {
      this.render_template()
    } else {
      this.render_row(true)
    }
    if (this.grid_form) {
      this.grid_form.layout && this.grid_form.layout.refresh(this.doc)
    }
  }
  render_template(this: any) {
    this.set_row_index()
    if (this.row_display) {
      this.row_display.remove()
    }
    if (!this.row_index) {
      this.row_index = $(`<div class="template-row-index">${this.row_check_html}<span></span></div>`).appendTo(this.row)
    }
    if (this.doc) {
      this.row_index.find('span').html(this.doc.idx)
    }
    this.row_display = $('<div class="row-data sortable-handle template-row"></div>')
      .appendTo(this.row)
      .html(
        frappe.render(this.grid.template, {
          doc: this.doc ? frappe.get_format_helper(this.doc) : null,
          frm: this.frm,
          row: this,
        }),
      )
  }
  render_row(this: any) {
    if (this.show_search && !this.show_search_row()) return
    let me = this
    this.set_row_index()
    if (!this.row_index && !this.show_search) {
      const txt = this.doc ? this.doc.idx : __('No.', null, "Title of the 'row number' column")
      if (this.header_row) {
        this.row_check_html = $(this.row_check_html).attr('tabindex', -1).get(0).outerHTML
      }
      this.row_check = $(`<div class="row-check sortable-handle col">
					${this.row_check_html}
				</div>`).appendTo(this.row)
      this.row_index = $(`<div class="row-index sortable-handle grid-static-col col">
					<span>${txt}</span>
				</div>`)
        .appendTo(this.row)
        .on('click', function (e?: any) {
          if (!$(e.target).hasClass('grid-row-check')) {
            me.toggle_view()
          }
        })
    } else if (this.show_search) {
      this.row_check = $(`
				<div class="row-check col search">
					<input type="text" class="form-control input-xs text-center invisible">
				</div>`).appendTo(this.row)
      this.row_index = $(`<div class="row-index col search">
					<input type="text" class="form-control input-xs text-center" >
					<span style="width: 33px;" class="d-block"></span>
				</div>`).appendTo(this.row)
      this.row_index.find('input').on(
        'keyup',
        frappe.utils.debounce((e?: any) => {
          let df: any = {
            fieldtype: 'Sr No',
          }
          this.grid.filter['row-index'] = {
            df: df,
            value: e.target.value,
          }
          if (e.target.value == '') {
            delete this.grid.filter['row-index']
          }
          if (this.grid.grid_sortable) {
            this.grid.grid_sortable.option('disabled', Object.keys(this.grid.filter).length !== 0)
          }
          this.grid.prevent_build = true
          me.grid.refresh()
          this.grid.prevent_build = false
        }, 500),
      )
      frappe.utils.only_allow_num_decimal(this.row_index.find('input'))
    }
    this.setup_columns()
    this.add_open_form_button()
    this.add_column_configure_button()
    this.refresh_check()
    if (this.frm && this.doc) {
      $(this.frm.wrapper).trigger('grid-row-render', [this])
    }
    return true
  }
  make_editable(this: any) {
    this.row.toggleClass('editable-row', this.grid.is_editable())
  }
  is_too_small(this: any) {
    return this.row.width() ? this.row.width() < 300 : false
  }
  add_open_form_button(this: any) {
    if (this.doc && !this.grid.df.in_place_edit) {
      if (!this.open_form_button) {
        this.open_form_button = $('<div class="col"></div>').appendTo(this.row)
        this.open_form_button.on('click', () => {
          this.toggle_view()
          return false
        })
        if (!this.configure_columns) {
          const edit_msg = __('Edit', null, 'Edit grid row')
          this.open_form_button = $(`
						<div class="btn-open-row" data-toggle="tooltip" data-placement="right" title="${edit_msg}">
							<a>${frappe.utils.icon('pencil', 'xs')}</a>
						</div>
					`).appendTo(this.open_form_button)
          $(this.open_form_button)
            .parent()
            .on('keydown', (ev?: any) => {
              if (ev.key == 'Enter') {
                this.toggle_view()
                return false
              }
            })
          this.open_form_button.tooltip({ delay: { show: 600, hide: 100 } })
        }
        if (this.is_too_small()) {
          this.open_form_button.css({ 'margin-right': '-2px' })
        }
        $(document).on('escape', () => {
          this.open_form_button.parent().focus()
        })
      }
    }
  }
  add_column_configure_button(this: any) {
    if (this.grid.df.in_place_edit && !this.frm) return
    if (this.configure_columns && this.frm) {
      this.configure_columns_button = $(`
				<div class="col grid-static-col pointer">
					<a>${frappe.utils.icon('settings', 'sm', '', 'filter: opacity(0.5)')}</a>
				</div>
			`)
        .appendTo(this.row)
        .on('click', () => {
          this.configure_dialog_for_columns_selector()
        })
    } else if (this.configure_columns && !this.frm) {
      this.configure_columns_button = $(`
				<div class="col grid-static-col"></div>
			`).appendTo(this.row)
    }
  }
  configure_dialog_for_columns_selector(this: any) {
    this.grid_settings_dialog = new frappe.ui.Dialog({
      title: __('Configure Columns'),
      fields: [
        {
          fieldtype: 'HTML',
          fieldname: 'fields_html',
        },
      ],
    })
    this.grid.setup_visible_columns()
    this.setup_columns_for_dialog()
    this.prepare_wrapper_for_columns()
    this.render_selected_columns()
    this.grid_settings_dialog.show()
    $(this.fields_html_wrapper)
      .find('.add-new-fields')
      .click(() => {
        this.column_selector_for_dialog()
      })
    this.grid_settings_dialog.set_primary_action(__('Update'), () => {
      this.columns = {}
      this.update_user_settings_for_grid()
      this.grid_settings_dialog.hide()
    })
    this.grid_settings_dialog.set_secondary_action_label(__('Reset to default'))
    this.grid_settings_dialog.set_secondary_action(() => {
      this.reset_user_settings_for_grid()
      this.grid_settings_dialog.hide()
    })
  }
  setup_columns_for_dialog(this: any) {
    this.selected_columns_for_grid = []
    this.grid.visible_columns.forEach((row?: any) => {
      this.selected_columns_for_grid.push({
        fieldname: row[0].fieldname,
        width: row[1],
        sticky: row[0].sticky,
      })
    })
  }
  prepare_wrapper_for_columns(this: any) {
    this.fields_html_wrapper = this.grid_settings_dialog.get_field('fields_html').$wrapper[0]
    $(`
			<div class='form-group'>
				<div class='row' style='margin-bottom:10px;'>
					<div class='col-1'></div>
					<div class='col-5' style='padding-left:20px;'>
						${__('Fieldname').bold()}
					</div>
					<div class='col-3'>
						${__('Column Width').bold()}
					</div>
					<div class='col-2'>
						${__('Sticky').bold()}
					</div>
					<div class='col-1'></div>
				</div>
				<div class='control-input-wrapper selected-fields'>
				</div>
				<p class='help-box small text-muted'>
					<a class='add-new-fields text-muted'>
						+ ${__('Add / Remove Columns')}
					</a>
				</p>
			</div>
		`).appendTo(this.fields_html_wrapper)
  }
  column_selector_for_dialog(this: any) {
    let docfields = this.prepare_columns_for_dialog(
      this.selected_columns_for_grid.map((field?: any) => field.fieldname),
    )
    let d = new frappe.ui.Dialog({
      title: __('{0} Fields', [__(this.grid.doctype)]),
      fields: [
        {
          label: __('Select Fields'),
          fieldtype: 'MultiCheck',
          fieldname: 'fields',
          options: docfields,
          columns: 2,
          sort_options: false,
        },
      ],
      secondary_action_label: __('Select All'),
      secondary_action: () => this.select_all_columns(docfields),
    })
    d.set_primary_action(__('Add'), () => {
      let selected_fields = d.get_values().fields
      const existing_settings: any = {}
      this.selected_columns_for_grid.forEach((col?: any) => {
        existing_settings[col.fieldname] = col
      })
      this.selected_columns_for_grid = []
      if (selected_fields) {
        selected_fields.forEach((selected_column?: any) => {
          if (existing_settings[selected_column]) {
            this.selected_columns_for_grid.push(existing_settings[selected_column])
          } else {
            let docfield = frappe.meta.get_docfield(this.grid.doctype, selected_column)
            this.selected_columns_for_grid.push({
              fieldname: selected_column,
              width: this.grid.get_column_width(docfield),
              sticky: docfield.sticky,
            })
          }
        })
        this.render_selected_columns()
        d.hide()
      }
    })
    d.show()
  }
  select_all_columns(docfields?: any) {
    docfields.forEach((docfield?: any) => {
      if (docfield.checked) {
        return
      }
      $(`.checkbox.unit-checkbox input[type="checkbox"][data-unit="${docfield.value}"]`)
        .prop('checked', true)
        .trigger('change')
    })
  }
  prepare_columns_for_dialog(this: any, selected_fields?: any) {
    let fields: any = []
    const blocked_fields = frappe.model.no_value_type
    const always_allow: any = ['Button']
    const show_field = (f?: any) => always_allow.includes(f) || !blocked_fields.includes(f)
    selected_fields.forEach((selectedField?: any) => {
      const selectedColumn = this.docfields.find((column?: any) => column.fieldname === selectedField)
      if (selectedColumn && !selectedColumn.hidden && show_field(selectedColumn.fieldtype)) {
        fields.push({
          label: __(selectedColumn.label, null, this.grid.doctype),
          value: selectedColumn.fieldname,
          checked: true,
        })
      }
    })
    this.docfields.forEach((column?: any) => {
      if (!selected_fields.includes(column.fieldname) && !column.hidden && show_field(column.fieldtype)) {
        fields.push({
          label: __(column.label, null, this.grid.doctype),
          value: column.fieldname,
          checked: false,
        })
      }
    })
    return fields
  }
  render_selected_columns(this: any) {
    let fields = ''
    if (this.selected_columns_for_grid) {
      this.selected_columns_for_grid.forEach((d?: any) => {
        let docfield = frappe.meta.get_docfield(this.grid.doctype, d.fieldname)
        fields += `
					<div class='control-input flex align-center form-control fields_order sortable-handle sortable'
						style='display: block; margin-bottom: 5px; padding: 0 8px; cursor: pointer; height: 32px;' data-fieldname='${docfield.fieldname}'
						data-label='${docfield.label}' data-type='${docfield.fieldtype}'>

						<div class='row'>
							<div class='col-1' style='padding-top: 4px;'>
								<a style='cursor: grabbing;'>${frappe.utils.icon('grip', 'xs')}</a>
							</div>
							<div class='col-5' style='padding-top: 5px;'>
								${__(docfield.label, null, docfield.parent)}
							</div>
							<div class='col-3' style='padding-top: 2px; margin-top:-2px;' title='${__('Width in pixels')}'>
								<input class='form-control column-width my-1 input-xs text-right'
								style='height: 24px; max-width: 80px; background: var(--bg-color);'
									value='${cint(d.width) || this.grid.get_column_width(docfield)}'
									data-fieldname='${docfield.fieldname}'>
							</div>
							<div class='col-2 sticky-col-container' title='${__('Sticky')}' >
								<input type='checkbox' class='form-control sticky-column'
									${d.sticky ? 'checked' : ''}
									data-fieldname='${d.fieldname}' style='background-color: var(--modal-bg); display: inline'>
							</div>
							<div class='col-1' style='padding-top: 3px;'>
								<a class='text-muted remove-field' data-fieldname='${docfield.fieldname}'>
									${frappe.utils.icon('trash', 'xs')}
								</a>
							</div>
						</div>
					</div>`
      })
    }
    $(this.fields_html_wrapper).find('.selected-fields').html(fields)
    this.prepare_handler_for_sort()
    this.select_on_focus()
    this.update_column_width()
    this.update_sticky_column()
    this.remove_selected_column()
  }
  prepare_handler_for_sort(this: any) {
    new Sortable($(this.fields_html_wrapper).find('.selected-fields')[0], {
      handle: '.sortable-handle',
      draggable: '.sortable',
      onUpdate: () => {
        this.sort_columns()
      },
    })
  }
  sort_columns(this: any) {
    this.selected_columns_for_grid = []
    let columns = $(this.fields_html_wrapper).find('.fields_order') || []
    columns.each((idx?: any) => {
      this.selected_columns_for_grid.push({
        fieldname: $(columns[idx]).attr('data-fieldname'),
        width: cint($(columns[idx]).find('.column-width').attr('value')),
        sticky: $(columns[idx]).find('.sticky-column').is(':checked') ? 1 : 0,
      })
    })
  }
  select_on_focus(this: any) {
    $(this.fields_html_wrapper)
      .find('.column-width')
      .click((event?: any) => {
        $(event.target).select()
      })
  }
  update_column_width(this: any) {
    $(this.fields_html_wrapper)
      .find('.column-width')
      .change((event?: any) => {
        let width = this.grid.clamp_column_width(event.target.value)
        event.target.value = width
        this.selected_columns_for_grid.forEach((row?: any) => {
          if (row.fieldname === event.target.dataset.fieldname) {
            row.width = width
            event.target.defaultValue = width
          }
        })
      })
  }
  update_sticky_column(this: any) {
    $(this.fields_html_wrapper)
      .find('.sticky-column')
      .change((event?: any) => {
        this.selected_columns_for_grid.forEach((row?: any) => {
          if (row.fieldname === event.target.dataset.fieldname) {
            row.sticky = cint(event.target.checked)
            event.target.defaultValue = cint(event.target.checked)
          }
        })
      })
  }
  remove_selected_column(this: any) {
    $(this.fields_html_wrapper)
      .find('.remove-field')
      .click((event?: any) => {
        let fieldname = event.currentTarget.dataset.fieldname
        let selected_columns_for_grid = this.selected_columns_for_grid.filter((row?: any) => {
          return row.fieldname !== fieldname
        })
        if (selected_columns_for_grid && selected_columns_for_grid.length === 0) {
          frappe.throw(__('At least one column is required to show in the grid.'))
        }
        this.selected_columns_for_grid = selected_columns_for_grid
        $(this.fields_html_wrapper).find(`[data-fieldname="${fieldname}"]`).remove()
      })
  }
  update_user_settings_for_grid(this: any) {
    if (!this.selected_columns_for_grid || !this.frm) {
      return
    }
    let value: any = {}
    value[this.grid.doctype] = this.selected_columns_for_grid
    frappe.model.user_settings.save(this.frm.doctype, 'GridView', value).then((r?: any) => {
      frappe.model.user_settings[this.frm.doctype] = r.message || r
      this.grid.reset_grid()
    })
  }
  reset_user_settings_for_grid(this: any) {
    frappe.model.user_settings.save(this.frm.doctype, 'GridView', null).then((r?: any) => {
      frappe.model.user_settings[this.frm.doctype] = r.message || r
      this.grid.reset_grid()
    })
  }
  setup_columns(this: any) {
    this.focus_set = false
    this.search_columns = {}
    this.grid.setup_visible_columns()
    const fields = this.grid.user_defined_columns.length > 0 ? this.grid.user_defined_columns : this.docfields
    this.grid.visible_columns.forEach((col?: any, ci?: any) => {
      let df = this.get_column_docfield(fields, col[0].fieldname)
      this.set_dependant_property(df)
      let width = col[1]
      let txt = this.doc
        ? this._format_static_value(this.doc[df.fieldname], df, this.doc)
        : __(df.label, null, df.parent)
      if (this.doc && df.fieldtype === 'Select') {
        txt = __(txt)
      }
      let column: any
      if (!this.columns[df.fieldname] && !this.show_search) {
        column = this.make_column(df, width, txt, ci)
      } else if (!this.columns[df.fieldname] && this.show_search) {
        column = this.make_search_column(df, width)
      } else {
        column = this.columns[df.fieldname]
        this.refresh_field(df.fieldname, txt)
      }
      if (this.doc) {
        if (df.reqd && !txt) {
          column.addClass('error')
        }
        if (column.is_invalid) {
          column.addClass('invalid')
        } else if (df.reqd || df.bold) {
          column.addClass('bold')
        }
      }
    })
    this.columns_list.forEach((column?: any) => column.removeClass('grid-data-last'))
    this.columns_list[this.columns_list.length - 1]?.addClass('grid-data-last')
    if (this.show_search) {
      $(`<div class="col grid-static-col search"></div>`).appendTo(this.row)
    }
    this.columns_list.forEach((column?: any) => {
      if (this.should_show_button_in_idle_grid_cell(column)) {
        this.make_control(column)
        column.static_area.toggle(false)
        column.field_area.toggle(true)
      }
    })
  }
  should_show_button_in_idle_grid_cell(this: any, column?: any) {
    return (
      column.df.fieldtype === 'Button' &&
      this.grid.allow_on_grid_editing() &&
      this.grid.is_editable() &&
      this.doc &&
      !column.df.hidden
    )
  }
  get_column_docfield(this: any, fields?: any, fieldname?: any) {
    const column_df = fields.find((field?: any) => field?.fieldname === fieldname)
    const row_df = this.docfields?.find((df?: any) => df.fieldname === fieldname)
    if (!column_df || !row_df || column_df === row_df) return column_df
    row_df.sticky = column_df.sticky
    row_df.in_list_view = column_df.in_list_view
    return row_df
  }
  set_dependant_property(this: any, df?: any) {
    let changed = false
    for (const { expr, prop, negate } of DEPENDENCY_PROPERTIES) {
      if (df[expr]) {
        const result = this.evaluate_depends_on_value(df[expr])
        const new_value = (negate ? !result : result) ? 1 : 0
        changed ||= df[prop] !== new_value
        df[prop] = new_value
      }
    }
    return changed
  }
  refresh_dependency(this: any) {
    let changed = false
    for (const { df } of this.columns_list) {
      if (DEPENDENCY_PROPERTIES.some((d?: any) => df[d.expr])) {
        changed ||= this.set_dependant_property(df)
      }
    }
    if (changed) {
      this.refresh()
    }
  }
  evaluate_depends_on_value(this: any, expression?: any) {
    let value: any
    let out = null
    let doc = this.doc
    if (!doc) return
    let parent = this.frm ? this.frm.doc : this.doc || null
    if (typeof expression === 'boolean') {
      out = expression
    } else if (typeof expression === 'function') {
      out = expression(doc)
    } else if (expression.substr(0, 5) == 'eval:') {
      try {
        out = frappe.utils.eval(expression.substr(5), { doc, parent })
      } catch (e: any) {
        frappe.throw(__('Invalid "depends_on" expression'))
      }
    } else if (expression.substr(0, 3) == 'fn:' && this.frm) {
      out = this.frm.script_manager.trigger(expression.substr(3), this.doctype, this.docname)
    } else {
      value = doc[expression]
      if ($.isArray(value)) {
        out = !!value.length
      } else {
        out = !!value
      }
    }
    return out
  }
  show_search_row(this: any) {
    let show_length =
      this.grid?.meta?.rows_threshold_for_grid_search > 0
        ? this.grid.meta.rows_threshold_for_grid_search
        : this.default_rows_threshold_for_grid_search
    this.show_search = this.show_search && (this.grid?.data?.length >= show_length || this.grid.filter_applied)
    !this.show_search && this.wrapper.remove()
    return this.show_search
  }
  _get_fieldtype_class(fieldtype?: any) {
    if (['Text', 'Small Text'].includes(fieldtype)) return 'grid-overflow-no-ellipsis'
    if (['Int', 'Currency', 'Float', 'Percent'].includes(fieldtype)) return 'text-right'
    if (fieldtype === 'Check') return 'text-center'
    return ''
  }
  make_search_column(this: any, df?: any, width?: any) {
    let title = ''
    let is_disabled = ''
    if (df.fieldtype === 'Check') {
      title = __('1 = True & 0 = False')
    } else if (df.fieldtype === 'Password') {
      is_disabled = 'disabled'
      title = __('Password cannot be filtered')
    }
    let input_class = this._get_fieldtype_class(df.fieldtype)
    let add_class = ''
    let add_style = `flex: 1 0 ${width}px; width: ${width}px;`
    if (df.sticky) {
      add_class = ' sticky-grid-col'
      add_style += `inset-inline-start: ${this.grid.get_sticky_offset(df.fieldname)}px;`
    }
    let $col = $(`<div class="col grid-static-col search${add_class}" style="${add_style}"></div>`)
      .attr('data-fieldname', df.fieldname)
      .appendTo(this.row)
    let $search_input = $(`
			<input
				type="text"
				class="form-control input-xs ${input_class}"
				title="${title}"
				data-fieldtype="${df.fieldtype}"
				${is_disabled}
			>
		`).appendTo($col)
    this.search_columns[df.fieldname] = $col
    $search_input.on(
      'keyup',
      frappe.utils.debounce((e?: any) => {
        this.grid.filter[df.fieldname] = {
          df: df,
          value: e.target.value,
        }
        if (e.target.value == '') {
          delete this.grid.filter[df.fieldname]
        }
        if (this.grid.grid_sortable) {
          this.grid.grid_sortable.option('disabled', Object.keys(this.grid.filter).length !== 0)
        }
        this.grid.prevent_build = true
        this.grid.grid_pagination.go_to_page(1)
        this.grid.refresh()
        this.grid.prevent_build = false
      }, 500),
    )
    ;['Currency', 'Float', 'Int', 'Percent', 'Rating'].includes(df.fieldtype) &&
      frappe.utils.only_allow_num_decimal($search_input)
    return $col
  }
  make_column(this: any, df?: any, width?: any, txt?: any, ci?: any) {
    let me = this
    let add_class = this._get_fieldtype_class(df.fieldtype)
    let add_style = `flex: 1 0 ${width}px; width: ${width}px;`
    if (df.sticky) {
      add_class += ' sticky-grid-col'
      add_style += `inset-inline-start: ${this.grid.get_sticky_offset(df.fieldname)}px;`
    }
    function handle_date_picker() {
      let date_time_picker = document.querySelectorAll('.datepicker.active')[0] as HTMLElement
      date_time_picker.classList.remove('active')
      date_time_picker.style.width = '220px'
      setTimeout(() => {
        date_time_picker.classList.add('active')
      }, 600)
    }
    function trigger_focus(input_field?: any, col_df?: any) {
      if (['Date', 'Datetime', 'Time'].includes(col_df.fieldtype) && col_df?.read_only) {
        return
      }
      input_field.trigger('focus')
    }
    let is_focused = false
    let $col = $(`<div class="col grid-static-col ${add_class}" style="${add_style}"></div>`)
      .attr('data-fieldname', df.fieldname)
      .attr('data-fieldtype', df.fieldtype)
      .data('df', df)
      .appendTo(this.row)
      .on('focusin', function (this: any, event?: any) {
        if (is_focused) return
        is_focused = true
        if (['Link', 'Dynamic Link', 'Autocomplete'].includes(df.fieldtype)) {
          let $dropdown = $(this).find('.awesomplete > ul:first-of-type')
          let $grid_field = $dropdown.closest('.grid-field')
          if ($grid_field.length) {
            let $home = $dropdown.parent()
            let $wrapper = $(`<div class="awesomplete ${$dropdown.attr('id')}"></div>`)
            $grid_field.append($wrapper)
            $wrapper.append($dropdown)
            let element_position = event.target.getBoundingClientRect()
            let grid_field_position = $grid_field[0].getBoundingClientRect()
            let left_difference = element_position.left - grid_field_position.left
            let top_difference = element_position.top - grid_field_position.top + 30
            $wrapper.css({
              position: 'absolute',
              top: `${top_difference + 10}px`,
              left: `${left_difference}px`,
              minWidth: '250px',
              width: `${element_position.width}px`,
            })
            $(event.target).one('awesomplete-close', () => {
              $home.append($dropdown)
              $wrapper.remove()
              is_focused = false
            })
          }
        }
      })
      .on('click', function (this: any, event?: any) {
        let out: any
        if (frappe.ui.form.editable_row !== me) {
          out = me.toggle_editable_row()
        }
        let col = this
        let first_input_field = $(col).find('input[type="Text"]:first')
        let input_in_focus = false
        $(col)
          .find("input[type='text']")
          .each(function (this: any) {
            if ($(this).is(':focus')) {
              input_in_focus = true
            }
          })
        !input_in_focus && trigger_focus(first_input_field, $(col).data('df'))
        if (event.pointerType == 'touch') {
          first_input_field.data('fieldtype') == 'Date' && handle_date_picker()
        }
        return out
      })
    $col.field_area = $('<div class="field-area"></div>').appendTo($col).toggle(false)
    $col.static_area = $('<div class="static-area ellipsis"></div>').appendTo($col).html(txt)
    if (!this.doc) {
      $col.attr('title', txt)
    }
    df.fieldname && $col.static_area.toggleClass('reqd', Boolean(df.reqd))
    if (this.header_row && df.fieldname && !frappe.is_mobile()) {
      $('<div class="grid-col-resize-handle"></div>').attr('title', '').appendTo($col)
    }
    $col.df = df
    $col.column_index = ci
    this.columns[df.fieldname] = $col
    this.columns_list.push($col)
    if (ci == 0 && this.header_row) {
      $col.attr('tabIndex', 0)
      $col.on('focus', function () {
        if (me.grid.grid_rows.length == 0) {
          me.grid.add_new_row()
        }
        me.grid.grid_rows[me.grid.grid_rows.length - 1].toggle_editable_row(true)
        me.grid.set_focus_on_row(0)
        $col.attr('tabIndex', '')
      })
    }
    return $col
  }
  activate(this: any) {
    this.toggle_editable_row(true)
    return this
  }
  toggle_editable_row(this: any, show?: any) {
    if (this.grid.allow_on_grid_editing() && this.grid.is_editable() && this.doc && show !== false) {
      if (frappe.ui.form.editable_row && frappe.ui.form.editable_row !== this) {
        frappe.ui.form.editable_row.toggle_editable_row(false)
      }
      this.row.toggleClass('editable-row', true)
      this.columns_list.forEach((column?: any) => {
        this.make_control(column)
        column.static_area.toggle(false)
        column.field_area.toggle(true)
        if (column.df.fieldtype === 'Currency') {
          this.update_currency_symbol_in_grid_input(column.field, column.df)
        }
      })
      frappe.ui.form.editable_row = this
      return false
    } else {
      this.row.toggleClass('editable-row', false)
      this.columns_list.forEach((column?: any, index?: any) => {
        if (!this.frm) {
          let df = this.grid.visible_columns[index][0]
          let txt = this.doc
            ? this._format_static_value(this.doc[df.fieldname], df, this.doc)
            : __(df.label, null, df.parent)
          this.refresh_field(df.fieldname, txt)
        }
        if (this.should_show_button_in_idle_grid_cell(column)) {
          this.make_control(column)
          column.static_area.toggle(false)
          column.field_area.toggle(true)
        } else {
          if (!column.df.hidden) {
            column.static_area.toggle(true)
          }
          column.field_area && column.field_area.toggle(false)
        }
      })
      frappe.ui.form.editable_row = null
    }
  }
  make_control(this: any, column?: any) {
    if (column.field) return
    let me = this,
      parent = column.field_area,
      df = column.df
    let field = frappe.ui.form.make_control({
      df: df,
      parent: parent,
      only_input: true,
      with_link_btn: true,
      doc: this.doc,
      doctype: this.doc.doctype,
      docname: this.doc.name,
      frm: this.grid.frm,
      grid: this.grid,
      grid_row: this,
      value: this.doc[df.fieldname],
    })
    field.get_query = this.grid.get_field(df.fieldname).get_query
    let field_onchange_function = df.onchange
    let field_change_function = df.change
    if (!field.df.change) {
      field.df.change = (e?: any) => {
        this.refresh_dependency()
        if (field_onchange_function) {
          field_onchange_function.apply(field, [e])
        } else if (field_change_function) {
          field_change_function.apply(field, [e])
        }
        me.refresh_field(field.df.fieldname)
      }
    }
    field.refresh()
    if (field.$input) {
      field.$input
        .addClass('input-sm')
        .attr('data-col-idx', column.column_index)
        .attr('placeholder', __(df.placeholder || df.label))
      if (this.columns_list && this.columns_list.slice(-1)[0] === column) {
        field.$input.attr('data-last-input', 1)
      } else if (this.columns_list && this.columns_list.slice(0)[0] === column) {
        field.$input.attr('data-first-input', 1)
      }
      if (df.fieldtype === 'Currency') {
        field.$input.off('input.grid-currency').on('input.grid-currency', () => {
          const $wrapper = field.$input.parent()
          const has_value = /\d/.test(field.$input.val() || '')
          if ($wrapper.hasClass('grid-currency-input') && has_value !== $wrapper.hasClass('grid-currency-has-value')) {
            this.update_currency_symbol_in_grid_input(field, df)
          }
        })
      }
    }
    this.set_arrow_keys(field)
    column.field = field
    this.on_grid_fields_dict[df.fieldname] = field
    this.on_grid_fields.push(field)
  }
  set_arrow_keys(this: any, field?: any) {
    const ignore_fieldtypes: any = ['Text', 'Small Text', 'Code', 'Text Editor', 'HTML Editor']
    if (!field.$input) return
    field.$input.on('keydown', (e?: any) => {
      const { ESCAPE, TAB, UP: UP_ARROW, DOWN: DOWN_ARROW } = frappe.ui.keyCode
      if (![TAB, UP_ARROW, DOWN_ARROW, ESCAPE].includes(e.which)) return
      const values = this.grid.get_data()
      const fieldname = $(e.currentTarget).attr('data-fieldname')
      const fieldtype = $(e.currentTarget).attr('data-fieldtype')
      const ctrl_key = e.metaKey || e.ctrlKey
      if (!ignore_fieldtypes.includes(fieldtype) && ctrl_key && e.which !== TAB) {
        this.add_new_row_using_keys(e)
        return
      }
      if (e.shiftKey && e.altKey && DOWN_ARROW === e.which) {
        this.duplicate_row_using_keys()
        return
      }
      const move_up_down = (base?: any) => {
        if (ignore_fieldtypes.includes(fieldtype) && !e.altKey) return false
        if (field.autocomplete_open) return false
        field.parse_validate_and_set_in_model(field.get_input_value()).then(() => {
          base.toggle_editable_row()
          const input = base.columns[fieldname].field.$input
          if (input) input.focus()
        })
        return true
      }
      if (e.which === ESCAPE && !e.shiftKey) {
        if (this.doc.__unedited) this.grid.grid_rows[this.doc.idx - 1].remove()
        return false
      }
      if (e.which === TAB && !e.shiftKey) {
        const last_column = this.wrapper.find('input:enabled:last').get(0)
        const is_last_column = $(e.currentTarget).attr('data-last-input') || last_column === e.currentTarget
        if (is_last_column) {
          if (this.doc.idx === values.length) {
            setTimeout(() => {
              this.grid.add_new_row(null, null, true)
              this.grid.grid_rows[this.grid.grid_rows.length - 1].toggle_editable_row()
              this.grid.set_focus_on_row()
            }, 100)
          } else {
            this.grid.grid_rows[this.doc.idx].toggle_editable_row()
            this.grid.set_focus_on_row(this.doc.idx)
            return false
          }
        }
      } else if (e.which === UP_ARROW) {
        if (this.doc.idx > 1) {
          const prev = this.grid.grid_rows[this.doc.idx - 2]
          if (move_up_down(prev)) return false
        }
      } else if (e.which === DOWN_ARROW) {
        if (this.doc.idx < values.length) {
          const next = this.grid.grid_rows[this.doc.idx]
          if (move_up_down(next)) return false
        }
      } else if (e.which === TAB && e.shiftKey) {
        const first_column = this.wrapper.find("input:enabled:not([type='checkbox'])").first().get(0)
        const is_first_column = $(e.currentTarget).attr('data-first-input') || first_column === e.currentTarget
        if (is_first_column) {
          const ri = this.grid.get_current_row(e.target)
          if (ri == 0) return
          this.grid.grid_rows[ri - 1].toggle_editable_row(true)
        }
      }
    })
  }
  duplicate_row_using_keys(this: any) {
    setTimeout(() => {
      this.insert(false, true, true)
      this.grid.grid_rows[this.doc.idx].toggle_editable_row()
      this.grid.set_focus_on_row(this.doc.idx)
    }, 100)
  }
  add_new_row_using_keys(this: any, e?: any) {
    let idx = ''
    let ctrl_key = e.metaKey || e.ctrlKey
    let is_down_arrow_key_press = e.which === 40
    if (ctrl_key && e.shiftKey) {
      idx = (is_down_arrow_key_press ? null : 1) as any
      this.grid.add_new_row(
        idx,
        null,
        is_down_arrow_key_press,
        false,
        is_down_arrow_key_press,
        !is_down_arrow_key_press,
      )
      idx = (is_down_arrow_key_press ? cint(this.grid.grid_rows.length) - 1 : 0) as any
    } else if (ctrl_key) {
      idx = is_down_arrow_key_press ? this.doc.idx : this.doc.idx - 1
      this.insert(false, is_down_arrow_key_press)
    }
    if (idx !== '') {
      setTimeout(() => {
        this.grid.grid_rows[idx].toggle_editable_row()
        this.grid.set_focus_on_row(idx)
      }, 100)
    }
  }
  get_open_form() {
    return frappe.ui.form.get_open_grid_form()
  }
  toggle_view(this: any, show?: any, callback?: any) {
    if (!this.doc) {
      return this
    }
    if (this.frm) {
      this.doc = locals[this.doc.doctype][this.doc.name]
    }
    let open_row = this.get_open_form()
    if (show === undefined) show = !open_row
    document.activeElement && (document.activeElement as HTMLElement).blur()
    if (show && open_row) {
      if (open_row == this) {
        callback && callback()
        return
      } else {
        open_row.toggle_view(false)
      }
    }
    if (show) {
      this.show_form()
    } else {
      this.hide_form()
    }
    callback && callback()
    return this
  }
  show_form(this: any) {
    if (frappe.utils.is_xs()) {
      $(this.grid.form_grid).css('min-width', '0')
      $(this.grid.form_grid).css('position', 'unset')
    }
    if (!this.grid_form) {
      this.grid_form = new GridRowForm({
        row: this,
      })
    }
    this.grid_form.wrapper.css('display', 'block')
    this.grid_form.render()
    this.row.toggle(false)
    let cannot_add_rows = this.grid.cannot_add_rows || (this.grid.df && this.grid.df.cannot_add_rows)
    this.wrapper.find('.grid-insert-row-below, .grid-insert-row, .grid-duplicate-row').toggle(!cannot_add_rows)
    this.wrapper.find('.grid-delete-row').toggle(!(this.grid.df && this.grid.df.cannot_delete_rows))
    frappe.dom.freeze('', 'grid-form')
    if (cur_frm) cur_frm.cur_grid = this
    this.wrapper.addClass('grid-row-open')
    if (!frappe.dom.is_element_in_viewport(this.wrapper) && !frappe.dom.is_element_in_modal(this.wrapper)) {
      frappe.utils.scroll_to(this.wrapper, true, -15)
    }
    if (this.frm) {
      this.frm.script_manager.trigger(this.doc.parentfield + '_on_form_rendered')
      this.frm.script_manager.trigger('form_render', this.doc.doctype, this.doc.name)
    }
  }
  hide_form(this: any) {
    if (frappe.utils.is_xs()) {
      $(this.grid.form_grid).css('min-width', '738px')
      $(this.grid.form_grid).css('position', 'relative')
    }
    frappe.dom.unfreeze()
    this.row.toggle(true)
    if (!frappe.dom.is_element_in_modal(this.row)) {
      frappe.utils.scroll_to(this.row, true, 15)
    }
    this.refresh()
    if (cur_frm) cur_frm.cur_grid = null
    if (this.grid_form) {
      this.grid_form.wrapper.css('display', 'none')
    }
    this.wrapper.removeClass('grid-row-open')
    if (this.grid.meta?.editable_grid) {
      this.open_form_button?.parent().focus()
    }
  }
  has_prev(this: any) {
    return this.doc.idx > 1
  }
  open_prev(this: any) {
    if (!this.doc) return
    this.open_row_at_index(this.doc.idx - 2)
  }
  has_next(this: any) {
    return this.doc.idx < this.grid.data.length
  }
  open_next(this: any) {
    if (!this.doc) return
    this.open_row_at_index(this.doc.idx)
  }
  open_row_at_index(this: any, row_index?: any) {
    if (!this.grid.data[row_index]) return
    this.change_page_if_reqd(row_index)
    this.grid.grid_rows[row_index].toggle_view(true)
    return true
  }
  change_page_if_reqd(this: any, row_index?: any) {
    const { page_index, page_length } = this.grid.grid_pagination
    row_index++
    let new_page: any
    if (row_index <= (page_index - 1) * page_length) {
      new_page = page_index - 1
    } else if (row_index > page_index * page_length) {
      new_page = page_index + 1
    }
    if (new_page) {
      this.grid.grid_pagination.go_to_page(new_page)
    }
  }
  _escape_for_format(value?: any, df?: any) {
    const PLAIN_TEXT_FIELDTYPES: any = ['Data', 'Long Text', 'Small Text', 'Text', 'Password', 'MultiSelect']
    if (df && PLAIN_TEXT_FIELDTYPES.includes(df.fieldtype)) {
      return frappe.utils.escape_html(cstr(value))
    }
    return value
  }
  _format_static_value(this: any, value?: any, df?: any, doc?: any) {
    const RICH_TEXT_FIELDTYPES: any = ['Text Editor', 'HTML Editor', 'Markdown Editor']
    if (df && RICH_TEXT_FIELDTYPES.includes(df.fieldtype)) {
      return strip_html(cstr(value))
    }
    return frappe.format(this._escape_for_format(value, df), df, null, doc)
  }
  refresh_field(this: any, fieldname?: any, txt?: any) {
    let fields =
      this.grid.user_defined_columns && this.grid.user_defined_columns.length > 0
        ? this.grid.user_defined_columns
        : this.docfields
    let df = this.get_column_docfield(fields, fieldname)
    if (df && this.doc) {
      txt = this._format_static_value(this.doc[fieldname], df, this.doc)
    }
    if (!txt && this.frm) {
      txt = this._format_static_value(this.doc[fieldname], df, this.frm.doc)
    }
    let column = this.columns[fieldname]
    if (column) {
      column.static_area.html(txt || '')
      if (df && df.reqd) {
        column.toggleClass('error', !!(txt === null || txt === ''))
      }
    }
    let field = this.on_grid_fields_dict[fieldname]
    if (field) {
      if (this.doc) field.docname = this.doc.name
      field.refresh()
      if (df && df.fieldtype === 'Currency') {
        this.update_currency_symbol_in_grid_input(field, df)
      }
    }
    if (this.grid_form) {
      this.grid_form.refresh_field(fieldname)
    }
  }
  update_currency_symbol_in_grid_input(this: any, field?: any, df?: any) {
    if (!field?.$input || !this.grid?.is_editable?.()) return
    const currency = frappe.meta.get_field_currency(df, this.doc)
    const symbol = window.get_currency_symbol(currency)
    if (symbol && symbol.includes(' or ')) {
      return
    }
    const show_on_right = cint(frappe.model.get_value(':Currency', currency, 'symbol_on_right')) === 1
    let $wrapper = field.$input.parent()
    if (!$wrapper.hasClass('grid-currency-input')) {
      field.$input.wrap('<div class="grid-currency-input"></div>')
      $wrapper = field.$input.parent()
    }
    $wrapper.toggleClass('grid-currency-symbol-right', show_on_right)
    let $prefix = $wrapper.find('.grid-currency-prefix')
    let $suffix = $wrapper.find('.grid-currency-suffix')
    if (!symbol) {
      $prefix.remove()
      $suffix.remove()
      $wrapper.removeClass('grid-currency-has-value')
      return
    }
    if (show_on_right) {
      if (!$suffix.length) {
        $suffix = $('<span class="grid-currency-suffix"></span>').appendTo($wrapper)
      }
      $suffix.text(symbol)
      $prefix.remove()
    } else {
      if (!$prefix.length) {
        $prefix = $('<span class="grid-currency-prefix"></span>').prependTo($wrapper)
      }
      $prefix.text(symbol)
      $suffix.remove()
    }
    const has_value = /\d/.test(field.$input.val() || '')
    $wrapper.toggleClass('grid-currency-has-value', has_value)
    if (has_value && $wrapper.is(':visible')) {
      const $symbol = show_on_right ? $suffix : $prefix
      const symbol_width = $symbol[0].getBoundingClientRect().width
      $wrapper.css('--grid-currency-symbol-width', `${symbol_width}px`)
    }
  }
  get_field(this: any, fieldname?: any) {
    let field = this.on_grid_fields_dict[fieldname]
    if (field) {
      return field
    } else if (this.grid_form) {
      return this.grid_form.fields_dict[fieldname]
    } else {
      throw `fieldname ${fieldname} not found`
    }
  }
  get_visible_columns(this: any, blacklist: any = []) {
    return this.docfields.filter(
      (df?: any) =>
        !df.hidden &&
        df.in_list_view &&
        this.grid.frm.get_perm(df.permlevel, 'read') &&
        !frappe.model.layout_fields.includes(df.fieldtype) &&
        !blacklist.includes(df.fieldname),
    )
  }
  set_field_property(this: any, fieldname?: any, property?: any, value?: any) {
    const set_property = (field?: any) => {
      if (!field) return
      field.df[property] = value
      field.refresh()
    }
    if (this.grid_form) {
      set_property(this.grid_form.fields_dict[fieldname])
      this.grid_form.layout && this.grid_form.layout.refresh_sections()
    }
    set_property(this.on_grid_fields_dict[fieldname])
  }
  toggle_reqd(this: any, fieldname?: any, reqd?: any) {
    this.set_field_property(fieldname, 'reqd', reqd ? 1 : 0)
  }
  toggle_display(this: any, fieldname?: any, show?: any) {
    this.set_field_property(fieldname, 'hidden', show ? 0 : 1)
  }
  toggle_editable(this: any, fieldname?: any, editable?: any) {
    this.set_field_property(fieldname, 'read_only', editable ? 0 : 1)
  }
}
