import { $, __, frappe } from '@/shared/frappe/runtime'
frappe.provide('frappe.ui')
frappe.ui.panel_header = function ({ title, closable = true, on_close }: any = {}) {
  const $header = $(`
		<div class="panel-header">
			<div class="panel-header-top">
				<div class="panel-title"></div>
				<div class="panel-header-actions">
					<div class="panel-actions"></div>
				</div>
			</div>
			<div class="panel-items"></div>
		</div>
	`)
  const $title = $header.find('.panel-title').text(title || '')
  const $actions = $header.find('.panel-actions')
  const $items = $header.find('.panel-items')
  if (closable) {
    $(`<span class="panel-close" role="button" tabindex="0" aria-label="${__('Close')}">
				${frappe.utils.icon('x', 'sm')}
			</span>`)
      .on('click', () => on_close?.())
      .on('keydown', (e?: any) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          on_close?.()
        }
      })
      .appendTo($header.find('.panel-header-actions'))
  }
  return { $header, $title, $items, $actions }
}
