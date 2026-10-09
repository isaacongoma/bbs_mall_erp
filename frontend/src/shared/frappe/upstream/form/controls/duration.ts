import { $, __, cint, frappe } from '@/shared/frappe/runtime'
frappe.ui.form.ControlDuration = class ControlDuration extends frappe.ui.form.ControlData {
  [key: string]: any
  make_input(this: any) {
    super.make_input()
    this.make_picker()
  }
  validate(value?: any) {
    if (!value) {
      return null
    }
    return super.validate(value)
  }
  make_picker(this: any) {
    this.inputs = []
    this.reposition_picker = () => this.position_picker()
    this.set_duration_options()
    this.$picker = $(`<div class="duration-picker">
				<div class="picker-row row"></div>
			</div>`)
    this.build_numeric_input('days', this.duration_options.hide_days, 0, __('Days', null, 'Duration'))
    this.build_numeric_input('hours', false, 0, __('Hours', null, 'Duration'))
    this.build_numeric_input('minutes', false, 0, __('Minutes', null, 'Duration'))
    this.build_numeric_input('seconds', this.duration_options.hide_seconds, 0, __('Seconds', null, 'Duration'))
    this.set_duration_picker_value(this.value)
    this.$picker.hide()
    this.bind_events()
    this.refresh()
  }
  build_numeric_input(this: any, name?: any, hidden?: any, max?: any, label?: any) {
    let $duration_input = $(`
			<input class="input-sm duration-input" data-duration="${name}" type="number" min="0" value="0">
		`)
    let $input = $(`<div class="row duration-row"></div>`).prepend($duration_input)
    if (max) {
      $duration_input.attr('max', max)
    }
    this.inputs[name] = $duration_input
    let $control = $(`
			<div class="col duration-col">
				<div class="row duration-row duration-label">${label}</div>
			</div>`)
    if (hidden) {
      $control.addClass('hidden')
    }
    $control.prepend($input)
    $control.appendTo(this.$picker.find('.picker-row'))
  }
  set_duration_options(this: any) {
    this.duration_options = frappe.utils.get_duration_options(this.df)
  }
  set_duration_picker_value(this: any, value?: any) {
    let total_duration = frappe.utils.seconds_to_duration(value || 0, this.duration_options)
    if (this.$picker) {
      Object.keys(total_duration).forEach((duration?: any) => {
        this.inputs[duration].prop('value', total_duration[duration])
      })
    }
  }
  bind_events(this: any) {
    let clicked = false
    this.$picker.on('mousedown', '.duration-input', () => {
      clicked = true
    })
    this.$picker.on('change', '.duration-input', () => {
      clicked = false
      let duration = this.get_duration()
      let value = frappe.utils.duration_to_seconds(duration.days, duration.hours, duration.minutes, duration.seconds)
      this.set_value(value)
      this.set_focus()
    })
    this.$input.on('focus', () => {
      if (this.df.read_only) return
      this.show_picker()
      let is_picker_set = this.is_duration_picker_set(this.inputs)
      if (!is_picker_set) {
        this.set_duration_picker_value(this.value)
      }
    })
    this.$input.on('blur', () => {
      if (clicked) {
        clicked = false
      } else {
        this.hide_picker()
      }
      this.set_formatted_input(this.value)
    })
  }
  show_picker(this: any) {
    $(document.body).append(this.$picker)
    this.$picker.show()
    this.position_picker()
    document.addEventListener('scroll', this.reposition_picker, true)
    window.addEventListener('resize', this.reposition_picker)
  }
  hide_picker(this: any) {
    this.$picker.hide()
    this.$picker.detach()
    document.removeEventListener('scroll', this.reposition_picker, true)
    window.removeEventListener('resize', this.reposition_picker)
  }
  position_picker(this: any) {
    let input = this.$input.get(0)
    if (!input.isConnected) {
      this.hide_picker()
      return
    }
    let rect = input.getBoundingClientRect()
    this.$picker.css({
      top: rect.bottom + 10 + 'px',
      left: rect.left + 'px',
    })
  }
  get_value(this: any) {
    return cint(this.value)
  }
  parse(this: any, value?: any) {
    if (!value) {
      return ''
    } else if (/^\s*\d+\s*$/.test(value)) {
      return parseInt(String(value))
    }
    this.DURATION_PARSE_REGEX ??= makeDurationParseRegex()
    const match = String(value).trim().match(this.DURATION_PARSE_REGEX)
    if (!match?.groups || !Object.values(match.groups).some((g?: any) => !!g)) {
      return null
    }
    let duration_in_seconds = 0
    for (const [key, multiplier] of Object.entries(DURATION_MULTIPLIERS)) {
      duration_in_seconds += parseInt(String(match.groups?.[key] || 0)) * (multiplier as number)
    }
    return duration_in_seconds
  }
  set_formatted_input(this: any, value?: any) {
    super.set_formatted_input(value)
    this.set_duration_picker_value(value)
  }
  refresh_input(this: any) {
    super.refresh_input()
    this.set_duration_options()
    this.set_duration_picker_value(this.value)
  }
  format_for_input(this: any, value?: any) {
    return frappe.utils.get_formatted_duration(value, this.duration_options)
  }
  get_duration(this: any) {
    let total_duration: any = {
      minutes: 0,
      hours: 0,
      days: 0,
      seconds: 0,
    }
    if (this.inputs) {
      total_duration.minutes = parseInt(String(this.inputs.minutes.val()))
      total_duration.hours = parseInt(String(this.inputs.hours.val()))
      if (!this.duration_options.hide_days) {
        total_duration.days = parseInt(String(this.inputs.days.val()))
      }
      if (!this.duration_options.hide_seconds) {
        total_duration.seconds = parseInt(String(this.inputs.seconds.val()))
      }
    }
    return total_duration
  }
  is_duration_picker_set(inputs?: any) {
    let is_set = false
    Object.values(inputs).forEach((duration?: any) => {
      if (duration.prop('value') != 0) {
        is_set = true
      }
    })
    return is_set
  }
}
const DURATION_MULTIPLIERS: any = {
  weeks: 7 * 24 * 60 * 60,
  days: 24 * 60 * 60,
  hours: 60 * 60,
  minutes: 60,
  seconds: 1,
}
function makeDurationParseRegex() {
  const _part = (key?: any, seps?: any) => {
    const rCapture = `(?<${key}>\\d+)`
    const rSep = '(?:' + seps.join('|') + ')'
    return '\\s*(?:' + rCapture + '\\s*' + rSep + ')?\\s*'
  }
  return new RegExp(
    [
      _part('days', [__('d', null, 'Days (Field: Duration)')]),
      _part('hours', [__('h', null, 'Hours (Field: Duration)')]),
      _part('minutes', [__('m', null, 'Minutes (Field: Duration)')]),
      _part('seconds', [__('s', null, 'Seconds (Field: Duration)')]),
      '.*',
    ].join(''),
    'i',
  )
}
