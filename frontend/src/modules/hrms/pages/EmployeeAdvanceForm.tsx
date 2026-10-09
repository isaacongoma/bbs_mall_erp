import { dayjsLocal } from '@/core/datetime'
import { HrmsDocumentForm } from '../components/HrmsDocumentForm'
import { useHrmsEmployee } from '../stores/employeeStore'
import { useParams } from 'react-router-dom'

export default function EmployeeAdvanceForm() {
  const { id } = useParams()
  return (
    <HrmsDocumentForm
      doctype="Employee Advance"
      title="Request an Advance"
      description="Submit an employee advance request for approval."
      listPath="/hrms/employee-advances"
      employee={useHrmsEmployee()}
      docname={id}
      seed={{ posting_date: dayjsLocal().format('YYYY-MM-DD') }}
      excludedFields={['naming_series', 'employee', 'employee_name', 'department', 'company', 'status']}
    />
  )
}
