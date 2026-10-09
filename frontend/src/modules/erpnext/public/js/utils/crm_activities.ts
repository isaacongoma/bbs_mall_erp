import { $, __, erpnext, frappe } from '@/shared/frappe'
erpnext.utils.CRMActivities = class CRMActivities {
  [key: string]: any
  constructor(opts?: any) {
    $.extend(this, opts)
  }
  refresh(this: any) {
    let me = this
    $(this.open_activities_wrapper).empty()
    if (this.frm.is_new()) return
    let cur_form_footer = this.form_wrapper.find('.form-footer')
    if (!$(this.all_activities_wrapper).find('.form-footer').length) {
      this.all_activities_wrapper.empty()
      $(cur_form_footer).appendTo(this.all_activities_wrapper)
      $(this.all_activities_wrapper).removeClass('frappe-control')
      $('.timeline-actions').find('.btn-default').hide()
      $('.comment-box').hide()
      $($('.timeline-content').find('.nav-link')[0]).tab('show')
    }
    frappe.call({
      method: 'erpnext.crm.utils.get_open_activities',
      args: {
        ref_doctype: this.frm.doc.doctype,
        ref_docname: this.frm.doc.name,
      },
      callback: (r?: any) => {
        let activities_html: any
        if (!r.exc) {
          activities_html = frappe.render_template('crm_activities', {
            tasks: r.message.tasks,
            events: r.message.events,
            tasks_history: r.message.tasks_history,
            events_history: r.message.events_history,
          })
          $(activities_html).appendTo(me.open_activities_wrapper)
          $('.open-tasks')
            .find('.completion-checkbox')
            .on('click', function (this: any) {
              me.update_status(this, 'ToDo')
            })
          $('.open-events')
            .find('.completion-checkbox')
            .on('click', function (this: any) {
              me.update_status(this, 'Event')
            })
          me.create_task()
          me.create_event()
        }
      },
    })
  }
  create_task(this: any) {
    let me = this
    let _create_task = () => {
      const args: any = {
        doc: me.frm.doc,
        frm: me.frm,
        title: __('New Task'),
      }
      let composer = new frappe.views.InteractionComposer(args)
      composer.dialog.get_field('interaction_type').set_value('ToDo')
      $(composer.dialog.get_field('interaction_type').wrapper).closest('.form-column').hide()
      $(composer.dialog.get_field('summary').wrapper).closest('.form-section').hide()
    }
    $('.new-task-btn').click(_create_task)
  }
  create_event(this: any) {
    let me = this
    let _create_event = () => {
      const args: any = {
        doc: me.frm.doc,
        frm: me.frm,
        title: __('New Event'),
      }
      let composer = new frappe.views.InteractionComposer(args)
      composer.dialog.get_field('interaction_type').set_value('Event')
      $(composer.dialog.get_field('interaction_type').wrapper).hide()
    }
    $('.new-event-btn').click(_create_event)
  }
  async update_status(this: any, input_field?: any, doctype?: any) {
    let completed = $(input_field).prop('checked') ? 1 : 0
    let docname = $(input_field).attr('name')
    if (completed) {
      await frappe.db.set_value(doctype, docname, 'status', 'Closed')
      this.refresh()
    }
  }
}
erpnext.utils.CRMNotes = class CRMNotes {
  [key: string]: any
  constructor(opts?: any) {
    $.extend(this, opts)
  }
  refresh(this: any) {
    let me = this
    this.notes_wrapper.find('.notes-section').remove()
    let notes = this.frm.doc.notes || []
    notes.sort(function (a?: any, b?: any) {
      return new Date(b.added_on).getTime() - new Date(a.added_on).getTime()
    })
    let notes_html = frappe.render_template('crm_notes', {
      notes: notes,
    })
    $(notes_html).appendTo(this.notes_wrapper)
    this.add_note()
    $('.notes-section')
      .find('.edit-note-btn')
      .on('click', function (this: any) {
        me.edit_note(this)
      })
    $('.notes-section')
      .find('.delete-note-btn')
      .on('click', function (this: any) {
        me.delete_note(this)
      })
  }
  add_note(this: any) {
    let me = this
    let _add_note = () => {
      let d = new frappe.ui.Dialog({
        title: __('Add a Note'),
        fields: [
          {
            label: 'Note',
            fieldname: 'note',
            fieldtype: 'Text Editor',
            reqd: 1,
            enable_mentions: true,
          },
        ],
        primary_action: function () {
          let data = d.get_values()
          frappe.call({
            method: 'add_note',
            doc: me.frm.doc,
            args: {
              note: data.note,
            },
            freeze: true,
            callback: function (r?: any) {
              if (!r.exc) {
                me.frm.refresh_field('notes')
                me.refresh()
              }
              d.hide()
            },
          })
        },
        primary_action_label: __('Add'),
      })
      d.show()
    }
    $('.new-note-btn').click(_add_note)
  }
  edit_note(this: any, edit_btn?: any) {
    let d: any
    let me = this
    let row = $(edit_btn).closest('.comment-content')
    let row_id = row.attr('name')
    let row_content = $(row).find('.content').html()
    if (row_content) {
      d = new frappe.ui.Dialog({
        title: __('Edit Note'),
        fields: [
          {
            label: 'Note',
            fieldname: 'note',
            fieldtype: 'Text Editor',
            default: row_content,
          },
        ],
        primary_action: function () {
          let data = d.get_values()
          frappe.call({
            method: 'edit_note',
            doc: me.frm.doc,
            args: {
              note: data.note,
              row_id: row_id,
            },
            freeze: true,
            callback: function (r?: any) {
              if (!r.exc) {
                me.frm.refresh_field('notes')
                me.refresh()
                d.hide()
              }
            },
          })
        },
        primary_action_label: __('Done'),
      })
      d.show()
    }
  }
  delete_note(this: any, delete_btn?: any) {
    let me = this
    let row_id = $(delete_btn).closest('.comment-content').attr('name')
    frappe.call({
      method: 'delete_note',
      doc: me.frm.doc,
      args: {
        row_id: row_id,
      },
      freeze: true,
      callback: function (r?: any) {
        if (!r.exc) {
          me.frm.refresh_field('notes')
          me.refresh()
        }
      },
    })
  }
}
