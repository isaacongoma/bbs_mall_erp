import { $, __, erpnext, frappe } from '@/shared/frappe'
erpnext.PointOfSale.NumberPad = class {
  [key: string]: any
  constructor({ wrapper, events, cols, keys, css_classes, fieldnames_map }: any) {
    this.wrapper = wrapper
    this.events = events
    this.cols = cols
    this.keys = keys
    this.css_classes = css_classes || []
    this.fieldnames = fieldnames_map || {}
    this.init_component()
  }
  init_component(this: any) {
    this.prepare_dom()
    this.bind_events()
  }
  prepare_dom(this: any) {
    const { keys, css_classes, fieldnames } = this
    function get_keys() {
      return keys.reduce((a?: any, row?: any, i?: any) => {
        return (
          a +
          row.reduce((a2?: any, number?: any, j?: any) => {
            const class_to_append = css_classes && css_classes[i] ? css_classes[i][j] : ''
            const fieldname =
              fieldnames && fieldnames[number]
                ? fieldnames[number]
                : typeof number === 'string'
                  ? frappe.scrub(number)
                  : number
            return (
              a2 + `<div class="numpad-btn ${class_to_append}" data-button-value="${fieldname}">${__(number)}</div>`
            )
          }, '')
        )
      }, '')
    }
    this.wrapper.html(`<div class="numpad-container">
				${get_keys()}
			</div>`)
  }
  bind_events(this: any) {
    const me = this
    this.wrapper.on('click', '.numpad-btn', function (this: any) {
      const $btn = $(this)
      me.events.numpad_event($btn)
    })
  }
}
