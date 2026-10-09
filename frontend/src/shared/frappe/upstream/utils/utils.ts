import { $, __, cint, cstr, flt, frappe, is_null } from '@/shared/frappe/runtime'
import deep_equal from 'fast-deep-equal'
import number_systems from './number_systems'
frappe.provide('frappe.utils')
const eval_function_cache = new Map()
if (!Array.prototype.uniqBy) {
  Object.defineProperty(Array.prototype, 'uniqBy', {
    value: function (this: any, key?: any) {
      let seen: any = {}
      return this.filter(function (item?: any) {
        let k = key(item)
        return k in seen ? false : (seen[k] = true)
      })
    },
  })
  Object.defineProperty(Array.prototype, 'move', {
    value: function (this: any, from?: any, to?: any) {
      this.splice(to, 0, this.splice(from, 1)[0])
    },
  })
}
Object.defineProperty(Object.prototype, 'setDefault', {
  value: function (this: any, key?: any, default_value?: any) {
    if (!(key in this)) this[key] = default_value
    return this[key]
  },
  writable: true,
})
String.prototype.plural = function (this: any, revert?: any) {
  const plural: any = {
    '(quiz)$': '$1zes',
    '^(ox)$': '$1en',
    '([m|l])ouse$': '$1ice',
    '(matr|vert|ind)ix|ex$': '$1ices',
    '(x|ch|ss|sh)$': '$1es',
    '([^aeiouy]|qu)y$': '$1ies',
    '(hive)$': '$1s',
    '(?:([^f])fe|([lr])f)$': '$1$2ves',
    '(shea|lea|loa|thie)f$': '$1ves',
    sis$: 'ses',
    '([ti])um$': '$1a',
    '(tomat|potat|ech|her|vet)o$': '$1oes',
    '(bu)s$': '$1ses',
    '(alias)$': '$1es',
    '(octop)us$': '$1i',
    '(ax|test)is$': '$1es',
    '(us)$': '$1es',
    '(f)oot$': '$1eet',
    '(g)oose$': '$1eese',
    '(sex)$': '$1es',
    '(child)$': '$1ren',
    '(m)an$': '$1en',
    '(t)ooth$': '$1eeth',
    '(pe)rson$': '$1ople',
    '([^s]+)$': '$1s',
  }
  const singular: any = {
    '(quiz)zes$': '$1',
    '(matr)ices$': '$1ix',
    '(vert|ind)ices$': '$1ex',
    '^(ox)en$': '$1',
    '(alias)es$': '$1',
    '(octop|vir)i$': '$1us',
    '(cris|ax|test)es$': '$1is',
    '(shoe)s$': '$1',
    '(o)es$': '$1',
    '(bus)es$': '$1',
    '([m|l])ice$': '$1ouse',
    '(x|ch|ss|sh)es$': '$1',
    '(m)ovies$': '$1ovie',
    '(s)eries$': '$1eries',
    '([^aeiouy]|qu)ies$': '$1y',
    '([lr])ves$': '$1f',
    '(tive)s$': '$1',
    '(hive)s$': '$1',
    '(li|wi|kni)ves$': '$1fe',
    '(shea|loa|lea|thie)ves$': '$1f',
    '(^analy)ses$': '$1sis',
    '((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$': '$1$2sis',
    '([ti])a$': '$1um',
    '(n)ews$': '$1ews',
    '(h|bl)ouses$': '$1ouse',
    '(corpse)s$': '$1',
    '(us)es$': '$1',
    '(f)eet$': '$1oot',
    '(g)eese$': '$1oose',
    '(sex)es$': '$1',
    '(child)ren$': '$1',
    '(m)en$': '$1an',
    '(t)eeth$': '$1ooth',
    '(pe)ople$': '$1rson',
    s$: '',
  }
  const uncountable: any = [
    'sheep',
    'fish',
    'deer',
    'moose',
    'series',
    'species',
    'money',
    'rice',
    'information',
    'equipment',
  ]
  if (uncountable.indexOf(this.toLowerCase()) >= 0) return this
  const array = revert ? singular : plural
  let reg: any
  for (reg in array) {
    const pattern = new RegExp(reg, 'i')
    if (pattern.test(this)) return this.replace(pattern, array[reg])
  }
  return this
}
Object.assign(frappe.utils, {
  parse_layout_condition_to_filters(condition?: any) {
    if (!condition || condition.includes('||')) return {}
    const params: any = {}
    const re = /doc\.(\w+)\s*(===?|!==?|>=?|<=?)\s*(?:"([^"]*)"|'([^']*)'|(-?\d+(?:\.\d+)?))/g
    let match: any
    while ((match = re.exec(condition)) !== null) {
      const fieldname = match[1]
      const op = match[2]
      const value = match[3] ?? match[4] ?? match[5]
      if (value === undefined) continue
      const frappe_op = op === '===' || op === '==' ? '=' : op === '!==' || op === '!=' ? '!=' : op
      if (frappe_op === '=') {
        params[fieldname] = value
      } else {
        params[fieldname] = JSON.stringify([frappe_op, value])
      }
    }
    return params
  },
  get_random: function (len?: any) {
    let text = ''
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    for (let i = 0; i < len; i++) text += possible.charAt(Math.floor(Math.random() * possible.length))
    return text
  },
  get_file_link: function (filename?: any) {
    filename = cstr(filename)
    if (frappe.utils.is_url(filename)) {
      return filename
    } else if (filename.indexOf('/') === -1) {
      return 'files/' + filename
    } else {
      return filename
    }
  },
  replace_newlines(t?: any) {
    return t ? t.replace(/\n/g, '<br>') : ''
  },
  is_html: function (txt?: any) {
    if (!txt) return false
    const doc = new DOMParser().parseFromString(txt, 'text/html')
    const nodes = doc.body.childNodes || []
    return [...nodes].some((node?: any) => node.nodeType === 1)
  },
  is_mac: function () {
    return window.navigator.platform === 'MacIntel'
  },
  is_xs: function () {
    return $(document).width() < 768
  },
  is_sm: function () {
    return $(document).width() < 991 && $(document).width() >= 768
  },
  is_md: function () {
    return $(document).width() < 1199 && $(document).width() >= 991
  },
  is_json: function (str?: any) {
    try {
      JSON.parse(str)
    } catch (e: any) {
      return false
    }
    return true
  },
  parse_json: function (str?: any) {
    let parsed_json = ''
    try {
      parsed_json = JSON.parse(str)
    } catch (e: any) {
      return str
    }
    return parsed_json
  },
  strip_whitespace: function (html?: any) {
    return (html || '').replace(/<p>\s*<\/p>/g, '').replace(/<br>(\s*<br>\s*)+/g, '<br><br>')
  },
  encode_tags: function (html?: any) {
    let tagsToReplace: any = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
    }
    function replaceTag(tag?: any) {
      return tagsToReplace[tag] || tag
    }
    return html.replace(/[&<>]/g, replaceTag)
  },
  strip_original_content: function (txt?: any) {
    let out: any = [],
      part: any = [],
      newline = txt.indexOf('<br>') === -1 ? '\n' : '<br>'
    $.each(txt.split(newline), function (_i?: any, t?: any) {
      let tt = strip(t)
      if (tt && (tt.substr(0, 1) === '>' || tt.substr(0, 4) === '&gt;')) {
        part.push(t)
      } else {
        out = out.concat(part)
        out.push(t)
        part = []
      }
    })
    return out.join(newline)
  },
  escape_html: function (txt?: any) {
    if (txt == null) return ''
    let escape_html_mapping: any = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '`': '&#x60;',
      '=': '&#x3D;',
    }
    return String(txt).replace(/[&<>"'`=]/g, (char?: any) => escape_html_mapping[char] || char)
  },
  bold: function (txt?: any) {
    return `<strong>${frappe.utils.escape_html(cstr(txt))}</strong>`
  },
  unescape_html: function (txt?: any) {
    let unescape_html_mapping: any = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&#x60;': '`',
      '&#x3D;': '=',
    }
    return String(txt).replace(
      /&amp;|&lt;|&gt;|&quot;|&#39;|&#x60;|&#x3D;/g,
      (char?: any) => unescape_html_mapping[char] || char,
    )
  },
  html2text: function (html?: any) {
    const parser = new DOMParser()
    const dom = parser.parseFromString(html, 'text/html')
    return dom.body.textContent
  },
  is_url: function (txt?: any) {
    return txt.toLowerCase().substr(0, 7) == 'http://' || txt.toLowerCase().substr(0, 8) == 'https://'
  },
  to_title_case: function (string?: any, with_space: any = false) {
    let titlecased_string = string.toLowerCase().replace(/(?:^|[\s-/])\w/g, function (match?: any) {
      return match.toUpperCase()
    })
    let replace_with = with_space ? ' ' : ''
    return titlecased_string.replace(/-|_/g, replace_with)
  },
  toggle_blockquote: function (txt?: any) {
    if (!txt) return txt
    let content = $('<div></div>').html(txt)
    content.find('blockquote').parent('blockquote').addClass('hidden').before(
      '<p><a class="text-muted btn btn-default toggle-blockquote" style="padding: 2px 7px 0px; line-height: 1;"> \
					• • • \
				</a></p>',
    )
    return content.html()
  },
  scroll_page_to_top() {
    const $container = $('.main-section')
    $container.animate(
      { scrollTop: 0 },
      {
        duration: 300,
        easing: 'swing',
        complete: function () {
          $container.scrollTop(0)
        },
      },
    )
  },
  scroll_to: function (
    this: any,
    element?: any,
    animate: any = true,
    additional_offset?: any,
    element_to_be_scrolled?: any,
    callback?: any,
    highlight_element: any = false,
  ) {
    if (frappe.flags.disable_auto_scroll) return
    element_to_be_scrolled = element_to_be_scrolled || $('html, body')
    let scroll_top = 0
    if (element) {
      scroll_top =
        typeof element == 'number'
          ? element - cint(additional_offset)
          : this.get_scroll_position(element, additional_offset, element_to_be_scrolled)
    }
    if (scroll_top < 0) {
      scroll_top = 0
    }
    const highlight = () => {
      if (highlight_element) {
        $(element).addClass('highlight')
        document.addEventListener(
          'click',
          function () {
            $(element).removeClass('highlight')
          },
          { once: true },
        )
      }
    }
    if (scroll_top == element_to_be_scrolled.scrollTop()) {
      return highlight()
    }
    if (animate) {
      element_to_be_scrolled
        .animate({
          scrollTop: scroll_top,
        })
        .promise()
        .then(() => {
          highlight()
          callback && callback()
        })
    } else {
      element_to_be_scrolled.scrollTop(scroll_top)
    }
  },
  get_scroll_position: function (element?: any, additional_offset?: any, element_to_be_scrolled?: any) {
    const get_offset_relative_to_container = () => {
      let offset = 0
      let el = element instanceof HTMLElement ? element : element[0]
      const container = element_to_be_scrolled ? element_to_be_scrolled[0] : null
      while (el && el !== container && el.offsetParent) {
        offset += el.offsetTop
        el = el.offsetParent
      }
      return offset
    }
    const get_header_offset = () => {
      const navbar_height = $('.navbar').height() || 0
      const page_head_height = $('.page-head:visible').height() || 0
      const tabs_container_height = $('.form-tabs-list:visible').height() || 0
      return navbar_height + page_head_height + tabs_container_height
    }
    const element_offset_top = get_offset_relative_to_container()
    const header_offset = get_header_offset()
    return element_offset_top - header_offset - cint(additional_offset)
  },
  filter_dict: function (dict?: any, filters?: any) {
    let ret: any = []
    if (typeof filters == 'string') {
      return [dict[filters]]
    }
    $.each(dict, function (_i?: any, d?: any) {
      for (let key in filters) {
        if ($.isArray(filters[key])) {
          if (filters[key][0] == 'in') {
            if (filters[key][1].indexOf(d[key]) == -1) return
          } else if (filters[key][0] == 'not in') {
            if (filters[key][1].indexOf(d[key]) != -1) return
          } else if (filters[key][0] == '<') {
            if (!(d[key] < filters[key])) return
          } else if (filters[key][0] == '<=') {
            if (!(d[key] <= filters[key])) return
          } else if (filters[key][0] == '>') {
            if (!(d[key] > filters[key])) return
          } else if (filters[key][0] == '>=') {
            if (!(d[key] >= filters[key])) return
          }
        } else {
          if (d[key] != filters[key]) return
        }
      }
      ret.push(d)
    })
    return ret
  },
  comma_or: function (list?: any) {
    return frappe.utils.comma_sep(list, ' ' + __('or') + ' ')
  },
  comma_and: function (list?: any) {
    return frappe.utils.comma_sep(list, ' ' + __('and') + ' ')
  },
  comma_sep: function (list?: any, sep?: any) {
    if (list instanceof Array) {
      if (list.length == 0) {
        return ''
      } else if (list.length == 1) {
        return list[0]
      } else {
        return list.slice(0, list.length - 1).join(', ') + sep + list.slice(-1)[0]
      }
    } else {
      return list
    }
  },
  set_footnote: function (footnote_area?: any, wrapper?: any, txt?: any) {
    if (!footnote_area) {
      footnote_area = $('<div class="text-muted footnote-area level">').appendTo(wrapper)
    }
    if (txt) {
      footnote_area.html(txt)
    } else {
      footnote_area.remove()
      footnote_area = null
    }
    return footnote_area
  },
  get_args_dict_from_url: function (txt?: any) {
    let args: any = {}
    $.each(decodeURIComponent(txt).split('&'), function (_i?: any, arg?: any) {
      arg = arg.split('=')
      args[arg[0]] = arg[1]
    })
    return args
  },
  get_url_from_dict: function (args?: any) {
    return (
      $.map(args, function (val?: any, key?: any) {
        if (val !== null) return encodeURIComponent(key) + '=' + encodeURIComponent(val)
        else return null
      }).join('&') || ''
    )
  },
  validate_type: function (val?: any, type?: any) {
    let regExp: any
    switch (type) {
      case 'phone':
        regExp = /^([0-9 +_\-,.*#()]){1,20}$/
        break
      case 'name':
        regExp = /^[\w][\w'-]*([ \w][\w'-]+)*$/
        break
      case 'number':
        regExp = /^-?(?:\d+|\d{1,3}(?:,\d{3})+)?(?:\.\d+)?$/
        break
      case 'digits':
        regExp = /^\d+$/
        break
      case 'alphanum':
        regExp = /^\w+$/
        break
      case 'email':
        regExp =
          /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        break
      case 'url':
        regExp =
          /^((([A-Za-z0-9.+-]+:(?:\/\/)?)(?:[-;:&=\+\,\w]@)?[A-Za-z0-9.-]+(:[0-9]+)?|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)$/i
        break
      case 'dateIso':
        regExp = /^(\d{4})\D?(0[1-9]|1[0-2])\D?([12]\d|0[1-9]|3[01])$/
        break
      default:
        return false
    }
    return '' !== val ? regExp.test(val) : false
  },
  guess_style: function (text?: any, default_style?: any, _colour?: any) {
    let style = default_style || 'default'
    let colour = 'gray'
    if (text) {
      text = cstr(text)
      if (has_words(['Pending', 'Review', 'Medium', 'Not Approved'], text)) {
        style = 'warning'
        colour = 'amber'
      } else if (has_words(['Open', 'Urgent', 'High', 'Failed', 'Rejected', 'Error'], text)) {
        style = 'danger'
        colour = 'red'
      } else if (
        has_words(
          [
            'Closed',
            'Finished',
            'Converted',
            'Completed',
            'Complete',
            'Confirmed',
            'Approved',
            'Yes',
            'Active',
            'Available',
            'Paid',
            'Success',
          ],
          text,
        )
      ) {
        style = 'success'
        colour = 'green'
      } else if (has_words(['Submitted'], text)) {
        style = 'info'
        colour = 'blue'
      }
    }
    return _colour ? colour : style
  },
  guess_colour: function (text?: any) {
    return frappe.utils.guess_style(text, null, true)
  },
  get_indicator_color: function (state?: any) {
    return frappe.db
      .get_list('Workflow State', { filters: { name: state }, fields: ['name', 'style'] })
      .then((res?: any) => {
        const state = res[0]
        if (!state.style) {
          return frappe.utils.guess_colour(state.name)
        }
        const style = state.style
        const colour_map: any = {
          Success: 'green',
          Warning: 'amber',
          Danger: 'red',
          Primary: 'blue',
        }
        return colour_map[style]
      })
  },
  sort: function (list?: any, key?: any, compare_type?: any, reverse?: any) {
    if (!list || list.length < 2) return list || []
    let sort_fn: any = {
      string: function (a?: any, b?: any) {
        return cstr(a[key]).localeCompare(cstr(b[key]))
      },
      number: function (a?: any, b?: any) {
        return flt(a[key]) - flt(b[key])
      },
    }
    if (!compare_type) compare_type = typeof list[0][key] === 'string' ? 'string' : 'number'
    list.sort(sort_fn[compare_type])
    if (reverse) {
      list.reverse()
    }
    return list
  },
  unique: function (list?: any) {
    let dict: any = {},
      arr: any = []
    for (let i = 0, l = list.length; i < l; i++) {
      if (!(list[i] in dict)) {
        dict[list[i]] = null
        arr.push(list[i])
      }
    }
    return arr
  },
  remove_nulls: function (list?: any) {
    let new_list: any = []
    for (let i = 0, l = list.length; i < l; i++) {
      if (!is_null(list[i])) {
        new_list.push(list[i])
      }
    }
    return new_list
  },
  all: function (lst?: any) {
    for (let i = 0, l = lst.length; i < l; i++) {
      if (!lst[i]) {
        return false
      }
    }
    return true
  },
  dict: function (keys?: any, values?: any) {
    let out: any = []
    $.each(values, function (_row_idx?: any, row?: any) {
      let new_row: any = {}
      $.each(keys, function (key_idx?: any, key?: any) {
        new_row[key] = row[key_idx]
      })
      out.push(new_row)
    })
    return out
  },
  sum: function (list?: any) {
    return list.reduce(function (previous_value?: any, current_value?: any) {
      return flt(previous_value) + flt(current_value)
    }, 0.0)
  },
  arrays_equal: function (arr1?: any, arr2?: any) {
    if (!arr1 || !arr2) {
      return false
    }
    if (arr1.length != arr2.length) {
      return false
    }
    for (let i = 0; i < arr1.length; i++) {
      if ($.isArray(arr1[i])) {
        if (!frappe.utils.arrays_equal(arr1[i], arr2[i])) {
          return false
        }
      } else if (arr1[i] !== arr2[i]) {
        return false
      }
    }
    return true
  },
  intersection: function (a?: any, b?: any) {
    let ai = 0,
      bi = 0
    let result = []
    a = [].concat(a).sort()
    b = [].concat(b).sort()
    while (ai < a.length && bi < b.length) {
      if (a[ai] < b[bi]) {
        ai++
      } else if (a[ai] > b[bi]) {
        bi++
      } else {
        result.push(a[ai])
        ai++
        bi++
      }
    }
    return result
  },
  resize_image: function (reader?: any, callback?: any, max_width?: any, max_height?: any) {
    let tempImg = new Image()
    if (!max_width) max_width = 600
    if (!max_height) max_height = 400
    tempImg.src = reader.result
    tempImg.onload = function (this: any) {
      let tempW = tempImg.width
      let tempH = tempImg.height
      if (tempW > tempH) {
        if (tempW > max_width) {
          tempH *= max_width / tempW
          tempW = max_width
        }
      } else {
        if (tempH > max_height) {
          tempW *= max_height / tempH
          tempH = max_height
        }
      }
      let canvas = document.createElement('canvas')
      canvas.width = tempW
      canvas.height = tempH
      let ctx = canvas.getContext('2d')
      ctx?.drawImage(this, 0, 0, tempW, tempH)
      let dataURL = canvas.toDataURL('image/jpeg')
      setTimeout(function () {
        callback(dataURL)
      }, 10)
    }
  },
  csv_to_array: function (strData?: any, strDelimiter?: any) {
    let strMatchedDelimiter: any, strMatchedValue: any
    strDelimiter = strDelimiter || ','
    let objPattern = new RegExp(
      '(\\' + strDelimiter + '|\\r?\\n|\\r|^)' + '(?:"([^"]*(?:""[^"]*)*)"|' + '([^"\\' + strDelimiter + '\\r\\n]*))',
      'gi',
    )
    let arrData: any = [[]]
    let arrMatches = null
    while ((arrMatches = objPattern.exec(strData))) {
      strMatchedDelimiter = arrMatches[1]
      if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
        arrData.push([])
      }
      if (arrMatches[2]) {
        strMatchedValue = arrMatches[2].replace(new RegExp('""', 'g'), '"')
      } else {
        strMatchedValue = arrMatches[3]
      }
      arrData[arrData.length - 1].push(strMatchedValue)
    }
    return arrData
  },
  warn_page_name_change: function () {
    frappe.msgprint(__('Note: Changing the Page Name will break previous URL to this page.'))
  },
  set_title: function (title?: any) {
    frappe._original_title = title
    if (frappe._title_prefix) {
      title = frappe._title_prefix + ' ' + title.replace(/<[^>]*>/g, '')
    }
    document.title = title
    const sub_path = frappe.router.get_sub_path()
    frappe.route_titles[sub_path] = title
  },
  set_title_prefix: function (prefix?: any) {
    frappe._title_prefix = prefix
    frappe.utils.set_title(frappe._original_title)
  },
  is_image_file: function (filename?: any) {
    if (!filename) return false
    filename = filename.split('?')[0]
    return /\.(gif|jpg|jpeg|tiff|png|svg)$/i.test(filename)
  },
  is_video_file: function (filename?: any) {
    if (!filename) return false
    filename = filename.split('?')[0]
    return /\.(mov|mp4|mkv|webm)$/i.test(filename)
  },
  play_sound: function (name?: any) {
    let audio: any
    try {
      if (frappe.boot.user.mute_sounds) {
        return
      }
      audio = $('#sound-' + name)[0]
      audio.volume = audio.getAttribute('volume')
      if (!audio.paused) {
        audio.currentTime = 0
      }
      audio.play()
    } catch (e: any) {
      console.log('Cannot play sound', name, e)
    }
  },
  split_emails: function (txt?: any) {
    let email_list: any = []
    if (!txt) {
      return email_list
    }
    txt.split(/[,\n](?=(?:[^"]|"[^"]*")*$)/g).forEach(function (email?: any) {
      email = email.trim()
      if (email) {
        email_list.push(email)
      }
    })
    return email_list
  },
  supportsES6: (function () {
    try {
      new Function('(a = 0) => a')
      return true
    } catch (err: any) {
      return false
    }
  })(),
  throttle: function (func?: any, wait?: any, options?: any) {
    let context: any, args: any, result: any
    let timeout: any = null
    let previous = 0
    if (!options) options = {}
    let later = function () {
      previous = options.leading === false ? 0 : Date.now()
      timeout = null
      result = func.apply(context, args)
      if (!timeout) context = args = null
    }
    return function (this: any) {
      let now = Date.now()
      if (!previous && options.leading === false) previous = now
      let remaining = wait - (now - previous)
      context = this
      args = arguments
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout)
          timeout = null
        }
        previous = now
        result = func.apply(context, args)
        if (!timeout) context = args = null
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining)
      }
      return result
    }
  },
  debounce: function (func?: any, wait?: any, immediate?: any) {
    let timeout: any, context: any, args: any
    let later = function () {
      timeout = null
      if (!immediate) func.apply(context, args)
    }
    let debounced: any = function (this: any) {
      context = this
      args = arguments
      let callNow = immediate && !timeout
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
      if (callNow) func.apply(context, args)
    }
    debounced.cancel = function () {
      if (!timeout) return false
      clearTimeout(timeout)
      timeout = null
      return true
    }
    debounced.flush = function () {
      if (!timeout) return false
      clearTimeout(timeout)
      timeout = null
      func.apply(context, args)
      return true
    }
    return debounced
  },
  get_form_link: function (
    doctype?: any,
    name?: any,
    html: any = false,
    display_text: any = null,
    query_params_obj: any = null,
  ) {
    display_text = display_text || frappe.utils.escape_html(name)
    name = encodeURIComponent(name)
    let route = `/desk/${encodeURIComponent(doctype.toLowerCase().replace(/ /g, '-'))}/${name}`
    if (query_params_obj) {
      route += frappe.utils.make_query_string(query_params_obj)
    }
    if (html) {
      return `<a href="${route}">${display_text}</a>`
    }
    return route
  },
  get_route_label(route_str?: any) {
    let route = route_str.split('/')
    if (route[2] === 'Report' || route[0] === 'query-report') {
      return (__(route[3]) || __(route[1])).bold() + ' ' + __('Report')
    }
    if (route[0] === 'List') {
      return __(route[1]).bold() + ' ' + __('List')
    }
    if (route[0] === 'modules') {
      return __(route[1]).bold() + ' ' + __('Module')
    }
    if (route[0] === 'Workspaces') {
      return __(route[1]).bold() + ' ' + __('Workspace')
    }
    if (route[0] === 'dashboard') {
      return __(route[1]).bold() + ' ' + __('Dashboard')
    }
    return __(frappe.utils.to_title_case(__(route[0]), true))
  },
  report_column_total: function (values?: any, column?: any, type?: any) {
    if (column.column.disable_total) {
      return ''
    } else if (values.length > 0) {
      if (column.column.fieldtype == 'Percent' || type === 'mean') {
        return values.reduce((a?: any, b?: any) => flt(a) + flt(b)) / values.length
      } else if (column.column.fieldtype == 'Int') {
        return values.reduce((a?: any, b?: any) => cint(a) + cint(b))
      } else if (frappe.model.is_numeric_field(column.column.fieldtype)) {
        return values.reduce((a?: any, b?: any) => flt(a) + flt(b))
      } else {
        return null
      }
    } else {
      return null
    }
  },
  setup_search($wrapper?: any, el_class?: any, text_class?: any, data_attr?: any) {
    const $search_input = $wrapper.find('[data-element="search"]').show()
    $search_input.focus().val('')
    const $elements = $wrapper.find(el_class).show()
    const $multichecks = $wrapper.find('[data-fieldtype="MultiCheck"]')
    let $no_results = $wrapper.find('.no-results-message')
    if (!$no_results.length) {
      $no_results = $(`
				<div class="no-results-message text-muted text-center" style="padding: 5px; display: none;">
					${__('No values to show')}
				</div>
			`).appendTo($wrapper)
    }
    $no_results.hide()
    const matches_filter = ($el?: any, filter?: any) => {
      const $text_el = $el.find(text_class)
      const text = $text_el.text().toLowerCase()
      let name = ''
      if (data_attr && $text_el.attr(data_attr)) {
        name = $text_el.attr(data_attr).toLowerCase()
      }
      return text.includes(filter) || name.includes(filter)
    }
    $search_input.off('keyup').on('keyup', () => {
      const text_filter = $search_input.val().toLowerCase().trim()
      let any_visible = false
      $elements.each(function (this: any) {
        const match = matches_filter($(this), text_filter)
        $(this).toggle(match)
        if (match) any_visible = true
      })
      if ($multichecks.length) {
        $multichecks.show()
        $multichecks.each(function (this: any) {
          const has_visible = $(this).find(el_class + ':visible').length
          $(this).toggle(!!has_visible)
        })
      }
      if (text_filter) {
        $no_results.toggle(!any_visible)
      } else {
        $no_results.hide()
      }
    })
  },
  setup_timer(start?: any, end?: any, $element?: any) {
    const increment = end > start
    let counter = start
    let interval = setInterval(() => {
      increment ? counter++ : counter--
      if (increment ? counter > end : counter < end) {
        clearInterval(interval)
        return
      }
      $element.text(counter)
    }, 1000)
  },
  deep_equal(a?: any, b?: any) {
    return deep_equal(a, b)
  },
  file_name_ellipsis(filename?: any, length?: any) {
    let first_part_length = (length * 2) / 3
    let last_part_length = length - first_part_length
    let parts = filename.split('.')
    let extn = parts.pop()
    let name = parts.join('')
    let first_part = name.slice(0, first_part_length)
    let last_part = name.slice(-last_part_length)
    if (name.length > length) {
      return `${first_part}...${last_part}.${extn}`
    } else {
      return filename
    }
  },
  get_decoded_string(dataURI?: any) {
    let parts = dataURI.split(',')
    const encoded_data = parts[1]
    let decoded = atob(encoded_data)
    try {
      const escaped = escape(decoded)
      decoded = decodeURIComponent(escaped)
    } catch (e: any) {}
    return decoded
  },
  copy_to_clipboard(string?: any, message?: any) {
    const show_success_alert = () => {
      frappe.show_alert({
        indicator: 'green',
        message: message || __('Copied to clipboard.'),
      })
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(string).then(show_success_alert)
    } else {
      let input = $('<textarea>')
      $('body').append(input)
      input.val(string).select()
      document.execCommand('copy')
      show_success_alert()
      input.remove()
    }
  },
  is_rtl(lang: any = null) {
    const rtl_languages: any = ['ar', 'fa', 'he', 'ku', 'ps', 'ur']
    const code = lang || frappe.boot.lang || ''
    if (rtl_languages.includes(code)) return true
    return rtl_languages.includes(code.split(/[-_]/)[0])
  },
  bind_actions_with_object($el?: any, object?: any) {
    $($el).off('click.class_actions')
    $($el).on('click.class_actions', '[data-action]', (e?: any) => {
      let $target = $(e.currentTarget)
      let action = $target.data('action')
      let method = object[action]
      method ? object[action](e, $target) : null
    })
    return $el
  },
  eval(code?: any, context: any = {}) {
    if (code.substr(0, 5) == 'eval:') {
      code = code.substr(5)
    }
    let variable_names = Object.keys(context)
    let variables = Object.values(context)
    const should_cache = code.length < 500
    const cache_key = should_cache ? code + '|' + variable_names.join(',') : null
    let expression_function = cache_key && eval_function_cache.get(cache_key)
    if (!expression_function) {
      const function_code = `let out = ${code}; return out`
      try {
        expression_function = new Function(...variable_names, function_code)
      } catch (error: any) {
        console.log('Error evaluating the following expression:')
        console.error(function_code)
        throw error
      }
      if (cache_key) {
        eval_function_cache.set(cache_key, expression_function)
      }
    }
    try {
      return expression_function(...variables)
    } catch (error: any) {
      console.log('Error executing the following expression:')
      console.error(code)
      throw error
    }
  },
  get_browser() {
    let ua = navigator.userAgent
    let tem: any
    let M: any = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || []
    if (/trident/i.test(M[1])) {
      tem = /\brv[ :]+(\d+)/g.exec(ua) || []
      return { name: 'IE', version: tem[1] || '' }
    }
    if (M[1] === 'Chrome') {
      tem = ua.match(/\bOPR|Edge\/(\d+)/)
      if (tem != null) {
        return { name: 'Opera', version: tem[1] }
      }
    }
    M = (M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?']) as any
    if ((tem = ua.match(/version\/(\d+)/i)) != null) {
      M.splice(1, 1, tem[1])
    }
    return {
      name: M[0],
      version: M[1],
    }
  },
  get_formatted_duration(value?: any, duration_options: any = null) {
    let duration = ''
    if (!duration_options) {
      duration_options = {
        hide_days: 0,
        hide_seconds: 0,
      }
    }
    if (value) {
      let total_duration = frappe.utils.seconds_to_duration(value, duration_options)
      if (total_duration.days && duration_options.hide_days !== 1) {
        duration += total_duration.days + __('d', null, 'Days (Field: Duration)')
      }
      if (total_duration.hours) {
        duration += duration.length ? ' ' : ''
        duration += total_duration.hours + __('h', null, 'Hours (Field: Duration)')
      }
      if (total_duration.minutes) {
        duration += duration.length ? ' ' : ''
        duration += total_duration.minutes + __('m', null, 'Minutes (Field: Duration)')
      }
      if (total_duration.seconds && duration_options.hide_seconds !== 1) {
        duration += duration.length ? ' ' : ''
        duration += total_duration.seconds + __('s', null, 'Seconds (Field: Duration)')
      }
    }
    return duration
  },
  get_formatted_iban(value?: any) {
    if (!value || ['BI', 'SV', 'EG', 'LY'].some((country?: any) => value.startsWith(country))) {
      return value
    }
    return value.replaceAll(' ', '').replace(/(.{4})(?=.)/g, '$1 ')
  },
  seconds_to_duration(seconds?: any, duration_options?: any) {
    const floor = seconds > 0 ? Math.floor : Math.ceil
    const total_duration: any = {
      days: floor(seconds / 86400),
      hours: floor((seconds % 86400) / 3600),
      minutes: floor((seconds % 3600) / 60),
      seconds: floor(seconds % 60),
    }
    if (duration_options && duration_options.hide_days) {
      total_duration.hours = floor(seconds / 3600)
      total_duration.days = 0
    }
    if (duration_options && duration_options.hide_seconds) {
      total_duration.minutes += Math.round(total_duration.seconds / 60)
      total_duration.seconds = 0
    }
    return total_duration
  },
  duration_to_seconds(days: any = 0, hours: any = 0, minutes: any = 0, seconds: any = 0) {
    let value = 0
    if (days) {
      value += days * 24 * 60 * 60
    }
    if (hours) {
      value += hours * 60 * 60
    }
    if (minutes) {
      value += minutes * 60
    }
    if (seconds) {
      value += seconds
    }
    return value
  },
  get_duration_options: function (docfield?: any) {
    return {
      hide_days: docfield.hide_days,
      hide_seconds: docfield.hide_seconds,
    }
  },
  get_number_system: function (country?: any) {
    if (['Bangladesh', 'India', 'Myanmar', 'Pakistan'].includes(country)) {
      return number_systems.indian
    } else if (country == 'Nepal') {
      return number_systems.nepalese
    } else {
      return number_systems.default
    }
  },
  map_defaults: {
    center: [19.08, 72.8961],
    zoom: 13,
    tiles: {
      default_tile: {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        options: {
          attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
        },
      },
      satellite_tile: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        options: {
          attribution: '© Esri © OpenStreetMap Contributors',
        },
      },
      labels_tail: {
        url: 'https://tiles.stadiamaps.com/tiles/stamen_toner_labels/{z}/{x}/{y}{r}.png',
        options: {
          attribution:
            '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a>',
        },
      },
      terrain_lines_tail: {
        url: 'https://tiles.stadiamaps.com/tiles/stamen_terrain_lines/{z}/{x}/{y}{r}.png',
        options: {
          attribution:
            '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a>',
        },
      },
    },
    image_path: '/assets/frappe/images/leaflet/',
  },
  desktop_icon(this: any, label?: any, color?: any, size?: any, style?: any) {
    let letter = frappe.utils.escape_html(label.charAt(0).toUpperCase())
    let icon_size = size ? size : 'md'
    let opacity_hex = '1A'
    let icon_html = $(`
			<div class="icon-container">
				<svg fill="currentColor" class="desktop-alphabet icon text-ink-gray-7 icon-${icon_size}" stroke=none style="" aria-hidden="true">
				<use class="" href="#${letter}"></use>
				</svg>
			</div>
		`)
    let pallete_color = this.desktop_pallete[color || 'blue']
    let bg_color = pallete_color + opacity_hex
    let stroke_color = pallete_color
    if ((style || frappe.boot.desktop_icon_style) == 'Solid') {
      bg_color = stroke_color
      stroke_color = 'var(--white)'
    }
    icon_html.css('backgroundColor', bg_color)
    icon_html.find('svg').css('color', stroke_color)
    return icon_html.get(0).outerHTML
  },
  app_logo(app?: any) {
    if (!app) return null
    const title = app.app_title || app.app_name
    const logo_url = Array.isArray(app.app_logo_url) ? app.app_logo_url[0] : app.app_logo_url
    const icon = logo_url
      ? `<img src="${frappe.utils.escape_html(logo_url)}" alt="${frappe.utils.escape_html(title)}" />`
      : frappe.utils.desktop_icon(title, 'gray', 'sm')
    return { icon, title }
  },
  sidebar_for_module(module?: any) {
    if (!module) return undefined
    const all = frappe.boot.module_sidebars || {}
    return all[module] || Object.values(all).find((entry?: any) => entry.module === module)
  },
  get_route_for_icon(desktop_icon?: any) {
    let route: any
    if (!desktop_icon) return
    if (desktop_icon.link_type == 'External' && desktop_icon.link) {
      route = desktop_icon.link
    } else {
      let sidebar = frappe.utils.sidebar_for_module(desktop_icon.module || desktop_icon.label)
      if (desktop_icon.link_type == 'Workspace Sidebar' && sidebar) {
        let first_link = sidebar.items.find((i?: any) => i.type == 'Link')
        if (first_link) {
          if (first_link.link_type === 'Report') {
            let args: any = {
              type: first_link.link_type,
              name: first_link.link_to,
            }
            if (first_link.report) {
              args.is_query_report =
                first_link.report.report_type === 'Query Report' || first_link.report.report_type == 'Script Report'
              args.report_ref_doctype = first_link.report.ref_doctype
            }
            route = frappe.utils.generate_route(args)
          } else if (first_link.link_type == 'Workspace') {
            let workspaces = frappe.workspaces[frappe.router.slug(first_link.link_to)]
            if (workspaces) {
              if (workspaces.public) {
                route = '/desk/' + frappe.router.slug(first_link.link_to)
              } else {
                route = '/desk/private/' + frappe.router.slug(workspaces.title)
              }
            }
          } else if (first_link.link_type === 'URL') {
            route = first_link.url
          } else if (first_link.link_type == 'Page') {
            route = frappe.utils.generate_route({
              type: first_link.link_type,
              name: first_link.link_to,
              route: first_link.route ? `${first_link.link_to}/${first_link.route}` : undefined,
              route_options: first_link.route_options ? JSON.parse(first_link.route_options) : undefined,
            })
          } else {
            route = frappe.utils.generate_route({
              type: first_link.link_type,
              name: first_link.link_to,
              tab: first_link.tab,
            })
          }
        }
      }
    }
    return route
  },
  get_desktop_icon(this: any, icon_name?: any, variant?: any) {
    let exists = false
    let icon_data = this.get_desktop_icon_by_label(icon_name)
    variant = variant.toLowerCase()
    if (!icon_data?.app) return exists
    let app_name = icon_data.app
    let icon_url = `assets/${app_name}/icons/desktop_icons/${variant}/${frappe.scrub(icon_name)}.svg`
    if (frappe.boot.desktop_icon_urls[app_name]?.[variant]?.includes(icon_url)) {
      return `/${icon_url}`
    }
    return exists
  },
  get_desktop_icon_by_label(title?: any, filters?: any) {
    if (!filters) {
      return frappe.boot.desktop_icons.find((f?: any) => f.label === title)
    } else {
      return frappe.boot.desktop_icons.find((f?: any) => {
        return f.label === title && Object.keys(filters).every((key?: any) => f[key] === filters[key])
      })
    }
  },
  desktop_pallete: {
    blue: '#0289F7',
    gray: '#7B808A',
  },
  icon(
    icon_name?: any,
    size: any = 'sm',
    icon_class: any = '',
    icon_style: any = '',
    svg_class: any = '',
    current_color: any = false,
    stroke_color: any = null,
  ) {
    if (frappe.utils.is_emoji(icon_name)) {
      return `<span>${icon_name}</span>`
    }
    let size_class = ''
    icon_name = `${'#icon-' + icon_name}`
    if (typeof size == 'object') {
      icon_style += ` width: ${size.width}; height: ${size.height}`
    } else {
      size_class = `icon-${size}`
    }
    let $svg = `<svg class="icon ${svg_class} ${size_class}"
			${current_color ? 'stroke="currentColor"' : ''}
			${stroke_color ? `stroke="${stroke_color}"` : ''}
			style="${icon_style}" aria-hidden="true">
			<use class="${icon_class}" href="${icon_name}"
				${stroke_color ? `stroke="${stroke_color}"` : ''}
			>
			</use>
		</svg>`
    return $svg
  },
  flag(country_code?: any) {
    return `<img loading="lazy" src="https://flagcdn.com/${country_code}.svg" width="20" height="15">`
  },
  is_emoji(str?: any) {
    return /^\p{Extended_Pictographic}(‍\p{Extended_Pictographic}|️|⃣)*$/u.test(str)
  },
  get_emojis() {
    const ranges: any = [
      [0x1f600, 0x1f64f],
      [0x1f300, 0x1f5ff],
      [0x1f680, 0x1f6ff],
      [0x1f900, 0x1f9ff],
      [0x1fa00, 0x1fa6f],
      [0x1fa70, 0x1faff],
      [0x2600, 0x26ff],
      [0x2700, 0x27bf],
    ]
    return ranges.flatMap(([start, end]: any) =>
      Array.from({ length: end - start + 1 }, (_?: any, i?: any) => String.fromCodePoint(start + i)),
    )
  },
  desktop_icon_exists(app_name?: any, url?: any) {
    let exists = false
    if (frappe.boot.desktop_icon_urls[app_name].includes(url)) exists = true
    return exists
  },
  make_chart(wrapper?: any, custom_options: any = {}) {
    let chart_args: any = {
      type: 'bar',
      colors: ['light-blue'],
      axisOptions: {
        xIsSeries: 1,
        shortenYAxisNumbers: 1,
        xAxisMode: 'tick',
        numberFormatter: frappe.utils.format_chart_axis_number,
      },
    }
    for (let key in custom_options) {
      if (typeof chart_args[key] === 'object' && typeof custom_options[key] === 'object') {
        chart_args[key] = Object.assign(chart_args[key], custom_options[key])
      } else {
        chart_args[key] = custom_options[key]
      }
    }
    frappe.utils.set_space_label_ratio(chart_args)
    return new frappe.Chart(wrapper, chart_args)
  },
  format_chart_axis_number(label?: any, country?: any) {
    const default_country = frappe.sys_defaults.country
    return frappe.utils.shorten_number(label, country || default_country, 3)
  },
  set_space_label_ratio(chart_args?: any) {
    if (chart_args.data.labels.length > 10) {
      chart_args['axisOptions']['seriesLabelSpaceRatio'] = 0.9
    }
  },
  generate_route(item?: any) {
    const type = item.type.toLowerCase()
    if (type === 'doctype') {
      item.doctype = item.name
    }
    let route = ''
    if (!item.route) {
      if (item.link) {
        route = strip(item.link, '#')
      } else if (type === 'doctype') {
        let doctype_slug = frappe.router.slug(item.doctype)
        if (frappe.model.is_single(item.doctype)) {
          route = `${doctype_slug}/${item.doctype}`
        } else {
          switch (item.doc_view) {
            case 'List':
              if (item.filters) {
                frappe.route_options = item.filters
              }
              route = `${doctype_slug}/view/list`
              break
            case 'Tree':
              route = `${doctype_slug}/view/tree`
              break
            case 'Report Builder':
              route = `${doctype_slug}/view/report`
              break
            case 'Dashboard':
              route = `${doctype_slug}/view/dashboard`
              break
            case 'New':
              route = `${doctype_slug}/new`
              break
            case 'Calendar':
              route = `${doctype_slug}/view/calendar/default`
              break
            case 'Kanban':
              route = `${doctype_slug}/view/kanban`
              if (item.kanban_board) {
                route += `/${item.kanban_board}`
              }
              break
            case 'Image':
              route = `${doctype_slug}/view/image`
              break
            default:
              route = doctype_slug
          }
        }
        if (item.tab) {
          route += `#${item.tab}`
        }
      } else if (type === 'report') {
        if (item.is_query_report) {
          route = 'query-report/' + item.name
        } else if (!item.is_query_report && item.report_ref_doctype) {
          route = frappe.router.slug(item.report_ref_doctype) + '/view/report/' + item.name
        } else {
          route = 'report/' + item.name
        }
      } else if (type === 'page') {
        route = item.name
      } else if (type === 'dashboard') {
        route = `dashboard-view/${item.name}`
      } else if (type == 'workspace') {
        if (item.public) {
          route = frappe.router.slug(item.name)
        } else {
          route = 'private/' + frappe.router.slug(item.title || item.name)
        }
      }
    } else {
      route = item.route
    }
    if (item.route_options) {
      route +=
        '?' +
        $.map(item.route_options, function (value?: any, key?: any) {
          const encoded = Array.isArray(value) ? JSON.stringify(value) : value
          return encodeURIComponent(key) + '=' + encodeURIComponent(encoded)
        }).join('&')
    }
    return `/desk/${route}`
  },
  shorten_number: function (this: any, number?: any, country?: any, min_length: any = 4, max_no_of_decimals: any = 2) {
    if (!number || isNaN(number)) {
      return ''
    }
    const len = String(number).match(/\d/g)?.length || 0
    if (len < min_length) {
      return number.toString()
    }
    const number_system = this.get_number_system(country)
    let x = Math.abs(Math.round(number))
    const x_string = x.toString()
    if (x_string.length < min_length) {
      return x_string
    }
    for (const map of number_system) {
      if (x >= map.divisor) {
        let result = number / map.divisor
        const no_of_decimals = this.get_number_of_decimals(result)
        result = no_of_decimals > max_no_of_decimals ? Number(result.toFixed(max_no_of_decimals)) : result
        return result + ' ' + map.symbol
      }
    }
    return number.toFixed(max_no_of_decimals)
  },
  get_number_of_decimals: function (number?: any) {
    if (Math.floor(number) === number) return 0
    return number.toString().split('.')[1].length || 0
  },
  build_summary_item(summary?: any) {
    if (summary.type == 'separator') {
      return $(`<div class="summary-separator">
				<div class="summary-value ${summary.color ? summary.color.toLowerCase() : 'text-muted'}">${summary.value}</div>
			</div>`)
    }
    let df: any = { fieldtype: summary.datatype }
    let doc = null
    if (summary.datatype == 'Currency') {
      df.options = 'currency'
      doc = { currency: summary.currency }
    }
    let value = frappe.format(summary.value, df, { only_value: true }, doc)
    let color = summary.indicator ? summary.indicator.toLowerCase() : summary.color ? summary.color.toLowerCase() : ''
    return $(`<div class="summary-item">
			<span class="summary-label">${__(summary.label)}</span>
			<div class="summary-value ${color}">${value}</div>
		</div>`)
  },
  print(doctype?: any, docname?: any, print_format?: any, letterhead?: any, lang_code?: any) {
    let w = window.open(
      frappe.urllib.get_full_url(
        '/printview?doctype=' +
          encodeURIComponent(doctype) +
          '&name=' +
          encodeURIComponent(docname) +
          '&trigger_print=1' +
          '&format=' +
          encodeURIComponent(print_format) +
          '&no_letterhead=' +
          (letterhead ? '0' : '1') +
          '&letterhead=' +
          encodeURIComponent(letterhead) +
          (lang_code ? '&_lang=' + lang_code : ''),
      ),
    )
    if (!w) {
      frappe.msgprint(__('Please enable pop-ups'))
      return
    }
  },
  get_clipboard_data(clipboard_paste_event?: any) {
    let e = clipboard_paste_event
    let clipboard_data = e.clipboardData || window.clipboardData || e.originalEvent.clipboardData
    return clipboard_data.getData('Text')
  },
  add_custom_button(
    html?: any,
    action?: any,
    class_name: any = '',
    title: any = '',
    btn_type?: any,
    wrapper?: any,
    prepend?: any,
  ) {
    if (!btn_type) btn_type = 'btn-secondary'
    let button = $(`<button class="btn ${btn_type} btn-xs ${class_name}" title="${title}">${html}</button>`)
    button.click((event?: any) => {
      event.stopPropagation()
      action && action(event)
    })
    !prepend && button.appendTo(wrapper)
    prepend && wrapper.prepend(button)
  },
  add_select_group_button(wrapper?: any, actions?: any, btn_type?: any, icon: any = '', prepend?: any) {
    let selected_action = actions[0]
    let $select_group_button = $(`
			<div class="btn-group select-group-btn">
				<button type="button" class="btn ${btn_type} btn-sm selected-button">
					<span class="left-icon">${icon && frappe.utils.icon(icon, 'xs')}</span>
					<span class="label">${selected_action.label}</span>
				</button>

				<button type="button" class="btn ${btn_type} btn-sm dropdown-toggle dropdown-toggle-split" data-toggle="dropdown">
					${frappe.utils.icon('chevron-down', 'xs')}
				</button>

				<ul class="dropdown-menu dropdown-menu-right" role="menu"></ul>
			</div>
		`)
    actions.forEach((action?: any) => {
      $(`<li>
				<a class="dropdown-item flex">
					<div class="tick-icon mr-2">${frappe.utils.icon('check', 'xs')}</div>
					<div>
						<div class="item-label">${action.label}</div>
						<div class="item-description text-muted small">${action.description || ''}</div>
					</div>
				</a>
			</li>`)
        .appendTo($select_group_button.find('.dropdown-menu'))
        .click((e?: any) => {
          selected_action = action
          $select_group_button.find('.selected-button .label').text(action.label)
          $(e.currentTarget).find('.tick-icon').addClass('selected')
          $(e.currentTarget).siblings().find('.tick-icon').removeClass('selected')
        })
    })
    $select_group_button.find('.dropdown-menu li:first-child .tick-icon').addClass('selected')
    $select_group_button.find('.selected-button').click((event?: any) => {
      event.stopPropagation()
      selected_action.action && selected_action.action(event)
    })
    !prepend && $select_group_button.appendTo(wrapper)
    prepend && wrapper.prepend($select_group_button)
    return $select_group_button
  },
  sleep(time?: any) {
    return new Promise((resolve?: any) => setTimeout(resolve, time))
  },
  parse_array(array?: any) {
    if (array && array.length !== 0) {
      return array
    }
    return undefined
  },
  range(start?: any, end?: any) {
    if (!end) {
      end = start
      start = 0
    }
    let arr: any = []
    for (let i = start; i < end; i++) {
      arr.push(i)
    }
    return arr
  },
  get_link_title(doctype?: any, name?: any) {
    if (!doctype || !name || !frappe._link_titles) {
      return
    }
    return frappe._link_titles[doctype + '::' + name]
  },
  add_link_title(doctype?: any, name?: any, value?: any) {
    if (!doctype || !name) {
      return
    }
    if (!frappe._link_titles) {
      frappe._link_titles = {}
    }
    frappe._link_titles[doctype + '::' + name] = value
  },
  fetch_link_title(doctype?: any, name?: any) {
    if (!doctype || !name) {
      return
    }
    return frappe
      .xcall('frappe.desk.search.get_link_title', {
        doctype: doctype,
        docname: name,
      })
      .then((title?: any) => {
        frappe.utils.add_link_title(doctype, name, title)
        return title
      })
      .catch(() => name)
  },
  only_allow_num_decimal(input?: any) {
    input.on('input', (e?: any) => {
      let self = $(e.target)
      self.val(self.val().replace(/[^0-9.\-]/g, ''))
      if ((e.which != 46 || self.val().indexOf('.') != -1) && (e.which < 48 || e.which > 57)) {
        e.preventDefault()
      }
    })
  },
  string_to_boolean(string?: any) {
    switch (string.toLowerCase().trim()) {
      case 't':
      case 'true':
      case 'y':
      case 'yes':
      case '1':
        return true
      case 'f':
      case 'false':
      case 'n':
      case 'no':
      case '0':
      case null:
        return false
      default:
        return string
    }
  },
  get_filter_as_json(filters?: any) {
    let filter = null
    if (filters.length) {
      filter = {}
      filters.forEach((arr?: any) => {
        filter[arr[1]] = [arr[2], arr[3]]
      })
      filter = JSON.stringify(filter)
    }
    return filter
  },
  process_filter_expression(this: any, filter?: any) {
    let filters: any = []
    filters = filter ? new Function(`return ${filter}`)() : []
    return this.cleanup_filters(filters)
  },
  cleanup_filters(filters?: any) {
    if (filters.length && filters[0].length == 5) {
      filters.pop()
      return filters
    }
    return filters
  },
  get_filter_from_json(this: any, filter_json?: any, doctype?: any) {
    if (filter_json) {
      if (!filter_json.length) {
        return []
      }
      const filters_json = this.process_filter_expression(filter_json)
      if (!doctype) {
        if (Array.isArray(filters_json)) {
          let filter = filters_json.reduce((acc?: any, filter?: any) => {
            const field = filter[1]
            const value: any = [filter[2], filter[3]]
            if (acc[field]) {
              acc[field].push(value)
            } else {
              acc[field] = [value]
            }
            return acc
          }, {})
          return filter || []
        }
        return filters_json || []
      }
      if (Array.isArray(filters_json)) {
        return filters_json
      }
      return Object.keys(filters_json).map((filter?: any) => {
        let val = filters_json[filter]
        return [doctype, filter, val[0], val[1], false]
      })
    }
  },
  load_video_player() {
    return frappe.require('video_player.bundle.js')
  },
  is_current_user(user?: any) {
    return user === frappe.session.user
  },
  debug: {
    watch_property(obj?: any, prop?: any, callback: any = console.trace) {
      console.warn('Adding property watcher, make sure to remove it after debugging.')
      const private_prop = '$_' + prop + '_$'
      obj[private_prop] = obj[prop]
      Object.defineProperty(obj, prop, {
        get: function () {
          return obj[private_prop]
        },
        set: function (value?: any) {
          callback()
          obj[private_prop] = value
        },
      })
    },
  },
  generate_tracking_url() {
    frappe.prompt(
      [
        {
          fieldname: 'url',
          label: __('Web Page URL'),
          fieldtype: 'Data',
          options: 'URL',
          reqd: 1,
          default: localStorage.getItem('tracker_url:url'),
        },
        {
          fieldname: 'source',
          label: __('Source'),
          fieldtype: 'Link',
          reqd: 1,
          options: 'UTM Source',
          description: 'The referrer (e.g. google, newsletter)',
          default: localStorage.getItem('tracker_url:source'),
        },
        {
          fieldname: 'campaign',
          label: __('Campaign'),
          fieldtype: 'Link',
          ignore_link_validation: 1,
          options: 'UTM Campaign',
          default: localStorage.getItem('tracker_url:campaign'),
        },
        {
          fieldname: 'medium',
          label: __('Medium'),
          fieldtype: 'Link',
          options: 'UTM Medium',
          description: 'Marketing medium (e.g. cpc, banner, email)',
          default: localStorage.getItem('tracker_url:medium'),
        },
        {
          fieldname: 'content',
          label: __('Content'),
          fieldtype: 'Data',
          description: 'Use to differentiate ad variants (e.g. A/B testing)',
          default: localStorage.getItem('tracker_url:content'),
        },
      ],
      async function (data?: any) {
        let url = data.url
        localStorage.setItem('tracker_url:url', data.url)
        const { message } = await frappe.db.get_value('UTM Source', data.source, 'slug')
        url += '?utm_source=' + encodeURIComponent(message.slug || data.source)
        localStorage.setItem('tracker_url:source', data.source)
        if (data.campaign) {
          const { message } = await frappe.db.get_value('UTM Campaign', data.campaign, 'slug')
          url += '&utm_campaign=' + encodeURIComponent(message.slug || data.campaign)
          localStorage.setItem('tracker_url:campaign', data.campaign)
        }
        if (data.medium) {
          const { message } = await frappe.db.get_value('UTM Medium', data.medium, 'slug')
          url += '&utm_medium=' + encodeURIComponent(message.slug || data.medium)
          localStorage.setItem('tracker_url:medium', data.medium)
        }
        if (data.content) {
          url += '&utm_content=' + encodeURIComponent(data.content)
          localStorage.setItem('tracker_url:content', data.content)
        }
        frappe.utils.copy_to_clipboard(url)
        frappe.msgprint(
          __('Tracking URL generated and copied to clipboard') + ': <br>' + `<a href="${url}">${url.bold()}</a>`,
          __("Here's your tracking URL"),
        )
      },
      __('Generate Tracking URL'),
    )
  },
  is_empty(value?: any) {
    if (!value && value !== 0) return true
    if (typeof value === 'object') return (Array.isArray(value) ? value : Object.keys(value)).length === 0
    return false
  },
  mask_passwords(obj?: any) {
    const KEYWORDS_TO_MASK: any = ['password', 'passphrase']
    for (const key of Object.keys(obj)) {
      if (KEYWORDS_TO_MASK.some((keyword?: any) => key.includes(keyword)) && obj[key]) {
        obj[key] = '*****'
      }
    }
  },
  highlight_pre($wrapper?: any) {
    frappe.require('syntax_highlighting.bundle.js').then(() => {
      $wrapper.find('pre').each(function (this: any) {
        hljs.highlightElement(this)
      })
    })
  },
  can_upload_public_files() {
    if (!frappe.defaults.is_enabled('only_allow_system_managers_to_upload_public_files')) {
      return true
    }
    return frappe.user.has_role(['System Manager', 'Administrator'])
  },
  get_help_siblings(this: any) {
    const navbar_settings = frappe.boot.navbar_settings
    let help_dropdown_items: any = []
    let custom_help_links = this.get_custom_help_links()
    help_dropdown_items = custom_help_links.concat(help_dropdown_items)
    navbar_settings.help_dropdown.forEach((element?: any) => {
      let dropdown_children: any = {
        name: element.name,
        label: element.item_label,
      }
      if (element.item_type === 'Route') {
        dropdown_children.url = element.route
      }
      if (element.item_type === 'Action') {
        dropdown_children.onClick = function () {
          frappe.utils.eval(element.action)
        }
      }
      help_dropdown_items.push(dropdown_children)
    })
    return help_dropdown_items
  },
  get_custom_help_links() {
    let route = frappe.get_route_str()
    let breadcrumbs = route.split('/')
    let links: any = []
    for (let i = 0; i < breadcrumbs.length; i++) {
      let r = route.split('/', i + 1)
      let key = r.join('/')
      let help_links = frappe.help.help_links[key] || []
      links = $.merge(links, help_links)
    }
    if (links.length) {
      links.push({ is_divider: true })
    }
    return links
  },
  eval_expression(value?: any, number_format?: any) {
    let parsed_value: any
    if (typeof value === 'string') {
      const parsed_components = value.match(/[^\d.,]+|[\d.,]+/g)
      parsed_value = value
      if (parsed_components !== null) {
        parsed_value = parsed_components
          .map((v?: any) => {
            return isNaN(parseFloat(v)) ? v : flt(v, null, number_format)
          })
          .join('')
      }
      if (parsed_value.match(/^[0-9+\-/*.() ]+$/)) {
        try {
          return (0, eval)(parsed_value)
        } catch (e: any) {
          return value
        }
      }
    }
    return value
  },
  get_installed_apps() {
    return frappe.boot.app_data.map((app?: any) => {
      return app.app_name
    })
  },
  is_sub_array(big?: any, small?: any) {
    let i = 0
    for (let num of big) {
      if (num === small[i]) i++
    }
    return i === small.length
  },
})
