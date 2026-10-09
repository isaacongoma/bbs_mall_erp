import { $, cint, frappe, locals } from '@/shared/frappe/runtime'
Object.assign(frappe.model, {
  docinfo: {},
  sync: function (r?: any) {
    let d: any
    let isPlain: any
    if (!r.docs && !r.docinfo) r = { docs: r }
    isPlain = $.isPlainObject(r.docs)
    if (isPlain) r.docs = [r.docs]
    if (r.docs) {
      for (let i = 0, l = r.docs.length; i < l; i++) {
        d = r.docs[i]
        if (locals[d.doctype] && locals[d.doctype][d.name]) {
          frappe.model.update_in_locals(d)
        } else {
          frappe.model.add_to_locals(d)
        }
        d.__last_sync_on = new Date()
        if (d.doctype === 'DocType') {
          frappe.meta.sync(d)
        }
        if (d.doctype === 'Print Format') {
          frappe.model.sync_print_format_for_meta(d)
        }
        if (d.localname) {
          frappe.model.rename_after_save(d, i)
        }
      }
    }
    frappe.model.sync_docinfo(r)
    return r.docs
  },
  sync_print_format_for_meta: function (doc?: any) {
    if (!locals[':Print Format']) locals[':Print Format'] = {}
    if (doc.docstatus < 2 && !cint(doc.disabled)) {
      locals[':Print Format'][doc.name] = {
        ...doc,
        doctype: ':Print Format',
      }
    } else {
      delete locals[':Print Format'][doc.name]
    }
  },
  rename_after_save: (d?: any, i?: any) => {
    frappe.model.new_names[d.localname] = d.name
    frappe.model.rename_doc_in_locals(d.doctype, d.localname, d.name)
    $(document).trigger('rename', [d.doctype, d.localname, d.name])
    if (i === 0) {
      frappe.model.docinfo[d.doctype][d.name] = frappe.model.docinfo[d.doctype][d.localname]
      frappe.model.docinfo[d.doctype][d.localname] = undefined
    }
  },
  delete_from_locals: (doctype?: any, name?: any) => {
    frappe.model.clear_doc(doctype, name)
    if (locals[':' + doctype]) {
      delete locals[':' + doctype][name]
    }
  },
  rename_doc_in_locals: (doctype?: any, old_name?: any, new_name?: any, merge: any = false) => {
    if (old_name === new_name) {
      return
    }
    if (locals[doctype]) {
      delete locals[doctype][old_name]
    }
    const meta_doctype = ':' + doctype
    const doc = locals[meta_doctype]?.[old_name]
    if (!doc) {
      return
    }
    if (!merge) {
      doc.name = new_name
      doc.doctype = meta_doctype
      locals[meta_doctype][new_name] = doc
    }
    delete locals[meta_doctype][old_name]
  },
  sync_docinfo: (r?: any) => {
    if (r.docinfo) {
      const { doctype, name } = r.docinfo
      if (!frappe.model.docinfo[doctype]) {
        frappe.model.docinfo[doctype] = {}
      }
      frappe.model.docinfo[doctype][name] = r.docinfo
      Object.assign(frappe.boot.user_info, r.docinfo.user_info)
    }
    return r.docs
  },
  add_to_locals: function (doc?: any) {
    let value: any, d: any
    if (!locals[doc.doctype]) locals[doc.doctype] = {}
    if (!doc.name && doc.__islocal) {
      if (!doc.parentfield) frappe.model.clear_doc(doc)
      doc.name = frappe.model.get_new_name(doc.doctype)
      if (!doc.parentfield) frappe.provide('frappe.model.docinfo.' + doc.doctype + '.' + doc.name)
    }
    locals[doc.doctype][doc.name] = doc
    let meta = frappe.get_meta(doc.doctype)
    let is_table = meta ? meta.istable : doc.parentfield
    if (!is_table) {
      for (let i in doc) {
        if (i.startsWith('__')) continue
        value = doc[i]
        if ($.isArray(value)) {
          for (let x = 0, y = value.length; x < y; x++) {
            d = value[x]
            if (typeof d == 'object' && !d.parent) d.parent = doc.name
            frappe.model.add_to_locals(d)
          }
        }
      }
    }
  },
  update_in_locals: function (updated_doc?: any) {
    let local_parent_doc = locals[updated_doc.doctype][updated_doc.name]
    let clear_keys = function (source?: any, target?: any) {
      Object.keys(target).map((key?: any) => {
        if (source[key] == undefined) delete target[key]
      })
    }
    for (let fieldname in updated_doc) {
      let df = frappe.meta.get_field(updated_doc.doctype, fieldname)
      if (df && frappe.model.table_fields.includes(df.fieldtype)) {
        if (!(updated_doc[fieldname] instanceof Array)) {
          updated_doc[fieldname] = []
        }
        if (!(local_parent_doc[fieldname] instanceof Array)) {
          local_parent_doc[fieldname] = []
        }
        const incoming_names = new Set(updated_doc[fieldname].map((d?: any) => d.name))
        for (let i = 0; i < updated_doc[fieldname].length; i++) {
          let updated_child_doc = updated_doc[fieldname][i]
          let local_child_doc_in_parent = local_parent_doc[fieldname][i]
          const local_child_doc = locals[updated_child_doc.doctype]
            ? locals[updated_child_doc.doctype][updated_child_doc.name]
            : null
          if (local_child_doc) {
            Object.assign(local_child_doc, updated_child_doc)
            clear_keys(updated_child_doc, local_child_doc)
            if (local_child_doc_in_parent !== local_child_doc) {
              local_parent_doc[fieldname][i] = local_child_doc
            }
            continue
          }
          if (local_child_doc_in_parent && !incoming_names.has(local_child_doc_in_parent.name)) {
            if (!locals[updated_child_doc.doctype]) locals[updated_child_doc.doctype] = {}
            if (!updated_child_doc.name) {
              updated_child_doc.name = frappe.model.get_new_name(updated_doc.doctype)
            }
            if (!locals[updated_child_doc.doctype][updated_child_doc.name]) {
              const old_name = local_child_doc_in_parent.name
              delete locals[updated_child_doc.doctype][old_name]
              locals[updated_child_doc.doctype][updated_child_doc.name] = local_child_doc_in_parent
              const dc = frappe.meta.docfield_copy[updated_child_doc.doctype]
              if (dc?.[old_name]) {
                dc[updated_child_doc.name] = dc[old_name]
                delete dc[old_name]
              }
            }
            Object.assign(local_child_doc_in_parent, updated_child_doc)
            clear_keys(updated_child_doc, local_child_doc_in_parent)
          } else {
            local_parent_doc[fieldname][i] = updated_child_doc
            if (!updated_child_doc.parent) updated_child_doc.parent = updated_doc.name
            frappe.model.add_to_locals(updated_child_doc)
          }
        }
        if (local_parent_doc[fieldname].length > updated_doc[fieldname].length) {
          for (let i = updated_doc[fieldname].length; i < local_parent_doc[fieldname].length; i++) {
            let d = local_parent_doc[fieldname][i]
            if (locals[d.doctype] && locals[d.doctype][d.name]) {
              delete locals[d.doctype][d.name]
            }
          }
          local_parent_doc[fieldname].length = updated_doc[fieldname].length
        }
      } else {
        local_parent_doc[fieldname] = updated_doc[fieldname]
      }
    }
    if ((local_parent_doc?.on_paste_event || updated_doc.__islocal) && local_parent_doc?.__newname) {
      updated_doc.__newname = local_parent_doc.__newname
    }
    clear_keys(updated_doc, local_parent_doc)
  },
})
