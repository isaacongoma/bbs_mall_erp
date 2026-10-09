import { frappe } from '@/shared/frappe'
const call_debug = (frm?: any) => {
  frm.trigger('debug')
}
frappe.ui.form.on('Permission Inspector', {
  refresh(frm?: any) {
    frm.disable_save()
  },
  docname: call_debug,
  ref_doctype(frm?: any) {
    frm.doc.docname = ''
    call_debug(frm)
    frm.trigger('add_custom_perm_types')
  },
  user: call_debug,
  permission_type: call_debug,
  debug(frm?: any) {
    if (frm.doc.ref_doctype && frm.doc.user) {
      frm.call('debug')
    }
  },
  add_custom_perm_types(frm?: any) {
    if (!frm.doc.ref_doctype) return
    const doctype_ptype_map = frm.doc.__onload.doctype_ptype_map
    if (!Object.keys(doctype_ptype_map).length) return
    const standard_options = frm.meta.fields.find((f?: any) => f.fieldname === 'permission_type').options
    const custom_options = doctype_ptype_map[frm.doc.ref_doctype]?.join('\n')
    frm.set_df_property('permission_type', 'options', `${standard_options}\n${custom_options}`)
  },
})
