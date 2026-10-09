export interface HrmsUser {
  name: string
  first_name?: string | null
  full_name?: string | null
  user_image?: string | null
  roles?: string[]
}

export interface HrmsEmployee {
  name: string
  first_name?: string | null
  employee_name?: string | null
  designation?: string | null
  department?: string | null
  company?: string | null
  reports_to?: string | null
  user_id?: string | null
  image?: string | null
  status?: string | null
  isActive?: boolean
  [key: string]: unknown
}

export interface HrmsSettings {
  allow_employee_checkin_from_mobile_app?: boolean
  allow_geolocation_tracking?: boolean
  prevent_self_leave_approval?: boolean
  enable_multi_currency_expense_claim?: boolean
}

export interface CurrencyMap {
  [company: string]: [string, string]
}

export interface HrmsRequest {
  name: string
  creation?: string
  employee?: string
  employee_name?: string
  reason?: string
  status?: string
  docstatus?: number
  from_date?: string
  to_date?: string
  start_date?: string
  end_date?: string
  attendance_dates?: string
  shift_dates?: string
  leave_dates?: string
  total_attendance_days?: number | null
  total_shift_days?: number | null
  shift_type?: string
  shift_timing?: string
  leave_type?: string
  leave_days?: number
  description?: string
  purpose?: string
  balance_amount?: number
  currency?: string
  year_to_date?: number
  gross_pay?: number
  net_pay?: number
  posting_date?: string
  log_type?: string
  time?: string
  expense_approver?: string
  workflow_state?: string
  doctype?: string
  [key: string]: unknown
}

export interface HrmsPayrollPeriod {
  name: string
  start_date?: string | null
  end_date?: string | null
}

export interface HrmsCalendarEvents {
  [date: string]: string
}

export interface LeaveBalance {
  allocated_leaves?: number
  expired_leaves?: number
  used_leaves?: number
  pending_leaves?: number
  balance_leaves?: number
  balance_percentage?: number
  [key: string]: unknown
}

export interface LeaveBalanceMap {
  [leaveType: string]: LeaveBalance
}

export interface HrmsHoliday {
  holiday_date: string
  description?: string | null
}
