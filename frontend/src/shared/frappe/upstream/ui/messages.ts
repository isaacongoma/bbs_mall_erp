import { $, __, cint, flt, frappe, repl } from '@/shared/frappe/runtime'
frappe.provide('frappe.messages')
import './dialog'
import { has_unsafe_scheme } from './components/utils.js'
frappe.messages.waiting = function (parent?: any, msg?: any) {
  return $(frappe.messages.get_waiting_message(msg)).appendTo(parent)
}
frappe.messages.get_waiting_message = function (msg?: any) {
  return repl(
    '<div class="msg-box" style="width: 63%; margin: 30px auto;">\
		<p class="text-center">%(msg)s</p></div>',
    { msg: msg },
  )
}
frappe.throw = function (msg?: any) {
  if (typeof msg === 'string') {
    msg = { message: msg, title: __('Error') }
  }
  if (!msg.indicator) msg.indicator = 'red'
  frappe.msgprint(msg)
  throw new Error(msg.message)
}
frappe.confirm = function (
  message?: any,
  confirm_action?: any,
  reject_action?: any,
  primary_label?: any,
  secondary_label?: any,
) {
  let d = new frappe.ui.Dialog({
    title: __('Confirm', null, 'Title of confirmation dialog'),
    primary_action_label: __(primary_label || 'Yes', null, 'Approve confirmation dialog'),
    primary_action: () => {
      confirm_action && confirm_action()
      d.hide()
    },
    secondary_action_label: __(secondary_label || 'No', null, 'Dismiss confirmation dialog'),
    secondary_action: () => d.hide(),
  })
  d.$body.append(`<p class="frappe-confirm-message">${message}</p>`)
  d.show()
  d.confirm_dialog = true
  if (reject_action) {
    d.onhide = () => {
      if (!d.primary_action_fulfilled) {
        reject_action()
      }
    }
  }
  return d
}
frappe.warn = function (
  title?: any,
  message_html?: any,
  proceed_action?: any,
  primary_label?: any,
  is_minimizable?: any,
  secondary_label?: any,
) {
  const d = new frappe.ui.Dialog({
    title: title,
    indicator: 'red',
    primary_action_label: primary_label,
    primary_action: () => {
      if (proceed_action) proceed_action()
      d.hide()
    },
    secondary_action_label: secondary_label || __('Cancel', null, 'Secondary button in warning dialog'),
    secondary_action: () => d.hide(),
    minimizable: is_minimizable,
  })
  d.confirm_dialog = true
  d.$body.append(`<div class="frappe-confirm-message">${message_html}</div>`)
  d.get_primary_btn().attr('data-theme', 'red')
  d.show()
  return d
}
frappe.prompt = function (fields?: any, callback?: any, title?: any, primary_label?: any) {
  if (typeof fields === 'string') {
    fields = [
      {
        label: fields,
        fieldname: 'value',
        fieldtype: 'Data',
        reqd: 1,
      },
    ]
  }
  if (!$.isArray(fields)) fields = [fields]
  let d = new frappe.ui.Dialog({
    fields: fields,
    title: title || __('Enter Value', null, 'Title of prompt dialog'),
  })
  d.set_primary_action(primary_label || __('Submit', null, 'Primary action of prompt dialog'), function () {
    let values = d.get_values()
    if (!values) {
      return
    }
    d.hide()
    callback(values)
  })
  d.show()
  return d
}
frappe.msgprint = function (msg?: any, title?: any, is_minimizable?: any, re_route?: any) {
  if (!msg) return
  let data: any
  if ($.isPlainObject(msg)) {
    data = msg
  } else {
    if (typeof msg === 'string' && msg.substr(0, 1) === '{') {
      data = JSON.parse(msg)
    } else {
      data = { message: msg, title: title, re_route: re_route }
    }
  }
  if (!data.indicator) {
    data.indicator = 'blue'
  }
  if (data.as_list) {
    const list_rows = data.message.map((m?: any) => `<li>${m}</li>`).join('')
    data.message = `<ul style="padding-left: 20px">${list_rows}</ul>`
  }
  if (data.as_table) {
    const rows = data.message
      .map((row?: any) => {
        const cols = row.map((col?: any) => `<td>${col}</td>`).join('')
        return `<tr>${cols}</tr>`
      })
      .join('')
    data.message = `<table class="table table-bordered" style="margin: 0;">${rows}</table>`
  }
  if (data.message instanceof Array) {
    let messages = data.message
    const exceptions = messages
      .map((m?: any) => {
        if (typeof m == 'string') {
          return JSON.parse(m)
        } else {
          return m
        }
      })
      .filter((m?: any) => m.raise_exception)
    if (exceptions.length) {
      messages = exceptions
    }
    messages.forEach(function (m?: any) {
      frappe.msgprint(m)
    })
    return
  }
  if (data.alert || data.toast) {
    frappe.show_alert(data)
    return
  }
  if (frappe.msg_dialog && data.re_route) {
    frappe.msg_dialog.custom_onhide = function () {
      frappe.route_flags.replace_route = true
      let prev_route = frappe.get_prev_route()
      if (prev_route.length == 0) frappe.set_route('')
      frappe.set_route(prev_route)
    }
  }
  if (!frappe.msg_dialog) {
    frappe.msg_dialog = new frappe.ui.Dialog({
      title: __('Message'),
      onhide: function () {
        if (frappe.msg_dialog.custom_onhide) {
          frappe.msg_dialog.custom_onhide()
          delete frappe.msg_dialog.custom_onhide
        }
        frappe.msg_dialog.msg_area.empty()
      },
      minimizable: data.is_minimizable || is_minimizable,
    })
    frappe.msg_dialog.msg_area = $('<div class="msgprint">').appendTo(frappe.msg_dialog.body)
    frappe.msg_dialog.clear = function () {
      frappe.msg_dialog.msg_area.empty()
    }
    frappe.msg_dialog.indicator = frappe.msg_dialog.header.find('.indicator')
  }
  if (data.primary_action) {
    if (data.primary_action.server_action && typeof data.primary_action.server_action === 'string') {
      data.primary_action.action = () => {
        return frappe.call({
          method: data.primary_action.server_action,
          args: data.primary_action.args,
          callback() {
            if (data.primary_action.hide_on_success) {
              frappe.hide_msgprint()
            }
          },
        })
      }
    }
    if (data.primary_action.client_action && typeof data.primary_action.client_action === 'string') {
      let parts = data.primary_action.client_action.split('.')
      let obj: any = window
      for (let part of parts) {
        obj = obj[part]
      }
      data.primary_action.action = () => {
        if (typeof obj === 'function') {
          ;(obj as any)(data.primary_action.args)
        }
      }
    }
    frappe.msg_dialog.set_primary_action(
      __(data.primary_action.label) || __(data.primary_action_label) || __('Done'),
      data.primary_action.action,
    )
  } else {
    if (frappe.msg_dialog.has_primary_action) {
      frappe.msg_dialog.get_primary_btn().addClass('hide')
      frappe.msg_dialog.has_primary_action = false
    }
  }
  if (data.secondary_action) {
    frappe.msg_dialog.set_secondary_action(data.secondary_action.action)
    frappe.msg_dialog.set_secondary_action_label(__(data.secondary_action.label) || __('Close'))
  }
  if (data.message == null) {
    data.message = ''
  }
  if (data.message.search(/<br>|<p>|<li>/) == -1) {
    msg = frappe.utils.replace_newlines(data.message)
  }
  let msg_exists = false
  if (data.clear) {
    frappe.msg_dialog.msg_area.empty()
  } else {
    msg_exists = frappe.msg_dialog.msg_area.html()
  }
  if (data.title || !msg_exists) {
    frappe.msg_dialog.set_title(data.title || __('Message', null, 'Default title of the message dialog'))
  }
  if (data.indicator) {
    frappe.msg_dialog.indicator.removeClass().addClass('indicator ' + data.indicator)
  } else {
    frappe.msg_dialog.indicator.removeClass().addClass('hidden')
  }
  if (data.wide) {
    if (frappe.msg_dialog.wrapper.classList.contains('msgprint-dialog')) {
      frappe.msg_dialog.wrapper.classList.remove('msgprint-dialog')
    }
  } else {
    frappe.msg_dialog.wrapper.classList.add('msgprint-dialog')
  }
  if (msg_exists) {
    frappe.msg_dialog.msg_area.append('<hr>')
  }
  frappe.msg_dialog.msg_area.append(data.message)
  frappe.msg_dialog.$wrapper.css('z-index', 2000)
  frappe.msg_dialog.show()
  return frappe.msg_dialog
}
window.msgprint = frappe.msgprint
frappe.hide_msgprint = function (instant?: any) {
  if (frappe.msg_dialog && frappe.msg_dialog.msg_area) {
    frappe.msg_dialog.msg_area.empty()
  }
  if (frappe.msg_dialog && frappe.msg_dialog.$wrapper.is(':visible')) {
    if (instant) {
      frappe.msg_dialog.$wrapper.removeClass('fade')
    }
    frappe.msg_dialog.hide()
    if (instant) {
      frappe.msg_dialog.$wrapper.addClass('fade')
    }
  }
}
frappe.update_msgprint = function (html?: any) {
  if (!frappe.msg_dialog || (frappe.msg_dialog && !frappe.msg_dialog.$wrapper.is(':visible'))) {
    frappe.msgprint(html)
  } else {
    frappe.msg_dialog.msg_area.html(html)
  }
}
frappe.verify_password = function (callback?: any) {
  frappe.prompt(
    {
      fieldname: 'password',
      label: __('Enter your password'),
      fieldtype: 'Password',
      reqd: 1,
    },
    function (data?: any) {
      frappe.call({
        method: 'frappe.core.doctype.user.user.verify_password',
        args: {
          password: data.password,
        },
        callback: function (r?: any) {
          if (!r.exc) {
            callback()
          }
        },
      })
    },
    __('Verify Password'),
    __('Verify'),
  )
}
frappe.show_progress = (
  title?: any,
  count?: any,
  total: any = 100,
  description?: any,
  hide_on_completion: any = false,
) => {
  let dialog: any
  if (frappe.cur_progress && frappe.cur_progress.title === title && frappe.cur_progress.is_visible) {
    dialog = frappe.cur_progress
  } else {
    dialog = new frappe.ui.Dialog({
      title: title,
    })
    dialog.progress = $(`<div>
			<div class="progress">
				<div class="progress-bar"></div>
			</div>
			<p class="description text-muted small"></p>
		</div`).appendTo(dialog.body)
    dialog.progress_bar = dialog.progress.css({ 'margin-top': '10px' }).find('.progress-bar')
    dialog.$wrapper.removeClass('fade')
    dialog.show()
    frappe.cur_progress = dialog
  }
  if (description) {
    dialog.progress.find('.description').text(description)
  }
  dialog.percent = cint((flt(count) * 100) / total)
  dialog.progress_bar.css({ width: dialog.percent + '%' })
  if (hide_on_completion && dialog.percent === 100) {
    setTimeout(frappe.hide_progress, 500)
  }
  frappe.cur_progress.$wrapper.css('z-index', 2000)
  return dialog
}
frappe.hide_progress = function () {
  if (frappe.cur_progress) {
    frappe.cur_progress.hide()
    frappe.cur_progress = null
  }
}
frappe.show_alert = frappe.toast = function (message?: any, seconds: any = 7, actions: any = {}) {
  if (typeof message === 'string') {
    message = { message: message }
  }
  const type_map: any = {
    green: 'success',
    red: 'error',
    orange: 'warning',
    yellow: 'warning',
    blue: 'info',
  }
  const indicator = (message.indicator || 'blue').toLowerCase()
  const handle = frappe.ui.toast({
    type: type_map[indicator] || 'info',
    duration: seconds * 1000,
  })
  const sane = (html?: any) => frappe.utils.xss_sanitise(String(html), { strategies: ['js'] })
  const harden = ($root?: any) => {
    $root.find('*').each(function (this: any) {
      for (const attr of Array.from(this.attributes)) {
        if (/^on/i.test((attr as any).name)) this.removeAttribute((attr as any).name)
        else if (
          ['href', 'src', 'action', 'formaction'].includes((attr as any).name) &&
          has_unsafe_scheme((attr as any).value)
        ) {
          this.removeAttribute((attr as any).name)
        }
      }
    })
    return $root
  }
  const fill = ($target?: any, content?: any) => {
    if (content && (content.jquery || content.nodeType)) {
      return $target.append(content)
    }
    return harden($target.html(sane(content)))
  }
  fill(handle.$el.find('.es-toast__message'), message.message || '')
  if (message.subtitle) {
    fill(
      $('<div class="es-toast__description"></div>').appendTo(handle.$el.find('.es-toast__content')),
      message.subtitle,
    )
  }
  if (message.body) {
    fill($('<div class="es-toast__body"></div>').appendTo(handle.$el.find('.es-toast__content')), message.body)
  }
  Object.keys(actions).map((key?: any) => {
    handle.$el.find(`[data-action=${key}]`).on('click', actions[key])
  })
  return handle.$el
}
