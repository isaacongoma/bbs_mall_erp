import { $, __, frappe, locals } from '@/shared/frappe/runtime'
import { createPopper } from '@popperjs/core'
frappe.ui.is_liked = function (doc?: any) {
  return frappe.ui.get_liked_by(doc).includes(frappe.session.user)
}
frappe.ui.get_liked_by = function (doc?: any) {
  return doc._liked_by ? JSON.parse(doc._liked_by) : []
}
frappe.ui.toggle_like = function ($btn?: any, doctype?: any, name?: any, callback?: any) {
  const add = $btn.hasClass('not-liked') ? 'Yes' : 'No'
  $btn.css('pointer-events', 'none')
  frappe.call({
    method: 'frappe.desk.like.toggle_like',
    quiet: true,
    args: {
      doctype: doctype,
      name: name,
      add: add,
    },
    callback: function (r?: any) {
      $btn.css('pointer-events', 'auto')
      if (r.exc) {
        return
      }
      $btn.toggleClass('not-liked', add === 'No')
      $btn.toggleClass('liked', add === 'Yes')
      const doc = locals[doctype] && locals[doctype][name]
      if (doc) {
        let liked_by = frappe.ui.get_liked_by(doc)
        if (add === 'Yes' && !liked_by.includes(frappe.session.user)) {
          liked_by.push(frappe.session.user)
        }
        if (add === 'No' && liked_by.includes(frappe.session.user)) {
          liked_by = liked_by.filter((user?: any) => user !== frappe.session.user)
        }
        doc._liked_by = JSON.stringify(liked_by)
      }
      if (callback) {
        callback()
      }
    },
  })
}
frappe.ui.click_toggle_like = function () {
  console.warn('`frappe.ui.click_toggle_like` is deprecated and has no effect.')
}
frappe.ui.setup_like_popover = ($parent?: any, selector?: any) => {
  if (frappe.dom.is_touchscreen()) {
    return
  }
  let active_target: any = null
  let active_popover: any = null
  let active_popper: any = null
  let hide_timer: any = null
  const clear_hide_timer = () => {
    if (hide_timer) {
      clearTimeout(hide_timer)
      hide_timer = null
    }
  }
  const destroy_active_popover = () => {
    clear_hide_timer()
    if (active_target) {
      active_target.off('.likePopover')
    }
    if (active_popover) {
      active_popover.off('.likePopover')
      active_popover.remove()
    }
    if (active_popper) {
      active_popper.destroy()
    }
    active_target = null
    active_popover = null
    active_popper = null
  }
  const schedule_hide = () => {
    clear_hide_timer()
    hide_timer = setTimeout(() => {
      destroy_active_popover()
    }, 120)
  }
  const get_liked_by_users = (target_element?: any) => {
    let liked_by = target_element.parents('.liked-by').attr('data-liked-by')
    liked_by = liked_by ? decodeURI(liked_by) : '[]'
    return JSON.parse(liked_by)
  }
  const get_popover_content = (target_element?: any) => {
    const liked_by = get_liked_by_users(target_element)
    const content = $('<div class="liked-by-popover-content"></div>')
    const like_count = liked_by.length
    if (like_count > 3) {
      const like_summary = __('Liked by {0} people', [like_count])
      const like_count_html = $(`<div class="liked-by-popover-summary">${like_summary}</div>`)
      content.append(like_count_html)
    }
    if (!liked_by.length) {
      return content
    }
    const liked_by_list = $('<ul class="list-unstyled"></ul>')
    const link_base = '/desk/user/'
    liked_by.forEach((user?: any) => {
      liked_by_list.append(`
				<li data-user=${user}>${frappe.avatar(user, 'avatar-xs')}
					<span>${frappe.user.full_name(user)}</span>
				</li>
			`)
    })
    liked_by_list.children('li').on('click', (ev?: any) => {
      ev.preventDefault()
      ev.stopPropagation()
      const user = ev.currentTarget.dataset.user
      setTimeout(() => destroy_active_popover(), 0)
      frappe.set_route(link_base + user)
    })
    content.append(liked_by_list)
    return content
  }
  const show_popover = (target_element?: any) => {
    if (!get_liked_by_users(target_element).length) {
      destroy_active_popover()
      return
    }
    if (active_target?.get(0) === target_element.get(0) && active_popover) {
      clear_hide_timer()
      active_popper?.update()
      return
    }
    destroy_active_popover()
    const popover = $(`<div class="liked-by-popover popover show" role="tooltip">
				<div class="popover-body popover-content"></div>
			</div>`)
    popover.find('.popover-content').append(get_popover_content(target_element))
    $(document.body).append(popover)
    const popper = createPopper(target_element.get(0), popover.get(0), {
      placement: 'bottom',
      modifiers: [
        {
          name: 'offset',
          options: {
            offset: [0, 8],
          },
        },
        {
          name: 'preventOverflow',
          options: {
            padding: 12,
          },
        },
        {
          name: 'flip',
          options: {
            padding: 12,
            fallbackPlacements: ['bottom-start', 'top', 'top-start'],
          },
        },
      ],
    })
    active_target = target_element
    active_popover = popover
    active_popper = popper
    target_element
      .off('.likePopover')
      .on('mouseenter.likePopover', clear_hide_timer)
      .on('mouseleave.likePopover', schedule_hide)
    popover
      .off('.likePopover')
      .on('mousedown.likePopover click.likePopover', (ev?: any) => {
        ev.stopPropagation()
      })
      .on('mouseenter.likePopover', clear_hide_timer)
      .on('mouseleave.likePopover', schedule_hide)
  }
  $parent.on('mouseenter', selector, function (this: any) {
    show_popover($(this))
  })
  $parent.on('mouseleave', selector, schedule_hide)
}
