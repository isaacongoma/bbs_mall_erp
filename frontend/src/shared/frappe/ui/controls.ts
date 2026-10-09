import { $, __, frappe } from '../runtime'

type AnyRecord = Record<string, any>

const form = (): AnyRecord => frappe.ui.form

function noop(): void {
  return undefined
}

export function installDatePickerOverrides(): void {
  const F = form()

  F.ControlDate.prototype.make_picker = function (this: AnyRecord) {
    this.set_date_options()
  }
  F.ControlDate.prototype.set_date_options = function (this: AnyRecord) {
    this.today_text = __('Today')
    this.date_format = frappe.defaultDateFormat
    this.datepicker_options = {}
  }
  F.ControlDate.prototype.set_datepicker = noop
  F.ControlDate.prototype.set_t_for_today = noop
  F.ControlDate.prototype.update_datepicker_position = noop

  F.ControlDatetime.prototype.set_date_options = function (this: AnyRecord) {
    this.today_text = __('Now')
    this.date_format = frappe.defaultDatetimeFormat
    this.datepicker_options = {}
  }
  F.ControlDatetime.prototype.set_datepicker = noop
  F.ControlDatetime.prototype.sync_datepicker_state = noop

  F.ControlTime.prototype.make_picker = function (this: AnyRecord) {
    this.set_time_options()
    this.refresh()
  }
  F.ControlTime.prototype.set_time_options = function (this: AnyRecord) {
    this.time_format = frappe.defaultTimeFormat
    this.datepicker_options = {}
  }
  F.ControlTime.prototype.set_datepicker = noop
}

export function installValueControls(): void {
  const F = form()
  const types = [
    'Code',
    'TextEditor',
    'Comment',
    'MarkdownEditor',
    'HTMLEditor',
    'Color',
    'Signature',
    'Barcode',
    'Geolocation',
    'Icon',
    'Phone',
    'DateRange',
    'Attach',
    'AttachImage',
    'AttachmentGallery',
    'Multiselect',
    'MultiSelectPills',
    'MultiSelectList',
  ]
  for (const type of types) {
    const Base = type === 'Code' || type.endsWith('Editor') || type === 'Comment' ? F.ControlText : F.ControlData
    const name = `Control${type}`
    F[name] = class extends Base {} as unknown
    Object.defineProperty(F[name], 'name', { value: name })
  }

  F.ControlSwitch = class ControlSwitch extends F.ControlCheck {}
  F.ControlReadOnly ??= class ControlReadOnly extends F.ControlData {}
}

export function installControlFactory(): void {
  const F = form()
  F.make_control = function (opts: AnyRecord) {
    const className = `Control${String(opts.df.fieldtype).replace(/ /g, '')}`
    if (F[className]) return new F[className](opts)
    console.warn(`Invalid Control Name: ${opts.df.fieldtype}`)
    return undefined
  }
  void $
}
