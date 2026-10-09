import { $, __, frappe } from '@/shared/frappe/runtime'
export default class Tab {
  [key: string]: any
  constructor(layout?: any, df?: any, frm?: any, tab_link_container?: any, tabs_content?: any) {
    this.layout = layout
    this.df = df || {}
    this.frm = frm
    this.doctype = layout?.is_child_table ? layout.doctype : (this.frm?.doctype ?? this.df.parent ?? layout?.doctype)
    this.label = this.df && this.df.label
    this.tab_link_container = tab_link_container
    this.tabs_content = tabs_content
    this.hidden = false
    this.make()
    this.setup_listeners()
    this.refresh()
  }
  make(this: any) {
    const id = `${frappe.scrub(this.doctype, '-')}-${this.df.fieldname}`
    this.id = id
    this.tab_link = $(`
			<li class="nav-item">
				<button class="nav-link ${this.df.active ? 'active' : ''}" id="${id}-tab"
					data-toggle="tab"
					data-fieldname="${this.df.fieldname}"
					type="button"
					role="tab"
					aria-controls="${id}">
						${__(this.label, null, this.doctype)}
				</button>
			</li>
		`).appendTo(this.tab_link_container)
    this.wrapper = $(`<div class="tab-pane fade show ${this.df.active ? 'active' : ''}"
			id="${id}" role="tabpanel" aria-labelledby="${id}-tab">`).appendTo(this.tabs_content)
  }
  refresh(this: any) {
    if (!this.df) return
    let hide = this.df.hidden || this.df.hidden_due_to_dependency
    if (!hide && this.frm && !this.frm.get_perm(this.df.permlevel || 0, 'read')) {
      hide = true
    }
    if (!hide) {
      hide = true
      if (
        this.wrapper.find(
          '.form-section:not(.hide-control, .empty-section), .form-dashboard-section:not(.hide-control, .empty-section)',
        ).length
      ) {
        hide = false
      }
    }
    this.toggle(!hide)
  }
  toggle(this: any, show?: any) {
    this.tab_link.toggleClass('hide', !show)
    this.wrapper.toggleClass('hide', !show)
    this.tab_link.toggleClass('show', show)
    this.wrapper.toggleClass('show', show)
    this.hidden = !show
  }
  show(this: any) {
    this.tab_link.show()
  }
  hide(this: any) {
    this.tab_link.hide()
  }
  add_field(this: any, fieldobj?: any) {
    fieldobj.tab = this
  }
  replace_field(this: any, fieldobj?: any) {
    fieldobj.tab = this
  }
  set_active(this: any) {
    if (this.layout?.tabs) {
      this.layout.tabs.forEach((tab?: any) => {
        if (tab !== this) {
          tab.tab_link.find('.nav-link').removeClass('active')
          tab.wrapper.removeClass('show active')
        }
      })
    }
    this.tab_link.find('.nav-link').addClass('active')
    this.wrapper.addClass('show active')
    if (this.layout?.grid_row_form) {
      this.layout.grid_row_form.set_active_tab?.(this)
    } else {
      this.frm?.set_active_tab?.(this)
    }
  }
  is_active(this: any) {
    return this.wrapper.hasClass('active')
  }
  is_hidden(this: any) {
    return this.wrapper.hasClass('hide') && this.tab_link.hasClass('hide')
  }
  setup_listeners(this: any) {
    this.tab_link.find('.nav-link').on('click', (e?: any) => {
      e.preventDefault()
      this.set_active()
    })
  }
}
