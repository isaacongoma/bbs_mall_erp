import { frappe } from '@/shared/frappe/runtime'
frappe.provide('frappe.utils')
function get_url_arg(name?: any) {
  return get_query_params()[name] || ''
}
function get_query_string(url?: any) {
  if (url.includes('?')) {
    return url.slice(url.indexOf('?') + 1)
  } else {
    return ''
  }
}
function get_query_params(query_string?: any) {
  let pair: any, key: any, value: any
  let query_params: any = {}
  if (!query_string) {
    query_string = location.search.substring(1)
  }
  let query_list = query_string.split('&')
  for (let i = 0, l = query_list.length; i < l; i++) {
    pair = query_list[i].split(/=(.+)/)
    key = pair[0]
    if (!key) {
      continue
    }
    value = pair[1]
    if (typeof value === 'string') {
      value = value.replace(/\+/g, '%20')
      try {
        value = decodeURIComponent(value)
      } catch (e: any) {}
    }
    if (key in query_params) {
      if (typeof query_params[key] === 'undefined') {
        query_params[key] = []
      } else if (typeof query_params[key] === 'string') {
        query_params[key] = [query_params[key]]
      }
      query_params[key].push(value)
    } else {
      query_params[key] = value
    }
  }
  return query_params
}
function make_query_string(obj?: any, encode: any = true) {
  let query_params: any = []
  for (let key in obj) {
    let value = obj[key]
    if (value === undefined || value === '' || value === null) {
      continue
    }
    if (typeof value === 'object') {
      value = JSON.stringify(value)
    }
    if (encode) {
      key = encodeURIComponent(key)
      value = encodeURIComponent(value)
    }
    query_params.push(`${key}=${value}`)
  }
  return '?' + query_params.join('&')
}
Object.assign(frappe.utils, {
  get_url_arg,
  get_query_string,
  get_query_params,
  make_query_string,
})
