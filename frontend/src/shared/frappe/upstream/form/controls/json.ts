import { frappe } from '@/shared/frappe/runtime'
frappe.ui.form.ControlJSON = class ControlCode extends frappe.ui.form.ControlCode {
  [key: string]: any
  set_language(this: any) {
    this.editor.session.setMode('ace/mode/json')
    this.editor.setKeyboardHandler('ace/keyboard/vscode')
  }
}
