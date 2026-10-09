import { dayjsLocal } from '@/core/datetime'
import { HrmsDocumentForm } from '../components/HrmsDocumentForm'
import { ExpenseClaimExtras } from '../components/ExpenseClaimExtras'
import { useHrmsEmployee } from '../stores/employeeStore'
import { useParams } from 'react-router-dom'

export default function ExpenseClaimForm() {
  const { id } = useParams()
  return (
    <HrmsDocumentForm
      doctype="Expense Claim"
      title="Claim an Expense"
      description="Submit an expense claim for your employee profile."
      listPath="/hrms/expense-claims/list"
      employee={useHrmsEmployee()}
      docname={id}
      allowAttachments
      seed={{ posting_date: dayjsLocal().format('YYYY-MM-DD') }}
      excludedFields={[
        'naming_series',
        'employee',
        'employee_name',
        'department',
        'company',
        'status',
        'expenses',
        'taxes',
        'advances',
      ]}
      renderExtras={({ data, setField, readOnly }) => (
        <ExpenseClaimExtras data={data} setField={setField} readOnly={readOnly} />
      )}
    />
  )
}
