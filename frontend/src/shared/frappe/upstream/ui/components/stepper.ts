import { $, __, frappe } from '@/shared/frappe/runtime'
frappe.provide('frappe.ui')
frappe.ui.Stepper = class Stepper {
  [key: string]: any
  constructor(opts: any = {}) {
    this.steps = opts.steps || []
    this.current = opts.current || 0
    this.is_locked = opts.is_locked || null
    this.is_completed = opts.is_completed || null
    this.on_step_click = opts.on_step_click || null
    this.on_locked_click = opts.on_locked_click || null
    this.compact = Boolean(opts.compact)
    this.nav = document.createElement('nav')
    this.nav.className = ['es-stepper', opts.css_class].filter(Boolean).join(' ')
    const label_position = ['bottom', 'top', 'left'].includes(opts.label_position) ? opts.label_position : 'right'
    if (label_position !== 'right') {
      this.nav.classList.add(`es-stepper--label-${label_position}`)
    }
    if (label_position === 'bottom' || label_position === 'top') {
      this.nav.style.setProperty('--es-stepper-steps', this.steps.length)
    }
    this.nav.setAttribute('aria-label', opts.label || __('Steps'))
    this.$el = $(this.nav)
    this.$el.data('es-stepper', this)
    this.render()
  }
  set_current(this: any, index?: any) {
    this.current = Math.max(0, Math.min(index, this.steps.length - 1))
    this.render()
  }
  next_step(this: any) {
    this.set_current(this.current + 1)
  }
  prev_step(this: any) {
    this.set_current(this.current - 1)
  }
  refresh(this: any) {
    this.render()
  }
  render(this: any) {
    const done = (index?: any) => (this.is_completed ? Boolean(this.is_completed(index)) : index < this.current)
    const render_key = [
      this.compact ? 'compact' : 'full',
      this.current,
      ...this.steps.map(
        (step?: any, index?: any) =>
          `${step.label}:${Number(done(index))}:${this.is_locked && index !== this.current ? Number(Boolean(this.is_locked(index))) : 0}`,
      ),
    ].join('|')
    if (render_key === this._render_key) return
    this._render_key = render_key
    const had_focus =
      document.activeElement && this.nav.contains(document.activeElement)
        ? Array.from(this.nav.querySelectorAll('.es-stepper__step')).indexOf(
            document.activeElement.closest('.es-stepper__step'),
          )
        : -1
    this.nav.textContent = ''
    if (this.compact) {
      this.render_compact()
      return
    }
    this.steps.forEach((step?: any, index?: any) => {
      if (index > 0) {
        const connector = document.createElement('span')
        connector.className = 'es-stepper__connector'
        connector.setAttribute('aria-hidden', 'true')
        if (done(index - 1)) {
          connector.setAttribute('data-completed', 'true')
        }
        this.nav.appendChild(connector)
      }
      const locked = Boolean(this.is_locked && index !== this.current && this.is_locked(index))
      const is_done = done(index)
      const state = index === this.current ? 'active' : is_done ? 'completed' : locked ? 'locked' : null
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'es-stepper__step'
      if (state) button.setAttribute('data-state', state)
      if (state === 'active') button.setAttribute('aria-current', 'step')
      if (is_done) button.setAttribute('data-completed', 'true')
      if (locked) button.setAttribute('aria-disabled', 'true')
      const marker = document.createElement('span')
      marker.className = 'es-stepper__marker'
      const icon_name = is_done
        ? state === 'active'
          ? 'dot'
          : 'check'
        : state === 'active'
          ? 'circle-dot-dashed'
          : 'circle-dashed'
      marker.innerHTML = frappe.utils.icon(icon_name, 'sm', '', '', '', true)
      button.appendChild(marker)
      const label = document.createElement('span')
      label.className = 'es-stepper__label'
      label.textContent = step.label
      button.appendChild(label)
      button.title = step.label
      button.addEventListener('click', () => {
        if (button.getAttribute('aria-disabled') === 'true') {
          this.on_locked_click && this.on_locked_click(index)
          return
        }
        if (index === this.current) return
        this.on_step_click && this.on_step_click(index)
      })
      this.nav.appendChild(button)
    })
    if (had_focus > -1) {
      const target = this.nav.querySelectorAll('.es-stepper__step')[had_focus]
      target && target.focus({ preventScroll: true })
    }
  }
  render_compact(this: any) {
    const done = this.current + 1
    const count = this.steps.length
    $(this.nav).append(
      frappe.ui.progress({
        label: this.steps[this.current]?.label || '',
        hint: () => __('Step {0} of {1}', [done, count]),
        intervals: true,
        interval_count: count,
        size: 'md',
        value: count ? (done / count) * 100 : 0,
      }),
    )
  }
}
frappe.ui.stepper = (opts?: any) => new frappe.ui.Stepper(opts).$el
export default frappe.ui.stepper
