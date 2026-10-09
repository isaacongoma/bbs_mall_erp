import { $, __, cint, cur_frm, flt, frappe } from '@/shared/frappe/runtime'
frappe.provide('frappe.model')
$.extend(frappe.model, {
  new_names: {},
  get_new_doc: function (doctype?: any, parent_doc?: any, parentfield?: any, with_mandatory_children?: any) {
    let meta: any
    frappe.provide('locals.' + doctype)
    let doc: any = {
      docstatus: 0,
      doctype: doctype,
      name: frappe.model.get_new_name(doctype),
      __islocal: 1,
      __unsaved: 1,
      owner: frappe.session.user,
    }
    frappe.model.set_default_values(doc, parent_doc)
    if (parent_doc) {
      $.extend(doc, {
        parent: parent_doc.name,
        parentfield: parentfield,
        parenttype: parent_doc.doctype,
      })
      if (!parent_doc[parentfield]) parent_doc[parentfield] = []
      doc.idx = parent_doc[parentfield].length + 1
      parent_doc[parentfield].push(doc)
    } else {
      frappe.provide('frappe.model.docinfo.' + doctype + '.' + doc.name)
    }
    frappe.model.add_to_locals(doc)
    if (with_mandatory_children) {
      frappe.model.create_mandatory_children(doc)
    }
    if (!parent_doc) {
      doc.__run_link_triggers = 1
    }
    if (frappe.route_options && frappe.route_options.name_field) {
      meta = frappe.get_meta(doctype)
      if (meta.autoname && meta.autoname.indexOf('field:') !== -1) {
        doc[meta.autoname.substr(6)] = frappe.route_options.name_field
      } else if (meta.autoname && meta.autoname === 'prompt') {
        doc.__newname = frappe.route_options.name_field
      } else if (meta.title_field) {
        doc[meta.title_field] = frappe.route_options.name_field
      }
      delete frappe.route_options.name_field
    }
    if (frappe.route_options && !doc.parent) {
      $.each(frappe.route_options, function (fieldname?: any, value?: any) {
        let df = frappe.meta.has_field(doctype, fieldname)
        if (df && !df.no_copy) {
          doc[fieldname] = value
        }
      })
      frappe.route_options = null
    }
    return doc
  },
  make_new_doc_and_get_name: function (doctype?: any, with_mandatory_children?: any) {
    return frappe.model.get_new_doc(doctype, null, null, with_mandatory_children).name
  },
  get_new_name: function (doctype?: any) {
    return frappe.router.slug(`new-${doctype}-${frappe.utils.get_random(10)}`)
  },
  set_default_values: function (doc?: any, parent_doc?: any) {
    let doctype = doc.doctype
    let docfields = frappe.meta.get_docfields(doctype)
    let updated: any = []
    let fieldtypes_without_default = frappe.model.no_value_type.filter(
      (fieldtype?: any) => !frappe.model.table_fields.includes(fieldtype),
    )
    docfields.forEach((f?: any) => {
      if (fieldtypes_without_default.includes(f.fieldtype) || doc[f.fieldname] != null || f.no_default) {
        return
      }
      let v = frappe.model.get_default_value(f, doc, parent_doc)
      if (v) {
        if (['Int', 'Check'].includes(f.fieldtype)) v = cint(v)
        else if (['Currency', 'Float'].includes(f.fieldtype)) v = flt(v)
        doc[f.fieldname] = v
        updated.push(f.fieldname)
      } else if (
        f.fieldtype == 'Select' &&
        f.options &&
        typeof f.options === 'string' &&
        !['[Select]', 'Loading...'].includes(f.options)
      ) {
        doc[f.fieldname] = f.options.split('\n')[0]
      }
    })
    return updated
  },
  create_mandatory_children: function (doc?: any) {
    let meta = frappe.get_meta(doc.doctype)
    if (meta && meta.istable) return
    frappe.meta.get_docfields(doc.doctype).forEach(function (df?: any) {
      if (df.fieldtype === 'Table' && df.reqd) {
        frappe.model.add_child(doc, df.fieldname)
      }
    })
  },
  get_default_value: function (df?: any, doc?: any, parent_doc?: any) {
    let user_defaults: any,
      is_allowed_user_default: any,
      boot_doc: any,
      is_allowed_boot_doc: any,
      is_allowed_default: any
    let user_default = ''
    let user_permissions = frappe.defaults.get_user_permissions()
    let allowed_records: any = []
    let default_doc = null
    let value = null
    if (user_permissions) {
      ;({ allowed_records, default_doc } = frappe.perm.filter_allowed_docs_for_doctype(
        user_permissions[df.options],
        doc.doctype,
      ))
    }
    let meta = frappe.get_meta(doc.doctype)
    let has_user_permissions =
      df.fieldtype === 'Link' &&
      !$.isEmptyObject(user_permissions) &&
      df.ignore_user_permissions != 1 &&
      allowed_records.length
    if (!df.read_only && df.fieldtype === 'Link' && df.options !== 'User') {
      if (has_user_permissions && default_doc) {
        value = default_doc
      } else {
        if (!df.ignore_user_permissions) {
          user_defaults = frappe.defaults.get_user_defaults(df.options)
          if (user_defaults && user_defaults.length === 1) {
            user_default = user_defaults[0]
          }
        }
        if (!user_default) {
          user_default = frappe.defaults.get_user_default(df.fieldname)
        }
        if (!user_default && df.remember_last_selected_value && frappe.boot.user.last_selected_values) {
          user_default = frappe.boot.user.last_selected_values[df.options]
        }
        is_allowed_user_default = user_default && (!has_user_permissions || allowed_records.includes(user_default))
        if (is_allowed_user_default) {
          value = user_default
        }
      }
    }
    if (!value || df['default']) {
      const default_val = String(df['default'])
      if (default_val == '__user' || default_val.toLowerCase() == 'user') {
        value = frappe.session.user
      } else if (default_val == 'user_fullname') {
        value = frappe.session.user_fullname
      } else if (default_val == 'Today') {
        value = frappe.datetime.get_today()
      } else if ((default_val || '').toLowerCase() === 'now') {
        if (df.fieldtype == 'Time') {
          value = frappe.datetime.now_time()
        } else {
          value = frappe.datetime.system_datetime()
        }
      } else if (default_val[0] === ':') {
        boot_doc = frappe.model.get_default_from_boot_docs(df, doc, parent_doc)
        is_allowed_boot_doc = !has_user_permissions || allowed_records.includes(boot_doc)
        if (is_allowed_boot_doc) {
          value = boot_doc
        }
      } else if (df.fieldname === meta.title_field) {
        value = ''
      } else {
        is_allowed_default = !has_user_permissions || allowed_records.includes(df.default)
        if (df.fieldtype !== 'Link' || df.options === 'User' || is_allowed_default) {
          value = df['default']
        }
      }
    } else if (df.fieldtype == 'Time') {
      value = frappe.datetime.now_time()
    }
    if (frappe.model.table_fields.includes(df.fieldtype)) {
      value = []
    }
    df.__default_value = value
    return value
  },
  get_default_from_boot_docs: function (df?: any, _doc?: any, parent_doc?: any) {
    let ref_fieldname: any, ref_value: any, ref_doc: any
    if (frappe.get_list(df['default']).length > 0) {
      ref_fieldname = df['default'].slice(1).toLowerCase().replace(' ', '_')
      ref_value = parent_doc ? parent_doc[ref_fieldname] : frappe.defaults.get_user_default(ref_fieldname)
      ref_doc = ref_value ? frappe.get_doc(df['default'], ref_value) : null
      if (ref_doc && ref_doc[df.fieldname]) {
        return ref_doc[df.fieldname]
      }
    }
  },
  add_child: function (parent_doc?: any, doctype?: any, parentfield?: any, idx?: any) {
    let sorted: any, d: any
    if (arguments.length === 2) {
      parentfield = doctype
      doctype = frappe.meta.get_field(parent_doc.doctype, parentfield).options
    }
    idx = idx ? idx - 0.1 : (parent_doc[parentfield] || []).length + 1
    let child = frappe.model.get_new_doc(doctype, parent_doc, parentfield)
    child.idx = idx
    if (idx !== cint(idx)) {
      sorted = parent_doc[parentfield].sort(function (a?: any, b?: any) {
        return a.idx - b.idx
      })
      for (let i = 0, j = sorted.length; i < j; i++) {
        d = sorted[i]
        d.idx = i + 1
      }
    }
    if (cur_frm && cur_frm.doc == parent_doc) cur_frm.dirty()
    return child
  },
  copy_doc: function (doc?: any, from_amend?: any, parent_doc?: any, parentfield?: any) {
    let no_copy_list: any = ['name', 'amended_from', 'amendment_date', 'cancel_reason']
    let newdoc = frappe.model.get_new_doc(doc.doctype, parent_doc, parentfield)
    for (let key in doc) {
      let df = frappe.meta.get_docfield(doc.doctype, key)
      const is_internal_field = key.substring(0, 2) === '__'
      const is_blocked_field = no_copy_list.includes(key)
      const is_no_copy = !from_amend && df && cint(df.no_copy) == 1
      const is_password = df && df.fieldtype === 'Password'
      if (df && !is_internal_field && !is_blocked_field && !is_no_copy && !is_password) {
        let value = doc[key] || []
        if (frappe.model.table_fields.includes(df.fieldtype)) {
          for (let i = 0, j = value.length; i < j; i++) {
            let d = value[i]
            frappe.model.copy_doc(d, from_amend, newdoc, df.fieldname)
          }
        } else {
          newdoc[key] = doc[key]
        }
      }
    }
    let user = frappe.session.user
    newdoc.__islocal = 1
    newdoc.docstatus = 0
    newdoc.owner = user
    newdoc.creation = ''
    newdoc.modified_by = user
    newdoc.modified = ''
    newdoc.lft = null
    newdoc.rgt = null
    if (from_amend && parent_doc) {
      newdoc._amended_from = doc.name
    }
    return newdoc
  },
  _mapped_doc_guards: [],
  _running_mapped_doc_guards: 0,
  add_mapped_doc_guard: function (fn?: any) {
    if (!frappe.model._mapped_doc_guards.includes(fn)) {
      frappe.model._mapped_doc_guards.push(fn)
    }
  },
  remove_mapped_doc_guard: function (fn?: any) {
    frappe.model._mapped_doc_guards = frappe.model._mapped_doc_guards.filter((guard?: any) => guard !== fn)
  },
  should_open_mapped_doc: async function (mapped_doc?: any, opts?: any) {
    for (const guard of frappe.model._mapped_doc_guards) {
      try {
        if (!(await guard(mapped_doc, opts))) {
          return false
        }
      } catch (e: any) {
        console.error(e)
      }
    }
    return true
  },
  open_mapped_doc: function (opts?: any) {
    if (frappe.model._running_mapped_doc_guards) {
      return
    }
    if (opts.frm && opts.frm.doc.__unsaved) {
      frappe.throw(__('You have unsaved changes in this form. Please save before you continue.'))
    } else if (!opts.source_name && opts.frm) {
      opts.source_name = opts.frm.doc.name
    } else if (!opts.frm && !opts.source_name) {
      opts.source_name = null
    }
    return frappe.call({
      type: 'POST',
      method: 'frappe.model.mapper.make_mapped_doc',
      args: {
        method: opts.method,
        source_name: opts.source_name,
        args: opts.args || null,
        selected_children: opts.frm ? opts.frm.get_selected() : null,
      },
      freeze: true,
      freeze_message: opts.freeze_message || '',
      callback: async function (r?: any) {
        if (r.exc) {
          return
        }
        frappe.model._running_mapped_doc_guards++
        try {
          if (!(await frappe.model.should_open_mapped_doc(r.message, opts))) {
            return
          }
        } finally {
          frappe.model._running_mapped_doc_guards--
        }
        frappe.model.sync(r.message)
        if (opts.run_link_triggers) {
          frappe.get_doc(r.message.doctype, r.message.name).__run_link_triggers = true
        }
        frappe.set_route('Form', r.message.doctype, r.message.name)
      },
    })
  },
})
frappe.create_routes = {}
frappe.new_doc = function (doctype?: any, opts?: any, init_callback?: any) {
  if (doctype === 'File') {
    new frappe.ui.FileUploader({
      folder: opts ? opts.folder : 'Home',
    })
    return
  }
  return new Promise((resolve?: any) => {
    if (opts && $.isPlainObject(opts)) {
      frappe.route_options = opts
    }
    frappe.model.with_doctype(doctype, function () {
      if (frappe.create_routes[doctype]) {
        frappe.set_route(frappe.create_routes[doctype]).then(() => resolve())
      } else {
        frappe.ui.form.make_quick_entry(doctype, null, init_callback).then(() => resolve())
      }
    })
  })
}
