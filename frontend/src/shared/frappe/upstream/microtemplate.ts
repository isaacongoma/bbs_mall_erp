import { __, frappe } from '@/shared/frappe/runtime'
frappe.template = { compiled: {}, debug: {} }
frappe.template.compile = function (str?: any, name?: any) {
  let fn_str: any
  let key = name || str
  if (!frappe.template.compiled[key]) {
    if (str.indexOf("'") !== -1) {
      str.replace(/'/g, "\\'")
    }
    str = str.replace(/{{/g, '{%=').replace(/}}/g, '%}')
    str = str.replace(/{%\s?if\s?\s?not\s?([^\(][^%{]+)\s?%}/g, '{% if (! $1) { %}')
    str = str.replace(/{%\s?if\s?([^\(][^%{]+)\s?%}/g, '{% if ($1) { %}')
    function replacer(_match?: any, p1?: any, p2?: any) {
      let i = frappe.utils.get_random(3)
      let len = frappe.utils.get_random(3)
      return (
        '{% for (var ' +
        i +
        '=0, ' +
        len +
        '=' +
        p2 +
        '.length; ' +
        i +
        '<' +
        len +
        '; ' +
        i +
        '++) { var ' +
        p1 +
        ' = ' +
        p2 +
        '[' +
        i +
        ']; ' +
        p1 +
        '._index = ' +
        i +
        '; %}'
      )
    }
    str = str.replace(/{%\s?for\s([a-z._]+)\sin\s([a-z._]+)\s?%}/g, replacer)
    str = str.replace(/{%\s?endif\s?%}/g, '{% }; %}')
    str = str.replace(/{%\s?else\s?%}/g, '{% } else { %}')
    str = str.replace(/{%\s?endfor\s?%}/g, '{% }; %}')
    fn_str =
      'var _p=[],print=function(){_p.push.apply(_p,arguments)};' +
      "with(obj){\n_p.push('" +
      str
        .replace(/[\r\t\n]/g, ' ')
        .split('{%')
        .join('\t')
        .replace(/((^|%})[^\t]*)'/g, '$1\r')
        .replace(/\t=(.*?)%}/g, "',$1,'")
        .split('\t')
        .join("');\n")
        .split('%}')
        .join("\n_p.push('")
        .split('\r')
        .join("\\'") +
      "');}return _p.join('');"
    frappe.template.debug[name] = fn_str
    try {
      frappe.template.compiled[key] = new Function('obj', fn_str)
    } catch (e: any) {
      console.log('Error in Template:')
      console.log(fn_str)
      if (e.lineNumber) {
        console.log('Error in Line ' + e.lineNumber + ', Col ' + e.columnNumber + ':')
        console.log(fn_str.split('\n')[e.lineNumber - 1])
      }
    }
  }
  return frappe.template.compiled[key]
}
frappe.render = function (str?: any, data?: any, name?: any) {
  return frappe.template.compile(str, name)(data)
}
frappe.render_template = function (name?: any, data?: any) {
  let template: any
  if (name.indexOf(' ') !== -1) {
    template = name
  } else {
    template = frappe.templates[name]
  }
  if (data === undefined) {
    data = {}
  }
  if (!template) {
    frappe.throw(`Template <b>${name}</b> not found.`)
  }
  return frappe.render(template, data, name)
}
;((frappe.render_grid = function (opts?: any) {
  if (opts.grid) {
    opts.columns = opts.grid.getColumns()
    opts.data = opts.grid.getData().getItems()
  }
  if (
    opts.print_settings &&
    opts.print_settings.orientation &&
    opts.print_settings.orientation.toLowerCase() === 'landscape'
  ) {
    opts.landscape = true
  }
  if (opts.landscape == null) {
    if (opts.columns && opts.columns.length > 10) {
      opts.landscape = true
    } else {
      opts.landscape = false
    }
  }
  if (!opts.content) {
    opts.content = frappe.render_template(opts.template || 'print_grid', opts)
  }
  opts.base_url = frappe.urllib.get_base_url()
  opts.print_css = frappe.boot.print_css
  ;((opts.lang = opts.lang || frappe.boot.lang),
    (opts.layout_direction = opts.layout_direction || frappe.utils.is_rtl() ? 'rtl' : 'ltr'))
  let html = frappe.render_template('print_template', opts)
  let w: any = window.open()
  if (!w) {
    frappe.msgprint(__('Please enable pop-ups in your browser'))
  }
  w.document.write(html)
  const footer = w.document.getElementById('footer-html')
  if (footer) {
    footer.classList.remove('visible-pdf')
    footer.style.marginTop = 'auto'
    const print_format = w.document.querySelector('.print-format')
    if (print_format) {
      print_format.style.display = 'flex'
      print_format.style.flexDirection = 'column'
      print_format.style.minHeight = '100vh'
    }
  }
  w.document.close()
}),
  (frappe.render_tree = function (opts?: any) {
    opts.base_url = frappe.urllib.get_base_url()
    opts.landscape = false
    opts.print_css = frappe.boot.print_css
    opts.print_format_css_path = frappe.assets.bundled_asset('print_format.bundle.css')
    let tree = frappe.render_template('print_tree', opts)
    let w: any = window.open()
    if (!w) {
      frappe.msgprint(__('Please enable pop-ups in your browser'))
    }
    w.document.write(tree)
    w.document.close()
  }))
function parse_server_messages(response?: any) {
  try {
    const body = JSON.parse(new TextDecoder().decode(response))
    return body._server_messages ? JSON.parse(body._server_messages) : null
  } catch {
    return null
  }
}
function pdf_size_message() {
  return __(
    'The report may be too large to render in a single request. Narrow the filters and try again, or use Print and save as PDF from your browser.',
  )
}
function show_pdf_error(message?: any, response?: any) {
  const server_messages = parse_server_messages(response)
  if (server_messages) {
    frappe.msgprint(server_messages)
    return
  }
  frappe.msgprint({
    title: __('Could not generate PDF'),
    message: message,
    indicator: 'red',
  })
}
frappe.render_pdf = function (html?: any, opts: any = {}) {
  let formData = new FormData()
  formData.append('html', html)
  if (opts.orientation) {
    formData.append('orientation', opts.orientation)
  }
  let blob = new Blob([], { type: 'text/xml' })
  formData.append('blob', blob)
  let xhr = new XMLHttpRequest()
  xhr.open('POST', '/api/method/frappe.utils.print_format.report_to_pdf')
  xhr.setRequestHeader('X-Frappe-CSRF-Token', frappe.csrf_token)
  xhr.responseType = 'arraybuffer'
  xhr.timeout = 10 * 60 * 1000
  frappe.dom?.freeze(__('Generating PDF...'))
  xhr.onload = function (this: any, success?: any) {
    frappe.dom?.unfreeze()
    if (this.status !== 200) {
      const timed_out = [408, 502, 503, 504].includes(this.status)
      show_pdf_error(
        timed_out ? pdf_size_message() : __('Check the Error Log for details.'),
        success.currentTarget.response,
      )
      return
    }
    let blob = new Blob([success.currentTarget.response], { type: 'application/pdf' })
    let objectUrl = URL.createObjectURL(blob)
    let hidden_a_tag = document.createElement('a')
    document.body.appendChild(hidden_a_tag)
    hidden_a_tag.style = 'display: none'
    hidden_a_tag.href = objectUrl
    hidden_a_tag.download = opts.report_name || 'report.pdf'
    hidden_a_tag.click()
    window.URL.revokeObjectURL(objectUrl)
  }
  xhr.ontimeout = function () {
    frappe.dom?.unfreeze()
    show_pdf_error(pdf_size_message())
  }
  xhr.onerror = function () {
    frappe.dom?.unfreeze()
    show_pdf_error(__('The request could not be completed. Check your connection and try again.'))
  }
  xhr.send(formData)
}
