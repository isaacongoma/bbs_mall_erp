import { frappe } from '@/shared/frappe/runtime'
frappe.db = {
  get_list: function (doctype?: any, args?: any) {
    if (!args) {
      args = {}
    }
    args.doctype = doctype
    if (!args.fields) {
      args.fields = ['name']
    }
    if (!('limit' in args)) {
      args.limit = 20
    }
    return new Promise((resolve?: any) => {
      frappe.call({
        method: 'frappe.desk.reportview.get_list',
        args: args,
        type: 'GET',
        callback: function (r?: any) {
          resolve(r.message)
        },
      })
    })
  },
  exists: function (doctype?: any, nameOrFilters?: any) {
    return new Promise((resolve?: any) => {
      if (typeof nameOrFilters === 'string') {
        frappe.db.get_value(doctype, { name: nameOrFilters }, 'name').then((r?: any) => {
          r.message && r.message.name ? resolve(true) : resolve(false)
        })
      } else if (typeof nameOrFilters === 'object') {
        frappe.db.count(doctype, { filters: nameOrFilters, limit: 1 }).then((count?: any) => {
          resolve(count > 0)
        })
      }
    })
  },
  get_value: function (doctype?: any, filters?: any, fieldname?: any, callback?: any, parent_doc?: any) {
    return frappe.call({
      method: 'frappe.client.get_value',
      type: 'GET',
      args: {
        doctype: doctype,
        fieldname: fieldname,
        filters: filters,
        parent: parent_doc,
      },
      callback: function (r?: any) {
        callback && callback(r.message)
      },
    })
  },
  get_single_value: (doctype?: any, field?: any) => {
    return new Promise((resolve?: any) => {
      frappe
        .call({
          method: 'frappe.client.get_single_value',
          args: { doctype, field },
          type: 'GET',
        })
        .then((r?: any) => resolve(r ? r.message : null))
    })
  },
  set_value: function (doctype?: any, docname?: any, fieldname?: any, value?: any, callback?: any) {
    return frappe.call({
      method: 'frappe.client.set_value',
      args: {
        doctype: doctype,
        name: docname,
        fieldname: fieldname,
        value: value,
      },
      callback: function (r?: any) {
        callback && callback(r.message)
      },
    })
  },
  get_doc: function (doctype?: any, name?: any, filters?: any) {
    return new Promise((resolve?: any, reject?: any) => {
      frappe
        .call({
          method: 'frappe.client.get',
          type: 'GET',
          args: { doctype, name, filters },
          callback: (r?: any) => {
            frappe.model.sync(r.message)
            resolve(r.message)
          },
        })
        .fail(reject)
    })
  },
  insert: function (doc?: any) {
    return frappe.xcall('frappe.client.insert', { doc })
  },
  delete_doc: function (doctype?: any, name?: any) {
    return new Promise((resolve?: any) => {
      frappe.call('frappe.client.delete', { doctype, name }, (r?: any) => {
        if (!r.exc) {
          frappe.model.delete_from_locals(doctype, name)
        }
        resolve(r.message)
      })
    })
  },
  count: function (doctype?: any, args: any = {}, cache: any = false) {
    let filters = args.filters || {}
    let limit = args.limit
    const distinct =
      Array.isArray(filters) &&
      filters.some((filter?: any) => {
        return filter[0] !== doctype
      })
    const fields: any = []
    return frappe.xcall(
      'frappe.desk.reportview.get_count',
      {
        doctype,
        filters,
        fields,
        distinct,
        limit,
      },
      cache ? 'GET' : 'POST',
      { cache },
    )
  },
  get_link_options(doctype?: any, txt: any = '', filters: any = {}, page_length: any = 0) {
    return new Promise((resolve?: any) => {
      frappe.call({
        type: 'GET',
        method: 'frappe.desk.search.search_link',
        args: {
          doctype,
          txt,
          filters,
          page_length,
        },
        callback(r?: any) {
          resolve(r.message)
        },
      })
    })
  },
}
