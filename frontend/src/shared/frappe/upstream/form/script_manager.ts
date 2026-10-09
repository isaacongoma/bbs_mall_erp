import { $, __, cur_frm, extend_cscript, frappe } from '@/shared/frappe/runtime'
frappe.provide('frappe.ui.form.handlers')
window.extend_cscript = (cscript?: any, controller_object?: any) => {
  $.extend(cscript, controller_object)
  if (cscript && controller_object) {
    cscript.__proto__ = controller_object.__proto__
  }
  return cscript
}
frappe.ui.form.get_event_handler_list = function (doctype?: any, fieldname?: any) {
  if (!frappe.ui.form.handlers[doctype]) {
    frappe.ui.form.handlers[doctype] = {}
  }
  if (!frappe.ui.form.handlers[doctype][fieldname]) {
    frappe.ui.form.handlers[doctype][fieldname] = []
  }
  return frappe.ui.form.handlers[doctype][fieldname]
}
frappe.ui.form.on = frappe.ui.form.on_change = function (doctype?: any, fieldname?: any, handler?: any) {
  let fn: any
  let add_handler = function (fieldname?: any, handler?: any) {
    let handler_list = frappe.ui.form.get_event_handler_list(doctype, fieldname)
    let _handler = (...args: any[]) => {
      try {
        return handler(...args)
      } catch (error: any) {
        console.error(handler)
        throw error
      }
    }
    handler_list.push(_handler)
    if (cur_frm && cur_frm.doctype === doctype) {
      cur_frm.events[fieldname] = _handler
    }
  }
  if (!handler && $.isPlainObject(fieldname)) {
    for (let key in fieldname) {
      fn = fieldname[key]
      if (typeof fn === 'function') {
        add_handler(key, fn)
      }
    }
  } else {
    add_handler(fieldname, handler)
  }
}
frappe.ui.form.off = function (doctype?: any, fieldname?: any) {
  let handler_list = frappe.ui.form.get_event_handler_list(doctype, fieldname)
  if (handler_list.length) {
    frappe.ui.form.handlers[doctype][fieldname] = []
  }
  if (cur_frm && cur_frm.doctype === doctype && cur_frm.events[fieldname]) {
    delete cur_frm.events[fieldname]
  }
  if (cur_frm && cur_frm.cscript && cur_frm.cscript[fieldname]) {
    delete cur_frm.cscript[fieldname]
  }
}
frappe.ui.form.trigger = function (doctype?: any, fieldname?: any) {
  cur_frm.script_manager.trigger(fieldname, doctype)
}
frappe.ui.form.controllers = {}
frappe.ui.form.set_controller = function (doctype?: any, ControllerClass?: any) {
  frappe.ui.form.controllers[doctype] = ControllerClass
}
frappe.ui.form.ScriptManager = class ScriptManager {
  [key: string]: any
  constructor(opts?: any) {
    $.extend(this, opts)
  }
  make(this: any, ControllerClass?: any) {
    this.frm.cscript = extend_cscript(this.frm.cscript, new ControllerClass({ frm: this.frm }))
  }
  bind_controller(this: any) {
    const ControllerClass = frappe.ui.form.controllers[this.frm.doctype]
    if (ControllerClass && !(this.frm.cscript instanceof ControllerClass)) {
      this.make(ControllerClass)
    }
  }
  trigger(this: any, event_name?: any, doctype?: any, name?: any) {
    let me = this
    doctype = doctype || this.frm.doctype
    name = name || this.frm.docname
    let tasks: any = []
    let handlers = this.get_handlers(event_name, doctype)
    this.frm.selected_doc = frappe.get_doc(doctype, name)
    let runner = (_function?: any, is_old_style?: any) => {
      let _promise = null
      if (is_old_style) {
        _promise = me.frm.cscript[_function](me.frm.doc, doctype, name)
      } else {
        _promise = _function(me.frm, doctype, name)
      }
      if (_promise && _promise.then) {
        return _promise
      } else {
        return frappe.after_server_call()
      }
    }
    handlers.new_style.forEach((_function?: any) => {
      if (event_name === 'setup') {
        runner(_function, false)
      } else {
        tasks.push(() => runner(_function, false))
      }
    })
    handlers.old_style.forEach((_function?: any) => {
      if (event_name === 'setup') {
        runner(_function, true)
      } else {
        tasks.push(() => runner(_function, true))
      }
    })
    return frappe.run_serially(tasks)
  }
  has_handler(this: any, event_name?: any) {
    return frappe.ui.form.handlers[this.frm.doctype] && frappe.ui.form.handlers[this.frm.doctype][event_name]
  }
  has_handlers(this: any, event_name?: any, doctype?: any) {
    let handlers = this.get_handlers(event_name, doctype)
    return handlers && (handlers.old_style.length || handlers.new_style.length)
  }
  get_handlers(this: any, event_name?: any, doctype?: any) {
    let handlers: any = {
      old_style: [],
      new_style: [],
    }
    if (frappe.ui.form.handlers[doctype] && frappe.ui.form.handlers[doctype][event_name]) {
      $.each(frappe.ui.form.handlers[doctype][event_name], function (_i?: any, fn?: any) {
        handlers.new_style.push(fn)
      })
    }
    if (frappe.ui.form.handlers['*'] && frappe.ui.form.handlers['*'][event_name]) {
      $.each(frappe.ui.form.handlers['*'][event_name], function (_i?: any, fn?: any) {
        handlers.new_style.push(fn)
      })
    }
    if (this.frm.cscript?.[event_name]) {
      handlers.old_style.push(event_name)
    }
    if (this.frm.cscript?.['custom_' + event_name]) {
      handlers.old_style.push('custom_' + event_name)
    }
    return handlers
  }
  setup(this: any) {
    const doctype = this.frm.meta
    const me = this
    let client_script = doctype.__js
    if (this.frm.doctype_layout?.client_script) {
      client_script += `\n${this.frm.doctype_layout.client_script}`
    }
    if (client_script) {
      new Function(client_script)()
    }
    if (!this.frm.doctype_layout && doctype.__custom_js) {
      try {
        new Function(doctype.__custom_js)()
      } catch (e: any) {
        frappe.msgprint({
          title: __('Error in Client Script'),
          indicator: 'orange',
          message: '<pre class="small"><code>' + e.stack + '</code></pre>',
        })
      }
    }
    this.bind_controller()
    function setup_add_fetch(df?: any) {
      let parts: any
      let is_read_only_field =
        [
          'Data',
          'Read Only',
          'Text',
          'Small Text',
          'Currency',
          'Check',
          'Text Editor',
          'Attach Image',
          'Code',
          'Link',
          'Float',
          'Int',
          'Date',
          'Datetime',
          'Select',
          'Duration',
          'Time',
          'Percent',
          'Phone',
          'Barcode',
          'Autocomplete',
          'Icon',
          'Color',
          'Rating',
        ].includes(df.fieldtype) ||
        df.read_only == 1 ||
        df.is_virtual == 1
      if (is_read_only_field && df.fetch_from && df.fetch_from.indexOf('.') != -1) {
        parts = df.fetch_from.split('.')
        me.frm.add_fetch(parts[0], parts[1], df.fieldname, df.parent)
      }
    }
    $.each(this.frm.fields, function (_i?: any, field?: any) {
      setup_add_fetch(field.df)
      if (frappe.model.table_fields.includes(field.df.fieldtype)) {
        $.each(frappe.meta.get_docfields(field.df.options, me.frm.docname), function (_i?: any, df?: any) {
          setup_add_fetch(df)
        })
      }
    })
    doctype.__css && frappe.dom.set_style(doctype.__css)
    this.trigger('setup')
  }
  log_error(caller?: any, e?: any) {
    frappe.show_alert({ message: __('Error in Client Script.'), indicator: 'error' })
    console.group && console.group()
    console.log('----- error in client script -----')
    console.log('method: ' + caller)
    console.log(e)
    console.log('error message: ' + e.message)
    console.trace()
    console.log('----- end of error message -----')
    console.groupEnd()
  }
  copy_from_first_row(this: any, parentfield?: any, current_row?: any, fieldnames?: any) {
    let data = this.frm.doc[parentfield]
    if (data.length === 1 || data[0] === current_row) return
    if (typeof fieldnames === 'string') {
      fieldnames = [fieldnames]
    }
    $.each(fieldnames, function (_i?: any, fieldname?: any) {
      frappe.model.set_value(current_row.doctype, current_row.name, fieldname, data[0][fieldname])
    })
  }
}
