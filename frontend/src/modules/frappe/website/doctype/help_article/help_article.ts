import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Help Article', {
  refresh: function (frm?: any) {
    frm.dashboard.clear_headline()
    frm.dashboard.set_headline_alert(`
			<div class="row">
				<div class="col-md-6 col-xs-12">
					<span class="indicator whitespace-nowrap green">
						<span>Helpful: ${frm.doc.helpful || 0}</span>
					</span>
				</div>
				<div class="col-md-6 col-xs-12">
					<span class="indicator whitespace-nowrap red">
						<span>Not Helpful: ${frm.doc.not_helpful || 0}</span>
					</span>
				</div>
			</div>
		`)
  },
})
