export type AccessLevel = 'Owner' | 'Finance' | 'Operations'

export interface PortalTenant {
  customer: string
  customer_name: string
  access_level: AccessLevel
}

export interface PortalSettings {
  welcome?: string
  support_phone?: string
  support_email?: string
  paybill?: string
  till?: string
  mpesa: boolean
  meter_readings: boolean
  sales_declarations: boolean
}

export interface PortalContext {
  enabled: boolean
  is_staff: boolean
  user: { full_name?: string; email?: string; mobile_no?: string; user_image?: string | null }
  tenants: PortalTenant[]
  settings: PortalSettings
}

export interface InvoiceSummary {
  name: string
  posting_date: string
  due_date: string
  grand_total: number
  outstanding_amount: number
  billing_period_start?: string | null
  billing_period_end?: string | null
  status: string
  late_fee_for?: string | null
  lease?: string | null
}

export interface PaymentSummary {
  name: string
  posting_date: string
  paid_amount: number
  mode_of_payment?: string
  reference_no?: string
}

export interface LeaseUnitRow {
  unit: string
  unit_type?: string
  area_sqm: number
  monthly_rent: number
  monthly_service_charge?: number
}

export interface LeaseSummary {
  name: string
  property: string
  status: string
  start_date: string
  end_date: string
  billing_frequency: string
  next_billing_date?: string | null
  total_monthly_rent: number
  total_monthly_service_charge: number
  deposit_balance: number
  days_left: number
  turnover_rent_applicable?: number
  units: LeaseUnitRow[]
}

export interface LeaseDetail extends LeaseSummary {
  security_deposit_amount: number
  outstanding_amount: number
  tenant_signed_on?: string | null
  landlord_signed_on?: string | null
  auto_renew: number
  escalation_type: string
  escalation_rate: number
  escalation_months: number
  turnover_rent_percent: number
  notice_period_days: number
  signed_copy?: string | null
  documents: { document_type: string; file: string; expiry_date?: string | null }[]
  schedule: {
    from_date: string
    to_date: string
    monthly_rent: number
    monthly_service_charge: number
    note?: string
  }[]
  charges: { charge_item: string; description?: string; amount: number; frequency: string }[]
}

export interface MaintenanceRow {
  name: string
  subject: string
  status: string
  priority: string
  category?: string
  unit?: string
  opened_on?: string
  due_by?: string
  resolved_on?: string | null
  rating?: number | null
  description?: string
}

export interface MaintenanceDetail extends MaintenanceRow {
  property: string
  resolution?: string
  feedback?: string
  updates: { posted_on: string; posted_by: string; status: string; note: string }[]
  attachments: { name: string; file_name: string; file_url: string }[]
  can_rate: boolean
}

export interface Notice {
  name: string
  title: string
  priority: 'Info' | 'Important' | 'Urgent'
  message: string
  published_on?: string
  attachment?: string | null
}

export interface DashboardData {
  customer: string
  customer_name: string
  access_level: AccessLevel
  balance: { outstanding: number; overdue: number; billed: number }
  next_due?: { name: string; due_date: string; outstanding_amount: number; grand_total: number }[]
  recent_invoices?: InvoiceSummary[]
  recent_payments?: PaymentSummary[]
  monthly?: { month: string; billed: number; paid: number }[]
  leases: LeaseSummary[]
  units: {
    unit: string
    unit_name?: string
    property: string
    unit_type?: string
    area_sqm: number
    floor?: string
    lease: string
  }[]
  open_requests?: number
  recent_requests?: MaintenanceRow[]
  pending_readings?: number
  notices: Notice[]
}

export interface InvoiceDetail {
  name: string
  posting_date: string
  due_date: string
  currency: string
  grand_total: number
  net_total: number
  total_taxes_and_charges: number
  outstanding_amount: number
  status: string
  lease?: string
  property?: string
  period_start?: string
  period_end?: string
  customer: string
  customer_name: string
  tax_id?: string
  company: { company_name: string; tax_id?: string; email?: string; phone_no?: string; website?: string }
  items: { description: string; qty: number; rate: number; amount: number }[]
  taxes: { description: string; rate: number; amount: number }[]
  etims?: { qr?: string | null; receipt?: string | null }
}

export interface StatementRow {
  posting_date: string
  voucher_type: string
  voucher_no: string
  debit: number
  credit: number
  balance: number
  remarks?: string
}

export interface Statement {
  customer: string
  customer_name: string
  from_date: string
  to_date: string
  opening: number
  closing: number
  rows: StatementRow[]
}

export interface MpesaRow {
  name: string
  transaction_id?: string
  amount: number
  status: string
  source: string
  transaction_time?: string
  creation: string
  sales_invoice?: string
  result_description?: string
}

export interface MeterRow {
  name: string
  meter_number: string
  utility_type: string
  unit: string
  last_reading: number
  last_reading_date?: string
  uom?: string
  status: string
  history: {
    name: string
    reading_date: string
    current_reading: number
    consumption: number
    amount: number
    status: string
  }[]
}

export interface DeclarationRow {
  name: string
  lease: string
  period_start: string
  period_end: string
  gross_sales: number
  turnover_rent_due: number
  base_rent_for_period: number
  status: string
}

export interface TeamMember {
  name: string
  user: string
  full_name: string
  access_level: AccessLevel
  mobile_no?: string
}
