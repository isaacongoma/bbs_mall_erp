import { __, frappe } from '@/shared/frappe/runtime'
import { validated, safe_href, shortcut_keys } from './utils.js'
import { place } from './position.js'
const THEMES: any = ['gray', 'red']
function is_thenable(value?: any) {
  return !!value && typeof value.then === 'function'
}
const SUBMENU_OFFSET = 4
const SUBMENU_OPEN_DELAY = 150
const EXIT_MS = 140
const TYPEAHEAD_RESET_MS = 1000
const GRACE_MS = 300
const GRACE_PAD = 5
function point_in_polygon(x?: any, y?: any, polygon?: any) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}
function is_group(entry?: any) {
  return entry && typeof entry === 'object' && 'group' in entry && Array.isArray(entry.options)
}
export function normalize_options(options?: any) {
  const groups: any = []
  let current: any = null
  const visible = (items?: any) =>
    (items || []).filter(Boolean).filter((item?: any) => (item.condition ? item.condition() : true))
  const flush = () => {
    if (current && current.options.length) groups.push(current)
    current = null
  }
  for (const entry of options || []) {
    if (!entry) continue
    if (is_group(entry)) {
      flush()
      const items = visible(entry.options)
      if (!items.length) continue
      groups.push({
        group: entry.group || '',
        hide_label: !!entry.hide_label,
        options: items,
      })
      continue
    }
    if (entry.condition && !entry.condition()) continue
    if (!current) current = { group: '', hide_label: true, options: [] }
    current.options.push(entry as any)
  }
  flush()
  return groups
}
function icon_html(name?: any, svg_class?: any, component?: any) {
  if (typeof name !== 'string' || !/^[a-z0-9-]+$/i.test(name)) {
    console.warn(`frappe.ui.${component}: icons take a lucide icon name, got "${name}"`)
    return ''
  }
  return frappe.utils.icon(name, 'sm', '', '', svg_class, true)
}
function assign_mnemonic(label_el?: any, text?: any, taken?: any) {
  for (let i = 0; i < text.length; i++) {
    const letter = text[i].toLowerCase()
    if (letter < 'a' || letter > 'z' || taken.has(letter)) continue
    taken.add(letter)
    const mark = document.createElement('span')
    mark.className = 'es-menu__mnemonic'
    mark.textContent = text[i]
    label_el.append(document.createTextNode(text.slice(0, i)), mark, document.createTextNode(text.slice(i + 1)))
    return letter
  }
  label_el.textContent = text
  return null
}
function build_item(item: any, { reserve_icon_space, component, taken }: any) {
  const href = item.submenu || item.disabled ? null : safe_href(item.href, component)
  const el = document.createElement(href ? 'a' : 'button')
  el.className = 'es-menu__item'
  if (item.css_class) el.className += ` ${item.css_class}`
  el.setAttribute('role', 'menuitem')
  el.setAttribute('tabindex', '-1')
  if (href) (el as any).href = href
  else el.type = 'button'
  if (href && item.target) {
    ;(el as any).target = item.target
    if (item.target === '_blank') (el as any).rel = 'noopener noreferrer'
  }
  if (item.disabled) {
    el.setAttribute('data-disabled', '')
    el.setAttribute('aria-disabled', 'true')
    ;(el as any).disabled = true
  }
  if (item.selected) el.setAttribute('data-state', 'checked')
  if (validated(item.theme, THEMES, 'theme', component) === 'red') {
    el.setAttribute('data-theme', 'red')
  }
  const image = safe_href(item.image, component)
  if (item.icon) {
    el.insertAdjacentHTML('beforeend', icon_html(item.icon, '', component))
  } else if (image) {
    const img = document.createElement('img')
    img.className = 'es-menu__image'
    img.src = image
    img.alt = ''
    el.appendChild(img)
  } else if (reserve_icon_space) {
    const space = document.createElement('span')
    space.className = 'es-menu__icon-space'
    space.setAttribute('aria-hidden', 'true')
    el.appendChild(space)
  }
  const label = document.createElement('span')
  label.className = 'es-menu__label'
  const label_text = item.label || ''
  let mnemonic = null
  if (taken && label_text && !item.disabled && !item.shortcut) {
    mnemonic = assign_mnemonic(label, label_text, taken)
  } else {
    label.textContent = label_text
  }
  if (item.description) {
    const description = document.createElement('span')
    description.className = 'es-menu__description'
    description.textContent = item.description
    label.appendChild(description)
  }
  el.appendChild(label)
  if (item.shortcut) {
    const shortcut = document.createElement('span')
    shortcut.className = 'es-menu__shortcut'
    shortcut.setAttribute('aria-hidden', 'true')
    for (const key of shortcut_keys(item.shortcut)) {
      if (shortcut.childNodes.length && !frappe.utils.is_mac()) {
        shortcut.append('+')
      }
      const kbd = document.createElement('kbd')
      kbd.textContent = key
      shortcut.appendChild(kbd)
    }
    el.appendChild(shortcut)
  }
  if (item.icon_right && !item.submenu) {
    el.insertAdjacentHTML('beforeend', icon_html(item.icon_right, 'es-menu__icon-right', component))
  }
  if (item.submenu) {
    el.setAttribute('aria-haspopup', 'menu')
    el.setAttribute('aria-expanded', 'false')
    el.insertAdjacentHTML('beforeend', icon_html('chevron-right', 'es-menu__chevron', component))
  }
  return { el, mnemonic }
}
function render_content(panel: any, groups: any, { empty_text, component }: any) {
  const rows: any = []
  const taken = new Set()
  if (!groups.length) {
    const empty = document.createElement('div')
    empty.className = 'es-menu__empty'
    empty.textContent = empty_text || __('No options')
    panel.appendChild(empty)
    return rows
  }
  for (const group of groups) {
    const group_el = document.createElement('div')
    group_el.className = 'es-menu__group'
    group_el.setAttribute('role', 'group')
    if (group.group && !group.hide_label) {
      const label = document.createElement('div')
      label.className = 'es-menu__group-label'
      label.id = frappe.utils.get_random(8)
      label.textContent = group.group
      group_el.setAttribute('aria-labelledby', label.id)
      group_el.appendChild(label)
    }
    const reserve_icon_space = group.options.some((item?: any) => item.icon || item.image)
    for (const item of group.options) {
      const { el, mnemonic } = build_item(item, {
        reserve_icon_space,
        component,
        taken,
      })
      rows.push({ el, item, mnemonic })
      group_el.appendChild(el)
    }
    panel.appendChild(group_el)
  }
  return rows
}
function render_loading(panel?: any) {
  const loading = document.createElement('div')
  loading.className = 'es-menu__loading'
  const spinner = document.createElement('span')
  spinner.className = 'es-spinner'
  spinner.setAttribute('aria-hidden', 'true')
  const text = document.createElement('span')
  text.textContent = __('Loading...')
  loading.append(spinner, text)
  panel.appendChild(loading)
  panel.setAttribute('aria-busy', 'true')
}
function build_panel(groups: any, { empty_text, component }: any) {
  const panel = document.createElement('div')
  panel.className = 'es-menu'
  panel.setAttribute('role', 'menu')
  panel.setAttribute('tabindex', '-1')
  if (groups === null) {
    render_loading(panel)
    return { panel, rows: [] }
  }
  const rows = render_content(panel, groups, { empty_text, component })
  return { panel, rows }
}
export class MenuTree {
  [key: string]: any
  constructor({ options, empty_text, component, anchor, ignore, on_close, lock_scroll }: any) {
    this.options = options
    this.empty_text = empty_text
    this.component = component || 'dropdown'
    this.anchor = anchor
    this.ignore = ignore || []
    this.on_close = on_close
    this.lock_scroll = lock_scroll
    this.panels = []
    this.closed = false
    this.submenu_cache = new Map()
    this.submenu_timer = null
    this.grace = null
    this.typeahead_buffer = ''
    this.typeahead_timer = null
    this.mnemonics_visible = false
  }
  open(this: any, { side = 'bottom', align = 'start', offset = 4, motion = 'animated', focus = null }: any) {
    const value = typeof this.options === 'function' ? this.options() : this.options
    const mount_opts: any = { anchor: this.anchor, side, align, offset, motion }
    let entry: any
    if (is_thenable(value)) {
      entry = this.mount(null, mount_opts)
      entry.pending_focus = focus === 'first' || focus === 'last' ? focus : null
      value.then(
        (items?: any) => this.fill(entry, normalize_options(items)),
        (error?: any) => this.fill_failed(entry, error),
      )
    } else {
      entry = this.mount(normalize_options(value), mount_opts)
    }
    this.onpointerdown = (e?: any) => {
      const inside = [...this.panels.map((p?: any) => p.panel), ...this.ignore].some(
        (el?: any) => el && (el === e.target || el.contains(e.target)),
      )
      if (!inside) this.close('outside')
    }
    document.addEventListener('pointerdown', this.onpointerdown, true)
    this.onreposition = () => this.reposition()
    window.addEventListener('resize', this.onreposition)
    document.addEventListener('scroll', this.onreposition, { capture: true, passive: true })
    this.ongracemove = (e?: any) => this.handle_grace_move(e)
    document.addEventListener('pointermove', this.ongracemove, true)
    if (this.lock_scroll) {
      this.onwheel = (e?: any) => {
        if (e.target instanceof Element && e.target.closest('[role="menu"]')) return
        e.preventDefault()
      }
      window.addEventListener('wheel', this.onwheel, { passive: false, capture: true })
      window.addEventListener('touchmove', this.onwheel, { passive: false, capture: true })
    }
    this.onaltkey = (e?: any) => {
      if (e.key === 'Alt') this.show_mnemonics(e.type === 'keydown')
    }
    document.addEventListener('keydown', this.onaltkey, true)
    document.addEventListener('keyup', this.onaltkey, true)
    this.onblur = () => this.show_mnemonics(false)
    window.addEventListener('blur', this.onblur)
    frappe.router.once('change', () => this.close('navigate'))
    if (focus === 'first' && entry.rows.length) this.focus_step(entry, 1)
    else if (focus === 'last' && entry.rows.length) this.focus_step(entry, -1)
    else entry.panel.focus({ preventScroll: true })
  }
  mount(this: any, groups: any, { anchor, side, align, offset, motion, parent_row = null }: any) {
    const { panel, rows } = build_panel(groups, {
      empty_text: this.empty_text,
      component: this.component,
    })
    const entry: any = { panel, rows, anchor, side, align, offset, parent_row }
    panel.setAttribute('data-motion', motion)
    this.bind_panel(entry)
    document.body.appendChild(panel)
    place(panel, anchor(), side, align, offset)
    panel.setAttribute('data-state', 'open')
    if (parent_row) {
      parent_row.setAttribute('data-state', 'open')
      parent_row.setAttribute('aria-expanded', 'true')
    }
    this.panels.push(entry)
    this.update_mnemonic_panels()
    return entry
  }
  bind_panel(this: any, entry?: any) {
    this.bind_rows(entry)
    entry.panel.addEventListener('pointerenter', (e?: any) => {
      if (e.target !== entry.panel) return
      clearTimeout(this.submenu_timer)
      this.grace = null
    })
    entry.panel.addEventListener('focusin', (e?: any) => {
      for (const row of entry.rows) {
        row.el.toggleAttribute('data-highlighted', row.el === e.target)
      }
    })
    entry.panel.addEventListener('keydown', (e?: any) => this.handle_keydown(entry, e))
  }
  bind_rows(this: any, entry?: any) {
    for (const row of entry.rows) {
      row.el.addEventListener('click', (e?: any) => {
        if (row.item.disabled) {
          e.preventDefault()
          return
        }
        if (row.item.submenu) {
          e.preventDefault()
          this.open_submenu(entry, row, { focus: false })
          return
        }
        row.item.onclick && row.item.onclick(e)
        this.close('activate')
      })
      row.el.addEventListener('pointerenter', (e?: any) => {
        if (this.in_grace(e)) return
        row.el.focus({ preventScroll: true })
        this.schedule_submenu(entry, row)
      })
      row.el.addEventListener('pointerleave', (e?: any) => {
        this.start_grace(entry, row, e)
      })
    }
  }
  start_grace(this: any, entry?: any, row?: any, e?: any) {
    const depth = this.panels.indexOf(entry)
    const child = this.panels[depth + 1]
    if (!child || child.parent_row !== row.el) return
    const rect = child.panel.getBoundingClientRect()
    const opens_left = rect.left < e.clientX
    const near_x = opens_left ? rect.right : rect.left
    const origin_x = e.clientX + (opens_left ? GRACE_PAD : -GRACE_PAD)
    this.grace = {
      polygon: [
        [origin_x, e.clientY],
        [near_x, rect.top - GRACE_PAD],
        [near_x, rect.bottom + GRACE_PAD],
      ],
      expiry: Date.now() + GRACE_MS,
    }
  }
  in_grace(this: any, e?: any) {
    if (!this.grace) return false
    if (Date.now() > this.grace.expiry) {
      this.grace = null
      return false
    }
    return point_in_polygon(e.clientX, e.clientY, this.grace.polygon)
  }
  handle_grace_move(this: any, e?: any) {
    if (!this.grace) return
    if (Date.now() <= this.grace.expiry && point_in_polygon(e.clientX, e.clientY, this.grace.polygon)) {
      return
    }
    this.grace = null
    const row_el = e.target instanceof Element && e.target.closest('.es-menu__item')
    if (!row_el) return
    for (const entry of this.panels) {
      const row = entry.rows.find((r?: any) => r.el === row_el)
      if (row) {
        row.el.focus({ preventScroll: true })
        this.schedule_submenu(entry, row)
        return
      }
    }
  }
  fill(this: any, entry?: any, groups?: any) {
    if (this.closed || !this.panels.includes(entry)) return
    const had_focus = entry.panel === document.activeElement || entry.panel.contains(document.activeElement)
    entry.panel.replaceChildren()
    entry.panel.removeAttribute('aria-busy')
    entry.rows = render_content(entry.panel, groups, {
      empty_text: this.empty_text,
      component: this.component,
    })
    this.bind_rows(entry)
    place(entry.panel, entry.anchor(), entry.side, entry.align, entry.offset)
    if (entry.pending_focus) {
      this.focus_step(entry, entry.pending_focus === 'last' ? -1 : 1)
      entry.pending_focus = null
    } else if (had_focus) {
      entry.panel.focus({ preventScroll: true })
    }
  }
  fill_failed(this: any, entry?: any, error?: any) {
    if (this.closed || !this.panels.includes(entry)) return
    console.warn(`frappe.ui.${this.component}: menu items failed to load`, error)
    entry.panel.replaceChildren()
    entry.panel.removeAttribute('aria-busy')
    const failed = document.createElement('div')
    failed.className = 'es-menu__empty'
    failed.textContent = __("Couldn't load options")
    entry.panel.appendChild(failed)
    entry.rows = []
    entry.pending_focus = null
    place(entry.panel, entry.anchor(), entry.side, entry.align, entry.offset)
  }
  handle_keydown(this: any, entry?: any, e?: any) {
    const handled = () => {
      e.preventDefault()
      e.stopPropagation()
    }
    let key = e.key
    if (frappe.utils.is_rtl()) {
      if (key === 'ArrowRight') key = 'ArrowLeft'
      else if (key === 'ArrowLeft') key = 'ArrowRight'
    }
    switch (key) {
      case 'ArrowDown':
        handled()
        this.focus_step(entry, 1)
        break
      case 'ArrowUp':
        handled()
        this.focus_step(entry, -1)
        break
      case 'Home':
        handled()
        this.focus_step(entry, 1, 'edge')
        break
      case 'End':
        handled()
        this.focus_step(entry, -1, 'edge')
        break
      case 'ArrowRight': {
        const row = entry.rows.find((r?: any) => r.el === document.activeElement)
        if (row && row.item.submenu) {
          handled()
          this.open_submenu(entry, row, { focus: true })
        }
        break
      }
      case 'ArrowLeft': {
        if (entry.parent_row) {
          handled()
          this.close_submenus_from(this.panels.indexOf(entry))
          entry.parent_row.focus()
        }
        break
      }
      case 'Escape':
        handled()
        this.close('escape')
        break
      case 'Tab':
        this.close('tab')
        break
      default: {
        if (e.altKey && !e.ctrlKey && !e.metaKey) {
          const match = e.code.match(/^Key([A-Z])$/)
          const letter = match && match[1].toLowerCase()
          const active = this.panels[this.panels.length - 1]
          const row = letter && active && active.rows.find((r?: any) => r.mnemonic === letter && !r.item.disabled)
          if (row) {
            handled()
            if (row.item.submenu) this.open_submenu(active, row, { focus: true })
            else row.el.click()
            break
          }
        }
        if (e.ctrlKey || e.metaKey || e.altKey) {
          e.stopPropagation()
          break
        }
        if (e.key.length !== 1) break
        if (e.key === ' ' && !this.typeahead_buffer) {
          const row = entry.rows.find((r?: any) => r.el === document.activeElement)
          if (row && row.el.tagName === 'A') {
            handled()
            row.el.click()
          }
          break
        }
        handled()
        this.typeahead(entry, e.key)
        break
      }
    }
  }
  typeahead(this: any, entry?: any, char?: any) {
    clearTimeout(this.typeahead_timer)
    this.typeahead_timer = setTimeout(() => (this.typeahead_buffer = ''), TYPEAHEAD_RESET_MS)
    this.typeahead_buffer += char
    const rows = entry.rows.filter((row?: any) => !row.item.disabled && row.item.label)
    if (!rows.length) return
    const repeated =
      this.typeahead_buffer.length > 1 && [...this.typeahead_buffer].every((c?: any) => c === this.typeahead_buffer[0])
    const search = (repeated ? this.typeahead_buffer[0] : this.typeahead_buffer).toLowerCase()
    const current = rows.findIndex((row?: any) => row.el === document.activeElement)
    const start = current === -1 ? 0 : current + (search.length === 1 ? 1 : 0)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[(start + i) % rows.length]
      if (row.item.label.toLowerCase().startsWith(search)) {
        row.el.focus()
        return
      }
    }
  }
  focus_step(entry?: any, direction?: any, edge?: any) {
    const rows = entry.rows.filter((row?: any) => !row.item.disabled)
    if (!rows.length) return
    let index: any
    if (edge === 'edge') {
      index = direction > 0 ? 0 : rows.length - 1
    } else {
      const active = rows.findIndex((row?: any) => row.el === document.activeElement)
      index = active >= 0 ? (active + direction + rows.length) % rows.length : direction > 0 ? 0 : rows.length - 1
    }
    rows[index].el.focus()
  }
  schedule_submenu(this: any, entry?: any, row?: any) {
    clearTimeout(this.submenu_timer)
    if (row.item.submenu) this.get_submenu_items(row)
    const depth = this.panels.indexOf(entry)
    this.submenu_timer = setTimeout(() => {
      if (this.closed) return
      if (row.item.submenu) this.open_submenu(entry, row, { focus: false })
      else this.close_submenus_from(depth + 1)
    }, SUBMENU_OPEN_DELAY)
  }
  get_submenu_items(this: any, row?: any) {
    const source = row.item.submenu
    if (typeof source !== 'function') return source
    if (!this.submenu_cache.has(row)) {
      const value = source()
      this.submenu_cache.set(row, value)
      if (is_thenable(value)) {
        value.then(
          (items?: any) => this.submenu_cache.set(row, items),
          () => {},
        )
      }
    }
    return this.submenu_cache.get(row)
  }
  open_submenu(this: any, parent_entry: any, row: any, { focus }: any) {
    const depth = this.panels.indexOf(parent_entry)
    const already = this.panels[depth + 1]
    if (already && already.parent_row === row.el) {
      if (focus && already.rows.length) this.focus_step(already, 1)
      return
    }
    this.close_submenus_from(depth + 1)
    const source = this.get_submenu_items(row)
    const mount_opts: any = {
      anchor: () => row.el.getBoundingClientRect(),
      side: frappe.utils.is_rtl() ? 'left' : 'right',
      align: 'start',
      offset: SUBMENU_OFFSET,
      motion: 'animated',
      parent_row: row.el,
    }
    let entry: any
    if (is_thenable(source)) {
      entry = this.mount(null, mount_opts)
      if (focus) entry.pending_focus = 'first'
      source.then(
        (items?: any) => this.fill(entry, normalize_options(items)),
        (error?: any) => this.fill_failed(entry, error),
      )
    } else {
      entry = this.mount(normalize_options(source), mount_opts)
      if (focus) this.focus_step(entry, 1)
    }
  }
  close_submenus_from(this: any, depth?: any) {
    while (this.panels.length > Math.max(depth, 1)) {
      const entry = this.panels.pop()
      if (entry.parent_row) {
        entry.parent_row.removeAttribute('data-state')
        entry.parent_row.setAttribute('aria-expanded', 'false')
      }
      this.retire(entry.panel)
    }
    this.update_mnemonic_panels()
  }
  show_mnemonics(this: any, show?: any) {
    this.mnemonics_visible = show
    this.update_mnemonic_panels()
  }
  update_mnemonic_panels(this: any) {
    const deepest = this.panels.length - 1
    this.panels.forEach((entry?: any, i?: any) => {
      entry.panel.toggleAttribute('data-alt', this.mnemonics_visible && i === deepest)
    })
  }
  reposition(this: any) {
    for (const entry of this.panels) {
      place(entry.panel, entry.anchor(), entry.side, entry.align, entry.offset)
    }
  }
  retire(panel?: any) {
    panel.setAttribute('data-state', 'closed')
    setTimeout(() => panel.remove(), EXIT_MS)
  }
  close(this: any, reason?: any) {
    if (this.closed) return
    this.closed = true
    clearTimeout(this.submenu_timer)
    clearTimeout(this.typeahead_timer)
    document.removeEventListener('keydown', this.onaltkey, true)
    document.removeEventListener('keyup', this.onaltkey, true)
    window.removeEventListener('blur', this.onblur)
    document.removeEventListener('pointerdown', this.onpointerdown, true)
    window.removeEventListener('resize', this.onreposition)
    document.removeEventListener('scroll', this.onreposition, { capture: true })
    document.removeEventListener('pointermove', this.ongracemove, true)
    this.grace = null
    if (this.onwheel) {
      window.removeEventListener('wheel', this.onwheel, { capture: true })
      window.removeEventListener('touchmove', this.onwheel, { capture: true })
    }
    for (const entry of this.panels) this.retire(entry.panel)
    this.panels = []
    this.on_close && this.on_close(reason)
  }
}
