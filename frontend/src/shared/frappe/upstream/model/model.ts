import { $, __, cint, cur_frm, flt, frappe, is_null, locals, moment, precision } from '@/shared/frappe/runtime'
frappe.provide('frappe.model')
$.extend(frappe.model, {
  all_fieldtypes: [
    'Autocomplete',
    'Attach',
    'Attach Image',
    'Attachment Gallery',
    'Barcode',
    'Button',
    'Check',
    'Code',
    'Color',
    'Currency',
    'Data',
    'Date',
    'Datetime',
    'Duration',
    'Dynamic Link',
    'Float',
    'Geolocation',
    'Heading',
    'HTML',
    'HTML Editor',
    'Icon',
    'Image',
    'Int',
    'JSON',
    'Link',
    'Long Text',
    'Markdown Editor',
    'Password',
    'Percent',
    'Phone',
    'Read Only',
    'Rating',
    'Select',
    'Signature',
    'Small Text',
    'Table',
    'Table MultiSelect',
    'Text',
    'Text Editor',
    'Time',
  ],
  no_value_type: [
    'Section Break',
    'Column Break',
    'Tab Break',
    'Attachment Gallery',
    'HTML',
    'Table',
    'Table MultiSelect',
    'Button',
    'Image',
    'Fold',
    'Heading',
  ],
  layout_fields: ['Section Break', 'Column Break', 'Tab Break', 'Fold'],
  std_fields_list: [
    'name',
    'owner',
    'creation',
    'modified',
    'modified_by',
    '_user_tags',
    '_assign',
    '_liked_by',
    'docstatus',
    'idx',
  ],
  child_table_field_list: ['parent', 'parenttype', 'parentfield'],
  core_doctypes_list: [
    'DocType',
    'DocField',
    'DocPerm',
    'User',
    'Role',
    'Has Role',
    'Page',
    'Module Def',
    'Print Format',
    'Report',
    'Customize Form',
    'Customize Form Field',
    'Property Setter',
    'Custom Field',
    'Client Script',
  ],
  restricted_fields: [
    'name',
    'parent',
    'creation',
    'modified',
    'modified_by',
    'parentfield',
    'parenttype',
    'file_list',
    'flags',
    'docstatus',
  ],
  html_fieldtypes: ['Text Editor', 'Text', 'Small Text', 'Long Text', 'HTML Editor', 'Markdown Editor', 'Code'],
  std_fields: [
    { fieldname: 'name', fieldtype: 'Link', label: __('ID') },
    { fieldname: 'owner', fieldtype: 'Link', label: __('Created By'), options: 'User' },
    { fieldname: 'idx', fieldtype: 'Int', label: __('Index') },
    { fieldname: 'creation', fieldtype: 'Datetime', label: __('Created On') },
    { fieldname: 'modified', fieldtype: 'Datetime', label: __('Last Updated On') },
    {
      fieldname: 'modified_by',
      fieldtype: 'Link',
      label: __('Last Updated By'),
      options: 'User',
    },
    { fieldname: '_user_tags', fieldtype: 'Data', label: __('Tags') },
    { fieldname: '_liked_by', fieldtype: 'Data', label: __('Liked By') },
    { fieldname: '_assign', fieldtype: 'Text', label: __('Assigned To') },
    { fieldname: 'docstatus', fieldtype: 'Int', label: __('Document Status') },
  ],
  numeric_fieldtypes: ['Int', 'Float', 'Currency', 'Percent', 'Duration'],
  std_fields_table: [{ fieldname: 'parent', fieldtype: 'Data', label: __('Parent') }],
  table_fields: ['Table', 'Table MultiSelect'],
  new_names: {},
  events: {},
  user_settings: {},
  init: function () {
    frappe.realtime.on('doc_update', function (data?: any) {
      let doc = locals[data.doctype] && locals[data.doctype][data.name]
      if (doc) {
        if (frappe.get_route()[0] === 'Form' && cur_frm.doc.doctype === doc.doctype && cur_frm.doc.name === doc.name) {
          if (data.modified !== cur_frm.doc.modified && !frappe.ui.form.is_saving) {
            if (!cur_frm.is_dirty()) {
              cur_frm.debounced_reload_doc()
            } else {
              doc.__needs_refresh = true
              cur_frm.show_conflict_message()
            }
          }
        } else {
          if (!doc.__unsaved) {
            frappe.model.remove_from_locals(doc.doctype, doc.name)
          } else {
            doc.__needs_refresh = true
          }
        }
      }
    })
    frappe.realtime.on('doctype_update', function (data?: any) {
      if (frappe.get_route()[0] !== 'Form') return
      if (!cur_frm || cur_frm.doctype !== data.doctype) return
      if (frappe.ui.form.is_saving) return
      if (cur_frm.is_dirty()) {
        cur_frm.dashboard.clear_headline()
        cur_frm.dashboard.set_headline_alert(
          __(
            'This DocType has been updated. Save or discard your changes, then reload the page to see the latest version.',
          ),
          'yellow',
        )
      } else {
        frappe.show_alert(
          {
            message: __('DocType updated. Reloading…'),
            indicator: 'blue',
          },
          1,
        )
        setTimeout(() => location.reload(), 1000)
      }
    })
  },
  is_value_type: function (fieldtype?: any) {
    if (typeof fieldtype == 'object') {
      fieldtype = fieldtype.fieldtype
    }
    return frappe.model.no_value_type.indexOf(fieldtype) === -1
  },
  is_non_std_field: function (fieldname?: any) {
    return ![...frappe.model.std_fields_list, ...frappe.model.child_table_field_list].includes(fieldname)
  },
  get_std_field: function (fieldname?: any, ignore: any = false) {
    let docfield = $.map([].concat(frappe.model.std_fields).concat(frappe.model.std_fields_table), function (d?: any) {
      if (d.fieldname == fieldname) return d
    })
    if (!docfield.length) {
      if (ignore) {
        return { fieldname: fieldname }
      } else {
        frappe.msgprint(__('Unknown Column: {0}', [fieldname]))
      }
    }
    return docfield[0]
  },
  with_doctype: function (doctype?: any, callback?: any, async?: any) {
    if (locals.DocType[doctype]) {
      callback && callback()
      return Promise.resolve()
    } else {
      return frappe.call({
        method: 'frappe.desk.form.load.getdoctype',
        type: 'GET',
        args: {
          doctype: doctype,
          with_parent: 1,
        },
        async: async,
        callback: function (r?: any) {
          if (r.exc) {
            frappe.msgprint(__('Unable to load: {0}', [__(doctype)]))
            throw 'No doctype'
          }
          let meta = r.docs[0]
          frappe.model.init_doctype(meta)
          if (r.user_settings) {
            frappe.model.user_settings[doctype] = JSON.parse(r.user_settings)
            frappe.model.user_settings[doctype].updated_on = moment().toString()
          }
          callback && callback(r)
        },
      })
    }
  },
  init_doctype: function (meta?: any) {
    if (meta.name === 'DocType') {
      frappe.meta.__doctype_meta = JSON.parse(JSON.stringify(meta))
    }
    for (const asset_key of ['__list_js', '__calendar_js', '__tree_js', '__kanban_js', '__custom_list_js']) {
      if (meta[asset_key]) {
        new Function(meta[asset_key])()
      }
    }
    if (meta.__templates) {
      $.extend(frappe.templates, meta.__templates)
    }
  },
  with_doc: function (doctype?: any, name?: any, callback?: any, error_callback?: any) {
    return new Promise((resolve?: any, reject?: any) => {
      if (!name) name = doctype
      const use_cache =
        !error_callback && locals[doctype] && locals[doctype][name] && frappe.model.get_docinfo(doctype, name)
      if (use_cache) {
        callback && callback(name)
        resolve(frappe.get_doc(doctype, name))
      } else {
        let permission_denied = false
        return frappe.call({
          method: 'frappe.desk.form.load.getdoc',
          type: 'GET',
          args: {
            doctype: doctype,
            name: name,
          },
          callback: function (r?: any) {
            callback && callback(name, r)
            resolve(frappe.get_doc(doctype, name))
          },
          error_handlers: {
            PermissionError: () => {
              permission_denied = true
            },
          },
          error: function (r?: any) {
            if (permission_denied) {
              frappe.model.remove_from_locals(doctype, name)
            }
            error_callback && error_callback(r, permission_denied)
            reject(r)
          },
        })
      }
    })
  },
  get_docinfo: function (doctype?: any, name?: any) {
    return (frappe.model.docinfo[doctype] && frappe.model.docinfo[doctype][name]) || null
  },
  set_docinfo: function (doctype?: any, name?: any, key?: any, value?: any) {
    if (frappe.model.docinfo[doctype] && frappe.model.docinfo[doctype][name]) {
      frappe.model.docinfo[doctype][name][key] = value
    }
  },
  get_shared: function (doctype?: any, name?: any) {
    return frappe.model.get_docinfo(doctype, name).shared
  },
  get_server_module_name: function (doctype?: any) {
    let dt = frappe.model.scrub(doctype)
    let module = frappe.model.scrub(locals.DocType[doctype].module)
    let app = frappe.boot.module_app[module]
    return app + '.' + module + '.doctype.' + dt + '.' + dt
  },
  scrub: function (txt?: any) {
    return txt.replace(/ /g, '_').toLowerCase()
  },
  unscrub: function (txt?: any) {
    return (txt || '').replace(/-|_/g, ' ').replace(/\w*/g, function (keywords?: any) {
      return keywords.charAt(0).toUpperCase() + keywords.substr(1).toLowerCase()
    })
  },
  can_create: function (doctype?: any) {
    return frappe.boot.user.can_create.indexOf(doctype) !== -1
  },
  can_select: function (doctype?: any) {
    if (frappe.boot.user) {
      return frappe.boot.user.can_select.indexOf(doctype) !== -1
    }
  },
  can_read: function (doctype?: any) {
    if (frappe.boot.user) {
      return frappe.boot.user.can_read.indexOf(doctype) !== -1
    }
  },
  can_write: function (doctype?: any) {
    return frappe.boot.user.can_write.indexOf(doctype) !== -1
  },
  can_get_report: function (doctype?: any) {
    return frappe.boot.user.can_get_report.indexOf(doctype) !== -1
  },
  can_delete: function (doctype?: any) {
    if (!doctype) return false
    return frappe.boot.user.can_delete.indexOf(doctype) !== -1
  },
  can_submit: function (doctype?: any) {
    if (!doctype) return false
    return frappe.boot.user.can_submit.indexOf(doctype) !== -1
  },
  can_cancel: function (doctype?: any) {
    if (!doctype) return false
    return frappe.boot.user.can_cancel.indexOf(doctype) !== -1
  },
  has_workflow: function (doctype?: any) {
    return frappe.get_list('Workflow', { document_type: doctype, is_active: 1 }).length
  },
  is_submittable: function (doctype?: any) {
    if (!doctype) return false
    return locals.DocType[doctype] && locals.DocType[doctype].is_submittable
  },
  is_table: function (doctype?: any) {
    if (!doctype) return false
    return locals.DocType[doctype] && locals.DocType[doctype].istable
  },
  is_single: function (doctype?: any) {
    if (!doctype) return false
    return frappe.boot.single_types.indexOf(doctype) != -1
  },
  is_tree: function (doctype?: any) {
    if (!doctype) return false
    return locals.DocType[doctype] && locals.DocType[doctype].is_tree
  },
  is_fresh(doc?: any) {
    return doc && doc.__last_sync_on && new Date().getTime() - doc.__last_sync_on < 5000
  },
  can_import: function (doctype?: any, frm?: any, meta: any = null) {
    if (meta && !meta.allow_import) return false
    if (frappe.user_roles.includes('System Manager')) return true
    if (frm) return frm.perm[0].import === 1
    return frappe.boot.user.can_import.indexOf(doctype) !== -1
  },
  can_export: function (doctype?: any, frm?: any) {
    if (frappe.user_roles.includes('System Manager')) return true
    if (frm) return frm.perm[0].export === 1
    return frappe.boot.user.can_export.indexOf(doctype) !== -1
  },
  can_print: function (doctype?: any, frm?: any) {
    if (frm) return frm.perm[0].print === 1
    return frappe.boot.user.can_print.indexOf(doctype) !== -1
  },
  can_print_docstatus: function (doctype?: any, docstatus?: any) {
    if (!frappe.model.is_submittable(doctype) || docstatus == 1) return true
    const print_settings = frappe.model.get_doc(':Print Settings', 'Print Settings') || {}
    if (docstatus == 2) return !!cint(print_settings.allow_print_for_cancelled)
    if (docstatus == 0) return !!cint(print_settings.allow_print_for_draft)
    return false
  },
  can_print_doc: function (frm?: any) {
    return !!(
      frappe.model.can_print_docstatus(frm.doc.doctype, frm.doc.docstatus) &&
      frappe.model.can_print(null, frm) &&
      !frm.meta.issingle
    )
  },
  can_email: function (doctype?: any, frm?: any) {
    if (frm) return frm.perm[0].email === 1
    return frappe.boot.user.can_email.indexOf(doctype) !== -1
  },
  can_share: function (doctype?: any, frm?: any) {
    let disable_sharing = frappe.defaults.is_enabled('disable_document_sharing')
    if (disable_sharing && frappe.session.user !== 'Administrator') {
      return false
    }
    if (frm) {
      return frm.perm[0].share === 1
    }
    return frappe.boot.user.can_share.indexOf(doctype) !== -1
  },
  has_value: function (dt?: any, dn?: any, fn?: any) {
    let val = locals[dt] && locals[dt][dn] && locals[dt][dn][fn]
    let df = frappe.meta.get_docfield(dt, fn, dn)
    let ret: any
    if (frappe.model.table_fields.includes(df.fieldtype)) {
      ret = false
      $.each(locals[df.options] || {}, function (_k?: any, d?: any) {
        if (d.parent == dn && d.parenttype == dt && d.parentfield == df.fieldname) {
          ret = true
          return false
        }
      })
    } else {
      ret = !is_null(val)
    }
    return ret ? true : false
  },
  get_list: function (doctype?: any, filters?: any) {
    let docsdict = locals[doctype] || locals[':' + doctype] || {}
    if ($.isEmptyObject(docsdict)) return []
    return frappe.utils.filter_dict(docsdict, filters)
  },
  get_value: function (doctype?: any, filters?: any, fieldname?: any, callback?: any) {
    let l: any
    if (callback) {
      frappe.call({
        method: 'frappe.client.get_value',
        args: {
          doctype: doctype,
          fieldname: fieldname,
          filters: filters,
        },
        callback: function (r?: any) {
          if (!r.exc) {
            callback(r.message)
          }
        },
      })
    } else {
      if (['number', 'string'].includes(typeof filters) && locals[doctype] && locals[doctype][filters]) {
        return locals[doctype][filters][fieldname]
      } else {
        l = frappe.get_list(doctype, filters)
        return l.length && l[0] ? l[0][fieldname] : null
      }
    }
  },
  set_value: function (
    doctype?: any,
    docname?: any,
    fieldname?: any,
    value?: any,
    fieldtype?: any,
    skip_dirty_trigger: any = false,
  ) {
    let doc: any
    if ($.isPlainObject(doctype)) {
      doc = doctype
      fieldname = docname
      value = fieldname
    } else {
      doc = locals[doctype] && locals[doctype][docname]
    }
    let to_update = fieldname
    let tasks: any = []
    if (!$.isPlainObject(to_update)) {
      to_update = {}
      to_update[fieldname] = value
    }
    $.each(to_update, (key?: any, value?: any) => {
      if (doc && doc[key] !== value) {
        if (doc.__unedited && !(!doc[key] && !value)) {
          doc.__unedited = false
        }
        doc[key] = value
        tasks.push(() => frappe.model.trigger(key, value, doc, skip_dirty_trigger))
      } else {
        if (['Link', 'Dynamic Link'].includes(fieldtype) && doc) {
          tasks.push(() => frappe.model.trigger(key, value, doc, skip_dirty_trigger))
        }
      }
    })
    return frappe.run_serially(tasks)
  },
  on: function (doctype?: any, fieldname?: any, fn?: any) {
    frappe.provide('frappe.model.events.' + doctype)
    if (!frappe.model.events[doctype][fieldname]) {
      frappe.model.events[doctype][fieldname] = []
    }
    frappe.model.events[doctype][fieldname].push(fn)
  },
  trigger: function (fieldname?: any, value?: any, doc?: any, skip_dirty_trigger: any = false) {
    const tasks: any = []
    function enqueue_events(events?: any) {
      if (!events) return
      for (const fn of events) {
        if (!fn) continue
        tasks.push(() => {
          const return_value = fn(fieldname, value, doc, skip_dirty_trigger)
          if (return_value && return_value.then) {
            return return_value
          } else {
            return frappe.after_server_call()
          }
        })
      }
    }
    if (frappe.model.events[doc.doctype]) {
      enqueue_events(frappe.model.events[doc.doctype][fieldname])
      enqueue_events(frappe.model.events[doc.doctype]['*'])
    }
    return frappe.run_serially(tasks)
  },
  get_doc: function (doctype?: any, name?: any) {
    let doc: any
    if (!name) name = doctype
    if ($.isPlainObject(name)) {
      doc = frappe.get_list(doctype, name)
      return doc && doc.length ? doc[0] : null
    }
    return locals[doctype] ? locals[doctype][name] : null
  },
  get_children: function (doctype?: any, parent?: any, parentfield?: any, filters?: any) {
    let doc: any
    if ($.isPlainObject(doctype)) {
      doc = doctype
      filters = parentfield
      parentfield = parent
    } else {
      doc = frappe.get_doc(doctype, parent)
    }
    let children = doc[parentfield] || []
    if (filters) {
      return frappe.utils.filter_dict(children, filters)
    } else {
      return children
    }
  },
  get_title_from_title_field: function (doc?: any, meta?: any) {
    let df = meta.fields.find((df?: any) => df.fieldname === meta.title_field)
    let title_value = doc[meta.title_field]
    if (df?.fieldtype && ['Link', 'Dynamic Link'].includes(df.fieldtype)) {
      const doctype = df.fieldtype === 'Dynamic Link' ? doc[df.options] : df.options
      title_value = frappe.utils.get_link_title(doctype, title_value) ?? title_value
    }
    return title_value
  },
  get_doc_title(this: any, doc?: any) {
    if (typeof doc.name == 'string') {
      if (doc.name.startsWith('new-' + doc.doctype.toLowerCase().replace(/ /g, '-'))) {
        return __('New {0}', [__(doc.doctype)])
      }
    }
    let meta = frappe.get_meta(doc.doctype)
    if (meta.title_field) {
      return this.get_title_from_title_field(doc, meta)
    } else {
      return String(doc.name)
    }
  },
  clear_table: function (doc?: any, parentfield?: any) {
    for (const d of doc[parentfield] || []) {
      delete locals[d.doctype][d.name]
    }
    doc[parentfield] = []
  },
  remove_from_locals: function (this: any, doctype?: any, name?: any) {
    this.clear_doc(doctype, name)
    if (frappe.views.formview[doctype]) {
      delete frappe.views.formview[doctype].frm.opendocs[name]
    }
  },
  clear_doc: function (doctype?: any, name?: any) {
    let parenttype: any, parentfield: any, parent_doc: any, newlist: any, idx: any
    let doc = locals[doctype] && locals[doctype][name]
    if (!doc) return
    let parent = null
    if (doc.parenttype) {
      parent = doc.parent
      ;((parenttype = doc.parenttype), (parentfield = doc.parentfield))
    }
    delete locals[doctype][name]
    if (parent) {
      parent_doc = locals[parenttype][parent]
      ;((newlist = []), (idx = 1))
      $.each(parent_doc[parentfield], function (_i?: any, d?: any) {
        if (d.name != name) {
          newlist.push(d)
          d.idx = idx
          idx++
        }
        parent_doc[parentfield] = newlist
      })
    }
  },
  get_no_copy_list: function (doctype?: any) {
    let df: any
    let no_copy_list: any = ['name', 'amended_from', 'amendment_date', 'cancel_reason']
    let docfields = frappe.get_meta(doctype).fields || []
    for (let i = 0, j = docfields.length; i < j; i++) {
      df = docfields[i]
      if (cint(df.no_copy)) no_copy_list.push(df.fieldname)
    }
    return no_copy_list
  },
  delete_doc: function (doctype?: any, docname?: any, callback?: any) {
    let title = docname.toString()
    const title_field = frappe.get_meta(doctype).title_field
    if (title_field) {
      const value = frappe.model.get_value(doctype, docname, title_field)
      if (value) {
        title = `${value} (${docname})`
      }
    }
    frappe.warn(
      __('Confirm'),
      __('Permanently delete {0}?', [title.bold()]),
      function () {
        return frappe.call({
          method: 'frappe.client.delete',
          args: {
            doctype: doctype,
            name: docname,
          },
          freeze: true,
          freeze_message: __('Deleting {0}...', [title]),
          callback: function (r?: any, rt?: any) {
            if (!r.exc) {
              frappe.utils.play_sound('delete')
              frappe.model.delete_from_locals(doctype, docname)
              if (callback) callback(r, rt)
            }
          },
        })
      },
      __('Delete'),
    )
  },
  rename_doc: function (doctype?: any, docname?: any, callback?: any) {
    let message = __('Merge with existing')
    let warning = __('This cannot be undone')
    let merge_label = message + ' <b>(' + warning + ')</b>'
    let d = new frappe.ui.Dialog({
      title: __('Rename {0}', [__(docname)]),
      fields: [
        {
          label: __('New Name'),
          fieldname: 'new_name',
          fieldtype: 'Data',
          reqd: 1,
          default: docname,
        },
        { label: merge_label, fieldtype: 'Check', fieldname: 'merge' },
      ],
    })
    d.set_primary_action(__('Rename'), function () {
      d.hide()
      let args = d.get_values()
      if (!args) return
      return frappe.call({
        method: 'frappe.rename_doc',
        freeze: true,
        freeze_message: 'Updating related fields...',
        args: {
          doctype: doctype,
          old: docname,
          new: args.new_name,
          merge: args.merge,
        },
        btn: d.get_primary_btn(),
        callback: function (r?: any) {
          if (!r.exc) {
            frappe.model.rename_doc_in_locals(doctype, docname, r.message || args.new_name, args.merge)
            $(document).trigger('rename', [doctype, docname, r.message || args.new_name])
            d.hide()
            if (callback) callback(r.message)
          }
        },
      })
    })
    d.show()
  },
  round_floats_in: function (doc?: any, fieldnames?: any) {
    let fieldname: any
    if (!doc) {
      return
    }
    if (!fieldnames) {
      fieldnames = frappe.meta.get_fieldnames(doc.doctype, doc.parent, {
        fieldtype: ['in', ['Currency', 'Float']],
      })
    }
    for (let i = 0, j = fieldnames.length; i < j; i++) {
      fieldname = fieldnames[i]
      doc[fieldname] = flt(doc[fieldname], precision(fieldname, doc))
    }
  },
  validate_missing: function (doc?: any, fieldname?: any) {
    if (!doc[fieldname]) {
      frappe.throw(
        __('Please specify') + ': ' + frappe.meta.get_translated_label(doc.doctype, fieldname, doc.parent || doc.name),
      )
    }
  },
  get_all_docs: function (doc?: any) {
    let children: any
    let all: any = [doc]
    for (let key in doc) {
      if ($.isArray(doc[key]) && !key.startsWith('_')) {
        children = doc[key]
        for (let i = 0, l = children.length; i < l; i++) {
          all.push(children[i])
        }
      }
    }
    return all
  },
  get_full_column_name: function (fieldname?: any, doctype?: any) {
    if (fieldname.includes('`tab')) return fieldname
    return '`tab' + doctype + '`.`' + fieldname + '`'
  },
  is_numeric_field: function (fieldtype?: any) {
    if (!fieldtype) return
    if (typeof fieldtype === 'object') {
      fieldtype = fieldtype.fieldtype
    }
    return frappe.model.numeric_fieldtypes.includes(fieldtype)
  },
  set_default_views_for_doctype(doctype?: any, frm?: any) {
    frappe.model.with_doctype(doctype, () => {
      let meta = frappe.get_meta(doctype)
      let default_views: any = ['List', 'Report', 'Dashboard', 'Kanban']
      if (meta.is_calendar_and_gantt) {
        let views: any = ['Calendar', 'Gantt']
        default_views.push(...views)
      }
      if (meta.is_tree) {
        default_views.push('Tree')
      }
      if (frm.doc.image_field) {
        default_views.push('Image')
      }
      if (doctype === 'Communication' && frappe.boot.email_accounts.length) {
        default_views.push('Inbox')
      }
      if (
        (frm.doc.fields?.find((i?: any) => i.fieldname === 'latitude') &&
          frm.doc.fields?.find((i?: any) => i.fieldname === 'longitude')) ||
        frm.doc.fields?.find((i?: any) => i.fieldname === 'location' && i.fieldtype == 'Geolocation')
      ) {
        default_views.push('Map')
      }
      frm.set_df_property('default_view', 'options', default_views)
    })
  },
})
frappe.get_doc = frappe.model.get_doc
frappe.get_children = frappe.model.get_children
frappe.get_list = frappe.model.get_list
