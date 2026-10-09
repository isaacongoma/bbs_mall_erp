import { $, __, frappe } from '@/shared/frappe/runtime'
frappe.ui.make_app_page = function (opts?: any) {
  opts.parent.page = new frappe.ui.Page(opts)
  if (frappe.container?.page === opts.parent) {
    frappe.app.sidebar.apply_page_visibility()
  }
  return opts.parent.page
}
frappe.ui.pages = {}
const BTN_TYPE_TO_ES: any = {
  default: { variant: 'subtle' },
  secondary: { variant: 'subtle' },
  light: { variant: 'subtle' },
  primary: { variant: 'solid' },
  danger: { variant: 'solid', theme: 'red' },
  ghost: { variant: 'ghost' },
}
function es_opts_for_btn_type(type?: any) {
  return BTN_TYPE_TO_ES[type] || BTN_TYPE_TO_ES.default
}
frappe.ui.Page = class Page {
  [key: string]: any
  constructor(opts?: any) {
    $.extend(this, opts)
    this.set_document_title = true
    this.buttons = {}
    this.fields_dict = {}
    this.views = {}
    this.make()
    if (!Object.keys(opts).includes('hide_sidebar')) this.hide_sidebar = false
    if (!Object.keys(opts).includes('hide_dock')) this.hide_dock = false
    frappe.ui.pages[frappe.get_route_str()] = this
  }
  make(this: any) {
    this.wrapper = $(this.parent)
    this.add_main_section()
    this.setup_main_sidebar_toggle()
    this.setup_awesomebar()
  }
  setup_awesomebar() {
    if (frappe.boot.desk_settings.search_bar && !frappe.app.awesome_bar) {
      let awesome_bar = new frappe.search.AwesomeBar()
      awesome_bar.setup('.navbar-modal-search-mobile')
      frappe.app.awesome_bar = awesome_bar
      frappe.search.utils.make_function_searchable(frappe.utils.generate_tracking_url, __('Generate Tracking URL'))
      if (frappe.model.can_read('RQ Job')) {
        frappe.search.utils.make_function_searchable(function () {
          frappe.set_route('List', 'RQ Job')
        }, __('Background Jobs'))
      }
    }
  }
  get_empty_state(title?: any, message?: any, primary_action?: any) {
    return $(`<div class="page-card-container">
  			<div class="page-card">
  				<div class="page-card-head">
  					<span class="indicator blue">
  						${title}</span>
  				</div>
  				<p>${message}</p>
  				<div>
  					<button class="btn btn-primary btn-sm">${primary_action}</button>
  				</div>
  			</div>
  		</div>`)
  }
  load_lib(this: any, callback?: any) {
    frappe.require(this.required_libs, callback)
  }
  add_main_section(this: any) {
    $(frappe.render_template('page', {})).appendTo(this.wrapper)
    if (this.single_column) {
      this.add_view(
        'main',
        '<div class="layout-main">\
					<div class="layout-main-section-wrapper">\
						<div class="layout-main-section"></div>\
						<div class="layout-footer hide"></div>\
					</div>\
				</div>',
      )
    } else {
      this.add_view(
        'main',
        `
				<div class="layout-main layout-two-column">
					<div class="layout-side-section"></div>
					<div class="layout-main-section-wrapper">
						<div class="layout-main-section"></div>
						<div class="layout-footer hide"></div>
					</div>
				</div>
			`,
      )
      if (this.sidebar_position === 'Right') {
        this.wrapper.find('.layout-main-section-wrapper').insertBefore(this.wrapper.find('.layout-side-section'))
        this.wrapper.find('.layout-side-section').addClass('right')
      }
    }
    this.setup_page()
  }
  setup_page(this: any) {
    this.$title_area = this.wrapper.find('.title-area')
    this.$sub_title_area = this.wrapper.find('h6')
    if (this.title) this.set_title(this.title)
    if (this.icon) this.get_main_icon(this.icon)
    this.body = this.main = this.wrapper.find('.layout-main-section')
    this.container = this.wrapper.find('.page-body')
    this.sidebar = this.wrapper.find('.layout-side-section')
    this.footer = this.wrapper.find('.layout-footer')
    this.indicator = this.wrapper.find('.title-area .page-indicator-pill')
    this.page_actions = this.wrapper.find('.page-actions')
    this.filters = this.wrapper.find('.filters')
    this.page_head = this.wrapper.find('.page-head')
    this.btn_primary = this.page_actions.find('.primary-action')
    this.btn_secondary = this.page_actions.find('.secondary-action')
    this.menu = this.page_actions.find('.menu-btn-group .dropdown-menu')
    this.menu_btn_group = this.page_actions.find('.menu-btn-group')
    this.actions = this.page_actions.find('.actions-btn-group .dropdown-menu')
    this.actions_btn_group = this.page_actions.find('.actions-btn-group')
    this.standard_actions = this.page_actions.find('.standard-actions')
    this.custom_actions = this.page_actions.find('.custom-actions')
    this.custom_mobile_actions = this.page_actions.find('.custom-mobile-actions')
    this.page_form = $('<div class="page-form row hide"></div>').prependTo(this.main)
    this.inner_toolbar = this.custom_actions
    this.icon_group = this.page_actions.find('.page-icon-group')
    if (this.make_page) {
      this.make_page()
    }
    let menu_btn = this.menu_btn_group.find('button')
    menu_btn
      .attr('title', __('Menu'))
      .tooltip({ delay: { show: 600, hide: 100 } })
      .on('click mousedown', function (this: any) {
        $(this).tooltip('hide')
      })
    frappe.ui.keys.get_shortcut_group(this.page_actions[0]).add(menu_btn)
    this.menu_dropdown = new frappe.ui.Dropdown({
      trigger: menu_btn,
      align: 'end',
      options: () => this.build_dropdown_options(this.menu),
    })
    this.actions_dropdown = new frappe.ui.Dropdown({
      trigger: this.actions_btn_group.find('button'),
      align: 'end',
      options: () => this.build_dropdown_options(this.actions),
    })
    this.wrapper.on('hide', () => {
      this.menu_dropdown.close('owner')
      this.actions_dropdown.close('owner')
      this.wrapper.find('.inner-group-button, .custom-btn-group').each((_?: any, group?: any) => {
        $(group).data('es_dropdown')?.close('owner')
      })
    })
    let action_btn = this.actions_btn_group.find('button')
    let action_btn_label = action_btn.find('.es-button__label').addClass('hidden-xs actions-btn-group-label')
    frappe.ui.keys.get_shortcut_group(this.page_actions[0]).add(action_btn, action_btn_label)
    this.skip_link_to_main = $('<button>')
      .addClass('sr-only sr-only-focusable btn btn-primary-light my-2')
      .text(__('Navigate to main content'))
      .attr({ tabindex: 0, role: 'link' })
      .on('click', (e?: any) => {
        e.preventDefault()
        const main = this.main.get(0)
        main.setAttribute('tabindex', -1)
        main.focus()
        main.addEventListener(
          'blur',
          () => {
            main.removeAttribute('tabindex')
          },
          { once: true },
        )
      })
      .appendTo(this.sidebar)
  }
  set_indicator(this: any, label?: any, color?: any) {
    let indicator_html = `<span>${label}</span>`
    const is_mobile = frappe.is_mobile()
    if (is_mobile) {
      indicator_html = `<span class="indicator-doc-html" style="background-color: var(--${color}-400)"></span>`
    }
    this.clear_indicator().removeClass('hide').html(indicator_html).attr('data-theme', color)
    if (is_mobile) {
      this.indicator.attr('title', label)
      this.indicator.tooltip()
    }
  }
  add_action_icon(this: any, icon?: any, click?: any, css_class: any = '', tooltip_label?: any) {
    const button = $(`
			<button class="text-muted btn btn-default ${css_class} icon-btn">
				${frappe.utils.icon(icon)}
			</button>
		`)
    if (!tooltip_label) {
      tooltip_label = frappe.unscrub(icon)
    }
    button.appendTo(this.icon_group.removeClass('hide'))
    button.click(click)
    button.attr('title', __(tooltip_label)).tooltip({ delay: { show: 600, hide: 100 }, trigger: 'hover' })
    return button
  }
  setup_main_sidebar_toggle(this: any) {
    this.wrapper.find('.sidebar-toggle-btn.navbar-brand').on('click', () => {
      frappe.app.sidebar.set_height()
      frappe.app.sidebar.toggle_width()
      frappe.app.sidebar.prevent_scroll()
    })
  }
  clear_indicator(this: any) {
    return this.indicator.removeClass().removeAttr('data-theme').addClass('es-badge page-indicator-pill hide')
  }
  get_icon_label(icon?: any, label?: any) {
    let icon_name = icon
    let size = 'xs'
    if (typeof icon === 'object') {
      icon_name = icon.icon
      size = icon.size || 'xs'
    }
    return `${icon ? frappe.utils.icon(icon_name, size) : ''} <span class="hidden-xs"> ${__(label)} </span>`
  }
  set_action(this: any, btn?: any, opts?: any) {
    let me = this
    this.clear_action_of(btn)
    const icon = opts.icon && typeof opts.icon === 'object' ? opts.icon.icon : opts.icon
    const dress_opts: any = {
      label: opts.label,
      icon: icon,
      variant: opts.variant,
    }
    if (opts.working_label) {
      dress_opts.loading_label = opts.working_label
    }
    frappe.ui.button.dress(btn, dress_opts)
    btn
      .removeClass('hide')
      .prop('disabled', false)
      .attr('data-label', opts.label)
      .on('click', function (this: any) {
        if (btn.attr('aria-busy') === 'true') return
        let response = opts.click.apply(this, [btn])
        me.btn_disable_enable(btn, response)
      })
    if (opts.short_label) {
      btn.find('.es-button__label').addClass('hidden-xs')
      $('<span class="es-button__label hidden-lg"></span>')
        .text(opts.short_label)
        .insertAfter(btn.find('.es-button__label').first())
    } else if (opts.icon) {
      btn.find('.es-button__label').addClass('hidden-xs')
    }
    if (opts.working_label) {
      btn.attr('data-working-label', opts.working_label)
    }
    let text_span = btn.find('.es-button__label').first()
    frappe.ui.keys.get_shortcut_group(this).add(btn, text_span.length ? text_span : btn)
  }
  set_primary_action(this: any, label?: any, click?: any, icon?: any, working_label?: any) {
    this.set_action(this.btn_primary, {
      ...(label && typeof label === 'object' ? label : { label }),
      click: click,
      icon: icon,
      working_label: working_label,
      variant: 'solid',
    })
    return this.btn_primary
  }
  set_secondary_action(this: any, label?: any, click?: any, icon?: any, working_label?: any) {
    this.set_action(this.btn_secondary, {
      ...(label && typeof label === 'object' ? label : { label }),
      click: click,
      icon: icon,
      working_label: working_label,
      variant: 'subtle',
    })
    return this.btn_secondary
  }
  clear_action_of(btn?: any) {
    btn.addClass('hide').unbind('click').removeAttr('data-working-label')
  }
  clear_primary_action(this: any) {
    this.clear_action_of(this.btn_primary)
  }
  clear_secondary_action(this: any) {
    this.clear_action_of(this.btn_secondary)
  }
  clear_actions(this: any) {
    this.clear_primary_action()
    this.clear_secondary_action()
  }
  destroy_group_dropdowns($scope?: any) {
    $scope
      .find('.inner-group-button, .custom-btn-group')
      .addBack('.inner-group-button, .custom-btn-group')
      .each((_?: any, group?: any) => {
        $(group).data('es_dropdown')?.destroy()
      })
  }
  clear_custom_actions(this: any) {
    this.destroy_group_dropdowns(this.custom_actions)
    this.custom_actions.addClass('hide').empty()
    this.clear_mobile_custom_groups()
  }
  clear_mobile_custom_groups(this: any) {
    const $groups = this.custom_mobile_actions.children('.custom-btn-group:not(.view-switcher)')
    this.destroy_group_dropdowns($groups)
    $groups.remove()
  }
  clear_icons(this: any) {
    this.icon_group.addClass('hide').empty()
  }
  add_menu_item(this: any, label?: any, click?: any, standard?: any, shortcut?: any, show_parent?: any) {
    return this.add_dropdown_item({
      label,
      click,
      standard,
      parent: this.menu,
      shortcut,
      show_parent,
    })
  }
  add_custom_menu_item(
    this: any,
    parent?: any,
    label?: any,
    click?: any,
    standard?: any,
    shortcut?: any,
    icon: any = null,
  ) {
    return this.add_dropdown_item({
      label,
      click,
      standard,
      parent: parent,
      shortcut,
      icon,
    })
  }
  clear_menu(this: any) {
    this.clear_btn_group(this.menu)
  }
  show_menu(this: any) {
    this.menu_btn_group.removeClass('hide')
  }
  hide_menu(this: any) {
    this.menu_btn_group.addClass('hide')
  }
  show_icon_group(this: any) {
    this.icon_group.removeClass('hide')
  }
  hide_icon_group(this: any) {
    this.icon_group.addClass('hide')
  }
  show_actions_menu(this: any) {
    this.actions_btn_group.removeClass('hide')
  }
  hide_actions_menu(this: any) {
    this.actions_btn_group.addClass('hide')
  }
  add_action_item(this: any, label?: any, click?: any, standard?: any) {
    return this.add_dropdown_item({
      label,
      click,
      standard,
      parent: this.actions,
    })
  }
  add_actions_menu_item(this: any, label?: any, click?: any, standard?: any, shortcut?: any) {
    return this.add_dropdown_item({
      label,
      click,
      standard,
      shortcut,
      parent: this.actions,
      show_parent: false,
    })
  }
  clear_actions_menu(this: any) {
    this.clear_btn_group(this.actions)
  }
  add_dropdown_item(
    this: any,
    { label, click, standard, parent, shortcut, show_parent = true, icon = null, icon_right = null }: any,
  ) {
    if (show_parent) {
      parent.parent().removeClass('hide hidden-xl')
    }
    let $link = this.is_in_group_button_dropdown(parent, 'li > a.grey-link > span', label)
    if ($link) return $link
    let $li: any
    let $icon = ``
    if (icon) {
      $icon = `<span class="menu-item-icon flex align-items-center justify-items-center">${frappe.utils.icon(icon)}</span>`
    }
    const data_label = encodeURIComponent(label)
    if (shortcut) {
      let shortcut_obj = this.prepare_shortcut_obj(shortcut, click, label)
      $li = $(`
				<li>
					<a class="grey-link dropdown-item" href="#" onClick="return false;">
						${$icon}
						<span class="menu-item-label" data-label="${data_label}">${label}</span>
						<span class="menu-item-shortcut">${shortcut_obj.shortcut_label}</span>
					</a>
				</li>
			`)
      frappe.ui.keys.add_shortcut(shortcut_obj)
      $li.data('menu_shortcut', shortcut_obj.shortcut)
    } else {
      $li = $(`
				<li>
					<a class="grey-link dropdown-item" href="#" onClick="return false;">
						${$icon}
						<span class="menu-item-label" data-label="${data_label}">${label}</span>
					</a>
				</li>
			`)
    }
    $li.data('menu_click', click)
    if (icon) $li.data('menu_icon', icon)
    if (icon_right) $li.data('menu_icon_right', icon_right)
    $link = $li.find('a').on('click', (e?: any) => {
      if (e.ctrlKey || e.metaKey) {
        frappe.open_in_new_tab = true
      }
      return click()
    })
    if (standard) {
      $li.appendTo(parent)
    } else {
      this.divider = parent.find('.dropdown-divider.user-action')
      if (!this.divider.length) {
        this.divider = $('<li class="dropdown-divider user-action visible-xs"></li>').prependTo(parent)
      }
      $li.addClass('user-action').insertBefore(this.divider)
    }
    return $link
  }
  build_dropdown_options($parent?: any) {
    const internal: any = ['grey-link', 'dropdown-item', 'disabled', 'user-action']
    const responsive_hidden = (el?: any) =>
      (el.classList.contains('visible-xs') && window.matchMedia('(min-width: 576px)').matches) ||
      (el.classList.contains('hidden-xl') && window.matchMedia('(min-width: 992px)').matches)
    const segments: any = [[]]
    const nested_groups = new Map()
    $parent.children('li').each((_?: any, li?: any) => {
      if (li.classList.contains('dropdown-divider')) {
        if (!responsive_hidden(li) && segments[segments.length - 1].length) {
          segments.push([])
        }
        return
      }
      const $li = $(li)
      const a = $li.children('a').get(0)
      if (!a) return
      if (li.style.display === 'none' || a.style.display === 'none') return
      if (responsive_hidden(li) || responsive_hidden(a)) return
      const label = ($li.find('.menu-item-label').text() || $(a).text()).trim()
      if (!label) return
      const css_class = [...li.classList, ...a.classList].filter((c?: any) => !internal.includes(c)).join(' ')
      const click = $li.data('menu_click')
      const onclick = (e?: any) => {
        if (e && (e.ctrlKey || e.metaKey)) {
          frappe.open_in_new_tab = true
        }
        return click ? click() : a.click()
      }
      const nested = $li.data('menu_submenu')
      if (nested) {
        let submenu = nested_groups.get(nested.group)
        if (!submenu) {
          submenu = []
          nested_groups.set(nested.group, submenu)
          segments[segments.length - 1].push({
            label: nested.group,
            css_class: css_class || undefined,
            submenu,
          })
        }
        submenu.push({
          label: nested.label,
          disabled: a.classList.contains('disabled'),
          onclick,
        })
        return
      }
      segments[segments.length - 1].push({
        label,
        icon: $li.data('menu_icon') || undefined,
        icon_right: $li.data('menu_icon_right') || undefined,
        shortcut: $li.data('menu_shortcut') || undefined,
        disabled: a.classList.contains('disabled'),
        css_class: css_class || undefined,
        onclick,
      })
    })
    const groups = segments.filter((segment?: any) => segment.length)
    if (groups.length <= 1) return groups[0] || []
    return groups.map((options?: any) => ({ group: '', hide_label: true, options }))
  }
  prepare_shortcut_obj(this: any, shortcut?: any, click?: any, label?: any) {
    let shortcut_obj: any
    if (typeof shortcut === 'string') {
      shortcut_obj = { shortcut }
    } else {
      shortcut_obj = shortcut
    }
    shortcut_obj.shortcut_label = frappe.ui.keys.get_shortcut_label(shortcut_obj.shortcut)
    shortcut_obj.shortcut = shortcut_obj.shortcut.toLowerCase()
    if (!shortcut_obj.action) {
      shortcut_obj.action = click
    }
    if (!shortcut_obj.description) {
      shortcut_obj.description = label
    }
    shortcut_obj.page = this
    return shortcut_obj
  }
  is_in_group_button_dropdown(parent?: any, selector?: any, label?: any) {
    if (!selector) selector = 'li'
    if (!label || !parent) return false
    const item_selector = `${selector}[data-label="${encodeURIComponent(label)}"]`
    const existing_items = $(parent).find(item_selector)
    return existing_items?.length > 0 && existing_items
  }
  clear_btn_group(this: any, parent?: any) {
    if (parent.is(this.menu)) this.menu_dropdown?.close('owner')
    if (parent.is(this.actions)) this.actions_dropdown?.close('owner')
    parent.empty()
    parent.parent().addClass('hide')
  }
  add_divider(this: any) {
    return $('<li class="dropdown-divider"></li>').appendTo(this.menu)
  }
  get_or_add_inner_group_button(this: any, label?: any, align_right?: any) {
    let $group = this.inner_toolbar.find(`.inner-group-button[data-label="${encodeURIComponent(label)}"]`)
    if (!$group.length) {
      $group = $(`<div class="inner-group-button" data-label="${encodeURIComponent(label)}">
					<div role="presentation" class="dropdown-menu ${align_right ? 'dropdown-menu-right' : ''}"></div>
				</div>`).appendTo(this.inner_toolbar)
      const $btn = frappe.ui
        .button({
          label: label,
          icon_right: 'chevrons-up-down',
          css_class: 'ellipsis',
        })
        .prependTo($group)
      $group.data(
        'es_dropdown',
        new frappe.ui.Dropdown({
          trigger: $btn,
          align: align_right ? 'end' : 'start',
          options: () => this.build_inner_group_options($group.children('.dropdown-menu')),
        }),
      )
    }
    return $group
  }
  build_inner_group_options($store?: any) {
    const segments: any = [[]]
    $store.children().each((_?: any, el?: any) => {
      if (el.classList.contains('dropdown-divider')) {
        if (segments[segments.length - 1].length) segments.push([])
        return
      }
      if (el.tagName !== 'A' || el.style.display === 'none') return
      const label = $(el).text().trim()
      if (!label) return
      const internal: any = ['dropdown-item', 'disabled', 'btn', 'btn-danger', 'text-danger']
      const css_class = [...el.classList].filter((c?: any) => !internal.includes(c)).join(' ')
      segments[segments.length - 1].push({
        label,
        disabled: el.classList.contains('disabled'),
        theme: el.classList.contains('btn-danger') || el.classList.contains('text-danger') ? 'red' : undefined,
        css_class: css_class || undefined,
        onclick: () => $(el).trigger('click'),
      })
    })
    const groups = segments.filter((segment?: any) => segment.length)
    if (groups.length <= 1) return groups[0] || []
    return groups.map((options?: any) => ({ group: '', hide_label: true, options }))
  }
  get_inner_group_button(this: any, label?: any) {
    return this.inner_toolbar.find(`.inner-group-button[data-label="${encodeURIComponent(label)}"]`)
  }
  set_inner_btn_group_as_primary(this: any, label?: any) {
    const group = this.get_or_add_inner_group_button(label)
    const dropdown_items = group.find('.dropdown-menu .dropdown-item')
    if (dropdown_items.length > 0) {
      group.find('button').attr('data-variant', 'solid')
    } else {
      group.toggleClass('hide', true)
    }
  }
  btn_disable_enable(btn?: any, response?: any) {
    const busy = (on?: any) => (on ? btn.attr('aria-busy', 'true') : btn.removeAttr('aria-busy'))
    if (response && response.finally) {
      busy(true)
      response.finally(() => busy(false))
    } else if (response && response.always) {
      busy(true)
      response.always(() => busy(false))
    }
  }
  add_divider_to_button_group(this: any, group?: any) {
    let $group = this.get_or_add_inner_group_button(group)
    $('<li class="dropdown-divider"></li>').appendTo($group.find('.dropdown-menu'))
  }
  add_inner_button(this: any, label?: any, action?: any, group?: any, type: any = 'default', align_right: any = false) {
    let $group: any
    let me = this
    let _action = function (this: any) {
      let btn = $(this)
      let response = action()
      me.btn_disable_enable(btn, response)
    }
    let menu_item_label = group ? `${group} > ${label}` : label
    let menu_item = this.add_menu_item(menu_item_label, _action, false, false, false)
    if (group) {
      menu_item.closest('li').data('menu_submenu', { group, label })
    }
    menu_item.parent().addClass('hidden-xl')
    if (this.menu_btn_group.hasClass('hide')) {
      this.menu_btn_group.removeClass('hide').addClass('hidden-xl')
    }
    if (group) {
      $group = this.get_or_add_inner_group_button(group, align_right)
      $(this.inner_toolbar).removeClass('hide')
      if (!this.is_in_group_button_dropdown($group.find('.dropdown-menu'), 'a', label)) {
        return $(
          `<a class="dropdown-item" href="#" onclick="return false;" data-label="${encodeURIComponent(label)}">${label}</a>`,
        )
          .on('click', _action)
          .appendTo($group.find('.dropdown-menu'))
      }
    } else {
      let button = this.inner_toolbar.find(`button[data-label="${encodeURIComponent(label)}"]`)
      if (button.length == 0) {
        button = frappe.ui.button({
          label: __(label),
          ...es_opts_for_btn_type(type),
          css_class: 'ellipsis',
          attrs: { 'data-label': encodeURIComponent(label) },
        })
        button.on('click', _action)
        button.appendTo(this.inner_toolbar.removeClass('hide'))
      }
      return button
    }
  }
  remove_inner_button(this: any, label?: any, group?: any) {
    let $group: any
    if (typeof label === 'string') {
      label = [label]
    }
    label = label.map((l?: any) => __(l))
    if (group) {
      $group = this.get_inner_group_button(__(group))
      if ($group.length) {
        $group.find(`.dropdown-item[data-label="${encodeURIComponent(label)}"]`).remove()
      }
      if ($group.find('.dropdown-item').length === 0) {
        this.destroy_group_dropdowns($group)
        $group.remove()
      }
    } else {
      this.inner_toolbar.find(`button[data-label="${encodeURIComponent(label)}"]`).remove()
    }
  }
  change_inner_button_type(this: any, label?: any, group?: any, type?: any) {
    let $group: any
    let btn: any
    if (group) {
      $group = this.get_inner_group_button(__(group))
      if ($group.length) {
        btn = $group.find(`.dropdown-item[data-label="${encodeURIComponent(label)}"]`)
        if (btn) btn.removeClass().addClass(`btn btn-${type} ellipsis`)
      }
    } else {
      btn = this.inner_toolbar.find(`button[data-label="${encodeURIComponent(label)}"]`)
      if (btn.length) {
        const es = es_opts_for_btn_type(type)
        es.variant === 'subtle' ? btn.removeAttr('data-variant') : btn.attr('data-variant', es.variant)
        es.theme ? btn.attr('data-theme', es.theme) : btn.removeAttr('data-theme')
      }
    }
  }
  add_inner_message(this: any, message?: any) {
    let $message = $(`<span class='inner-page-message text-muted small'>${message}</div>`)
    this.inner_toolbar.find('.inner-page-message').remove()
    this.inner_toolbar.removeClass('hide').prepend($message)
    return $message
  }
  clear_inner_toolbar(this: any) {
    this.clear_custom_actions()
  }
  clear_user_actions(this: any) {
    this.menu.find('.user-action').remove()
  }
  get_title_area(this: any) {
    return this.$title_area
  }
  set_breadcrumbs(this: any, items?: any) {
    this.breadcrumbs = items || []
    this.legacy_breadcrumbs = null
    this.render_breadcrumbs()
  }
  get_breadcrumbs(this: any) {
    if (this.legacy_breadcrumbs) return frappe.breadcrumbs.resolve(this.legacy_breadcrumbs)
    return this.breadcrumbs || []
  }
  render_breadcrumbs(this: any) {
    const $nav = this.$title_area?.find('.navbar-breadcrumbs')
    if (!$nav?.length) return
    $nav.toggleClass('mobile-no-divider', !!frappe.is_mobile())
    this.$breadcrumbs = $nav.children('ol').first()
    if (!this.$breadcrumbs.length) {
      this.$breadcrumbs = $('<ol>').appendTo($nav)
    }
    const items = this.show_breadcrumbs === false ? [] : this.get_breadcrumbs()
    this.$breadcrumbs.empty().append(frappe.ui.breadcrumbs({ items }).children('ol').children())
  }
  set_title(this: any, title?: any, icon: any = null, strip: any = true, tab_title: any = '', tooltip_label: any = '') {
    if (!title) title = ''
    if (strip) {
      title = strip_html(title)
    }
    this.title = title
    if (this.set_document_title) {
      frappe.utils.set_title(tab_title || title)
    }
    const items = (this.breadcrumbs || []).slice()
    const last: any = { ...(items.pop() || {}) }
    last.label = title
    last.title = __(tooltip_label) || title
    delete last.href
    delete last.onclick
    if (icon) last.prefix = icon
    items.push(last)
    this.set_breadcrumbs(items)
  }
  set_title_sub(this: any, txt?: any) {
    this.$sub_title_area.html(txt).toggleClass('hide', !!!txt)
  }
  get_main_icon(this: any, icon?: any) {
    return this.$title_area.find('.title-icon').html(frappe.utils.icon(icon)).toggle(true)
  }
  add_help_button() {}
  add_button(this: any, label?: any, click?: any, opts?: any) {
    if (!opts) opts = {}
    const type = (opts.btn_class || 'btn-default').replace(/^btn-/, '')
    const known = Boolean(BTN_TYPE_TO_ES[type])
    let button = frappe.ui.button({
      label: label,
      icon: opts.icon,
      ...es_opts_for_btn_type(type),
      size: opts.btn_size === 'btn-xs' ? 'xs' : undefined,
      css_class: ['ellipsis', !known && opts.btn_class].filter(Boolean).join(' '),
      attrs: { 'data-label': encodeURIComponent(label) },
    })
    let menu_item = this.add_menu_item(label, click, false)
    menu_item.parent().addClass('hidden-xl')
    button.appendTo(this.custom_actions)
    button.on('click', click)
    this.custom_actions.removeClass('hide')
    return button
  }
  add_custom_button_group(this: any, label?: any, icon?: any, parent?: any) {
    let custom_btn_group = $(`
			<div class="custom-btn-group">
				<ul class="dropdown-menu" role="presentation"></ul>
			</div>
		`)
    let $button = frappe.ui.button({
      label: __(label),
      icon: icon,
      icon_right: 'chevrons-up-down',
      css_class: 'ellipsis',
    })
    $button.find('.es-button__label').addClass('custom-btn-group-label')
    if (icon) {
      $button.find('.es-button__label').addClass('hidden-xs')
      $button.children('svg').last().addClass('hidden-xs')
    }
    $button.prependTo(custom_btn_group)
    if (!parent) parent = frappe.is_mobile() ? this.custom_mobile_actions : this.custom_actions
    parent.removeClass('hide').append(custom_btn_group)
    const $store = custom_btn_group.find('.dropdown-menu')
    custom_btn_group.data(
      'es_dropdown',
      new frappe.ui.Dropdown({
        trigger: $button,
        options: () => this.build_dropdown_options($store),
      }),
    )
    return $store
  }
  add_dropdown_button(parent?: any, label?: any, click?: any, icon?: any) {
    frappe.ui.toolbar.add_dropdown_button(parent, label, click, icon)
  }
  add_label(this: any, label?: any) {
    this.show_form()
    return $("<label class='col-md-1 page-only-label'>" + label + ' </label>').appendTo(this.page_form)
  }
  add_select(this: any, label?: any, options?: any) {
    let field = this.add_field({ label: label, fieldtype: 'Select' })
    return field.$wrapper.find('select').empty().add_options(options)
  }
  add_data(this: any, label?: any) {
    let field = this.add_field({ label: label, fieldtype: 'Data' })
    return field.$wrapper.find('input').attr('placeholder', label)
  }
  add_date(this: any, label?: any, date?: any) {
    let field = this.add_field({ label: label, fieldtype: 'Date', default: date })
    return field.$wrapper.find('input').attr('placeholder', label)
  }
  add_check(this: any, label?: any) {
    return $("<div class='checkbox'><label><input type='checkbox'>" + label + '</label></div>')
      .appendTo(this.page_form)
      .find('input')
  }
  add_break(this: any) {
    this.page_form.append('<div class="clearfix invisible-xs"></div>')
  }
  add_field(this: any, df?: any, parent?: any) {
    this.show_form()
    if (!df.placeholder) {
      df.placeholder = df.label
    }
    df.input_class = 'input-xs'
    let f = frappe.ui.form.make_control({
      df: df,
      parent: parent || this.page_form,
      only_input: df.fieldtype == 'Check' ? false : true,
    })
    f.refresh()
    $(f.wrapper)
      .addClass('col-md-2')
      .attr('title', __(df.label, null, df.parent))
      .tooltip({
        delay: { show: 600, hide: 100 },
        trigger: 'hover',
      })
    if (parent == this.filters) {
      this.restyle_field(f)
    }
    if (df.fieldtype == 'HTML') {
      return
    }
    if (!f.$input) f.make_input()
    f.$input.attr('placeholder', __(df.label, null, df.parent))
    if (df.fieldtype === 'Check') {
      $(f.wrapper).find(':first-child').removeClass('col-md-offset-4 col-md-8')
    }
    if (df.fieldtype == 'Button') {
      $(f.wrapper).find('.page-control-label').html('&nbsp;')
      f.$input.addClass('btn-xs').css({ width: '100%', 'margin-top': '-1px' })
    }
    if (df['default']) f.set_input(df['default'])
    this.fields_dict[df.fieldname || df.label] = f
    return f
  }
  restyle_field(f?: any) {
    $(f.wrapper).removeClass('col-md-2').css('margin', '0px')
    $(f.wrapper).find('select').css('width', '140px')
    $(f.wrapper).find('.select-icon').css('top', '2px')
  }
  clear_fields(this: any) {
    this.page_form.empty()
  }
  show_form(this: any) {
    this.page_form.removeClass('hide')
  }
  hide_form(this: any) {
    this.page_form.addClass('hide')
  }
  get_form_values(this: any) {
    let values: any = {}
    for (let fieldname in this.fields_dict) {
      let field = this.fields_dict[fieldname]
      values[fieldname] = field.get_value()
    }
    return values
  }
  add_view(this: any, name?: any, html?: any) {
    let element = html
    if (typeof html === 'string') {
      element = $(html)
    }
    this.views[name] = element.appendTo($(this.wrapper).find('.page-content'))
    if (!this.current_view) {
      this.current_view = this.views[name]
    } else {
      this.views[name].toggle(false)
    }
    return this.views[name]
  }
  set_view(this: any, name?: any) {
    if (this.current_view_name === name) return
    this.current_view && this.current_view.toggle(false)
    this.current_view = this.views[name]
    this.previous_view_name = this.current_view_name
    this.current_view_name = name
    this.views[name].toggle(true)
    this.wrapper.trigger('view-change')
  }
}
