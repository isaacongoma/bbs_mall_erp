import { __, frappe } from '@/shared/frappe/runtime'
export class UndoManager {
  [key: string]: any
  constructor({ frm }: any) {
    this.frm = frm
    this.undo_stack = []
    this.redo_stack = []
  }
  record_change(this: any, { fieldname, old_value, new_value, doctype, docname, is_child }: any) {
    if (old_value == new_value) {
      return
    }
    this.undo_stack.push({
      fieldname,
      old_value,
      new_value,
      doctype,
      docname,
      is_child,
    })
  }
  erase_history(this: any) {
    this.undo_stack = []
    this.redo_stack = []
  }
  undo(this: any) {
    const change = this.undo_stack.pop()
    if (change) {
      this._apply_change(change)
      this._push_reverse_entry(change, this.redo_stack)
    } else {
      this._show_alert(__('Nothing left to undo'))
    }
  }
  redo(this: any) {
    const change = this.redo_stack.pop()
    if (change) {
      this._apply_change(change)
      this._push_reverse_entry(change, this.undo_stack)
    } else {
      this._show_alert(__('Nothing left to redo'))
    }
  }
  _push_reverse_entry(change?: any, stack?: any) {
    stack.push({
      ...change,
      new_value: change.old_value,
      old_value: change.new_value,
    })
  }
  _apply_change(this: any, change?: any) {
    if (change.is_child) {
      frappe.model.set_value(change.doctype, change.docname, change.fieldname, change.old_value)
    } else {
      this.frm.set_value(change.fieldname, change.old_value)
      this.frm.scroll_to_field(change.fieldname, false)
    }
  }
  _show_alert(msg?: any) {
    frappe.show_alert(msg, 3)
  }
}
