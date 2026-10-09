import Sortable from 'sortablejs'
import { $, __, cint, cstr, flt, frappe } from '@/shared/frappe/runtime'
import GridRow from './grid_row'
import GridPagination from './grid_pagination'
const BULK_EDIT_CSV_HEADER_ROWS = 7
export const GRID_MIN_COLUMN_WIDTH = 60
export const GRID_MAX_COLUMN_WIDTH = 600
export const DEFAULT_COLUMN_WIDTHS: any = {
  Text: 200,
  'Small Text': 200,
  'Long Text': 200,
  Check: 60,
  Int: 100,
  Float: 100,
  Currency: 100,
  Percent: 100,
}
export const LEGACY_COLSIZE_TO_PX: any = {
  1: 60,
  2: 100,
  3: 140,
  4: 200,
  5: 250,
  6: 300,
  7: 350,
  8: 400,
  9: 450,
  10: 500,
  11: 550,
  12: 600,
}
frappe.ui.form.get_open_grid_form = function () {
  return $('.grid-row-open').data('grid_row')
}
frappe.ui.form.close_grid_form = function () {
  const open_form = frappe.ui.form.get_open_grid_form()
  open_form && open_form.hide_form()
  if (frappe.ui.form.editable_row) {
    frappe.ui.form.editable_row.toggle_editable_row(false)
  }
}
export default class Grid {
  [key: string]: any
  constructor(opts?: any) {
    $.extend(this, opts)
    this.fieldinfo = {}
    this.doctype = this.df.options
    this.sticky_offsets = {}
    if (this.doctype) {
      this.meta = frappe.get_meta(this.doctype)
    }
    this.fields_map = {}
    this.column_disp_overrides = {}
    this.template = null
    this.multiple_set = false
    if (this.frm && this.frm.meta.__form_grid_templates && this.frm.meta.__form_grid_templates[this.df.fieldname]) {
      this.template = this.frm.meta.__form_grid_templates[this.df.fieldname]
    }
    this.filter = {}
    this.is_grid = true
    this.debounced_refresh = this.refresh.bind(this)
    this.debounced_refresh = frappe.utils.debounce(this.debounced_refresh, 100)
  }
  get perm() {
    return this.control?.perm || this.frm?.perm || this.df.perm
  }
  set perm(_perm: any) {
    console.error("Setting perm on grid isn't supported, update form's perm instead")
  }
  allow_on_grid_editing(this: any) {
    return !this.meta || !!this.meta.editable_grid
  }
  make(this: any) {
    let template = `
			<div class="grid-field">
				<label class="control-label">${__(this.df.label || '', null, this.df.parent)}</label>
				<span class="help"></span>
				<p class="text-muted small grid-description"></p>
				<div class="grid-custom-buttons"></div>
				<div class="form-grid-container">
					<div class="form-grid">
						<div class="grid-heading-row"></div>
						<div class="grid-body">
							<div class="rows"></div>
							<div class="grid-empty text-center text-extra-muted">
								${__('No rows')}
							</div>
						</div>
					</div>
				</div>
				<div class="small form-clickable-section grid-footer">
					<div class="flex justify-between">
						<div class="grid-buttons">
							${frappe.ui.button.html({
                label: __('Delete'),
                size: 'sm',
                theme: 'red',
                css_class: 'grid-remove-rows hidden',
                attrs: { 'data-action': 'delete_rows' },
              })}
							${frappe.ui.button.html({
                label: __('Edit'),
                size: 'sm',
                css_class: 'grid-edit-rows hidden',
                attrs: { 'data-action': 'bulk_edit_rows' },
              })}
							${frappe.ui.button.html({
                label: __('Delete all'),
                size: 'sm',
                theme: 'red',
                css_class: 'grid-remove-all-rows hidden',
                attrs: { 'data-action': 'delete_all_rows' },
              })}
							${frappe.ui.button.html({
                label: __('Duplicate rows'),
                size: 'sm',
                css_class: 'grid-duplicate-rows hidden',
                attrs: { 'data-action': 'duplicate_rows' },
              })}
							<!-- hack to allow firefox include this in tabs -->
							${frappe.ui.button.html({
                label: __('Add row'),
                size: 'sm',
                css_class: 'grid-add-row',
              })}
							${frappe.ui.button.html({
                label: __('Add multiple'),
                size: 'sm',
                css_class: 'grid-add-multiple-rows hidden',
              })}
						</div>
						<div class="grid-pagination">
						</div>
						<div class="grid-bulk-actions text-right">
							${frappe.ui.button.html({
                label: __('Download'),
                size: 'sm',
                css_class: 'grid-download hidden',
              })}
							${frappe.ui.button.html({
                label: __('Upload'),
                size: 'sm',
                css_class: 'grid-upload hidden',
              })}
						</div>
					</div>
				</div>
			</div>
		`
    this.wrapper = $(template).appendTo(this.parent)
    $(this.parent).addClass('form-group')
    this.set_grid_description()
    this.set_doc_url()
    frappe.utils.bind_actions_with_object(this.wrapper, this)
    this.form_grid = this.wrapper.find('.form-grid')
    this.form_grid.on('scroll', (e?: any) => {
      if ($(e.currentTarget).scrollLeft() > 0) {
        this.grid_rows.forEach((grid_row?: any) => {
          grid_row.on_grid_fields.forEach((field?: any) => {
            if (field.df.fieldtype === 'Link' && field.awesomplete) {
              field.awesomplete.close()
            }
          })
        })
      }
    })
    this.setup_add_row()
    this.setup_grid_pagination()
    this.update_idx_and_name()
    this.custom_buttons = {}
    this.grid_buttons = this.wrapper.find('.grid-buttons')
    this.grid_custom_buttons = this.wrapper.find('.grid-custom-buttons')
    this.remove_rows_button = this.grid_buttons.find('.grid-remove-rows')
    this.edit_rows_button = this.grid_buttons.find('.grid-edit-rows')
    this.duplicate_rows_button = this.grid_buttons.find('.grid-duplicate-rows')
    this.remove_all_rows_button = this.grid_buttons.find('.grid-remove-all-rows')
    this.setup_allow_bulk_edit()
    this.setup_check()
    if (this.df.on_setup) {
      this.df.on_setup(this)
    }
  }
  set_grid_description(this: any) {
    let description_wrapper = $(this.parent).find('.grid-description')
    if (this.df.description) {
      description_wrapper.html(__(this.df.description))
    } else {
      description_wrapper.hide()
    }
  }
  update_idx_and_name(this: any) {
    this.data.forEach((d?: any, ri?: any) => {
      if (d.idx === undefined) {
        d.idx = ri + 1
      }
      if (d.name === undefined) {
        d.name = this.get_random_name()
      }
    })
  }
  get_random_name() {
    return Math.random().toString(36).slice(2, 10)
  }
  set_doc_url(this: any) {
    let unsupported_fieldtypes = frappe.model.no_value_type.filter(
      (x?: any) => frappe.model.table_fields.indexOf(x) === -1,
    )
    if (!this.df.label || !this.df?.documentation_url || unsupported_fieldtypes.includes(this.df.fieldtype)) return
    let $help = $(this.parent).find('span.help')
    $help.empty()
    $(`<a href="${this.df.documentation_url}" target="_blank">
			${frappe.utils.icon('circle-question-mark', 'sm')}
		</a>`).appendTo($help)
  }
  setup_grid_pagination(this: any) {
    this.grid_pagination = new GridPagination({
      grid: this,
      wrapper: this.wrapper,
    })
  }
  setup_check(this: any) {
    this.wrapper.on('click touchend', '.grid-row-check', (e?: any) => {
      if (e.type === 'touchend') {
        e.stopPropagation()
        return
      }
      const $check = $(e.currentTarget)
      const checked = $check.prop('checked')
      const is_select_all = $check.parents('.grid-heading-row:first').length !== 0
      const docname = $check.parents('.grid-row:first')?.attr('data-name')
      if (is_select_all) {
        this.form_grid.find('.grid-row-check').prop('checked', checked)
        let result_length = this.grid_pagination.get_result_length()
        let page_index = this.grid_pagination.page_index
        let page_length = this.grid_pagination.page_length
        for (let ri = (page_index - 1) * page_length; ri < result_length; ri++) {
          this.grid_rows[ri].select(checked)
        }
      } else if (docname) {
        if (e.shiftKey && this.last_checked_docname) {
          this.check_range(docname, this.last_checked_docname, checked)
        }
        this.grid_rows_by_docname[docname].select(checked)
        this.last_checked_docname = docname
      }
      const num_selected_rows = this.get_selected_children().length
      const should_hide_add_buttons =
        num_selected_rows > 0 || this.cannot_add_rows || (this.df && this.df.cannot_add_rows)
      this.wrapper.find('.grid-add-row').toggleClass('hidden', should_hide_add_buttons)
      this.wrapper.find('.grid-add-multiple-rows').toggleClass('hidden', should_hide_add_buttons || !this.multiple_set)
      if (num_selected_rows == 1) {
        this.set_button_label(this.remove_rows_button, __('Delete row'))
        this.set_button_label(this.edit_rows_button, __('Edit row'))
        this.set_button_label(this.duplicate_rows_button, __('Duplicate row'))
      } else {
        this.set_button_label(this.remove_rows_button, __('Delete {0} rows', [num_selected_rows]))
        this.set_button_label(this.edit_rows_button, __('Edit {0} rows', [num_selected_rows]))
        this.set_button_label(this.duplicate_rows_button, __('Duplicate {0} rows', [num_selected_rows]))
      }
      this.refresh_remove_rows_button()
      this.refresh_edit_rows_button()
      this.refresh_duplicate_rows_button()
    })
  }
  check_range(this: any, docname1?: any, docname2?: any, checked: any = true) {
    const row_1 = this.grid_rows_by_docname[docname1]
    const row_2 = this.grid_rows_by_docname[docname2]
    const index_1 = this.grid_rows.indexOf(row_1)
    const index_2 = this.grid_rows.indexOf(row_2)
    if (index_1 === -1 || index_2 === -1) return
    const [start, end] = [index_1, index_2].sort((a?: any, b?: any) => a - b)
    const rows = this.grid_rows.slice(start, end + 1)
    for (const row of rows) {
      row.select(checked)
      row.row_check?.find('.grid-row-check').prop('checked', checked)
    }
  }
  duplicate_rows(this: any) {
    let selected_children = this.get_selected_children()
    selected_children.forEach((doc?: any) => {
      this.add_new_row(null, null, false, doc, false)
      this.check_range(doc.name, doc.name, false)
    })
  }
  delete_rows(this: any) {
    let dirty = false
    let tasks: any = []
    let selected_children = this.get_selected_children()
    selected_children.forEach((doc?: any) => {
      tasks.push(() => {
        if (!this.frm) {
          this.df.data = this.get_data()
          this.df.data = this.df.data.filter((row?: any) => row.idx != doc.idx)
        }
        this.grid_rows_by_docname[doc.name]?.remove()
        dirty = true
      })
      tasks.push(() => frappe.timeout(0.1))
    })
    if (!this.frm) {
      tasks.push(() => {
        this.df.data.forEach((row?: any, index?: any) => (row.idx = index + 1))
      })
    }
    tasks.push(() => {
      if (dirty) {
        this.refresh()
        this.frm && this.frm.script_manager.trigger(this.df.fieldname + '_delete', this.doctype)
      }
    })
    frappe.run_serially(tasks)
    this.wrapper.find('.grid-heading-row .grid-row-check:checked:first').prop('checked', 0)
    if (selected_children.length == this.grid_pagination.page_length) {
      this.scroll_to_top()
    }
  }
  delete_all_rows(this: any) {
    const num_rows = this.data.length
    frappe.confirm(__('Are you sure you want to delete all {0} rows?', [num_rows]), () => {
      this.frm.doc[this.df.fieldname] = []
      $(this.parent).find('.rows').empty()
      this.grid_rows = []
      this.refresh()
      this.frm && this.frm.script_manager.trigger(this.df.fieldname + '_delete', this.doctype)
      this.frm && this.frm.dirty()
      this.scroll_to_top()
    })
  }
  scroll_to_top(this: any) {
    frappe.utils.scroll_to(this.wrapper)
  }
  select_row(this: any, name?: any) {
    this.grid_rows_by_docname[name].select()
  }
  remove_all(this: any) {
    this.grid_rows.forEach((row?: any) => {
      row.remove()
    })
  }
  _any_rows_checked(this: any) {
    return !!this.wrapper.find('.grid-body .grid-row-check:checked:first').length
  }
  refresh_remove_rows_button(this: any) {
    if (this.df.cannot_delete_rows) {
      return
    }
    const has_checked = this._any_rows_checked()
    this.remove_rows_button.toggleClass('hidden', !has_checked)
    this.duplicate_rows_button.toggleClass(
      'hidden',
      !has_checked || this.cannot_add_rows || (this.df && this.df.cannot_add_rows),
    )
    const all_checked = !!this.wrapper.find('.grid-heading-row .grid-row-check:checked:first').length
    const show_delete_all_btn = all_checked && this.data.length > this.get_selected_children().length
    this.remove_all_rows_button.toggleClass('hidden', !show_delete_all_btn)
    if (show_delete_all_btn) {
      this.set_button_label(this.remove_all_rows_button, __('Delete all {0} rows', [this.data.length]))
    }
  }
  set_button_label($btn?: any, label?: any) {
    $btn.find('.es-button__label').text(label)
  }
  refresh_edit_rows_button(this: any) {
    if (!this.meta?.allow_bulk_edit) {
      this.edit_rows_button.toggleClass('hidden', true)
      return
    }
    this.edit_rows_button.toggleClass('hidden', !this._any_rows_checked())
  }
  debounced_refresh_remove_rows_button = frappe.utils.debounce(this.refresh_remove_rows_button, 100)
  refresh_duplicate_rows_button(this: any) {
    if (this.df.cannot_add_rows || (this.df && this.df.cannot_add_rows)) {
      return
    }
    this.duplicate_rows_button.toggleClass('hidden', !this._any_rows_checked())
  }
  debounced_duplicate_rows_button = frappe.utils.debounce(this.refresh_duplicate_rows_button, 100)
  get_selected(this: any) {
    return (this.data || []).filter((doc?: any) => doc.__checked).map((doc?: any) => doc.name)
  }
  get_selected_children(this: any) {
    return (this.data || []).filter((row?: any) => row.__checked)
  }
  _teardown_column_layout(this: any) {
    this.visible_columns = []
    this.grid_rows = []
    $(this.parent).find('.grid-body .grid-row').remove()
  }
  reset_grid(this: any) {
    this._teardown_column_layout()
    this.refresh()
  }
  make_head(this: any) {
    if (this.prevent_build) return
    if (this.header_row) {
      $(this.parent).find('.grid-heading-row .grid-row').remove()
    }
    this.header_row = new GridRow({
      parent: $(this.parent).find('.grid-heading-row'),
      parent_df: this.df,
      docfields: this.docfields,
      frm: this.frm,
      grid: this,
      configure_columns: true,
      header_row: true,
    })
    this.header_search = new GridRow({
      parent: $(this.parent).find('.grid-heading-row'),
      parent_df: this.df,
      docfields: this.docfields,
      frm: this.frm,
      grid: this,
      show_search: true,
    })
    this.header_search.row.addClass('filter-row')
    if (this.header_search.show_search || this.header_search.show_search_row()) {
      $(this.parent).find('.grid-heading-row').addClass('with-filter')
    } else {
      $(this.parent).find('.grid-heading-row').removeClass('with-filter')
    }
    this.filter_applied && this.update_search_columns()
    this.setup_column_resize()
  }
  setup_column_resize(this: any) {
    if (frappe.is_mobile() || !this.wrapper) return
    let me = this
    let ns = this._resize_ns || (this._resize_ns = 'grid-col-resize-' + this.get_random_name())
    let dir = frappe.utils.is_rtl() ? -1 : 1
    this.wrapper.off(`mousedown.${ns}`)
    this.wrapper.on(`mousedown.${ns}`, '.grid-heading-row .grid-col-resize-handle', function (this: any, e?: any) {
      e.preventDefault()
      e.stopPropagation()
      let $col = $(this).closest('.grid-static-col')
      let fieldname = $col.attr('data-fieldname')
      if (!fieldname) return
      let start_x = e.pageX
      let start_width = $col.outerWidth()
      $('body').addClass('grid-col-resizing')
      $(document)
        .on(`mousemove.${ns}`, function (ev?: any) {
          let width = me.clamp_column_width(start_width + dir * (ev.pageX - start_x))
          me.wrapper.find(`.grid-static-col[data-fieldname="${fieldname}"]`).css({
            width: `${width}px`,
            flex: `0 0 ${width}px`,
          })
        })
        .on(`mouseup.${ns}`, function (ev?: any) {
          $(document).off(`mousemove.${ns} mouseup.${ns}`)
          $('body').removeClass('grid-col-resizing')
          me.save_column_width(fieldname, me.clamp_column_width(start_width + dir * (ev.pageX - start_x)))
        })
    })
  }
  save_column_width(this: any, fieldname?: any, width?: any) {
    if (!this.frm) return
    let columns = this.visible_columns.map((col?: any) => {
      let df = col[0]
      if (df.fieldname === fieldname) {
        df.width = width
        col[1] = width
      }
      return {
        fieldname: df.fieldname,
        width: this.get_column_width(df),
        sticky: df.sticky ? 1 : 0,
      }
    })
    this.sticky_offsets = {}
    let sticky_sum = 71
    for (let [df, w] of this.visible_columns) {
      if (df.sticky) {
        this.sticky_offsets[df.fieldname] = sticky_sum
        this.wrapper
          .find(`.grid-static-col[data-fieldname="${df.fieldname}"]`)
          .css('inset-inline-start', `${sticky_sum}px`)
        sticky_sum += w
      }
    }
    let value: any = {}
    value[this.doctype] = columns
    frappe.model.user_settings.save(this.frm.doctype, 'GridView', value).then((r?: any) => {
      frappe.model.user_settings[this.frm.doctype] = r.message || r
    })
  }
  update_search_columns(this: any) {
    for (const field in this.filter) {
      if (this.filter[field] && !this.header_search.search_columns[field]) {
        delete this.filter[field]
        this.data = this.get_data(this.filter_applied)
        break
      }
      if (this.filter[field] && this.filter[field].value) {
        let $input = this.header_search.row_index.find('input')
        if (field && field !== 'row-index') {
          $input = this.header_search.search_columns[field].find('input')
        }
        $input.val(this.filter[field].value)
      }
    }
  }
  refresh(this: any) {
    if (this.frm && this.frm.setting_dependency) return
    this.filter_applied = Object.keys(this.filter).length !== 0
    this.data = this.get_data(this.filter_applied)
    !this.wrapper && this.make()
    let $rows = $(this.parent).find('.rows')
    this.setup_fields()
    if (this.frm) {
      this.display_status = frappe.perm.get_field_display_status(this.df, this.frm.doc, this.perm)
    } else if (this.df.is_web_form && this.control) {
      this.display_status = this.control.get_status()
    } else {
      this.display_status = 'Write'
    }
    if (this.display_status === 'None') return
    this.make_head()
    if (!this.grid_rows) {
      this.grid_rows = []
    }
    this.grid_rows_by_docname = {}
    this.grid_pagination.update_page_numbers()
    this.render_result_rows($rows)
    this.grid_pagination.check_page_number()
    this.wrapper.find('.grid-empty').toggleClass('hidden', Boolean(this.data.length))
    this.setup_toolbar()
    this.toggle_checkboxes(this.display_status !== 'Read')
    if (this.is_sortable() && !this.sortable_setup_done) {
      this.make_sortable($rows)
      this.sortable_setup_done = true
    }
    this.last_display_status = this.display_status
    this.last_docname = this.frm && this.frm.docname
    this.form_grid.toggleClass('error', !!(this.df.reqd && !(this.data && this.data.length)))
    this.refresh_remove_rows_button()
    this.refresh_edit_rows_button()
    this.refresh_duplicate_rows_button()
    this.wrapper.trigger('change')
  }
  render_result_rows(this: any, $rows?: any) {
    if (!$rows) {
      $rows = $(this.parent).find('.rows')
    }
    let result_length = this.grid_pagination.get_result_length()
    let page_index = this.grid_pagination.page_index
    let page_length = this.grid_pagination.page_length
    let page_start = (page_index - 1) * page_length
    if (!this.grid_rows) {
      return
    }
    let rows_by_doc = new Map()
    for (let row of this.grid_rows) {
      if (row?.doc) {
        rows_by_doc.set(row.doc, row)
      }
    }
    let matched_rows = new Set()
    for (let ri = page_start; ri < result_length; ri++) {
      const d = this.data[ri]
      if (!d) {
        return
      }
      if (d.idx === undefined) {
        d.idx = ri + 1
      }
      if (d.name === undefined) {
        d.name = this.get_random_name()
      }
      let grid_row = rows_by_doc.get(d)
      if (grid_row) {
        matched_rows.add(grid_row)
        grid_row.refresh()
      } else {
        grid_row = new GridRow({
          parent: $rows,
          parent_df: this.df,
          docfields: this.docfields,
          doc: d,
          frm: this.frm,
          grid: this,
        })
      }
      this.grid_rows[ri] = grid_row
      this.grid_rows_by_docname[d.name] = grid_row
    }
    for (let [, row] of rows_by_doc) {
      if (!matched_rows.has(row)) {
        row.wrapper.remove()
      }
    }
    let $children = $rows.children()
    let page_count = result_length - page_start
    let reorder_from = -1
    for (let i = 0; i < page_count; i++) {
      if ($children.get(i) !== this.grid_rows[page_start + i].wrapper.get(0)) {
        reorder_from = i
        break
      }
    }
    if (reorder_from >= 0) {
      for (let ri = page_start + reorder_from; ri < result_length; ri++) {
        $rows.append(this.grid_rows[ri].wrapper)
      }
    }
    for (let i = 0; i < this.grid_rows.length; i++) {
      if (i < page_start || i >= result_length) {
        delete this.grid_rows[i]
      }
    }
    if (this.grid_rows.length > this.data.length) {
      this.grid_rows.length = this.data.length
    }
  }
  setup_toolbar(this: any) {
    const is_editable = this.is_editable()
    if (is_editable) {
      this.wrapper.find('.grid-footer').removeClass('hidden')
      const num_selected_rows = this.get_selected_children().length
      if (this.cannot_add_rows || (this.df && this.df.cannot_add_rows) || num_selected_rows > 0) {
        this.wrapper.find('.grid-add-row, .grid-add-multiple-rows, .grid-duplicate-rows').addClass('hidden')
      } else {
        this.wrapper.find('.grid-add-row').removeClass('hidden')
        if (this.multiple_set) {
          this.wrapper.find('.grid-add-multiple-rows').removeClass('hidden')
        }
      }
    } else if (this.grid_rows.length < this.grid_pagination.page_length && !this.df.allow_bulk_edit) {
      this.wrapper.find('.grid-footer').addClass('hidden')
    }
    this.wrapper.find('.grid-add-row, .grid-add-multiple-rows, .grid-upload').toggleClass('d-none', !is_editable)
  }
  setup_fields(this: any) {
    if (this.frm && this.frm.docname) {
      this.df = frappe.meta.get_docfield(this.frm.doctype, this.df.fieldname, this.frm.docname)
    } else {
      if (this.df.options) {
        this.df = frappe.meta.get_docfield(this.df.options, this.df.fieldname) || this.df || null
      }
    }
    if (this.doctype && this.frm) {
      this.docfields = frappe.meta.get_docfields(this.doctype, this.frm.docname)
    } else {
      this.docfields = this.df.fields
    }
    this._apply_layout_child_overrides()
    this._apply_column_disp_overrides()
    this._apply_mask_overrides()
    this.docfields.forEach((df?: any) => {
      this.fields_map[df.fieldname] = df
    })
  }
  _apply_mask_overrides(this: any) {
    const masked_fields = frappe.get_meta(this.doctype)?.masked_fields || []
    if (!masked_fields.length) return
    this.docfields = this.docfields.map((df?: any) => {
      if (!masked_fields.includes(df.fieldname)) return df
      return Object.assign({}, df, { read_only: 1, fieldtype: 'Data' })
    })
  }
  _apply_column_disp_overrides(this: any) {
    const fieldnames = Object.keys(this.column_disp_overrides || {})
    if (!fieldnames.length) return
    this.docfields = this.docfields.map((df?: any) => {
      if (!(df.fieldname in this.column_disp_overrides)) return df
      return Object.assign({}, df, { hidden: this.column_disp_overrides[df.fieldname] })
    })
  }
  _apply_layout_child_overrides(this: any) {
    const layout = this.frm?.doctype_layout
    if (!layout?.child_tables?.length || !this.df?.fieldname) return
    const table_fn = this.df.fieldname
    const entry = layout.child_tables.find((r?: any) => r.table_fieldname === table_fn)
    if (!entry?.child_layout) return
    const child_layout = frappe.get_doc('DocType Layout', entry.child_layout)
    if (!child_layout?.fields?.length) return
    const OVERRIDE_PROPS: any = [
      'hidden',
      'reqd',
      'read_only',
      'bold',
      'allow_in_quick_entry',
      'in_list_view',
      'in_standard_filter',
      'default',
      'description',
      'depends_on',
      'mandatory_depends_on',
      'read_only_depends_on',
    ]
    const override_map = Object.fromEntries(child_layout.fields.map((f?: any) => [f.fieldname, f]))
    this.docfields = this.docfields.map((df?: any) => {
      const o = override_map[df.fieldname]
      if (!o) return df
      const copy = Object.assign({}, df)
      if (o.label) copy.label = o.label
      for (const prop of OVERRIDE_PROPS) {
        if (o[prop]) {
          copy[prop] = o[prop]
        }
      }
      return copy
    })
  }
  refresh_row(this: any, docname?: any) {
    this.grid_rows_by_docname[docname] && this.grid_rows_by_docname[docname].refresh()
  }
  make_sortable(this: any, $rows?: any) {
    this.grid_sortable = new Sortable($rows.get(0), {
      group: { name: this.df.fieldname },
      handle: '.sortable-handle',
      draggable: '.grid-row',
      animation: 100,
      filter: (evt?: any) => {
        if (evt.target.closest('.ql-editor')) {
          return false
        }
        return !!evt.target.closest('li, a')
      },
      onMove: (event?: any) => {
        if (!this.is_editable()) {
          return false
        }
        let idx = $(event.dragged).closest('.grid-row').attr('data-idx')
        let doc = this.data[idx % this.grid_pagination.page_length]
        if (doc && doc._sortable === false) {
          return false
        }
      },
      onUpdate: (event?: any) => {
        let idx = $(event.item).closest('.grid-row').attr('data-idx') - 1
        let doc = this.data[idx % this.grid_pagination.page_length]
        this.renumber_based_on_dom()
        this.frm && this.frm.script_manager.trigger(this.df.fieldname + '_move', this.df.options, doc.name)
        this.refresh()
        this.frm && this.frm.dirty()
      },
    })
    this.frm && $(this.frm.wrapper).trigger('grid-make-sortable', [this.frm])
  }
  get_data(this: any, filter_field?: any) {
    let data: any = []
    if (filter_field) {
      data = this.get_filtered_data()
    } else {
      data = this.frm ? this.frm.doc[this.df.fieldname] || [] : this.df.data || this.get_modal_data()
    }
    return data
  }
  get_filtered_data(this: any) {
    let all_data = this.frm ? this.frm.doc[this.df.fieldname] : this.df.data
    if (!all_data) return
    for (const field in this.filter) {
      all_data = all_data.filter((data?: any) => {
        let { df, value } = this.filter[field]
        return this.get_data_based_on_fieldtype(df, data, value.toLowerCase())
      })
    }
    return all_data
  }
  get_data_based_on_fieldtype(df?: any, data?: any, value?: any) {
    let fieldname = df.fieldname
    let fieldtype = df.fieldtype
    let fieldvalue = data[fieldname]
    if (fieldtype === 'Check') {
      value = frappe.utils.string_to_boolean(value)
      return Boolean(fieldvalue) === value && data
    } else if (fieldtype === 'Sr No' && data.idx.toString().includes(value)) {
      return data
    } else if (fieldtype === 'Duration' && fieldvalue) {
      let formatted_duration = frappe.utils.get_formatted_duration(fieldvalue)
      if (formatted_duration.includes(value)) {
        return data
      }
    } else if (fieldtype === 'Barcode' && fieldvalue) {
      let barcode = fieldvalue.startsWith('<svg') ? $(fieldvalue).attr('data-barcode-value') : fieldvalue
      if (barcode.toLowerCase().includes(value)) {
        return data
      }
    } else if (['Datetime', 'Date'].includes(fieldtype) && fieldvalue) {
      let user_formatted_date = frappe.datetime.str_to_user(fieldvalue)
      if (user_formatted_date.includes(value)) {
        return data
      }
    } else if (['Currency', 'Float', 'Int', 'Percent', 'Rating'].includes(fieldtype)) {
      let num = fieldvalue || 0
      if (fieldtype === 'Rating') {
        let out_of_rating = parseInt(String(df.options)) || 5
        num = num * out_of_rating
      }
      if (num.toString().includes(value)) {
        return data
      }
    } else if (fieldvalue && fieldvalue.toLowerCase().includes(value)) {
      return data
    }
  }
  get_modal_data(this: any) {
    return this.df.get_data
      ? this.df.get_data().filter((data?: any) => {
          if (!this.deleted_docs || !this.deleted_docs.includes(data.name)) {
            return data
          }
        })
      : []
  }
  set_column_disp(this: any, fieldname?: any, show?: any) {
    if (Array.isArray(fieldname)) {
      for (let field of fieldname) {
        this.update_docfield_property(field, 'hidden', show ? 0 : 1)
        this.set_editable_grid_column_disp(field, show)
      }
    } else {
      this.get_docfield(fieldname).hidden = show ? 0 : 1
      this.set_editable_grid_column_disp(fieldname, show)
    }
    this.debounced_refresh()
  }
  set_column_disp_in_list_view(this: any, fieldname?: any, show?: any) {
    const fieldnames = Array.isArray(fieldname) ? fieldname : [fieldname]
    for (let field of fieldnames) {
      this.column_disp_overrides[field] = show ? 0 : 1
    }
    this._teardown_column_layout()
    this.debounced_refresh()
  }
  set_editable_grid_column_disp(this: any, fieldname?: any, show?: any) {
    if (this.meta.editable_grid && this.grid_rows) {
      this.grid_rows.forEach((row?: any) => {
        row.columns_list.forEach((column?: any) => {
          if (column.df.fieldname == fieldname) {
            if (show) {
              column.df.hidden = false
              if (row != frappe.ui.form.editable_row) {
                if (row.should_show_button_in_idle_grid_cell && row.should_show_button_in_idle_grid_cell(column)) {
                  row.make_control(column)
                  column.static_area.hide()
                  column.field_area && column.field_area.toggle(true)
                } else {
                  column.static_area.show()
                  column.field_area && column.field_area.toggle(false)
                }
              } else {
                column.static_area.hide()
                column.field_area && column.field_area.toggle(true)
                if (column.field) {
                  column.field.refresh()
                  if (column.field.$input) column.field.$input.toggleClass('input-sm', true)
                }
              }
            } else {
              column.df.hidden = true
              column.static_area.hide()
            }
          }
        })
      })
    }
    this.refresh()
  }
  toggle_reqd(this: any, fieldname?: any, reqd?: any) {
    this.update_docfield_property(fieldname, 'reqd', reqd)
    this.debounced_refresh()
  }
  toggle_enable(this: any, fieldname?: any, enable?: any) {
    this.update_docfield_property(fieldname, 'read_only', enable ? 0 : 1)
    this.debounced_refresh()
  }
  toggle_display(this: any, fieldname?: any, show?: any) {
    this.update_docfield_property(fieldname, 'hidden', show ? 0 : 1)
    this.debounced_refresh()
  }
  toggle_checkboxes(this: any, enable?: any) {
    this.wrapper.find('.grid-row-check').prop('disabled', !enable)
  }
  get_docfield(this: any, fieldname?: any) {
    return frappe.meta.get_docfield(this.doctype, fieldname, this.frm ? this.frm.docname : null)
  }
  get_row(this: any, key?: any) {
    if (typeof key == 'number') {
      if (key < 0) {
        return this.grid_rows[this.grid_rows.length + key]
      } else {
        return this.grid_rows[key]
      }
    } else {
      return this.grid_rows_by_docname[key]
    }
  }
  get_grid_row(this: any, key?: any) {
    return this.get_row(key)
  }
  get_field(this: any, fieldname?: any) {
    if (!this.fieldinfo[fieldname]) this.fieldinfo[fieldname] = {}
    return this.fieldinfo[fieldname]
  }
  set_value(this: any, fieldname?: any, value?: any, doc?: any) {
    if (this.display_status !== 'None' && doc?.name && this.grid_rows_by_docname?.[doc.name]) {
      let grid_row = this.grid_rows_by_docname[doc.name]
      grid_row.refresh_field(fieldname, value)
      grid_row.refresh_dependency()
    }
  }
  setup_add_row(this: any) {
    this.wrapper.find('.grid-add-row').click(() => {
      this.add_new_row(null, null, true, null, true)
      this.set_focus_on_row()
      return false
    })
  }
  add_new_row(
    this: any,
    idx?: any,
    callback?: any,
    show?: any,
    copy_doc?: any,
    go_to_last_page: any = false,
    go_to_first_page: any = false,
  ) {
    let d: any
    let cannot_add_rows = this.cannot_add_rows || (this.df && this.df.cannot_add_rows)
    if (this.is_editable() && !cannot_add_rows) {
      if (go_to_last_page) {
        this.grid_pagination.go_to_last_page_to_add_row()
      } else if (go_to_first_page) {
        this.grid_pagination.go_to_page(1)
      }
      if (this.frm) {
        d = frappe.model.add_child(this.frm.doc, this.df.options, this.df.fieldname, idx)
        if (copy_doc) {
          d = this.duplicate_row(d, copy_doc)
        }
        d.__unedited = true
        this.frm.script_manager.trigger(this.df.fieldname + '_add', d.doctype, d.name)
        this.refresh()
      } else {
        if (!this.df.data) {
          this.df.data = this.get_data() || []
        }
        const defaults = this.docfields.reduce((acc?: any, d?: any) => {
          acc[d.fieldname] = d.default
          return acc
        }, {})
        const row_idx = this.df.data.length + 1
        this.df.data.push({ idx: row_idx, __islocal: true, ...defaults })
        this.df.on_add_row && this.df.on_add_row(row_idx)
        this.refresh()
      }
      if (show) {
        if (idx) {
          this.wrapper
            .find("[data-idx='" + idx + "']")
            .data('grid_row')
            .toggle_view(true, callback)
        } else {
          if (!this.allow_on_grid_editing()) {
            this.wrapper.find('.grid-row:last').data('grid_row').toggle_view(true, callback)
          }
        }
      }
      return d
    }
  }
  renumber_based_on_dom(this: any) {
    let $rows = $(this.parent).find('.rows')
    $rows.find('.grid-row').each((i?: any, item?: any) => {
      let $item = $(item)
      let index = (this.grid_pagination.page_index - 1) * this.grid_pagination.page_length + i
      let d = this.grid_rows_by_docname[$item.attr('data-name')].doc
      d.idx = index + 1
      $item.attr('data-idx', d.idx)
      if (this.frm) this.frm.doc[this.df.fieldname][index] = d
      this.data[index] = d
      this.grid_rows[index] = this.grid_rows_by_docname[d.name]
    })
  }
  duplicate_row(d?: any, copy_doc?: any) {
    const skip: any = [
      'creation',
      'modified',
      'modified_by',
      'idx',
      'owner',
      'parent',
      'doctype',
      'name',
      'parentfield',
    ]
    for (const [key, value] of Object.entries(copy_doc)) {
      if (!skip.includes(key)) d[key] = value
    }
    return d
  }
  bulk_edit_rows(this: any) {
    if (!this.meta?.allow_bulk_edit) return
    const selected_children = this.get_selected_children()
    if (!selected_children.length) {
      frappe.show_alert({ message: __('No rows selected'), indicator: 'orange' })
      return
    }
    const bulk_edit_reference_row = selected_children[0]
    const parent_doc = this.frm?.doc
    const perm_reference_doc = parent_doc
      ? Object.assign({ doctype: this.doctype }, bulk_edit_reference_row, {
          docstatus: parent_doc.docstatus,
        })
      : null
    const is_field_editable = (field_doc?: any) => {
      if (
        !field_doc.fieldname ||
        !frappe.model.is_value_type(field_doc) ||
        field_doc.fieldtype === 'Read Only' ||
        field_doc.hidden ||
        field_doc.is_virtual
      ) {
        return false
      }
      if (!perm_reference_doc) {
        return !field_doc.read_only
      }
      return frappe.perm.get_field_display_status(field_doc, perm_reference_doc, this.frm.perm) === 'Write'
    }
    const editable_fields = (this.docfields || []).filter((field_doc?: any) => is_field_editable(field_doc))
    if (!editable_fields.length) {
      frappe.msgprint(__('No editable fields available for bulk edit.'))
      return
    }
    const grid = this
    const field_mappings: any = {}
    editable_fields.forEach((field_doc?: any) => {
      const field_key = `${field_doc.label}`
      field_mappings[field_key] = Object.assign({}, field_doc)
    })
    const field_options = Object.keys(field_mappings).sort((a?: any, b?: any) =>
      __(cstr(field_mappings[a].label)).localeCompare(cstr(__(field_mappings[b].label))),
    )
    const field_autocomplete_options = field_options.map((key?: any) => ({
      label: __(cstr(field_mappings[key].label)),
      value: key,
    }))
    const status_regex = /status/i
    const default_field =
      field_options.find((value?: any) => status_regex.test(value)) ||
      field_options.find((value?: any) => field_mappings[value]?.fieldtype === 'Select')
    const dialog = new frappe.ui.Dialog({
      title: __('Bulk Edit'),
      fields: [
        {
          fieldtype: 'Autocomplete',
          options: field_autocomplete_options,
          max_items: Infinity,
          default: default_field,
          label: __('Field'),
          fieldname: 'field',
          reqd: 1,
          onchange: () => {
            set_value_field(dialog)
          },
        },
        {
          fieldtype: 'Data',
          label: __('Value'),
          fieldname: 'value',
          onchange() {
            show_help_text()
          },
        },
      ],
      primary_action: ({ value }: any) => {
        const selected_field = field_mappings[dialog.get_value('field')]
        const { fieldname } = selected_field
        dialog.disable_primary_action()
        const update_value = value || null
        const tasks = selected_children.map((doc?: any) =>
          frappe.model.set_value(doc.doctype, doc.name, fieldname, update_value),
        )
        Promise.all(tasks).then(() => {
          this.frm && this.frm.dirty()
          this.refresh()
          dialog.hide()
          const row_label = selected_children.length === 1 ? __('row') : __('rows')
          frappe.show_alert(
            __('Updated {0} selected {1}. Save the form to keep changes.', [selected_children.length, row_label]),
          )
        })
      },
      primary_action_label: __('Update {0} rows', [selected_children.length]),
    })
    if (default_field) set_value_field(dialog)
    show_help_text()
    function set_value_field(dialogObj?: any) {
      const field_value = dialogObj.get_value('field')
      if (!field_value || !field_mappings[field_value]) return
      const new_df = Object.assign({}, field_mappings[field_value])
      if (new_df.label?.match(status_regex) && new_df.fieldtype === 'Select' && !new_df.default) {
        let options: any = []
        if (typeof new_df.options === 'string') {
          options = new_df.options.split('\n')
        }
        new_df.default = options[0] || options[1]
      }
      new_df.label = __('Value')
      new_df.onchange = show_help_text
      delete new_df.depends_on
      const grid_field = grid.get_field(new_df.fieldname)
      if (grid_field?.get_query) {
        new_df.get_query = grid_field.get_query
      }
      dialogObj.replace_field('value', new_df)
      setup_bulk_edit_value_field(dialogObj)
      show_help_text()
    }
    function setup_bulk_edit_value_field(dialogObj?: any) {
      const value_control = dialogObj.fields_dict.value
      if (!value_control || !bulk_edit_reference_row) return
      value_control.frm = grid.frm
      value_control.doc = bulk_edit_reference_row
      value_control.docname = bulk_edit_reference_row.name
      value_control.doctype = bulk_edit_reference_row.doctype
      value_control.refresh()
    }
    function show_help_text() {
      if (dialog.get_primary_btn().is(':focus, :active')) return
      let value = dialog.get_value('value')
      if (value == null || value === '') {
        dialog.set_df_property(
          'value',
          'description',
          __('You have not entered a value. The field will be set to empty.'),
        )
      } else {
        dialog.set_df_property('value', 'description', '')
      }
    }
    dialog.refresh()
    dialog.show()
  }
  set_focus_on_row(this: any, idx?: any) {
    if (!idx && idx !== 0) {
      idx = this.grid_rows.length - 1
    }
    setTimeout(() => {
      this.grid_rows[idx].toggle_editable_row(true)
      this.grid_rows[idx].row.find('input[type="Text"],textarea,select').filter(':visible:first').focus()
    }, 100)
  }
  setup_visible_columns(this: any) {
    if (this.visible_columns && this.visible_columns.length > 0) return
    this.user_defined_columns = []
    this.setup_user_defined_columns()
    const use_user_columns = this.user_defined_columns.length > 0
    const fields = use_user_columns ? this.user_defined_columns : this.editable_fields || this.docfields
    this.visible_columns = []
    for (const _df of fields) {
      let df = use_user_columns ? _df : this.fields_map[_df.fieldname]
      if (
        df &&
        !df.hidden &&
        (this.editable_fields || df.in_list_view) &&
        ((this.frm && this.frm.get_perm(df.permlevel, 'read')) || !this.frm) &&
        !frappe.model.layout_fields.includes(df.fieldtype)
      ) {
        if (df.fieldtype == 'Link' && !df.formatter && df.parent && frappe.meta.docfield_map[df.parent]) {
          const docfield = frappe.meta.docfield_map[df.parent][df.fieldname]
          if (docfield && docfield.formatter) {
            df.formatter = docfield.formatter
          }
        }
        this.visible_columns.push([df, this.get_column_width(df)])
      }
    }
    this.sticky_offsets = {}
    let sticky_sum = 71
    for (let [df, width] of this.visible_columns) {
      if (df.sticky) {
        this.sticky_offsets[df.fieldname] = sticky_sum
        sticky_sum += width
      }
    }
  }
  clamp_column_width(width?: any) {
    return Math.max(GRID_MIN_COLUMN_WIDTH, Math.min(GRID_MAX_COLUMN_WIDTH, cint(width)))
  }
  get_column_width(this: any, df?: any) {
    const width = df.width || LEGACY_COLSIZE_TO_PX[df.columns] || DEFAULT_COLUMN_WIDTHS[df.fieldtype] || 140
    return this.clamp_column_width(width)
  }
  get_sticky_offset(this: any, fieldname?: any) {
    return this.sticky_offsets[fieldname] ?? 71
  }
  setup_user_defined_columns(this: any) {
    if (!this.frm) return
    let user_settings = frappe.get_user_settings(this.frm.doctype, 'GridView')
    if (user_settings && user_settings[this.doctype] && user_settings[this.doctype].length) {
      this.user_defined_columns = user_settings[this.doctype]
        .map((row?: any) => {
          let column =
            this.docfields?.find((d?: any) => d.fieldname === row.fieldname) ||
            frappe.meta.get_docfield(this.doctype, row.fieldname)
          if (column) {
            column.in_list_view = 1
            column.width = cint(row.width) || LEGACY_COLSIZE_TO_PX[row.columns]
            column.sticky = row.sticky
            return column
          }
        })
        .filter(Boolean)
    }
  }
  is_editable(this: any) {
    return this.display_status == 'Write' && !this.static_rows
  }
  is_sortable(this: any) {
    return this.sortable_status || this.is_editable()
  }
  only_sortable(this: any, status?: any) {
    if (status === undefined ? true : status) {
      this.sortable_status = true
      this.static_rows = true
    }
  }
  set_multiple_add(this: any, link?: any, qty?: any) {
    if (this.multiple_set) return
    const link_field = frappe.meta.get_docfield(this.df.options, link)
    const btn = $(this.wrapper).find('.grid-add-multiple-rows')
    btn.removeClass('hidden')
    btn.on('click', () => {
      new frappe.ui.form.LinkSelector({
        doctype: link_field.options,
        fieldname: link,
        qty_fieldname: qty,
        get_query: link_field.get_query,
        target: this,
        txt: '',
      })
      this.grid_pagination.go_to_last_page_to_add_row()
      return false
    })
    this.multiple_set = true
  }
  setup_allow_bulk_edit(this: any) {
    let me = this
    if (this.frm && this.frm.get_docfield(this.df.fieldname)?.allow_bulk_edit) {
      this.setup_download()
      const value_formatter_map: any = {
        Date: (val?: any) => (val ? frappe.datetime.user_to_str(val) : val),
        Int: (val?: any) => cint(val),
        Check: (val?: any) => cint(val),
        Float: (val?: any) => flt(val),
        Currency: (val?: any) => flt(val),
      }
      frappe.flags.no_socketio = true
      $(this.wrapper)
        .find('.grid-upload')
        .removeClass('hidden')
        .on('click', () => {
          new frappe.ui.FileUploader({
            as_dataurl: true,
            allow_multiple: false,
            restrictions: {
              allowed_file_types: ['.csv'],
            },
            on_success(file?: any) {
              const data = frappe.utils.csv_to_array(frappe.utils.get_decoded_string(file.dataurl))
              if (cint(data.length) - BULK_EDIT_CSV_HEADER_ROWS > 5000) {
                frappe.throw(__('Cannot import table with more than 5000 rows.'))
              }
              const fieldnames = data[2]
              me.frm.clear_table(me.df.fieldname)
              data.forEach((row?: any, i?: any) => {
                if (i < BULK_EDIT_CSV_HEADER_ROWS) return
                if (!row.some((v?: any) => v)) return
                const d = me.frm.add_child(me.df.fieldname)
                row.forEach((value?: any, ci?: any) => {
                  const fieldname = fieldnames[ci]
                  const df = frappe.meta.get_docfield(me.df.options, fieldname)
                  if (df) {
                    d[fieldname] = value_formatter_map[df.fieldtype] ? value_formatter_map[df.fieldtype](value) : value
                  }
                })
              })
              me.frm.refresh_field(me.df.fieldname)
              frappe.msgprint({
                message: __('Table updated'),
                title: __('Success'),
                indicator: 'green',
              })
            },
          })
          return false
        })
    }
  }
  setup_download(this: any) {
    let title = this.df.label || frappe.model.unscrub(this.df.fieldname)
    $(this.wrapper)
      .find('.grid-download')
      .removeClass('hidden')
      .on('click', () => {
        const data: any = [
          [__('Bulk Edit {0}', [title])],
          [],
          [],
          [],
          [__('The CSV format is case sensitive')],
          [__('Do not edit headers which are preset in the template')],
          ['------'],
        ]
        const docfields: any = []
        frappe.get_meta(this.df.options).fields.forEach((df?: any) => {
          if (frappe.model.is_value_type(df.fieldtype)) {
            data[1].push(df.label)
            data[2].push(df.fieldname)
            let description = (df.description || '') + ' '
            if (df.fieldtype === 'Date') description += frappe.boot.sysdefaults.date_format
            data[3].push(description)
            docfields.push(df)
          }
        })
        ;(this.frm.doc[this.df.fieldname] || []).forEach((d?: any) => {
          const row = data[2].map((fieldname?: any, i?: any) => {
            let value = d[fieldname]
            if (docfields[i].fieldtype === 'Date' && value) {
              value = frappe.datetime.str_to_user(value)
            }
            return value || ''
          })
          data.push(row)
        })
        frappe.tools.downloadify(data, null, title)
        return false
      })
  }
  add_custom_button(this: any, label?: any, click?: any, position: any = 'bottom') {
    const $wrapper = position === 'top' ? this.grid_custom_buttons : this.grid_buttons
    let $btn = this.custom_buttons[label]
    if (!$btn) {
      $btn = frappe.ui
        .button({ label: __(label), size: 'sm', css_class: 'btn-custom' })
        .prependTo($wrapper)
        .on('click', click)
      this.custom_buttons[label] = $btn
    } else {
      $btn.removeClass('hidden')
    }
    return $btn
  }
  clear_custom_buttons(this: any) {
    this.grid_buttons.find('.btn-custom').addClass('hidden')
  }
  update_docfield_property(this: any, fieldname?: any, property?: any, value?: any) {
    if (!this.grid_rows) {
      return
    }
    for (let row of this.grid_rows) {
      if (!row) continue
      let docfield = row.docfields?.find((d?: any) => d.fieldname === fieldname)
      if (docfield) {
        docfield[property] = value
      } else {
        throw `field ${fieldname} not found`
      }
    }
    this.docfields.find((d?: any) => d.fieldname === fieldname)[property] = value
    if (this.user_defined_columns && this.user_defined_columns.length > 0) {
      let field = this.user_defined_columns.find((d?: any) => d.fieldname === fieldname)
      if (field && Object.keys(field).includes(property)) {
        field[property] = value
      }
    }
    this.debounced_refresh()
  }
  get_current_row(this: any, target?: any) {
    let current_row = null
    for (let i = 0; i < this.grid_rows.length; i++) {
      if (this.grid_rows[i]?.wrapper.get(0).contains(target)) {
        current_row = i
      }
    }
    return current_row
  }
}
