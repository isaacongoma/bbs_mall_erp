import { $, __, cint, frappe } from '@/shared/frappe/runtime'
frappe.provide('frappe.ui')
frappe.ui.Slide = class Slide {
  [key: string]: any
  constructor(slide: any = null) {
    $.extend(this, slide)
    this.setup()
  }
  setup(this: any) {
    this.$wrapper = $('<div class="slide-wrapper hidden"></div>')
      .attr({ 'data-slide-id': this.id, 'data-slide-name': this.name })
      .appendTo(this.parent)
  }
  make(this: any) {
    if (this.before_load) this.before_load(this)
    this.attach_toggle_theme_btn()
    let title = this.title
    if (typeof title === 'function') {
      title = title()
    }
    this.$body = $(`<div class="slide-body">
			<div class="content">
				<h1 class="title slide-title m-0 text-3xl-semibold text-ink-gray-9">${__(title)}</h1>
			</div>
			<div class="form-wrapper mt-6">
				<div class="form"></div>
				<div class="add-more mb-4">
					${frappe.ui.button.html({
            label: __('Add More'),
            icon: 'plus',
            variant: 'ghost',
            css_class: 'form-more-btn hide',
          })}
				</div>
			</div>
		</div>`).appendTo(this.$wrapper)
    this.$content = this.$body.find('.content')
    this.$form = this.$body.find('.form')
    this.$primary_btn = this.slides_footer.find('.primary')
    this.$form_wrapper = this.$body.find('.form-wrapper')
    if (this.image_src) this.$content.append($(`<img class="img-fluid mt-4" src="${this.image_src}">`))
    if (this.help)
      this.$content.append($(`<p class="slide-help mt-2 mb-0 text-p-sm text-ink-gray-5">${__(this.help)}</p>`))
    this.reqd_fields = []
    this.refresh()
    this.made = true
  }
  attach_toggle_theme_btn(this: any) {
    const toggle_icon = frappe.ui.get_current_theme() == 'dark' ? 'sun' : 'moon'
    this.$toggle_theme_btn = frappe.ui
      .button({
        icon: toggle_icon,
        variant: 'ghost',
        tooltip: __('Toggle Theme'),
        css_class: 'toggle-theme-btn',
      })
      .appendTo(this.$wrapper)
    this.$toggle_theme_btn.on('click', () => {
      new frappe.ui.ThemeSwitcher().show()
    })
  }
  refresh(this: any) {
    this.render_parent_dots()
    if (!this.done) {
      this.setup_form()
    } else {
      this.setup_done_state()
    }
  }
  setup_form(this: any) {
    this.form = new frappe.ui.FieldGroup({
      fields: this.get_atomic_fields(),
      body: this.$form[0],
      no_submit_on_enter: true,
    })
    this.form.make()
    if (this.add_more) this.bind_more_button()
    this.set_reqd_fields()
    if (this.onload) this.onload(this)
    this.set_reqd_fields()
  }
  setup_done_state() {}
  get_atomic_fields(this: any) {
    let fields = JSON.parse(JSON.stringify(this.fields))
    if (this.add_more) {
      this.count = 1
      fields = fields.map((field?: any, i?: any) => {
        if (field.fieldname) {
          field.fieldname += '_1'
        }
        if (i === 1 && this.mandatory_entry) {
          field.reqd = 1
        }
        if (!field.static) {
          if (field.label) field.label
        }
        return field
      })
    }
    return fields
  }
  set_reqd_fields(this: any) {
    let dict = this.form.fields_dict
    this.reqd_fields = []
    Object.keys(dict).map((key?: any) => {
      if (dict[key].df.reqd) {
        this.reqd_fields.push(dict[key])
      }
    })
  }
  set_values(this: any, ignore_errors?: any) {
    this.values = this.form.get_values(ignore_errors, true)
    if (this.values === null) {
      return false
    }
    if (this.validate && !this.validate()) {
      return false
    }
    return true
  }
  bind_more_button(this: any) {
    this.$more = this.$body.find('.form-more-btn')
    this.$more.removeClass('hide').on('click', () => {
      this.count++
      let fields = JSON.parse(JSON.stringify(this.fields))
      this.form.add_fields(
        fields.map((field?: any) => {
          if (field.fieldname) field.fieldname += '_' + this.count
          if (!field.static) {
            if (field.label) field.label
          }
          field.reqd = 0
          return field
        }),
      )
      if (this.count === this.max_count) {
        this.$more.addClass('hide')
      }
    })
  }
  resetup_primary_button(this: any) {
    this.unbind_primary_action()
    this.bind_fields_to_action_btn()
    this.reset_action_button_state()
    this.bind_primary_action()
  }
  bind_fields_to_action_btn(this: any) {
    let me = this
    this.reqd_fields.map((field?: any) => {
      field.$wrapper.on('change input click', () => {
        me.reset_action_button_state()
      })
      field.$wrapper.on('keydown', 'input', (e?: any) => {
        if (e.key == 'Enter') {
          me.reset_action_button_state()
        }
      })
    })
  }
  reset_action_button_state(this: any) {
    let empty_fields = this.reqd_fields.filter((field?: any) => {
      return !field.get_value()
    })
    if (empty_fields.length) {
      this.slides_footer.find('.action').addClass('disabled')
    } else {
      this.slides_footer.find('.action').removeClass('disabled')
    }
  }
  unbind_primary_action(this: any) {
    this.slides_footer.find('.primary').off()
  }
  bind_primary_action(this: any) {
    this.slides_footer.find('.primary').on('click.primary_action', () => {
      this.primary_action()
    })
  }
  is_last_slide(this: any) {
    if (this.id === this.parent[0].children.length - 1) {
      return true
    }
    return false
  }
  before_show() {}
  show_slide(this: any) {
    this.$wrapper.removeClass('hidden')
    this.before_show()
    this.resetup_primary_button()
    if (!this.done) {
      this.$body.find('.form-control').first().focus()
      this.$primary_btn.show()
    } else {
      this.$primary_btn.hide()
    }
  }
  hide_slide(this: any) {
    this.$wrapper.addClass('hidden')
  }
  get_input(this: any, fieldname?: any) {
    return this.form.get_input(fieldname)
  }
  get_field(this: any, fieldname?: any) {
    return this.form.get_field(fieldname)
  }
  get_value(this: any, fieldname?: any) {
    return this.form.get_value(fieldname)
  }
  destroy(this: any) {
    this.$body.remove()
  }
  primary_action() {}
}
frappe.ui.Slides = class Slides {
  [key: string]: any
  constructor({
    parent = null,
    slides = [],
    slide_class = null,
    unidirectional = 0,
    done_state = 0,
    before_load = null,
    on_update = null,
  }: any) {
    this.parent = parent
    this.slides = slides
    this.slide_class = slide_class
    this.unidirectional = unidirectional
    this.done_state = done_state
    this.before_load = before_load
    this.on_update = on_update
    this.page_name = 'setup-wizard'
    this.slide_dict = {}
    this.made_slide_ids = []
    this.values = {}
    this.make()
  }
  make(this: any) {
    this.container = $('<div>')
      .addClass('slides-wrapper w-full max-w-lg ms-auto me-auto')
      .attr({ tabindex: -1 })
      .appendTo(this.parent)
    this.$slide_progress = $(`<div>`).addClass('slides-progress mb-6').appendTo(this.container)
    this.$body = $(`<div>`).addClass(`slide-container`).appendTo(this.container)
    this.$footer = $(`<div>`).addClass(`slide-footer`).appendTo(this.container)
    this.render_progress_dots()
    this.make_prev_next_complete_buttons()
    if (this.before_load) this.before_load(this.$footer)
    this.setup()
    this.show_slide(0)
  }
  setup(this: any) {
    this.slides.map((_slide?: any, id?: any) => {
      if (!this.slide_dict[id]) {
        this.slide_dict[id] = new this.slide_class(
          $.extend(this.slides[id], {
            parent: this.$body,
            slides_footer: this.$footer,
            render_parent_dots: this.render_progress_dots.bind(this),
            id: id,
          }),
        )
        if (!this.unidirectional) {
          this.slide_dict[id].make()
        }
      } else {
        if (this.made_slide_ids.includes(id + '')) {
          this.slide_dict[id].done = false
          this.slide_dict[id].destroy()
          this.slide_dict[id].make()
        }
      }
    })
  }
  refresh(this: any, id?: any) {
    this.render_progress_dots()
    this.make_prev_next_complete_buttons()
    this.show_hide_prev_next(id)
    this.$body.find('.form-control').first().focus()
  }
  render_progress_dots(this: any) {
    this.$slide_progress.empty()
    const total = this.slides.length
    if (total > 1) {
      const step = cint(this.current_id) + 1
      this.$slide_progress.append(
        frappe.ui.progress({
          value: (step / total) * 100,
          intervals: true,
          interval_count: total,
          label: __('Step {0} of {1}', [step, total]),
        }),
      )
    }
    this.completed = 0
    this.slides.map((slide?: any, i?: any) => {
      if (this.slide_dict[i]) {
        if (this.slide_dict[i].done) this.completed++
      } else {
        if (slide.done) this.completed++
      }
    })
    if (this.on_update) this.on_update(this.completed, this.slides.length)
  }
  make_prev_next_complete_buttons(this: any) {
    this.$footer.empty()
    $(`<div class="flex gap-2 mt-4">
			${frappe.ui.button.html({
        label: __('Back', null, 'Go to previous slide'),
        icon_left: 'arrow-left',
        size: 'md',
        css_class: 'prev-btn',
      })}
			${frappe.ui.button.html({
        label: __('Complete Setup', null, 'Finish the setup wizard'),
        icon_right: 'check',
        variant: 'solid',
        size: 'md',
        css_class: 'complete-btn primary ms-auto',
      })}
			${frappe.ui.button.html({
        label: __('Continue', null, 'Go to next slide'),
        icon_right: 'arrow-right',
        variant: 'solid',
        size: 'md',
        css_class: 'next-btn ms-auto',
      })}
		</div>`).appendTo(this.$footer)
    this.$prev_btn = this.$footer
      .find('.prev-btn')
      .attr('tabIndex', 0)
      .on('click', () => this.show_slide(this.current_id - 1))
    this.$next_btn = this.$footer
      .find('.next-btn')
      .attr('tabIndex', 0)
      .on('click', () => {
        if (this.done_state) {
          if (this.slide) this.slide.done = true
          if (this.current_slide) this.current_slide.done = true
        }
        if (!this.unidirectional || (this.unidirectional && this.current_slide.set_values())) {
          this.show_slide(this.current_id + 1)
        }
      })
    this.$complete_btn = this.$footer.find('.complete-btn').attr('tabIndex', 0)
  }
  before_show_slide() {
    return true
  }
  show_slide(this: any, id?: any) {
    id = cint(id)
    if (!this.before_show_slide() || (this.current_slide && this.current_id === id)) {
      return
    }
    this.update_values()
    if (this.current_slide) this.current_slide.hide_slide()
    if (this.unidirectional && !this.slide_dict[id].made) {
      this.slide_dict[id].make()
    }
    this.current_id = id
    this.current_slide = this.slide_dict[id]
    this.current_slide.show_slide()
    this.refresh(id)
  }
  destroy_slide(this: any, id?: any) {
    if (this.slide_dict[id]) this.slide_dict[id].destroy()
    this.slide_dict[id] = null
  }
  on_update() {}
  show_hide_prev_next(this: any, id?: any) {
    id === 0 ? this.$prev_btn.hide() : this.$prev_btn.show()
    id + 1 === this.slides.length ? this.$next_btn.hide() : this.$next_btn.show()
  }
  get_values(this: any) {
    let values: any = {}
    $.each(this.slide_dict, function (_id?: any, slide?: any) {
      if (slide.values) {
        $.extend(values, slide.values)
      }
    })
    return values
  }
  update_values(this: any) {
    this.values = $.extend(this.values, this.get_values())
  }
}
