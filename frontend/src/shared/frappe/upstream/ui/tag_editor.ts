import { $, Awesomplete, frappe } from '@/shared/frappe/runtime'
frappe.ui.TagEditor = class TagEditor {
  [key: string]: any
  constructor(opts?: any) {
    $.extend(this, opts)
    this.setup_tags()
    if (!this.user_tags) {
      this.user_tags = ''
    }
    this.initialized = true
    this.refresh(this.user_tags)
  }
  update_user_tags(this: any, tags_string?: any) {
    this.user_tags = tags_string
    frappe.model.set_value(this.frm.doctype, this.frm.docname, '_user_tags', this.user_tags)
    this.on_change && this.on_change(this.user_tags)
    frappe.tags.utils.fetch_tags()
  }
  setup_tags(this: any) {
    let me = this
    if (!this.parent) {
      return
    }
    this.wrapper = this.parent
    if (!this.wrapper.length) return
    this.tags = new frappe.ui.Tags({
      parent: this.wrapper,
      placeholder: frappe.utils.icon('plus', 'sm'),
      onTagAdd: (tag?: any) => {
        if (me.initialized && !me.refreshing) {
          return frappe.call({
            method: 'frappe.desk.doctype.tag.tag.add_tag',
            args: me.get_args(tag),
            callback: function () {
              let user_tags = me.user_tags ? me.user_tags.split(',') : []
              user_tags.push(tag)
              me.update_user_tags(user_tags.join(','))
            },
          })
        }
      },
      onTagRemove: (tag?: any) => {
        if (!me.refreshing) {
          return frappe.call({
            method: 'frappe.desk.doctype.tag.tag.remove_tag',
            args: me.get_args(tag),
            callback: function () {
              let user_tags = me.user_tags.split(',')
              user_tags.splice(user_tags.indexOf(tag), 1)
              me.update_user_tags(user_tags.join(','))
            },
          })
        }
      },
    })
    this.setup_awesomplete()
    this.setup_complete = true
  }
  setup_awesomplete(this: any) {
    let me = this
    let $input = this.wrapper.find('input.tags-input')
    let input = $input.get(0)
    this.awesomplete = new Awesomplete(input, {
      minChars: 0,
      maxItems: 99,
      list: [],
    })
    $input.on('awesomplete-open', function () {
      $input.attr('state', 'open')
    })
    $input.on('awesomplete-close', function () {
      $input.attr('state', 'closed')
    })
    $input.on('input', function (e?: any) {
      let value = e.target.value
      frappe.call({
        method: 'frappe.desk.doctype.tag.tag.get_tags',
        args: {
          doctype: me.frm.doctype,
          txt: value.toLowerCase(),
        },
        callback: function (r?: any) {
          me.awesomplete.list = r.message
        },
      })
    })
    $input.on('focus', function () {
      if ($input.attr('state') != 'open') {
        $input.trigger('input')
      }
    })
    $input.on('enter-pressed-in-addtag', function (e?: any) {
      let value = e.target.value
      if (value && value.trim()) {
        $input.trigger('input-selected')
        return
      }
      frappe.call({
        method: 'frappe.desk.doctype.tag.tag.get_tags',
        args: {
          doctype: me.frm.doctype,
          txt: value.toLowerCase(),
        },
        callback: function (r?: any) {
          if (r.message.length) $input.val(r.message[0])
          $input.trigger('input-selected')
        },
      })
    })
  }
  get_args(this: any, tag?: any) {
    return {
      tag: tag,
      dt: this.frm.doctype,
      dn: this.frm.docname,
    }
  }
  refresh(this: any, user_tags?: any) {
    let me = this
    if (!this.initialized || !this.setup_complete || this.refreshing) return
    me.refreshing = true
    try {
      me.tags.clearTags()
      if (user_tags) {
        me.user_tags = user_tags
        me.tags.addTags(user_tags.split(','))
      }
    } catch (e: any) {
      me.refreshing = false
      setTimeout(function () {
        me.refresh()
      }, 100)
    }
    me.refreshing = false
  }
}
