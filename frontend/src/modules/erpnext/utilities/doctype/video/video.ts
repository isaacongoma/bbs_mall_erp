import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Video', {
  refresh: function (frm?: any) {
    frm.events.toggle_youtube_statistics_section(frm)
    frm.add_custom_button(__('Watch Video'), () => frappe.help.show_video(frm.doc.url, frm.doc.title))
  },
  toggle_youtube_statistics_section: (frm?: any) => {
    if (frm.doc.provider === 'YouTube') {
      frappe.db.get_single_value('Video Settings', 'enable_youtube_tracking').then((val?: any) => {
        frm.toggle_display('youtube_tracking_section', val)
      })
    }
  },
})
