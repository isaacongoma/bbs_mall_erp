import { $, __, frappe } from '../runtime'

type AnyRecord = Record<string, any>

class FormAttachments {
  frm: AnyRecord

  constructor(frm: AnyRecord) {
    this.frm = frm
  }

  get_attachments(): AnyRecord[] {
    return (this.frm.get_docinfo?.()?.attachments as AnyRecord[] | undefined) ?? []
  }

  refresh(): void {
    this.frm.notify?.()
  }

  attachment_uploaded(file: AnyRecord): void {
    const info = this.frm.get_docinfo?.()
    if (!info) return
    info.attachments = [...(info.attachments ?? []), file]
    this.frm.notify?.()
  }

  remove_attachment(name: string): void {
    const info = this.frm.get_docinfo?.()
    if (!info) return
    info.attachments = (info.attachments ?? []).filter((file: AnyRecord) => file.name !== name)
    this.frm.notify?.()
  }
}

export class FormSidebar {
  frm: AnyRecord
  page: AnyRecord
  toolbar: AnyRecord
  sidebar: JQuery
  user_actions: JQuery
  image_wrapper: JQuery
  items: AnyRecord = {}
  userActionItems: Array<{ label: string; element: JQuery }> = []

  constructor(opts: AnyRecord) {
    this.frm = opts.frm
    this.page = opts.page
    this.toolbar = opts.toolbar
    this.sidebar = $('<div class="form-sidebar"></div>')
    this.user_actions = $('<ul class="user-actions list-unstyled"></ul>').appendTo(this.sidebar)
    this.image_wrapper = $('<div class="sidebar-image-wrapper"></div>').appendTo(this.sidebar)
    this.frm.attachments = new FormAttachments(this.frm)
  }

  make(): void {
    this.refresh()
  }

  refresh(): void {
    this.frm.notify?.()
  }

  reload_docinfo(callback?: (info: AnyRecord) => unknown): void {
    if (!this.frm.doc || this.frm.doc.__islocal) return
    void frappe
      .call({
        method: 'frappe.desk.form.load.get_docinfo',
        args: { doctype: this.frm.doctype, name: this.frm.docname },
        callback: (response: AnyRecord) => {
          const info = response.docinfo ?? response.message
          if (info) {
            frappe.model.docinfo[this.frm.doctype] ??= {}
            frappe.model.docinfo[this.frm.doctype][this.frm.docname] = info
          }
          this.frm.notify?.()
          callback?.(info)
        },
      })
      .catch(() => undefined)
  }

  add_user_action(label: string, click: (event?: unknown) => unknown): JQuery {
    const element = $(`<li class="user-action"><a class="grey-link" href="#" data-label="${encodeURIComponent(label)}">${label}</a></li>`)
    element.on('click', (event: any) => {
      event.preventDefault()
      click(event)
    })
    this.user_actions.append(element)
    this.userActionItems = [...this.userActionItems, { label, element }]
    this.frm.notify?.()
    return element.find('a')
  }

  clear_user_actions(): void {
    this.user_actions.empty()
    this.userActionItems = []
    this.frm.notify?.()
  }

  refresh_comments_count(): void {
    this.frm.notify?.()
  }

  refresh_creation_modified(): void {
    this.frm.notify?.()
  }
}

export class FormFooter {
  frm: AnyRecord
  parent: JQuery
  wrapper: JQuery
  timeline: { refresh: () => void; frm: AnyRecord }

  constructor(opts: AnyRecord) {
    this.frm = opts.frm
    this.parent = opts.parent ?? $('<div></div>')
    this.wrapper = $('<div class="form-footer"></div>').appendTo(this.parent)
    this.timeline = { frm: this.frm, refresh: () => this.frm.notify?.() }
    this.frm.timeline = this.timeline
  }

  refresh(): void {
    this.frm.notify?.()
  }

  refresh_comments_count(): void {
    this.frm.notify?.()
  }
}

export class FormTour {
  frm: AnyRecord
  tour_name = ''
  is_active = false

  constructor(opts: AnyRecord) {
    this.frm = opts.frm
  }

  init(opts: AnyRecord = {}): void {
    this.tour_name = opts.tour_name ?? ''
  }

  refresh(): void {
    return undefined
  }

  show_tour(): void {
    return undefined
  }

  start_tour(): void {
    return undefined
  }

  get_next_step(): null {
    return null
  }
}

export function installFacades(): void {
  frappe.provide('frappe.ui.form')
  frappe.ui.form.Sidebar = FormSidebar
  frappe.ui.form.Footer = FormFooter
  frappe.ui.form.FormTour = FormTour
  void __
}
