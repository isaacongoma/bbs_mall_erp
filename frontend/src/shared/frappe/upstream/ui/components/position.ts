import { frappe } from '@/shared/frappe/runtime'
export const SIDES: any = ['top', 'right', 'bottom', 'left']
export const ALIGNS: any = ['start', 'center', 'end']
const VIEWPORT_PAD = 8
export function place(panel?: any, anchor?: any, side?: any, align?: any, offset?: any) {
  if ((side === 'top' || side === 'bottom') && frappe.utils.is_rtl()) {
    if (align === 'start') align = 'end'
    else if (align === 'end') align = 'start'
  }
  let rect = panel.getBoundingClientRect()
  const max_height = window.innerHeight - 2 * VIEWPORT_PAD
  if (rect.height > max_height) {
    panel.style.maxHeight = `${max_height}px`
    rect = panel.getBoundingClientRect()
  }
  const room: any = {
    top: anchor.top - VIEWPORT_PAD,
    bottom: window.innerHeight - anchor.bottom - VIEWPORT_PAD,
    left: anchor.left - VIEWPORT_PAD,
    right: window.innerWidth - anchor.right - VIEWPORT_PAD,
  }
  const opposite: any = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }
  const needed = side === 'top' || side === 'bottom' ? rect.height : rect.width
  if (room[side] < needed + offset && room[opposite[side]] > room[side]) {
    side = opposite[side]
  }
  let top: any, left: any
  if (side === 'top' || side === 'bottom') {
    top = side === 'bottom' ? anchor.bottom + offset : anchor.top - offset - rect.height
    if (align === 'start') left = anchor.left
    else if (align === 'end') left = anchor.right - rect.width
    else left = anchor.left + anchor.width / 2 - rect.width / 2
  } else {
    left = side === 'right' ? anchor.right + offset : anchor.left - offset - rect.width
    if (align === 'start') top = anchor.top
    else if (align === 'end') top = anchor.bottom - rect.height
    else top = anchor.top + anchor.height / 2 - rect.height / 2
  }
  left = Math.min(Math.max(left, VIEWPORT_PAD), window.innerWidth - rect.width - VIEWPORT_PAD)
  top = Math.min(Math.max(top, VIEWPORT_PAD), window.innerHeight - rect.height - VIEWPORT_PAD)
  panel.style.top = `${Math.round(top)}px`
  panel.style.left = `${Math.round(left)}px`
  panel.setAttribute('data-side', side)
  panel.setAttribute('data-align', align)
}
