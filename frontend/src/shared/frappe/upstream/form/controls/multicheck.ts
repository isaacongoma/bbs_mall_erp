import { $, __, cstr, frappe } from '@/shared/frappe/runtime'

frappe.ui.form.ControlMultiCheck = class ControlMultiCheck extends frappe.ui.form.Control {
  [key: string]: any
  make(this: any) {
    super.make()
    if (this.df.label) {
      this.$label = $(`<label class="control-label">${this.df.label}</label>`).appendTo(this.wrapper)
    }
    this.$load_state = $(`<div class="load-state text-muted small">${__('Loading')}...</div>`)
    this.$select_buttons = this.get_select_buttons().appendTo(this.wrapper)
    this.$load_state.appendTo(this.wrapper)
    const columns = this.df.columns
    this.$checkbox_area = $('<div class="checkbox-options"></div>').appendTo(this.wrapper)
    this.$checkbox_area.get(0).style.setProperty('--checkbox-options-columns', columns)
    this.$checkbox_area.get(0).style.setProperty('padding', '1em')
  }
  refresh(this: any) {
    this.set_options()
    this.bind_checkboxes()
    super.refresh()
  }
  refresh_input(this: any) {
    this.select_options(this.selected_options)
  }
  set_options(this: any) {
    this.$load_state.show()
    this.$select_buttons.hide()
    this.parse_df_options()
    if (this.df.get_data) {
      if (typeof this.df.get_data().then == 'function') {
        this.df.get_data().then((results: any) => {
          this.options = results
          this.make_checkboxes()
        })
      } else {
        this.options = this.df.get_data()
        this.make_checkboxes()
      }
    } else {
      this.make_checkboxes()
    }
  }
  parse_df_options(this: any) {
    if (Array.isArray(this.df.options)) {
      this.options = this.df.options
    } else if (this.df.options && this.df.options.length > 0 && frappe.utils.is_json(this.df.options)) {
      let args = JSON.parse(this.df.options)
      if (Array.isArray(args)) {
        this.options = args
      } else if (Array.isArray(args.options)) {
        this.options = args.options
      }
    } else {
      this.options = []
    }
  }
  make_checkboxes(this: any) {
    this.$load_state.hide()
    this.$checkbox_area.empty()
    if (this.df.sort_options != false) {
      this.options.sort((a: any, b: any) => cstr(a.label).localeCompare(cstr(b.label)))
    }
    this.options.forEach((option: any) => {
      let checkbox = this.get_checkbox_element(option).appendTo(this.$checkbox_area)
      checkbox.find('[data-toggle="tooltip"]').tooltip()
      option.$checkbox = checkbox
    })
    if (this.df.select_all) {
      this.setup_select_all()
    }
    this.set_checked_options()
  }
  bind_checkboxes(this: any) {
    $(this.wrapper).on('change', ':checkbox', (e: any) => {
      const $checkbox = $(e.target)
      const option_name = $checkbox.attr('data-unit')
      if ($checkbox.is(':checked')) {
        if (this.selected_options.includes(option_name)) return
        this.selected_options.push(option_name)
      } else {
        let index = this.selected_options.indexOf(option_name)
        if (index > -1) {
          this.selected_options.splice(index, 1)
        }
      }
      this.df.on_change && this.df.on_change()
    })
  }
  set_checked_options(this: any) {
    this.selected_options = this.options.filter((o: any) => o.checked).map((o: any) => o.value)
    this.select_options(this.selected_options)
  }
  setup_select_all(this: any) {
    this.$select_buttons.show()
    this.$select_buttons.find('.select-all').on('click', () => {
      this.select_all()
    })
    this.$select_buttons.find('.deselect-all').on('click', () => {
      this.select_all(true)
    })
  }
  select_all(this: any, deselect: any = false) {
    this.selected_options = []
    this.options.forEach((option: any) => {
      const checkbox = option.$checkbox.find(':checkbox').get(0)
      if (!checkbox.disabled) {
        checkbox.checked = !deselect
      }
      if (checkbox.checked) {
        this.selected_options.push(option.value)
      }
    })
    this.df.on_change && this.df.on_change()
  }
  select_options(this: any, selected_options: any) {
    this.options
      .map((option: any) => option.value)
      .forEach((value: any) => {
        let $checkbox = $(this.wrapper).find(`:checkbox[data-unit="${value}"]`)[0]
        if ($checkbox) $checkbox.checked = selected_options.includes(value)
      })
  }
  get_value(this: any) {
    return this.selected_options
  }
  get_checked_options(this: any) {
    return this.get_value()
  }
  get_unchecked_options(this: any) {
    return this.options.map((o: any) => o.value).filter((value: any) => !this.selected_options.includes(value))
  }
  get_checkbox_element(option: any) {
    const mandatory_marker = option.danger ? `<span class="text-danger" style="margin-left: 4px;">*</span>` : ''
    const warning_title = frappe.utils.escape_html(option.warning_title || __('Condition based field'))
    const warning_icon = option.warning
      ? `<span class="text-muted multicheck-warning-icon" data-toggle="tooltip" title="${warning_title}">${frappe.utils.icon('info', 'xs')}</span>`
      : ''
    return $(`
			<div class="checkbox unit-checkbox">
				<label title="${option.description || ''}" style="display: flex; align-items: center;">
					<input type="checkbox" data-unit="${option.value}" style="flex-shrink: 0;">
					<span class="label-area ${option.label_class || ''}" data-unit="${option.value}">${option.label}${mandatory_marker}${warning_icon}</span>
				</label>
			</div>
		`)
  }
  get_select_buttons() {
    return $(`
		<div class="bulk-select-options">
			<button class="btn btn-xs btn-default select-all">
				${__('Select All')}
			</button>
			<button class="btn btn-xs btn-default deselect-all">
				${__('Unselect All')}
			</button>
		</div>
		`)
  }
}
