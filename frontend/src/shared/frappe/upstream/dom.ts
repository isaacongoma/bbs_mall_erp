import { $, __, cstr, frappe, jQuery, repl } from '@/shared/frappe/runtime'
frappe.provide('frappe.dom')
frappe.dom = {
  id_count: 0,
  freeze_count: 0,
  by_id: function (id?: any) {
    return document.getElementById(id)
  },
  get_unique_id: function () {
    const id = 'unique-' + frappe.dom.id_count
    frappe.dom.id_count++
    return id
  },
  set_unique_id: function (ele?: any) {
    let $ele = $(ele)
    if ($ele.attr('id')) {
      return $ele.attr('id')
    }
    let id = 'unique-' + frappe.dom.id_count
    $ele.attr('id', id)
    frappe.dom.id_count++
    return id
  },
  eval: function (txt?: any) {
    if (!txt) return
    new Function(txt)()
  },
  remove_script_and_style: function (this: any, txt?: any) {
    const evil_tags: any = ['script', 'style', 'noscript', 'title', 'meta', 'base', 'head']
    const unsafe_tags: any = ['link']
    if (!this.unsafe_tags_regex) {
      const evil_and_unsafe_tags = evil_tags.concat(unsafe_tags)
      const regex_str = evil_and_unsafe_tags.map((t?: any) => `<([\\s]*)${t}`).join('|')
      this.unsafe_tags_regex = new RegExp(regex_str, 'im')
    }
    if (!txt || !this.unsafe_tags_regex.test(txt)) {
      return txt
    }
    const parser = new DOMParser()
    const doc = parser.parseFromString(txt, 'text/html')
    const body = doc.body
    let found = !!doc.head.innerHTML
    for (const tag of evil_tags) {
      for (const element of body.getElementsByTagName(tag)) {
        found = true
        element.parentNode?.removeChild(element)
      }
    }
    for (const element of body.getElementsByTagName('link')) {
      const relation = element.getAttribute('rel')
      if (relation && relation.toLowerCase().trim() === 'stylesheet') {
        found = true
        element.parentNode?.removeChild(element)
      }
    }
    if (found) {
      return body.innerHTML
    } else {
      return txt
    }
  },
  is_element_in_viewport: function (el?: any, tolerance: any = 0) {
    if (typeof jQuery === 'function' && el instanceof jQuery) {
      el = el[0]
    }
    let rect = el.getBoundingClientRect()
    return (
      rect.top + tolerance >= 0 &&
      rect.left + tolerance >= 0 &&
      rect.bottom - tolerance <= $(window).height() &&
      rect.right - tolerance <= $(window).width()
    )
  },
  is_element_in_modal(element?: any) {
    return Boolean($(element).parents('.modal').length)
  },
  set_style: function (txt?: any, id?: any) {
    let element: any
    if (!txt) return
    let se = document.createElement('style')
    se.type = 'text/css'
    if (id) {
      element = document.getElementById(id)
      if (element) {
        element.parentNode?.removeChild(element)
      }
      se.id = id
    }
    if ((se as any).styleSheet) {
      ;(se as any).styleSheet.cssText = txt
    } else {
      se.appendChild(document.createTextNode(txt))
    }
    document.getElementsByTagName('head')[0]?.appendChild(se)
    return se
  },
  add: function (parent?: any, newtag?: any, className?: any, cs?: any, innerHTML?: any, onclick?: any) {
    if (parent && parent.substr) parent = frappe.dom.by_id(parent)
    let c = document.createElement(newtag)
    if (parent) parent.appendChild(c)
    if (className) {
      if (newtag.toLowerCase() == 'img') c.src = className
      else c.className = className
    }
    if (cs) frappe.dom.css(c, cs)
    if (innerHTML) c.innerHTML = innerHTML
    if (onclick) c.onclick = onclick
    return c
  },
  css: function (ele?: any, s?: any) {
    if (ele && s) {
      $.extend(ele.style, s)
    }
    return ele
  },
  activate: function ($parent?: any, $child?: any, common_class?: any, active_class: any = 'active') {
    $parent.find(`.${common_class}.${active_class}`).removeClass(active_class)
    $child.addClass(active_class)
  },
  freeze: function (msg?: any, css_class?: any) {
    let freeze: any
    if (!$('#freeze').length) {
      const $container = $('#body').length ? $('#body') : $(document.body)
      freeze = $('<div id="freeze" class="modal-backdrop fade"></div>')
        .on('click', function () {
          const open_grid_row = frappe.ui.form.get_open_grid_form?.()
          if (open_grid_row) {
            open_grid_row.toggle_view()
            return false
          }
        })
        .appendTo($container)
      freeze.html(
        repl(
          '<div class="freeze-message-container"><div class="freeze-message"><p class="lead">%(msg)s</p></div></div>',
          { msg: msg || '' },
        ),
      )
      setTimeout(function () {
        freeze.addClass('in')
      }, 1)
    } else {
      $('#freeze').addClass('in')
    }
    if (css_class) {
      $('#freeze').addClass(css_class)
    }
    frappe.dom.freeze_count++
  },
  unfreeze: function () {
    if (!frappe.dom.freeze_count) return
    frappe.dom.freeze_count--
    if (!frappe.dom.freeze_count) {
      $('#freeze').removeClass('in').remove()
    }
  },
  save_selection: function () {
    let sel: any, ranges: any
    if (window.getSelection) {
      sel = window.getSelection()
      if (sel.getRangeAt && sel.rangeCount) {
        ranges = []
        for (let i = 0, len = sel.rangeCount; i < len; ++i) {
          ranges.push(sel.getRangeAt(i))
        }
        return ranges
      }
    } else if (document.selection && document.selection.createRange) {
      return document.selection.createRange()
    }
    return null
  },
  restore_selection: function (savedSel?: any) {
    let sel: any
    if (savedSel) {
      if (window.getSelection) {
        sel = window.getSelection()
        sel.removeAllRanges()
        for (let i = 0, len = savedSel.length; i < len; ++i) {
          sel.addRange(savedSel[i])
        }
      } else if (document.selection && savedSel.select) {
        savedSel.select()
      }
    }
  },
  is_touchscreen: function () {
    return 'ontouchstart' in window
  },
  handle_broken_images(container?: any) {
    $(container)
      .find('img')
      .on('error', (e?: any) => {
        const $img = $(e.currentTarget)
        $img.addClass('no-image')
      })
  },
  scroll_to_bottom(container?: any) {
    const $container = $(container)
    $container.scrollTop($container[0].scrollHeight)
  },
  file_to_base64(file_obj?: any) {
    return new Promise((resolve?: any) => {
      const reader = new FileReader()
      reader.onload = function () {
        resolve(reader.result)
      }
      reader.readAsDataURL(file_obj)
    })
  },
  scroll_to_section(section_name?: any) {
    setTimeout(() => {
      const section = $(`a:contains("${section_name}")`)
      if (section.length) {
        if (section.parent().hasClass('collapsed')) {
          section.click()
        }
        frappe.ui.scroll(section.parent().parent())
      }
    }, 200)
  },
  pixel_to_inches(pixels?: any) {
    const div = $('<div id="dpi" style="height: 1in; width: 1in; left: 100%; position: fixed; top: 100%;"></div>')
    div.appendTo(document.body)
    const dpi_x = document.getElementById('dpi')!.offsetWidth
    const inches = pixels / dpi_x
    div.remove()
    return inches
  },
}
frappe.ellipsis = function (text?: any, max?: any) {
  if (!max) max = 20
  text = cstr(text)
  if (text.length > max) {
    text = text.substr(0, max) + '...'
  }
  return text
}
frappe.run_serially = function (tasks?: any) {
  let result = Promise.resolve()
  tasks.forEach((task?: any) => {
    if (task) {
      result = result.then ? result.then(task) : Promise.resolve()
    }
  })
  return result
}
frappe.load_image = (src?: any, onload?: any, onerror?: any, preprocess: any = () => {}) => {
  let tester = new Image()
  tester.onload = function (this: any) {
    onload(this)
  }
  tester.onerror = onerror
  preprocess(tester)
  tester.src = src
}
frappe.timeout = (seconds?: any) => {
  return new Promise((resolve?: any) => {
    setTimeout(() => resolve(), seconds * 1000)
  })
}
frappe.scrub = frappe.slug = function (text?: any, spacer: any = '_') {
  return text.replace(/ /g, spacer).toLowerCase()
}
frappe.unscrub = function (txt?: any) {
  return frappe.model.unscrub(txt)
}
frappe.get_data_pill = (
  label?: any,
  target_id: any = null,
  remove_action: any = null,
  image: any = null,
  colored: any = false,
) => {
  let color = '',
    style = ''
  if (colored) {
    color = frappe.get_palette(label)
    style = `background-color: var(${color[0]}); color: var(${color[1]})`
  }
  let data_pill_wrapper = $(`
		<button class="data-pill btn" style="${style}">
			<div class="flex align-center ellipsis">
				${image ? image : ''}
				<span class="pill-label ellipsis">${label} </span>
			</div>
		</button>
	`)
  if (remove_action) {
    let remove_btn = $(`
			<span class="remove-btn cursor-pointer flex align-items-center">
				${frappe.utils.icon('x', 'sm')}
			</span>
		`)
    if (typeof remove_action === 'function') {
      remove_btn.click(() => {
        remove_action(target_id || label, data_pill_wrapper)
      })
    }
    data_pill_wrapper.append(remove_btn)
  }
  return data_pill_wrapper
}
frappe.get_modal = function (title?: any, content?: any) {
  return $(`<div class="modal fade" style="overflow: auto;" tabindex="-1">
		<div class="modal-dialog">
			<div class="modal-content">
				<div class="modal-header">
					<div class="fill-width flex title-section">
						<span class="indicator hidden"></span>
						<h4 class="modal-title">${title}</h4>
					</div>
					<div class="modal-actions d-flex">
						${frappe.ui.button.html({
              icon: 'minimize-2',
              variant: 'ghost',
              title: __('Minimize'),
              css_class: 'btn-modal-minimize icon-btn hide',
            })}
						${frappe.ui.button.html({
              icon: 'x',
              variant: 'ghost',
              title: __('Close'),
              css_class: 'btn-modal-close icon-btn',
              attrs: { 'data-dismiss': 'modal' },
            })}
					</div>
				</div>
				<div class="modal-body ui-front">${content}</div>
				<div class="modal-footer hide">
					<div class="custom-actions"></div>
					<div class="standard-actions">
						${frappe.ui.button.html({
              label: '',
              css_class: 'btn-modal-secondary hide',
            })}
						${frappe.ui.button.html({
              label: __('Confirm'),
              variant: 'solid',
              css_class: 'btn-modal-primary hide',
            })}
					</div>
				</div>
			</div>
		</div>
	</div>`)
}
frappe.is_online = function () {
  if (frappe.boot.developer_mode == 1) {
    return true
  }
  if ('onLine' in navigator) {
    return navigator.onLine
  }
  return true
}
frappe.create_shadow_element = function (wrapper?: any, html?: any, css?: any, js?: any) {
  let random_id = 'custom-block-' + frappe.utils.get_random(5).toLowerCase()
  class CustomBlock extends HTMLElement {
    [key: string]: any
    constructor() {
      super()
      let div = document.createElement('div')
      div.innerHTML = frappe.dom.remove_script_and_style(html)
      let link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = frappe.assets.bundled_asset('desk.bundle.css')
      let style = document.createElement('style')
      style.textContent = css
      let script = document.createElement('script')
      script.textContent = `
				(function() {
					let cname = ${JSON.stringify(random_id)};
					let root_element = document.querySelector(cname).shadowRoot;
					${js}
				})();
			`
      this.attachShadow({ mode: 'open' })
      this.shadowRoot?.appendChild(link)
      this.shadowRoot?.appendChild(div)
      this.shadowRoot?.appendChild(style)
      this.shadowRoot?.appendChild(script)
    }
  }
  if (!customElements.get(random_id)) {
    customElements.define(random_id, CustomBlock)
  }
  wrapper.innerHTML = `<${random_id}></${random_id}>`
}
$(window).on('online', function () {
  if (document.hidden) return
  frappe.ui.toast({
    id: 'connection-status',
    type: 'success',
    message: __('You are connected to internet.'),
    description: '',
    duration: 7000,
  })
})
$(window).on('offline', function () {
  if (document.hidden) return
  frappe.ui.toast({
    id: 'connection-status',
    type: 'warning',
    message: __('Connection lost. Some features might not work.'),
    description: '',
    duration: 7000,
  })
})
