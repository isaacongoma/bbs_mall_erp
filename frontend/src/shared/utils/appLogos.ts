import erpnextLogo from '../assets/desk/erpnext-logo.svg'
import frappeHrLogo from '../assets/desk/frappe-hr-logo.svg'
import frameworkLogo from '../assets/desk/frappe-framework-logo.svg'

const LOGOS: Record<string, string> = {
  erpnext: erpnextLogo,
  hrms: frappeHrLogo,
  frappe: frameworkLogo,
}

export function appLogo(app: string, fallback?: string | null): string {
  return LOGOS[app] ?? fallback ?? frameworkLogo
}
