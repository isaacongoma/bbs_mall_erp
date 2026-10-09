import { $, frappe } from '@/shared/frappe/runtime'
import { createPopper } from '@popperjs/core'
frappe.provide('frappe.ui')
frappe.ui.Card = class Card {
  [key: string]: any
  constructor(opts?: any) {
    Object.assign(this, opts)
    this.alignment_style_map = {
      right: 'flex-end',
      left: 'flex-start',
    }
    this.dismiss_intervals = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    }
    this.make(opts)
    this.setup()
    this.set_styles()
  }
  make(this: any, _opts?: any) {
    if (!this.icon) {
      this.icon = 'info'
    }
    this.card = $(
      frappe.render_template('card', {
        card: this,
      }),
    )
    if (!this.primary_action_label) {
      this.card.css('gap', '0px')
    }
    if (this.dismiss_it_for) {
      const next_time_for_show = localStorage.getItem(this.get_dismiss_key())
      if (next_time_for_show && Date.now() < Number(next_time_for_show)) {
        this.hide()
        return
      }
    }
    if (this.popper) {
      this.popper = createPopper($(this.trigger).get(0), $(this.parent).get(0), {
        placement: 'auto',
        modifiers: [
          {
            name: 'offset',
            options: {
              offset: [0, 8],
            },
          },
        ],
      })
    }
    if (this.outline) {
      this.card.addClass('frappe-card-outline')
      this.card.removeClass('px-2 py-2')
    }
    this.card.prependTo(this.parent)
    this.set_button_alignment()
    this.move_primary_action_to_header()
    if (!this.popper) this.show()
  }
  setup(this: any) {
    this.setup_primary_action()
    this.setup_close_button()
  }
  toggle(this: any) {
    if (this.display) {
      this.hide()
    } else {
      this.show()
    }
  }
  hide(this: any) {
    this.display = false
    this.parent.removeAttr('data-show')
    this.card.removeClass('d-inline-flex')
    this.card.addClass('hidden')
  }
  show(this: any) {
    this.display = true
    this.parent.attr('data-show', '')
    this.popper && this.popper.update()
    this.card.addClass('d-inline-flex')
    this.card.removeClass('hidden')
  }
  get_dismiss_key(this: any) {
    return this.dismiss_key || 'card_next_show_time'
  }
  setup_primary_action(this: any) {
    const me = this
    this.card.find('.frappe-card-button').on('click', function (event?: any) {
      event.preventDefault()
      me.primary_action(event)
    })
  }
  setup_close_button(this: any) {
    const me = this
    if (this.close_button) {
      this.card.find('.close-button').on('click', function (event?: any) {
        event.preventDefault()
        if (me.dismiss_it_for) {
          let next_show_time = Date.now() + me.dismiss_intervals[me.dismiss_it_for]
          localStorage.setItem(me.get_dismiss_key(), next_show_time)
        }
        me.toggle()
      })
    }
  }
  set_styles(this: any) {
    if (this.styles) {
      const $root = $(':root')
      for (const [variable, value] of Object.entries(this.styles)) {
        $root.css(`--${variable}`, value)
      }
    }
  }
  set_button_alignment(this: any) {
    if (this.primary_button_alignment) {
      this.card
        .find('.frappe-card-actions')
        .css('justifyContent', this.alignment_style_map[this.primary_button_alignment])
    }
  }
  move_primary_action_to_header(this: any) {
    if (this.primary_action_in_header) {
      this.card.find('.frappe-card-header-slot').append(this.card.find('.frappe-card-button'))
    }
  }
}
frappe.ui.SidebarCard = frappe.ui.Card
