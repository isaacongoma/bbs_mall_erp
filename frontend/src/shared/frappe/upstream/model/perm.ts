import { $, cint, cur_frm, frappe } from '@/shared/frappe/runtime'
frappe.provide('frappe.perm')
const boot_backed_rights: any = ['select', 'write', 'delete', 'submit', 'cancel']
Object.assign(window, {
  READ: 'read',
  WRITE: 'write',
  CREATE: 'create',
  DELETE: 'delete',
  SUBMIT: 'submit',
  CANCEL: 'cancel',
  AMEND: 'amend',
})
$.extend(frappe.perm, {
  rights: [
    'select',
    'read',
    'write',
    'create',
    'delete',
    'submit',
    'cancel',
    'amend',
    'report',
    'import',
    'export',
    'print',
    'email',
    'share',
  ],
  doctype_perm: {},
  get_rights: (doctype?: any) => {
    const custom_rights = (doctype && frappe.boot?.doctype_ptype_map?.[doctype]) || []
    return custom_rights.length ? [...frappe.perm.rights, ...custom_rights] : frappe.perm.rights
  },
  has_perm: (doctype?: any, permlevel: any = 0, ptype: any = 'read', doc?: any) => {
    const perms = frappe.perm.get_perm(doctype, doc)
    return !!perms?.[permlevel]?.[ptype]
  },
  get_perm: (doctype?: any, doc?: any) => {
    if (doc && !doc.__islocal) {
      return frappe.perm._get_perm(doctype, doc)
    }
    if (frappe.perm.doctype_perm[doctype]) {
      return frappe.perm.doctype_perm[doctype]
    }
    const perm = frappe.perm._get_perm(doctype)
    if (frappe.get_meta(doctype)) {
      frappe.perm.doctype_perm[doctype] = perm
    }
    return perm
  },
  _get_perm: (doctype?: any, doc?: any) => {
    const user = frappe.session.user
    let meta = frappe.get_meta(doctype)
    let perm: any = [{ read: 0, permlevel: 0, rights_without_if_owner: new Set() }]
    if (user === 'Administrator' || frappe.user_roles.includes('Administrator')) {
      perm[0].read = 1
    }
    if (!meta) {
      if (frappe.boot.user?.all_read?.includes(doctype)) {
        perm[0].read = 1
      }
      if (!doc) {
        for (const right of boot_backed_rights) {
          if (frappe.boot.user?.['can_' + right]?.includes(doctype)) {
            perm[0][right] = 1
          }
        }
        if (frappe.boot.user?.can_create?.includes(doctype) || frappe.boot.user?.in_create?.includes(doctype)) {
          perm[0].create = 1
        }
      }
      return perm
    }
    perm = frappe.perm.get_role_permissions(meta)
    const base_perm = perm[0]
    if (doc) {
      let docinfo = frappe.model.get_docinfo(doctype, doc.name)
      if (docinfo && docinfo.permissions) {
        Object.keys(docinfo.permissions).forEach((ptype?: any) => {
          base_perm[ptype] = docinfo.permissions[ptype]
        })
      }
      if (doc.owner !== user) {
        for (const right of frappe.perm.get_rights(doctype)) {
          if (base_perm[right] && !base_perm.rights_without_if_owner.has(right)) {
            base_perm[right] = 0
          }
        }
      }
      if (docinfo && docinfo.shared) {
        for (const s of docinfo.shared) {
          if (s.user !== user) continue
          for (const right of ['read', 'write', 'submit', 'share']) {
            if (!base_perm[right]) base_perm[right] = s[right]
          }
          if (s.read) {
            base_perm.email = frappe.boot.user.can_email.indexOf(doctype) !== -1 ? 1 : 0
            base_perm.print = frappe.boot.user.can_print.indexOf(doctype) !== -1 ? 1 : 0
          }
        }
      }
    }
    if (!base_perm.read && frappe.model.can_read(doctype)) {
      base_perm.read = 1
    }
    return perm
  },
  get_role_permissions: (meta?: any) => {
    let perm: any = [{ read: 0, permlevel: 0, rights_without_if_owner: new Set() }]
    const rights = frappe.perm.get_rights(meta.name)
    ;(meta.permissions || []).forEach((p?: any) => {
      const permlevel = cint(p.permlevel)
      const current_perm = (perm[permlevel] ??= { permlevel })
      if (permlevel === 0) {
        current_perm.rights_without_if_owner ??= new Set()
      }
      if (frappe.user_roles.includes(p.role)) {
        rights.forEach((right?: any) => {
          if (!p[right]) return
          current_perm[right] = 1
          if (permlevel === 0 && !p.if_owner) {
            current_perm.rights_without_if_owner.add(right)
          }
        })
      }
    })
    perm = perm.map((p?: any) => p || {})
    return perm
  },
  get_match_rules: (doctype?: any, ptype?: any) => {
    let match_rules: any = []
    if (!ptype) ptype = 'read'
    let perm = frappe.perm.get_perm(doctype)
    let user_permissions = frappe.defaults.get_user_permissions()
    if (user_permissions && !$.isEmptyObject(user_permissions)) {
      let rules: any = {}
      let fields_to_check = frappe.meta.get_fields_to_check_permissions(doctype)
      $.each(fields_to_check, (_i?: any, df?: any) => {
        const user_permissions_for_doctype = user_permissions[df.options] || []
        const allowed_records = frappe.perm.get_allowed_docs_for_doctype(user_permissions_for_doctype, doctype)
        if (allowed_records.length) {
          rules[df.label] = allowed_records
        }
      })
      if (!$.isEmptyObject(rules)) {
        match_rules.push(rules)
      }
    }
    const base_perm = perm[0]
    if (base_perm.read && !base_perm.rights_without_if_owner.has('read')) {
      match_rules.push({ Owner: frappe.session.user })
    }
    return match_rules
  },
  get_field_display_status: (df?: any, doc?: any, perm?: any, explain?: any) => {
    if (!perm && doc) {
      perm = frappe.perm.get_perm(doc.doctype, doc)
    }
    if (!perm) {
      let is_hidden = df && (cint(df.hidden) || cint(df.hidden_due_to_dependency))
      let is_read_only = df && (cint(df.read_only) || cint(df.is_virtual))
      return is_hidden ? 'None' : is_read_only ? 'Read' : 'Write'
    }
    if (!df.permlevel) df.permlevel = 0
    let p = perm[df.permlevel]
    let status = 'None'
    if (p) {
      if (p.write && !df.disabled && !df.is_virtual) {
        status = 'Write'
      } else if (p.read) {
        status = 'Read'
      }
    }
    if (explain) console.log('By Permission:' + status)
    if (cint(df.hidden)) status = 'None'
    if (explain) console.log('By Hidden:' + status)
    if (cint(df.hidden_due_to_dependency)) status = 'None'
    if (explain) console.log('By Hidden Due To Dependency:' + status)
    if (!doc) {
      return status
    }
    if (status === 'Write' && cint(doc.docstatus) > 0) status = 'Read'
    if (explain) console.log('By Submit:' + status)
    let allow_on_submit = cint(df.allow_on_submit)
    if (status === 'Read' && allow_on_submit && cint(doc.docstatus) === 1 && p.write) {
      status = 'Write'
    }
    if (explain) console.log('By Allow on Submit:' + status)
    if (status === 'Read' && cur_frm && cur_frm.state_fieldname) {
      if (
        cint(cur_frm.read_only) ||
        cur_frm.states.update_fields.includes(df.fieldname) ||
        df.fieldname == cur_frm.state_fieldname
      ) {
        status = 'Read'
      }
    }
    if (explain) console.log('By Workflow:' + status)
    if (status === 'Write' && (cint(df.read_only) || df.fieldtype === 'Read Only')) {
      status = 'Read'
    }
    if (explain) console.log('By Read Only:' + status)
    if (status === 'Write' && df.set_only_once && !doc.__islocal) {
      status = 'Read'
    }
    if (explain) console.log('By Set Only Once:' + status)
    return status
  },
  is_visible: (df?: any, doc?: any, perm?: any) => {
    if (typeof df === 'string') {
      df = frappe.meta.get_docfield(doc.doctype, df, doc.parent || doc.name)
    }
    let status = frappe.perm.get_field_display_status(df, doc, perm)
    return status === 'None' ? false : true
  },
  get_allowed_docs_for_doctype: (user_permissions?: any, doctype?: any) => {
    return frappe.perm.filter_allowed_docs_for_doctype(user_permissions, doctype, false)
  },
  filter_allowed_docs_for_doctype: (user_permissions?: any, doctype?: any, with_default_doc: any = true) => {
    const filtered_perms = (user_permissions || []).filter((perm?: any) => {
      return perm.applicable_for === doctype || !perm.applicable_for
    })
    const allowed_docs = filtered_perms.map((perm?: any) => perm.doc)
    if (with_default_doc) {
      const default_doc = filtered_perms.filter((perm?: any) => perm.is_default).map((record?: any) => record.doc)
      return {
        allowed_records: allowed_docs,
        default_doc: default_doc[0],
      }
    } else {
      return allowed_docs
    }
  },
})
