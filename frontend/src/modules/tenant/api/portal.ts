import { callMethod } from '@/shared/frappe/api'
import type {
  DashboardData,
  DeclarationRow,
  InvoiceDetail,
  InvoiceSummary,
  LeaseDetail,
  MaintenanceDetail,
  MaintenanceRow,
  MeterRow,
  MpesaRow,
  Notice,
  PaymentSummary,
  PortalContext,
  Statement,
  TeamMember,
} from '../types/portal'

const PREFIX = 'bbs_property.property_management.portal'

async function call<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const response = await callMethod(`${PREFIX}.${name}`, args)
  return response.message as T
}

export interface NewMaintenance {
  subject: string
  unit: string
  category: string
  priority: string
  description: string
}

export const portalApi = {
  context: () => call<PortalContext>('get_context'),
  dashboard: (customer?: string) => call<DashboardData>('get_dashboard', { customer }),
  invoices: (customer: string | undefined, status: string, start: number, limit: number) =>
    call<{ rows: InvoiceSummary[]; total: number }>('get_invoices', { customer, status, start, limit }),
  invoice: (name: string, customer?: string) => call<InvoiceDetail>('get_invoice', { name, customer }),
  statement: (customer: string | undefined, from_date: string, to_date: string) =>
    call<Statement>('get_statement', { customer, from_date, to_date }),
  payments: (customer?: string) =>
    call<{ payments: PaymentSummary[]; mpesa: MpesaRow[] }>('get_payments', { customer }),
  startPayment: (customer: string | undefined, phone: string, amount: number, invoice?: string) =>
    call<{ payment: string; checkout_request_id: string; message?: string }>('start_payment', {
      customer,
      phone,
      amount,
      invoice,
    }),
  checkPayment: (payment: string, customer?: string) =>
    call<{ status: string; transaction_id?: string; result_description?: string; amount: number }>('check_payment', {
      payment,
      customer,
    }),
  leases: (customer?: string) => call<LeaseDetail[]>('get_leases', { customer }),
  signLease: (lease: string, signature: string, signatory_name: string, customer?: string) =>
    call<boolean>('sign_lease', { lease, signature, signatory_name, customer }),
  requestRenewal: (lease: string, message: string, customer?: string) =>
    call<boolean>('request_renewal', { lease, message, customer }),
  maintenance: (customer: string | undefined, status: string) =>
    call<MaintenanceRow[]>('get_maintenance', { customer, status }),
  maintenanceRequest: (name: string, customer?: string) =>
    call<MaintenanceDetail>('get_maintenance_request', { name, customer }),
  createMaintenance: (customer: string | undefined, values: NewMaintenance) =>
    call<string>('create_maintenance_request', { customer, ...values }),
  commentMaintenance: (name: string, note: string, customer?: string) =>
    call<boolean>('add_maintenance_comment', { name, note, customer }),
  rateMaintenance: (name: string, rating: number, feedback: string, customer?: string) =>
    call<boolean>('rate_maintenance_request', { name, rating, feedback, customer }),
  upload: (doctype: string, docname: string, filename: string, content: string, customer?: string) =>
    call<{ name: string; file_url: string }>('upload_attachment', { doctype, docname, filename, content, customer }),
  meters: (customer?: string) => call<MeterRow[]>('get_meters', { customer }),
  submitReading: (customer: string | undefined, meter: string, reading: number, reading_date?: string) =>
    call<{ name: string; status: string; consumption: number; amount: number }>('submit_meter_reading', {
      customer,
      meter,
      reading,
      reading_date,
    }),
  sales: (customer?: string) =>
    call<{
      leases: { name: string; property: string; turnover_rent_percent: number }[]
      declarations: DeclarationRow[]
      enabled: boolean
    }>('get_sales_declarations', { customer }),
  submitSales: (
    customer: string | undefined,
    lease: string,
    period_start: string,
    period_end: string,
    gross_sales: number,
  ) =>
    call<{ name: string; turnover_rent_due: number }>('submit_sales_declaration', {
      customer,
      lease,
      period_start,
      period_end,
      gross_sales,
    }),
  notices: (customer?: string) => call<Notice[]>('get_notices', { customer }),
  team: (customer?: string) => call<TeamMember[]>('get_team', { customer }),
  invite: (customer: string | undefined, email: string, full_name: string, mobile: string, access_level: string) =>
    call<boolean>('invite_portal_user', { customer, email, full_name, mobile, access_level }),
  removeUser: (customer: string | undefined, user: string) => call<boolean>('remove_portal_user', { customer, user }),
  updateProfile: (mobile_no: string, full_name: string) => call<boolean>('update_profile', { mobile_no, full_name }),
}
