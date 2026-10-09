import { __, cint, cur_frm, format_number, frappe } from '@/shared/frappe/runtime'
import './datatype'
if (!window.frappe) window.frappe = {}
function flt(v?: any, decimals?: any, number_format?: any, rounding_method?: any) {
  let parts: any
  if (v == null || v == '') return 0
  if (typeof v !== 'number') {
    v = v + ''
    if (v.indexOf(' ') != -1) {
      parts = v.split(' ')
      v = isNaN(parseFloat(parts[0])) ? parts.slice(parts.length - 1).join(' ') : v
    }
    v = strip_number_groups(v, number_format)
    v = parseFloat(v)
    if (isNaN(v)) v = 0
  }
  if (decimals != null) return _round(v, decimals, rounding_method)
  return v
}
function strip_number_groups(v?: any, number_format?: any) {
  let decimal_regex: any
  if (!number_format) number_format = get_number_format()
  let info = get_number_format_info(number_format)
  let group_regex = new RegExp(info.group_sep === '.' ? '\\.' : info.group_sep, 'g')
  v = v.replace(group_regex, '')
  if (info.decimal_str !== '.' && info.decimal_str !== '') {
    decimal_regex = new RegExp(info.decimal_str, 'g')
    v = v.replace(decimal_regex, '.')
  }
  return v
}
function convert_old_to_new_number_format(v?: any, old_number_format?: any, new_number_format?: any) {
  if (!new_number_format) new_number_format = get_number_format()
  let new_info = get_number_format_info(new_number_format)
  if (!old_number_format) old_number_format = '#,###.##'
  let old_info = get_number_format_info(old_number_format)
  if (old_number_format === new_number_format) return v
  if (new_info.decimal_str == '') {
    return strip_number_groups(v)
  }
  let v_parts = v.split(old_info.decimal_str)
  let v_before_decimal = v_parts[0]
  let v_after_decimal = v_parts[1] || ''
  let old_group_regex = new RegExp(old_info.group_sep === '.' ? '\\.' : old_info.group_sep, 'g')
  v_before_decimal = v_before_decimal.replace(old_group_regex, new_info.group_sep)
  v = v_before_decimal
  if (v_after_decimal) {
    v = v + new_info.decimal_str + v_after_decimal
  }
  return v
}
frappe.number_format_info = {
  '#,###.##': { decimal_str: '.', group_sep: ',' },
  '#.###,##': { decimal_str: ',', group_sep: '.' },
  '# ###.##': { decimal_str: '.', group_sep: ' ' },
  '# ###,##': { decimal_str: ',', group_sep: ' ' },
  "#'###.##": { decimal_str: '.', group_sep: "'" },
  '#, ###.##': { decimal_str: '.', group_sep: ', ' },
  '#,##,###.##': { decimal_str: '.', group_sep: ',' },
  '#,###.###': { decimal_str: '.', group_sep: ',' },
  '#.###': { decimal_str: '', group_sep: '.' },
  '#,###': { decimal_str: '', group_sep: ',' },
}
window.format_number = function (v?: any, format?: any, decimals?: any) {
  let integer: any, str: any, l: any
  if (!format) {
    format = get_number_format()
    if (decimals == null) decimals = cint(frappe.defaults.get_default('float_precision')) || 3
  }
  let info = get_number_format_info(format)
  if (decimals == null) decimals = info.precision
  v = flt(v, decimals, format)
  let is_negative = false
  if (v < 0) is_negative = true
  v = Math.abs(v)
  v = v.toFixed(decimals)
  let part = v.split('.')
  let group_position = info.group_sep ? 3 : 0
  if (group_position) {
    integer = part[0]
    str = ''
    for (let i = integer.length; i >= 0; i--) {
      l = replace_all(str, info.group_sep, '').length
      if (format == '#,##,###.##' && str.indexOf(',') != -1) {
        group_position = 2
        l += 1
      }
      str += integer.charAt(i)
      if (l && !((l + 1) % group_position) && i != 0) {
        str += info.group_sep
      }
    }
    part[0] = str.split('').reverse().join('')
  }
  if (part[0] + '' == '') {
    part[0] = '0'
  }
  part[1] = part[1] && info.decimal_str ? info.decimal_str + part[1] : ''
  return (is_negative ? '-' : '') + part[0] + part[1]
}
function format_currency(v?: any, currency?: any, decimals?: any) {
  const format = get_number_format(currency)
  const symbol = get_currency_symbol(currency)
  const show_symbol_on_right = frappe.model.get_value(':Currency', currency, 'symbol_on_right') ?? false
  if (decimals === undefined) {
    decimals = frappe.boot.sysdefaults.currency_precision || null
  }
  if (symbol) {
    if (show_symbol_on_right) {
      return format_number(v, format, decimals) + ' ' + __(symbol)
    }
    return __(symbol) + ' ' + format_number(v, format, decimals)
  }
  return format_number(v, format, decimals)
}
function get_currency_symbol(currency?: any) {
  if (frappe.boot) {
    if (frappe.boot.sysdefaults && ['1', 'Yes'].includes(frappe.boot.sysdefaults.hide_currency_symbol)) return null
    if (!currency) currency = frappe.boot.sysdefaults.currency
    return frappe.model.get_value(':Currency', currency, 'symbol') || currency
  } else {
    return frappe.currency_symbols[currency]
  }
}
function get_number_format(currency?: any) {
  let sysdefaults = frappe?.boot?.sysdefaults
  return (
    (frappe.defaults.is_enabled('use_number_format_from_currency') &&
      currency &&
      frappe.model.get_value(':Currency', currency, 'number_format')) ||
    sysdefaults.number_format ||
    '#,###.##'
  )
}
function get_number_format_info(format?: any) {
  if (!format) format = get_number_format()
  let info = frappe.number_format_info[format]
  if (!info) {
    info = { decimal_str: '.', group_sep: ',' }
  }
  info.precision = info.decimal_str == '' ? 0 : format.split(info.decimal_str).slice(1)[0].length
  return info
}
function _round(num?: any, precision?: any, rounding_method?: any) {
  let d: any, m: any, n: any, i: any, f: any, r: any
  rounding_method = rounding_method || frappe.boot.sysdefaults.rounding_method || "Banker's Rounding (legacy)"
  let is_negative = num < 0 ? true : false
  if (rounding_method == "Banker's Rounding (legacy)") {
    d = cint(precision)
    m = Math.pow(10, d)
    n = +(d ? Math.abs(num) * m : Math.abs(num)).toFixed(8)
    ;((i = Math.floor(n)), (f = n - i))
    r = !precision && f == 0.5 ? (i % 2 == 0 ? i : i + 1) : Math.round(n)
    r = d ? r / m : r
    return is_negative ? -r : r
  } else if (rounding_method == "Banker's Rounding") {
    if (num == 0) return 0.0
    precision = cint(precision)
    let multiplier = Math.pow(10, precision)
    num = Math.abs(num) * multiplier
    let floor_num = Math.floor(num)
    let decimal_part = num - floor_num
    let epsilon = 2.0 ** (Math.log2(Math.abs(num)) - 52.0)
    let is_tie = epsilon < 0.5 ? Math.abs(decimal_part - 0.5) < epsilon : decimal_part == 0.5
    if (is_tie) {
      num = floor_num % 2 == 0 ? floor_num : floor_num + 1
    } else {
      num = Math.round(num)
    }
    num = num / multiplier
    return is_negative ? -num : num
  } else if (rounding_method == 'Commercial Rounding') {
    if (num == 0) return 0.0
    let digits = cint(precision)
    let multiplier = Math.pow(10, digits)
    num = num * multiplier
    let epsilon = 2.0 ** (Math.log2(Math.abs(num)) - 52.0)
    if (epsilon >= 0.25) {
      epsilon = 0
    }
    num = Math.sign(num) * Math.round(Math.abs(num) + epsilon)
    return num / multiplier
  } else {
    throw new Error(`Unknown rounding method ${rounding_method}`)
  }
}
function roundNumber(num?: any, precision?: any) {
  return _round(num, precision)
}
function precision(fieldname?: any, doc?: any) {
  let df: any
  if (cur_frm) {
    if (!doc) doc = cur_frm.doc
    df = frappe.meta.get_docfield(doc.doctype, fieldname, doc.parent || doc.name)
    if (!df) console.log(fieldname + ': could not find docfield in method precision()')
    return frappe.meta.get_field_precision(df, doc)
  } else {
    return frappe.boot.sysdefaults.float_precision
  }
}
function in_list(list?: any, item?: any) {
  return list.includes(item)
}
function remainder(numerator?: any, denominator?: any, precision?: any) {
  precision = cint(precision)
  let multiplier = Math.pow(10, precision)
  let _remainder: any
  if (precision) {
    _remainder = ((numerator * multiplier) % (denominator * multiplier)) / multiplier
  } else {
    _remainder = numerator % denominator
  }
  return flt(_remainder, precision)
}
function round_based_on_smallest_currency_fraction(value?: any, currency?: any, precision?: any) {
  let remainder_val: any
  let smallest_currency_fraction_value = flt(
    frappe.model.get_value(':Currency', currency, 'smallest_currency_fraction_value'),
  )
  if (smallest_currency_fraction_value) {
    remainder_val = remainder(value, smallest_currency_fraction_value, precision)
    if (remainder_val > smallest_currency_fraction_value / 2) {
      value += smallest_currency_fraction_value - remainder_val
    } else {
      value -= remainder_val
    }
  } else {
    value = _round(value)
  }
  return value
}
function fmt_money(v?: any, format?: any) {
  return format_currency(v, format)
}
Object.assign(window, {
  flt,
  cint,
  strip_number_groups,
  convert_old_to_new_number_format,
  format_currency,
  fmt_money,
  get_currency_symbol,
  get_number_format,
  get_number_format_info,
  _round,
  roundNumber,
  precision,
  remainder,
  round_based_on_smallest_currency_fraction,
  in_list,
})
