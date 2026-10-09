import { useDocumentResource } from '@/core/resources'
import { __ } from '@/core/i18n'
import { Dialog, Spinner } from '@/design-system'
import type { HrmsEmployee } from '../types'

export interface ProfileInfoSection {
  title: string
  fields: string[]
}

interface ProfileInfoDialogProps {
  employee: HrmsEmployee | null
  section: ProfileInfoSection | null
  onClose: () => void
}

const labels: Record<string, string> = {
  employee_name: 'Employee Name',
  employee_number: 'Employee Number',
  gender: 'Gender',
  date_of_birth: 'Date of Birth',
  date_of_joining: 'Date of Joining',
  blood_group: 'Blood Group',
  company: 'Company',
  department: 'Department',
  designation: 'Designation',
  branch: 'Branch',
  grade: 'Grade',
  reports_to: 'Reports To',
  employment_type: 'Employment Type',
  cell_number: 'Mobile Number',
  personal_email: 'Personal Email',
  company_email: 'Company Email',
  preferred_email: 'Preferred Email',
  ctc: 'CTC',
  payroll_cost_center: 'Payroll Cost Center',
  pan_number: 'PAN Number',
  provident_fund_account: 'Provident Fund Account',
  salary_mode: 'Salary Mode',
  bank_name: 'Bank Name',
  bank_ac_no: 'Bank Account Number',
  ifsc_code: 'IFSC Code',
  micr_code: 'MICR Code',
  iban: 'IBAN',
}

function formatValue(field: string, value: unknown, currency?: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  if (field === 'ctc' && typeof value === 'number') {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: String(currency || 'USD') }).format(value)
  }
  return String(value)
}

export function ProfileInfoDialog({ employee, section, onClose }: ProfileInfoDialogProps) {
  const resource = useDocumentResource({
    doctype: 'Employee',
    name: employee?.name ?? '',
    auto: Boolean(employee && section),
  })
  const document = (resource?.doc ?? employee ?? {}) as Record<string, unknown>
  const fields = section?.fields
    .map((field) => ({
      field,
      value: formatValue(
        field,
        document[field] ?? (field === 'employee_number' ? document.name : undefined),
        document.salary_currency,
      ),
    }))
    .filter((item) => item.value)

  return (
    <Dialog open={Boolean(section)} onOpenChange={(open) => !open && onClose()} title={section?.title ?? ''} size="lg">
      {!section || (resource?.get.loading && !resource.doc) ? (
        <div className="flex justify-center py-10">
          <Spinner size="md" />
        </div>
      ) : !fields?.length ? (
        <p className="py-4 text-sm text-ink-gray-6">{__('No information available')}</p>
      ) : (
        <div className="flex max-h-[65vh] flex-col gap-4 overflow-auto">
          {fields.map(({ field, value }) => (
            <div
              key={field}
              className="flex items-start justify-between gap-5 border-b border-outline-gray-1 pb-3 last:border-b-0"
            >
              <span className="text-sm text-ink-gray-6">{__(labels[field] ?? field)}</span>
              <span className="max-w-[60%] whitespace-pre-wrap text-right text-base text-ink-gray-8">{value}</span>
            </div>
          ))}
        </div>
      )}
    </Dialog>
  )
}
