import { $, frappe, moment } from '@/shared/frappe/runtime'
frappe.provide('frappe.datetime')
frappe.defaultDateFormat = 'YYYY-MM-DD'
frappe.defaultTimeFormat = 'HH:mm:ss'
frappe.defaultDatetimeFormat = frappe.defaultDateFormat + ' ' + frappe.defaultTimeFormat
moment.defaultFormat = frappe.defaultDateFormat
frappe.provide('frappe.datetime')
$.extend(frappe.datetime, {
  convert_to_user_tz: function (date?: any, format?: any) {
    let date_obj = null
    if (frappe.boot.time_zone && frappe.boot.time_zone.system && frappe.boot.time_zone.user) {
      date_obj = moment.tz(date, frappe.boot.time_zone.system).clone().tz(frappe.boot.time_zone.user)
    } else {
      date_obj = moment(date)
    }
    return format === false ? date_obj : date_obj.format(frappe.defaultDatetimeFormat)
  },
  convert_to_system_tz: function (date?: any, format?: any) {
    let date_obj = null
    if (frappe.boot.time_zone && frappe.boot.time_zone.system && frappe.boot.time_zone.user) {
      date_obj = moment.tz(date, frappe.boot.time_zone.user).clone().tz(frappe.boot.time_zone.system)
    } else {
      date_obj = moment(date)
    }
    return format === false ? date_obj : date_obj.format(frappe.defaultDatetimeFormat)
  },
  is_system_time_zone: function () {
    if (frappe.boot.time_zone && frappe.boot.time_zone.system && frappe.boot.time_zone.user) {
      return (
        moment().tz(frappe.boot.time_zone.system).utcOffset() === moment().tz(frappe.boot.time_zone.user).utcOffset()
      )
    }
    return true
  },
  is_timezone_same: function () {
    return frappe.datetime.is_system_time_zone()
  },
  str_to_obj: function (d?: any) {
    return (moment(d, frappe.defaultDatetimeFormat) as any)._d
  },
  obj_to_str: function (d?: any) {
    return moment(d).locale('en').format()
  },
  obj_to_user: function (d?: any) {
    return moment(d).format(frappe.datetime.get_user_date_fmt().toUpperCase())
  },
  get_diff: function (d1?: any, d2?: any) {
    return moment(d1).diff(d2, 'days')
  },
  get_hour_diff: function (d1?: any, d2?: any) {
    return moment(d1).diff(d2, 'hours')
  },
  get_minute_diff: function (d1?: any, d2?: any) {
    return moment(d1).diff(d2, 'minutes')
  },
  get_day_diff: function (d1?: any, d2?: any) {
    return moment(d1).diff(d2, 'days')
  },
  add_days: function (d?: any, days?: any) {
    return moment(d).add(days, 'days').format()
  },
  add_months: function (d?: any, months?: any) {
    return moment(d).add(months, 'months').format()
  },
  week_start: function () {
    return moment().startOf('week').format()
  },
  week_end: function () {
    return moment().endOf('week').format()
  },
  month_start: function () {
    return moment().startOf('month').format()
  },
  month_end: function () {
    return moment().endOf('month').format()
  },
  quarter_start: function () {
    return moment().startOf('quarter').format()
  },
  quarter_end: function () {
    return moment().endOf('quarter').format()
  },
  year_start: function () {
    return moment().startOf('year').format()
  },
  year_end: function () {
    return moment().endOf('year').format()
  },
  get_user_time_fmt: function () {
    return (frappe.sys_defaults && frappe.sys_defaults.time_format) || 'HH:mm:ss'
  },
  get_user_date_fmt: function () {
    return (frappe.sys_defaults && frappe.sys_defaults.date_format) || 'yyyy-mm-dd'
  },
  get_user_fmt: function () {
    return (frappe.sys_defaults && frappe.sys_defaults.date_format) || 'yyyy-mm-dd'
  },
  str_to_user: function (val?: any, only_time: any = false, only_date: any = false) {
    if (!val) {
      return ''
    }
    const user_date_fmt = frappe.datetime.get_user_date_fmt().toUpperCase()
    const user_time_fmt = frappe.datetime.get_user_time_fmt()
    if (only_time) {
      let date_obj = moment(val, frappe.defaultTimeFormat)
      return date_obj.format(user_time_fmt)
    } else if (only_date || (typeof val === 'string' && val.indexOf(' ') === -1)) {
      let date_obj = moment(val, frappe.defaultDateFormat)
      return date_obj.format(user_date_fmt)
    } else {
      const system_datetime = moment.tz(val, frappe.defaultDatetimeFormat, frappe.boot.time_zone.system)
      const user_datetime = system_datetime.clone().tz(frappe.boot.time_zone.user)
      return user_datetime.format(user_date_fmt + ' ' + user_time_fmt)
    }
  },
  get_datetime_as_string: function (d?: any) {
    let time_format = frappe?.boot?.sysdefaults?.time_format || frappe.defaultTimeFormat
    let datetime_format = frappe.defaultDateFormat + ' ' + time_format
    return moment(d).format(datetime_format)
  },
  user_to_str: function (val?: any, only_time: any = false) {
    let user_time_fmt = frappe.datetime.get_user_time_fmt()
    if (only_time) {
      return moment(val, user_time_fmt).format(frappe.defaultTimeFormat)
    }
    let user_fmt = frappe.datetime.get_user_date_fmt().toUpperCase()
    let system_fmt = 'YYYY-MM-DD'
    if (val.indexOf(' ') !== -1) {
      user_fmt += ' ' + user_time_fmt
      system_fmt += ' HH:mm:ss'
    }
    return moment(val, [user_fmt.replace('YYYY', 'YY'), user_fmt])
      .locale('en')
      .format(system_fmt)
  },
  user_to_obj: function (d?: any) {
    return frappe.datetime.str_to_obj(frappe.datetime.user_to_str(d))
  },
  global_date_format: function (d?: any) {
    let m: any = moment(d)
    if (m._f && m._f.indexOf('HH') !== -1) {
      return m.format('Do MMMM YYYY, hh:mm A')
    } else {
      return m.format('Do MMMM YYYY')
    }
  },
  now_date: function (as_obj: any = false) {
    return frappe.datetime._date(frappe.defaultDateFormat, as_obj)
  },
  now_time: function (as_obj: any = false) {
    return frappe.datetime._date(frappe.defaultTimeFormat, as_obj)
  },
  now_datetime: function (as_obj: any = false) {
    return frappe.datetime._date(frappe.defaultDatetimeFormat, as_obj)
  },
  system_datetime: function (as_obj: any = false) {
    return frappe.datetime._date(frappe.defaultDatetimeFormat, as_obj, true)
  },
  _date: function (format?: any, as_obj: any = false, system_time: any = false) {
    let time_zone = frappe.boot.time_zone?.system || frappe.sys_defaults.time_zone
    if (!system_time) {
      time_zone = frappe.boot.time_zone?.user || time_zone
    }
    let date = moment.tz(time_zone)
    return as_obj ? frappe.datetime.moment_to_date_obj(date) : date.format(format)
  },
  moment_to_date_obj: function (moment_obj?: any) {
    const date_obj = new Date()
    const date_array = moment_obj.toArray()
    date_obj.setFullYear(date_array[0])
    date_obj.setMonth(date_array[1])
    date_obj.setDate(date_array[2])
    date_obj.setHours(date_array[3])
    date_obj.setMinutes(date_array[4])
    date_obj.setSeconds(date_array[5])
    date_obj.setMilliseconds(date_array[6])
    return date_obj
  },
  nowdate: function () {
    return frappe.datetime.now_date()
  },
  get_today: function () {
    return frappe.datetime.now_date()
  },
  get_time: (timestamp?: any) => {
    return moment(timestamp).format('hh:mm A')
  },
  validate: function (d?: any) {
    return moment(
      d,
      [
        frappe.defaultDateFormat,
        frappe.defaultDatetimeFormat,
        `${frappe.defaultDatetimeFormat}.SSSSSS`,
        frappe.defaultTimeFormat,
        `${frappe.defaultTimeFormat}.SSSSSS`,
        'H:mm:ss',
        'H:mm:ss.SSSSSS',
        'H:mm:s.SSSSSS',
      ],
      true,
    ).isValid()
  },
  get_first_day_of_the_week_index() {
    const first_day_of_the_week = frappe.sys_defaults.first_day_of_the_week || 'Sunday'
    return moment.weekdays().indexOf(first_day_of_the_week)
  },
})
