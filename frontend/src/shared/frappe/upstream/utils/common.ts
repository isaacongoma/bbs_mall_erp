import { $, __, cint, cstr, frappe } from '@/shared/frappe/runtime'
import md5 from 'md5'
frappe.avatar = function (
  user?: any,
  css_class?: any,
  title?: any,
  image_url: any = null,
  remove_color: any = false,
  filterable: any = false,
) {
  let user_info: any
  if (user) {
    user_info = frappe.user_info(user)
  } else {
    let full_name = title || frappe.get_cookie('full_name')
    user_info = {
      image: image_url === null ? frappe.get_cookie('user_image') : image_url,
      fullname: full_name,
      abbr: frappe.get_abbr(full_name),
      color: frappe.get_palette(full_name),
    }
  }
  if (!title) {
    title = user_info.fullname
  }
  let data_attr = ''
  if (filterable) {
    css_class += ' filterable'
    data_attr = `data-filter="_assign,like,%${user}%"`
  }
  return frappe.get_avatar(css_class, title, image_url || user_info.image, remove_color, data_attr)
}
frappe.get_avatar = function (
  css_class?: any,
  title?: any,
  image_url: any = null,
  remove_color?: any,
  data_attributes?: any,
) {
  if (!css_class) {
    css_class = 'avatar-small'
  }
  let el = document.createElement('div')
  if (image_url) {
    el.innerHTML = `
			<span class="avatar ${css_class}" ${data_attributes}>
				<span class="avatar-frame" style='background-image: url("${frappe.utils.escape_html(image_url)}")'</span>
			</span>`
  } else {
    let abbr = frappe.get_abbr(title)
    let style = ''
    if (!remove_color) {
      let color = frappe.get_palette(title)
      style = `background-color: var(${color[0]}); color: var(${color[1]})`
    }
    if (css_class === 'avatar-small' || css_class == 'avatar-xs') {
      abbr = abbr.substr(0, 1)
    }
    el.innerHTML = `<span class="avatar ${css_class}" ${data_attributes}>
			<div class="avatar-frame standard-image"
				style="${style}">
					${abbr}
			</div>
		</span>`
  }
  el.querySelector('.avatar')?.setAttribute('title', title)
  el.querySelector('.avatar-frame')?.setAttribute('title', title)
  return el.innerHTML
}
frappe.avatar_group = function (users?: any, limit: any = 4, options: any = {}) {
  let avatar_action_html = ''
  const display_users = users.slice(0, limit)
  const extra_users = users.slice(limit)
  const css_class = options.css_class || ''
  let html = display_users
    .map((user?: any) => frappe.avatar(user, 'avatar-small ' + css_class, null, null, false, options.filterable))
    .join('')
  if (extra_users.length === 1) {
    html += frappe.avatar(extra_users[0], 'avatar-small ' + css_class, null, null, false, options.filterable)
  } else if (extra_users.length > 1) {
    html = `
			${html}
			<span class="avatar avatar-small ${css_class}">
				<div class="avatar-frame standard-image avatar-extra-count"
					title="${extra_users.map((u?: any) => frappe.user_info(u).fullname).join(', ')}">
					+${extra_users.length}
				</div>
			</span>
		`
  }
  if (options.action_icon) {
    avatar_action_html = `
			<span class="avatar avatar-small">
				<div class="avatar-frame avatar-action">
					${frappe.utils.icon(options.action_icon, 'sm')}
				</div>
			</span>
		`
  }
  const $avatar_group =
    $(`<div class="avatar-group ${options.align || 'right'} ${options.overlap != false ? 'overlap' : ''}">
			${html}
			${avatar_action_html}
		</div>`)
  $avatar_group.find('.avatar-action').on('click', options.action)
  return $avatar_group
}
frappe.ui.scroll = function (element?: any, animate?: any, additional_offset?: any) {
  let header_offset = $('.navbar').height() + $('.page-head').height()
  let top = $(element).offset().top - header_offset - cint(additional_offset)
  if (animate) {
    $('html, body').animate({ scrollTop: top })
  } else {
    $(window).scrollTop(top)
  }
}
frappe.palette = [
  ['--orange-avatar-bg', '--orange-avatar-color'],
  ['--pink-avatar-bg', '--pink-avatar-color'],
  ['--blue-avatar-bg', '--blue-avatar-color'],
  ['--green-avatar-bg', '--green-avatar-color'],
  ['--dark-green-avatar-bg', '--dark-green-avatar-color'],
  ['--red-avatar-bg', '--red-avatar-color'],
  ['--yellow-avatar-bg', '--yellow-avatar-color'],
  ['--purple-avatar-bg', '--purple-avatar-color'],
  ['--gray-avatar-bg', '--gray-avatar-color'],
]
function process_palette() {
  frappe.palette.forEach((color?: any, index?: any) => {
    let color_name = color[0].split('-')[2]
    frappe.palette_map[color_name] = index
  })
}
frappe.palette_map = {}
process_palette()
frappe.get_palette = function (txt?: any) {
  if (!txt) return frappe.palette[8]
  let idx = cint((parseInt(String(md5(txt).substr(4, 2)), 16) + 1) / 5.33)
  return frappe.palette[idx % 8]
}
frappe.get_abbr = function (txt?: any, max_length?: any) {
  if (!txt) return ''
  let abbr = ''
  $.each(txt.split(' '), function (_i?: any, w?: any) {
    if (abbr.length >= (max_length || 2)) {
      return false
    } else if (!w.trim().length) {
      return true
    }
    abbr += w.trim()[0]
  })
  return abbr || '?'
}
window.repl = function repl(s?: any, dict?: any) {
  if (s == null) return ''
  for (let key in dict) {
    s = s.split('%(' + key + ')s').join(dict[key])
  }
  return s
}
window.replace_all = function (s?: any, t1?: any, t2?: any) {
  return s.split(t1).join(t2)
}
window.strip_html = function (txt?: any) {
  return cstr(txt).replace(/<[^>]*>/g, '')
}
window.strip = function (s?: any, chars?: any) {
  if (s) {
    s = lstrip(s, chars)
    s = rstrip(s, chars)
    return s
  }
}
window.lstrip = function lstrip(s?: any, chars?: any) {
  if (!chars) chars = ['\n', '\t', ' ']
  let first_char = s.substr(0, 1)
  while (chars.includes(first_char)) {
    s = s.substr(1)
    first_char = s.substr(0, 1)
  }
  return s
}
window.rstrip = function (s?: any, chars?: any) {
  if (!chars) chars = ['\n', '\t', ' ']
  let last_char = s.substr(s.length - 1)
  while (chars.includes(last_char)) {
    s = s.substr(0, s.length - 1)
    last_char = s.substr(s.length - 1)
  }
  return s
}
frappe.get_cookie = function getCookie(name?: any) {
  return frappe.get_cookies()[name]
}
frappe.get_cookies = function getCookies() {
  let c = document.cookie,
    v = 0,
    cookies: any = {}
  if (document.cookie.match(/^\s*\$Version=(?:"1"|1);\s*(.*)/)) {
    c = RegExp.$1
    v = 1
  }
  if (v === 0) {
    c.split(/[,;]/).map(function (cookie?: any) {
      let parts = cookie.split(/=/, 2),
        name = decodeURIComponent(parts[0].trimLeft()),
        value = parts.length > 1 ? decodeURIComponent(parts[1].trimRight()) : null
      if (value && value.charAt(0) === '"') {
        value = value.substr(1, value.length - 2)
      }
      cookies[name] = value
    })
  } else {
    c.match(
      /(?:^|\s+)([!#$%&'*+\-.0-9A-Z^`a-z|~]+)=([!#$%&'*+\-.0-9A-Z^`a-z|~]*|"(?:[\x20-\x7E\x80\xFF]|\\[\x00-\x7F])*")(?=\s*[,;]|$)/g,
    )?.map(function ($0?: any, $1?: any) {
      let name = $0,
        value = $1.charAt(0) === '"' ? $1.substr(1, -1).replace(/\\(.)/g, '$1') : $1
      cookies[name] = value
    })
  }
  return cookies
}
let _is_mobile_cache: any = null
$(window).on('resize', () => {
  _is_mobile_cache = null
})
frappe.is_mobile = function () {
  if (_is_mobile_cache === null) {
    _is_mobile_cache = window.innerWidth < 768
  }
  return _is_mobile_cache
}
frappe.is_large_screen = function () {
  return window.innerHeight > 1180
}
frappe.utils.xss_sanitise = function (string?: any, options?: any) {
  let sanitised = string
  const DEFAULT_OPTIONS: any = {
    strategies: ['html', 'js'],
  }
  const HTML_ESCAPE_MAP: any = {
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  const REGEX_SCRIPT = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
  const REGEX_ALERT = /confirm\(.*\)|alert\(.*\)|prompt\(.*\)/gi
  options = Object.assign({}, DEFAULT_OPTIONS, options)
  if (options.strategies.includes('js')) {
    sanitised = sanitised.replace(REGEX_SCRIPT, '')
    sanitised = sanitised.replace(REGEX_ALERT, '')
  }
  if (options.strategies.includes('html')) {
    for (let char in HTML_ESCAPE_MAP) {
      const escape = HTML_ESCAPE_MAP[char]
      const regex = new RegExp(char, 'g')
      sanitised = sanitised.replace(regex, escape)
    }
  }
  return sanitised
}
frappe.utils.sanitise_redirect = (url?: any) => {
  if (!url) return url
  let target: any
  try {
    target = new URL(url, location.href)
  } catch (e: any) {
    return ''
  }
  if (target.origin !== location.origin) return ''
  const was_protocol_relative = url.startsWith('//')
  const was_absolute = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(url)
  if (was_protocol_relative) return target.href.slice(target.protocol.length)
  return was_absolute ? target.href : target.pathname + target.search + target.hash
}
frappe.utils.strip_url = (url?: any) => {
  return url.replace(/^[^A-Za-z0-9(//)#]+/g, '')
}
frappe.utils.new_auto_repeat_prompt = function (frm?: any) {
  const fields: any = [
    {
      fieldname: 'frequency',
      fieldtype: 'Select',
      label: __('Frequency'),
      reqd: 1,
      options: [
        { label: __('Daily'), value: 'Daily' },
        { label: __('Weekly'), value: 'Weekly' },
        { label: __('Monthly'), value: 'Monthly' },
        { label: __('Quarterly'), value: 'Quarterly' },
        { label: __('Half-yearly'), value: 'Half-yearly' },
        { label: __('Yearly'), value: 'Yearly' },
      ],
    },
    {
      fieldname: 'start_date',
      fieldtype: 'Date',
      label: __('Start Date'),
      reqd: 1,
      default: frappe.datetime.nowdate(),
    },
    {
      fieldname: 'end_date',
      fieldtype: 'Date',
      label: __('End Date'),
    },
  ]
  frappe.prompt(
    fields,
    function (values?: any) {
      frappe.call({
        method: 'frappe.automation.doctype.auto_repeat.auto_repeat.make_auto_repeat',
        args: {
          doctype: frm.doc.doctype,
          docname: frm.doc.name,
          frequency: values['frequency'],
          start_date: values['start_date'],
          end_date: values['end_date'],
        },
        callback: function (r?: any) {
          if (r.message) {
            frappe.show_alert({
              message: __('Auto Repeat created for this document'),
              indicator: 'green',
            })
            frm.reload_doc()
          }
        },
      })
    },
    __('Auto Repeat'),
    __('Save'),
  )
}
frappe.utils.get_page_view_count = function (route?: any) {
  return frappe.call('frappe.website.doctype.web_page_view.web_page_view.get_page_view_count', {
    path: route,
  })
}
