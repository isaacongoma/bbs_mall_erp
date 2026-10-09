import { $, __, frappe } from '@/shared/frappe/runtime'
frappe.ui.Tags = class {
  [key: string]: any
  constructor({ parent, placeholder, tagsList, onTagAdd, onTagRemove, onTagClick, onChange }: any) {
    this.tagsList = tagsList || []
    this.onTagAdd = onTagAdd
    this.onTagRemove = onTagRemove
    this.onTagClick = onTagClick
    this.onChange = onChange
    this.setup(parent, placeholder)
  }
  setup(this: any, parent?: any, placeholder?: any) {
    this.$ul = parent
    this.$input = $(`<input class="tags-input form-control mt-2"></input>`)
    this.$inputWrapper = this.get_list_element(this.$input)
    this.$placeholder =
      $(`<button type="button" class="es-button add-tags-btn" data-variant="ghost" data-icon-button="true" title="${__('Add Tags')}" aria-label="${__('Add Tags')}">
				${__(placeholder)}
			</button>`)
    this.$placeholder.appendTo(this.$ul.find('.form-sidebar-items'))
    this.$inputWrapper.appendTo(this.$ul)
    this.deactivate()
    this.bind()
    this.boot()
  }
  bind(this: any) {
    const me = this
    const select_tag = function () {
      const tagValue = frappe.utils.xss_sanitise(me.$input.val())
      me.addTag(tagValue)
      me.$input.val('')
    }
    const activate_input = () => {
      this.activate()
      this.$input.focus()
    }
    this.$input.keypress((e?: any) => {
      if (e.which == 13 || e.keyCode == 13) {
        this.$input.trigger('enter-pressed-in-addtag')
      }
    })
    this.$input.focusout(select_tag)
    this.$input.on('input-selected', () => {
      select_tag()
      this.deactivate()
    })
    this.$input.on('blur', () => {
      this.deactivate()
    })
    this.$placeholder.on('click', activate_input)
    this.$ul.find('.tags-label').on('click', activate_input)
  }
  boot(this: any) {
    this.addTags(this.tagsList)
  }
  activate(this: any) {
    this.$placeholder.hide()
    this.$inputWrapper.show()
  }
  deactivate(this: any) {
    this.$inputWrapper.hide()
    this.$placeholder.show()
  }
  addTag(this: any, label?: any) {
    if (label && label !== '' && !this.tagsList.includes(label)) {
      let $tag = this.get_tag(label)
      let row = this.get_list_element($tag, 'form-tag-row')
      row.insertAfter(this.$inputWrapper)
      this.tagsList.push(label)
      this.onTagAdd && this.onTagAdd(label)
    }
  }
  removeTag(this: any, label?: any) {
    label = frappe.utils.xss_sanitise(label)
    if (this.tagsList.includes(label)) {
      this.tagsList.splice(this.tagsList.indexOf(label), 1)
      this.onTagRemove && this.onTagRemove(label)
    }
  }
  addTags(this: any, labels?: any) {
    labels.map(this.addTag.bind(this))
  }
  clearTags(this: any) {
    this.$ul.find('.form-tag-row').remove()
    this.tagsList = []
  }
  get_list_element($element?: any, class_name: any = '') {
    let $li = $(`<div class="${class_name}"></div>`)
    $element.appendTo($li)
    return $li
  }
  get_tag(this: any, label?: any) {
    let $tag = frappe.ui.badge({
      label: label,
      theme: this.get_tag_theme(label),
      size: 'lg',
      icon_right: 'x',
      css_class: 'form-tag',
      title: label,
    })
    $tag.find('.es-badge__label').addClass('pill-label ellipsis')
    const $remove = $tag.find('.es-badge__affix')
    $remove
      .attr({ role: 'button', tabindex: 0, 'aria-label': __('Remove') })
      .on('click', () => {
        this.removeTag(label)
        $tag.closest('.form-tag-row').remove()
      })
      .on('keydown', (e?: any) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          $remove.trigger('click')
        }
      })
    if (this.onTagClick) {
      $tag.on('click', '.pill-label', () => {
        this.onTagClick(label)
      })
    }
    return $tag
  }
  get_tag_theme(label?: any) {
    const themes: any = ['blue', 'green', 'amber', 'red', 'violet']
    let hash = 0
    for (let i = 0; i < label.length; i++) {
      hash = (hash * 31 + label.charCodeAt(i)) % 997
    }
    return themes[hash % themes.length]
  }
}
