import { frappe } from '@/shared/frappe/runtime'
import erpnext from './erpnext'
import frappeTemplates from './frappe'
import hrms from './hrms'
Object.assign(frappe.templates, frappeTemplates, erpnext, hrms)
