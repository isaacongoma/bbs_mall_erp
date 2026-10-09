import { $, __, cint, frappe } from '@/shared/frappe/runtime'
frappe.provide('frappe.request')
frappe.provide('frappe.request.error_handlers')
frappe.request.url = '/'
frappe.request.ajax_count = 0
frappe.request.waiting_for_ajax = []
frappe.request.logs = {}
frappe.request.app_uses_json = function (cmd?: any) {
  if (!cmd) return false
  let app = cmd === 'run_doc_method' ? 'frappe' : cmd.split('.')[0]
  let apps = (frappe.boot && frappe.boot.json_request_apps) || []
  return apps.includes(app)
}
frappe.xcall = function (method?: any, params?: any, type?: any, opts: any = {}) {
  return new Promise((resolve?: any, reject?: any) => {
    frappe.call({
      method: method,
      args: params,
      type: type || 'POST',
      callback: (r?: any) => {
        resolve(r.message)
      },
      error: (r?: any) => {
        reject(r?.message)
      },
      ...opts,
    })
  })
}
frappe.call = function (opts?: any) {
  if (!frappe.is_online()) {
    frappe.ui.toast({
      id: 'connection-status',
      type: 'warning',
      message: __('Connection Lost'),
      description: __('You are not connected to Internet. Retry after sometime.'),
      duration: 3000,
    })
  }
  if (typeof arguments[0] === 'string') {
    opts = {
      method: arguments[0],
      args: arguments[1],
      callback: arguments[2],
      headers: arguments[3],
    }
  }
  if (opts.quiet) {
    opts.no_spinner = true
  }
  let args = $.extend({}, opts.args)
  if (opts.module && opts.page) {
    args.cmd = opts.module + '.page.' + opts.page + '.' + opts.page + '.' + opts.method
  } else if (opts.doc) {
    $.extend(args, {
      cmd: 'run_doc_method',
      docs: frappe.get_doc(opts.doc.doctype, opts.doc.name),
      method: opts.method,
      args: opts.args,
    })
  } else if (opts.method) {
    args.cmd = opts.method
  }
  let json = opts.json != null ? opts.json : frappe.request.app_uses_json(args.cmd)
  let callback = function (data?: any, response_text?: any) {
    if (data.task_id) {
      frappe.realtime.subscribe(data.task_id, opts)
      if (opts.queued) {
        opts.queued(data)
      }
    } else if (opts.callback) {
      return opts.callback(data, response_text)
    }
  }
  let url = opts.url
  if (!url) {
    let prefix = '/api/method/'
    if (opts.api_version) {
      prefix = `/api/${opts.api_version}/method/`
    }
    url = prefix + args.cmd
    delete args.cmd
  }
  if (opts.debounce && frappe.request.is_fresh(args, opts.debounce)) {
    return Promise.resolve()
  }
  return frappe.request.call({
    type: opts.type || 'POST',
    args: args,
    success: callback,
    error: opts.error,
    always: opts.always,
    btn: opts.btn,
    freeze: opts.freeze,
    freeze_message: opts.freeze_message,
    headers: opts.headers || {},
    error_handlers: opts.error_handlers || {},
    async: opts.async,
    silent: opts.silent,
    api_version: opts.api_version,
    url,
    cache: opts.cache,
    json,
  })
}
frappe.request.call = function (opts?: any) {
  opts.use_json = opts.json && (opts.type || 'POST').toUpperCase() !== 'GET'
  frappe.request.prepare(opts)
  let statusCode: any = {
    200: function (data?: any, xhr?: any) {
      opts.success_callback && opts.success_callback(data, xhr.responseText)
    },
    401: function (xhr?: any) {
      if (frappe.request.handle_session_expiry(xhr.responseJSON)) return
      opts.error_callback && opts.error_callback()
    },
    404: function () {
      frappe.msgprint({
        title: __('Not found'),
        indicator: 'red',
        message: __('The resource you are looking for is not available'),
        re_route: true,
      })
      opts.error_callback && opts.error_callback()
    },
    403: function (xhr?: any) {
      let _server_messages: any
      if (frappe.request.handle_session_expiry(xhr.responseJSON)) return
      if (xhr.responseJSON && xhr.responseJSON._error_message) {
        frappe.msgprint({
          title: __('Not permitted'),
          indicator: 'red',
          message: xhr.responseJSON._error_message,
          re_route: true,
        })
        xhr.responseJSON._server_messages = null
      } else if (xhr.responseJSON && xhr.responseJSON._server_messages) {
        _server_messages = JSON.parse(xhr.responseJSON._server_messages)
        if (_server_messages.indexOf(__('Not permitted')) !== -1) {
          return
        }
      } else {
        frappe.msgprint({
          title: __('Not permitted'),
          indicator: 'red',
          message: __(
            'You do not have enough permissions to access this resource. Please contact your manager to get access.',
          ),
        })
      }
      opts.error_callback && opts.error_callback()
    },
    508: function () {
      frappe.utils.play_sound('error')
      frappe.msgprint({
        title: __('Please try again'),
        indicator: 'red',
        message: __('Another transaction is blocking this one. Please try again in a few seconds.'),
      })
      opts.error_callback && opts.error_callback()
    },
    413: function () {
      frappe.msgprint({
        indicator: 'red',
        title: __('File too big'),
        message: __('File size exceeded the maximum allowed size of {0} MB', [
          (frappe.boot.max_file_size || 5242880) / 1048576,
        ]),
      })
      opts.error_callback && opts.error_callback()
    },
    417: function (xhr?: any) {
      let r = xhr.responseJSON
      if (!r) {
        try {
          r = JSON.parse(xhr.responseText)
        } catch (e: any) {
          r = xhr.responseText
        }
      }
      opts.error_callback && opts.error_callback(r)
    },
    501: function (data?: any, xhr?: any) {
      if (typeof data === 'string') data = JSON.parse(data)
      opts.error_callback && opts.error_callback(data, xhr.responseText)
    },
    500: function (xhr?: any) {
      frappe.utils.play_sound('error')
      try {
        opts.error_callback && opts.error_callback()
        frappe.request.report_error(xhr, opts)
      } catch (e: any) {
        frappe.request.report_error(xhr, opts)
      }
    },
    504: function () {
      frappe.msgprint(__('Request Timed Out'))
      opts.error_callback && opts.error_callback()
    },
    502: function () {
      frappe.msgprint(__('Internal Server Error'))
      opts.error_callback && opts.error_callback()
    },
  }
  let exception_handlers: any = {
    QueryTimeoutError: function () {
      frappe.utils.play_sound('error')
      frappe.msgprint({
        title: __('Request Timeout'),
        indicator: 'red',
        message: __('Server was too busy to process this request. Please try again.'),
      })
    },
    QueryDeadlockError: function () {
      frappe.utils.play_sound('error')
      frappe.msgprint({
        title: __('Deadlock Occurred'),
        indicator: 'red',
        message: __(
          'Server failed to process this request because of a concurrent conflicting request. Please try again.',
        ),
      })
    },
  }
  let ajax_args: any = {
    url: opts.url || frappe.request.url,
    data: opts.args,
    type: opts.type,
    dataType: opts.dataType || 'json',
    async: opts.async,
    headers: Object.assign(
      {
        'X-Frappe-CSRF-Token': frappe.csrf_token,
        Accept: 'application/json',
        'X-Frappe-CMD': (opts.args && opts.args.cmd) || '' || '',
      },
      opts.headers,
    ),
    cache: window.dev_server ? false : opts.cache || false,
  }
  if (opts.args && opts.args.doctype) {
    ajax_args.headers['X-Frappe-Doctype'] = encodeURIComponent(opts.args.doctype)
  }
  if (opts.use_json) {
    ajax_args.data = JSON.stringify(opts.args)
    ajax_args.contentType = 'application/json; charset=UTF-8'
    ajax_args.processData = false
  }
  frappe.last_request = ajax_args.data
  return $.ajax(ajax_args)
    .done(function (data?: any, _textStatus?: any, xhr?: any) {
      let status_code_handler: any
      try {
        if (typeof data === 'string') data = JSON.parse(data)
        if (data.docs || data.docinfo) {
          frappe.model.sync(data)
        }
        if (data.__messages) {
          $.extend(frappe._messages, data.__messages)
        }
        if (data._link_titles) {
          if (!frappe._link_titles) {
            frappe._link_titles = {}
          }
          $.extend(frappe._link_titles, data._link_titles)
        }
        status_code_handler = statusCode[xhr.statusCode().status]
        if (status_code_handler) {
          status_code_handler(data, xhr)
        }
      } catch (e: any) {
        console.log('Unable to handle success response', data)
        console.error(e)
      }
    })
    .always(function (data?: any) {
      try {
        if (typeof data === 'string') {
          data = JSON.parse(data)
        }
        if (data.responseText) {
          data = JSON.parse(data.responseText)
        }
      } catch (e: any) {
        data = null
      }
      frappe.request.cleanup(opts, data)
      if (opts.always) {
        opts.always(data)
      }
    })
    .fail(function (xhr?: any) {
      let data: any, exception: any, exception_handler: any, status_code_handler: any
      try {
        if (xhr.getResponseHeader('content-type') == 'application/json' && xhr.responseText) {
          try {
            data = JSON.parse(xhr.responseText)
          } catch (e: any) {
            console.log('Unable to parse reponse text')
            console.log(xhr.responseText)
            console.log(e)
          }
          if (data && data.exception) {
            exception = data.exception.split('.').at(-1).split(':').at(0)
            exception_handler = exception_handlers[exception]
            if (exception_handler) {
              exception_handler(data)
              return
            }
          }
        }
        status_code_handler = statusCode[xhr.statusCode().status]
        if (status_code_handler) {
          status_code_handler(xhr)
          return
        }
        opts.error_callback && opts.error_callback(xhr)
      } catch (e: any) {
        console.log('Unable to handle failed response')
        console.error(e)
      }
    })
}
frappe.request.is_fresh = function (args?: any, threshold?: any) {
  if (!frappe.request.logs[args.cmd]) {
    frappe.request.logs[args.cmd] = []
  }
  for (let past_request of frappe.request.logs[args.cmd]) {
    if (new Date().getTime() - past_request.timestamp < threshold && frappe.utils.deep_equal(args, past_request.args)) {
      console.log('throttled')
      return true
    }
  }
  frappe.request.logs[args.cmd].push({ args: args, timestamp: new Date().getTime() })
  return false
}
frappe.request.prepare = function (opts?: any) {
  $('body').attr('data-ajax-state', 'triggered')
  if (opts.btn) $(opts.btn).prop('disabled', true)
  if (opts.freeze) frappe.dom.freeze(opts.freeze_message)
  if (!opts.use_json) {
    for (let key in opts.args) {
      if (opts.args[key] && ($.isPlainObject(opts.args[key]) || $.isArray(opts.args[key]))) {
        opts.args[key] = JSON.stringify(opts.args[key])
      }
    }
  }
  if (!opts.args.cmd && !opts.url) {
    console.log(opts)
    throw 'Incomplete Request'
  }
  opts.success_callback = opts.success
  opts.error_callback = opts.error
  delete opts.success
  delete opts.error
}
frappe.request.is_session_expired = function (response?: any) {
  if (response?.session_expired) return true
  const was_logged_in = frappe.session.logged_in_user && frappe.session.logged_in_user !== 'Guest'
  if (!was_logged_in) return false
  const user_id = document.cookie
    .split(';')
    .find((c?: any) => c.trim().startsWith('user_id='))
    ?.split('=')[1]
  return !user_id || user_id === 'Guest' || frappe.session.user === 'Guest'
}
frappe.request.handle_session_expiry = function (response?: any) {
  if (!frappe.app) return false
  if (!frappe.app.session_expired_dialog && !frappe.request.is_session_expired(response)) {
    return false
  }
  frappe.app.handle_session_expired()
  return true
}
frappe.request.cleanup = function (opts?: any, r?: any) {
  if (opts.btn) {
    $(opts.btn).prop('disabled', false)
  }
  $('body').attr('data-ajax-state', 'complete')
  if (opts.freeze) frappe.dom.unfreeze()
  if (r) {
    if (frappe.request.handle_session_expiry(r)) return
    let global_handlers = frappe.request.error_handlers[r.exc_type] || []
    let request_handler = opts.error_handlers ? opts.error_handlers[r.exc_type] : null
    let handlers = [].concat(global_handlers, request_handler).filter(Boolean)
    if (r.exc_type) {
      handlers.forEach((handler?: any) => {
        handler(r)
      })
    }
    let messages: any
    if (opts.api_version == 'v2') {
      messages = r.messages
    } else if (r._server_messages) {
      messages = JSON.parse(r._server_messages)
    }
    if (messages && !opts.silent) {
      if (handlers.length === 0) {
        const opens_dialog = messages.some((m?: any) => {
          const message = typeof m === 'string' ? JSON.parse(m) : m
          return !(message.alert || message.toast)
        })
        if (opens_dialog) {
          frappe.hide_msgprint()
        }
        frappe.msgprint(messages)
      }
    }
    if (r.exc) {
      r.exc = JSON.parse(r.exc)
      if (r.exc instanceof Array) {
        r.exc.forEach((exc?: any) => {
          if (exc) {
            console.error(exc)
          }
        })
      } else {
        console.error(r.exc)
      }
    }
    if (r._debug_messages) {
      if (opts.args) {
        console.log('======== arguments ========')
        console.log(opts.args)
      }
      console.log('======== debug messages ========')
      $.each(JSON.parse(r._debug_messages), function (_i?: any, v?: any) {
        console.log(v)
      })
      console.log('======== response ========')
      delete r._debug_messages
      console.log(r)
      console.log('========')
    }
  }
  frappe.last_response = r
}
frappe.after_server_call = () => {
  if (frappe.request.ajax_count) {
    return new Promise((resolve?: any) => {
      frappe.request.waiting_for_ajax.push(() => {
        resolve()
      })
    })
  } else {
    return null
  }
}
frappe.after_ajax = function (fn?: any) {
  return new Promise((resolve?: any) => {
    if (frappe.request.ajax_count) {
      frappe.request.waiting_for_ajax.push(() => {
        if (fn) return resolve(fn())
        resolve()
      })
    } else {
      if (fn) return resolve(fn())
      resolve()
    }
  })
}
frappe.request.report_error = function (xhr?: any, request_opts?: any) {
  let error_report_email: any
  let data = JSON.parse(xhr.responseText)
  let exc: any
  if (data.exc) {
    try {
      exc = (JSON.parse(data.exc) || []).join('\n')
    } catch (e: any) {
      exc = data.exc
    }
    delete data.exc
  } else {
    exc = ''
  }
  const copy_markdown_to_clipboard = () => {
    const code_block = (snippet?: any) => '```\n' + snippet + '\n```'
    let request_data = Object.assign({}, request_opts)
    request_data.request_id = xhr.getResponseHeader('X-Frappe-Request-Id')
    const traceback_info = [
      '### App Versions',
      code_block(JSON.stringify(frappe.boot.versions, null, '\t')),
      '### Route',
      code_block(frappe.get_route_str()),
      '### Traceback',
      code_block(exc),
      '### Request Data',
      code_block(JSON.stringify(request_data, null, '\t')),
      '### Response Data',
      code_block(JSON.stringify(data, null, '\t')),
    ].join('\n')
    frappe.utils.copy_to_clipboard(traceback_info)
  }
  let show_communication = function () {
    let error_report_message = [
      '<h5>Please type some additional information that could help us reproduce this issue:</h5>',
      '<div style="min-height: 100px; border: 1px solid #bbb; \
				border-radius: 5px; padding: 15px; margin-bottom: 15px;"></div>',
      '<hr>',
      '<h5>App Versions</h5>',
      '<pre>' + JSON.stringify(frappe.boot.versions, null, '\t') + '</pre>',
      '<h5>Route</h5>',
      '<pre>' + frappe.get_route_str() + '</pre>',
      '<hr>',
      '<h5>Error Report</h5>',
      '<pre>' + exc + '</pre>',
      '<hr>',
      '<h5>Request Data</h5>',
      '<pre>' + JSON.stringify(request_opts, null, '\t') + '</pre>',
      '<hr>',
      '<h5>Response JSON</h5>',
      '<pre>' + JSON.stringify(data, null, '\t') + '</pre>',
    ].join('\n')
    let communication_composer = new frappe.views.CommunicationComposer({
      subject: 'Error Report [' + frappe.datetime.nowdate() + ']',
      recipients: error_report_email,
      message: error_report_message,
      doc: {
        doctype: 'User',
        name: frappe.session.user,
      },
    })
    communication_composer.dialog.$wrapper.css('z-index', cint(frappe.msg_dialog.$wrapper.css('z-index')) + 1)
  }
  if (exc) {
    error_report_email = frappe.boot.error_report_email
    request_opts = frappe.request.cleanup_request_opts(request_opts)
    if (!frappe.error_dialog) {
      frappe.error_dialog = new frappe.ui.Dialog({
        title: __('Server Error'),
      })
    }
    if (error_report_email) {
      frappe.error_dialog.set_primary_action(__('Report'), () => {
        show_communication()
        frappe.error_dialog.hide()
      })
    } else {
      frappe.error_dialog.set_primary_action(__('Copy error to clipboard'), () => {
        copy_markdown_to_clipboard()
        frappe.error_dialog.hide()
      })
    }
    frappe.error_dialog.wrapper.classList.add('msgprint-dialog')
    let parts = strip(exc).split('\n')
    let dialog_html = parts[parts.length - 1]
    if (data._exc_source) {
      dialog_html += '<br>'
      dialog_html += `Possible source of error: ${data._exc_source.bold()} `
    }
    frappe.error_dialog.$body.html(dialog_html)
    frappe.error_dialog.show()
  }
}
frappe.request.cleanup_request_opts = function (request_opts?: any) {
  let doc = (request_opts.args || {}).doc
  if (doc) {
    let was_string = typeof doc === 'string'
    if (was_string) doc = JSON.parse(doc)
    frappe.utils.mask_passwords(doc)
    request_opts.args.doc = was_string ? JSON.stringify(doc) : doc
  }
  if (request_opts.args) {
    frappe.utils.mask_passwords(request_opts.args)
  }
  return request_opts
}
frappe.request.on_error = function (error_type?: any, handler?: any) {
  frappe.request.error_handlers[error_type] = frappe.request.error_handlers[error_type] || []
  frappe.request.error_handlers[error_type].push(handler)
}
$(document).ajaxSend(function () {
  frappe.request.ajax_count++
})
$(document).ajaxComplete(function () {
  frappe.request.ajax_count--
  if (!frappe.request.ajax_count) {
    $.each(frappe.request.waiting_for_ajax || [], function (_i?: any, fn?: any) {
      fn()
    })
    frappe.request.waiting_for_ajax = []
  }
})
