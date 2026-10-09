import { cint, cstr, frappe } from '@/shared/frappe/runtime'
window.cstr = function (s?: any) {
  if (s == null) return ''
  return s + ''
}
window.cint = function (v?: any, def?: any) {
  if (v === true) return 1
  if (v === false) return 0
  v = v + ''
  if (v !== '0') v = lstrip(v, ['0'])
  v = parseInt(String(v))
  if (isNaN(v)) v = def === undefined ? 0 : def
  return v
}
window.toTitle = function (str?: any) {
  let word_in = str.split(' ')
  let word_out: any = []
  for (let w in word_in) {
    word_out[w] = word_in[w].charAt(0).toUpperCase() + word_in[w].slice(1)
  }
  return word_out.join(' ')
}
window.is_null = function (v?: any) {
  if (v === null || v === undefined || cstr(v).trim() === '') return true
}
window.copy_dict = function (d?: any) {
  let n: any = {}
  for (let k in d) n[k] = d[k]
  return n
}
window.validate_email = function (txt?: any) {
  return frappe.utils.validate_type(txt, 'email')
}
window.validate_phone = function (txt?: any) {
  return frappe.utils.validate_type(txt, 'phone')
}
window.validate_name = function (txt?: any) {
  return frappe.utils.validate_type(txt, 'name')
}
window.validate_url = function (txt?: any) {
  return frappe.utils.validate_type(txt, 'url')
}
window.nth = function (number?: any) {
  number = cint(number)
  let s = 'th'
  if ((number + '').substr(-1) == '1') s = 'st'
  if ((number + '').substr(-1) == '2') s = 'nd'
  if ((number + '').substr(-1) == '3') s = 'rd'
  return number + s
}
window.has_words = function (list?: any, item?: any) {
  if (!item) return true
  if (!list) return false
  for (let i = 0, j = list.length; i < j; i++) {
    if (item.indexOf(list[i]) != -1) return true
  }
  return false
}
window.has_common = function (list1?: any, list2?: any) {
  if (!list1 || !list2) return false
  for (let i = 0, j = list1.length; i < j; i++) {
    if (list2.includes(list1[i])) return true
  }
  return false
}
