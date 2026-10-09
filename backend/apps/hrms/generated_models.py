from django.db import models

from apps.hrms.hr.doctype.appointment_letter.appointment_letter_generated import AppointmentLetterGenerated
from apps.hrms.hr.doctype.appointment_letter_content.appointment_letter_content_generated import AppointmentLetterContentGenerated
from apps.hrms.hr.doctype.appointment_letter_template.appointment_letter_template_generated import AppointmentLetterTemplateGenerated
from apps.hrms.hr.doctype.appraisal.appraisal_generated import AppraisalGenerated
from apps.hrms.hr.doctype.appraisal_cycle.appraisal_cycle_generated import AppraisalCycleGenerated
from apps.hrms.hr.doctype.appraisal_goal.appraisal_goal_generated import AppraisalGoalGenerated
from apps.hrms.hr.doctype.appraisal_kra.appraisal_kra_generated import AppraisalKraGenerated
from apps.hrms.hr.doctype.appraisal_template.appraisal_template_generated import AppraisalTemplateGenerated
from apps.hrms.hr.doctype.appraisal_template_goal.appraisal_template_goal_generated import AppraisalTemplateGoalGenerated
from apps.hrms.hr.doctype.appraisee.appraisee_generated import AppraiseeGenerated
from apps.hrms.hr.doctype.attendance.attendance_generated import AttendanceGenerated
from apps.hrms.hr.doctype.attendance_request.attendance_request_generated import AttendanceRequestGenerated
from apps.hrms.hr.doctype.compensatory_leave_request.compensatory_leave_request_generated import CompensatoryLeaveRequestGenerated
from apps.hrms.hr.doctype.department_approver.department_approver_generated import DepartmentApproverGenerated
from apps.hrms.hr.doctype.designation_skill.designation_skill_generated import DesignationSkillGenerated
from apps.hrms.hr.doctype.earned_leave_schedule.earned_leave_schedule_generated import EarnedLeaveScheduleGenerated
from apps.hrms.hr.doctype.employee_advance.employee_advance_generated import EmployeeAdvanceGenerated
from apps.hrms.hr.doctype.employee_boarding_activity.employee_boarding_activity_generated import EmployeeBoardingActivityGenerated
from apps.hrms.hr.doctype.employee_checkin.employee_checkin_generated import EmployeeCheckinGenerated
from apps.hrms.hr.doctype.employee_feedback_criteria.employee_feedback_criteria_generated import EmployeeFeedbackCriteriaGenerated
from apps.hrms.hr.doctype.employee_feedback_rating.employee_feedback_rating_generated import EmployeeFeedbackRatingGenerated
from apps.hrms.hr.doctype.employee_grade.employee_grade_generated import EmployeeGradeGenerated
from apps.hrms.hr.doctype.employee_grievance.employee_grievance_generated import EmployeeGrievanceGenerated
from apps.hrms.hr.doctype.employee_health_insurance.employee_health_insurance_generated import EmployeeHealthInsuranceGenerated
from apps.hrms.hr.doctype.employee_onboarding.employee_onboarding_generated import EmployeeOnboardingGenerated
from apps.hrms.hr.doctype.employee_onboarding_template.employee_onboarding_template_generated import EmployeeOnboardingTemplateGenerated
from apps.hrms.hr.doctype.employee_performance_feedback.employee_performance_feedback_generated import EmployeePerformanceFeedbackGenerated
from apps.hrms.hr.doctype.employee_promotion.employee_promotion_generated import EmployeePromotionGenerated
from apps.hrms.hr.doctype.employee_property_history.employee_property_history_generated import EmployeePropertyHistoryGenerated
from apps.hrms.hr.doctype.employee_referral.employee_referral_generated import EmployeeReferralGenerated
from apps.hrms.hr.doctype.employee_separation.employee_separation_generated import EmployeeSeparationGenerated
from apps.hrms.hr.doctype.employee_separation_template.employee_separation_template_generated import EmployeeSeparationTemplateGenerated
from apps.hrms.hr.doctype.employee_skill.employee_skill_generated import EmployeeSkillGenerated
from apps.hrms.hr.doctype.employee_skill_map.employee_skill_map_generated import EmployeeSkillMapGenerated
from apps.hrms.hr.doctype.employee_training.employee_training_generated import EmployeeTrainingGenerated
from apps.hrms.hr.doctype.employee_transfer.employee_transfer_generated import EmployeeTransferGenerated
from apps.hrms.hr.doctype.employment_type.employment_type_generated import EmploymentTypeGenerated
from apps.hrms.hr.doctype.exit_interview.exit_interview_generated import ExitInterviewGenerated
from apps.hrms.hr.doctype.expected_skill_set.expected_skill_set_generated import ExpectedSkillSetGenerated
from apps.hrms.hr.doctype.expense_claim.expense_claim_generated import ExpenseClaimGenerated
from apps.hrms.hr.doctype.expense_claim_account.expense_claim_account_generated import ExpenseClaimAccountGenerated
from apps.hrms.hr.doctype.expense_claim_advance.expense_claim_advance_generated import ExpenseClaimAdvanceGenerated
from apps.hrms.hr.doctype.expense_claim_detail.expense_claim_detail_generated import ExpenseClaimDetailGenerated
from apps.hrms.hr.doctype.expense_claim_type.expense_claim_type_generated import ExpenseClaimTypeGenerated
from apps.hrms.hr.doctype.expense_taxes_and_charges.expense_taxes_and_charges_generated import ExpenseTaxesAndChargesGenerated
from apps.hrms.hr.doctype.full_and_final_asset.full_and_final_asset_generated import FullAndFinalAssetGenerated
from apps.hrms.hr.doctype.full_and_final_outstanding_statement.full_and_final_outstanding_statement_generated import FullAndFinalOutstandingStatementGenerated
from apps.hrms.hr.doctype.full_and_final_statement.full_and_final_statement_generated import FullAndFinalStatementGenerated
from apps.hrms.hr.doctype.goal.goal_generated import GoalGenerated
from apps.hrms.hr.doctype.grievance_type.grievance_type_generated import GrievanceTypeGenerated
from apps.hrms.hr.doctype.holiday_list_assignment.holiday_list_assignment_generated import HolidayListAssignmentGenerated
from apps.hrms.hr.doctype.hr_telemetry_milestone.hr_telemetry_milestone_generated import HrTelemetryMilestoneGenerated
from apps.hrms.hr.doctype.identification_document_type.identification_document_type_generated import IdentificationDocumentTypeGenerated
from apps.hrms.hr.doctype.interest.interest_generated import InterestGenerated
from apps.hrms.hr.doctype.interview.interview_generated import InterviewGenerated
from apps.hrms.hr.doctype.interview_detail.interview_detail_generated import InterviewDetailGenerated
from apps.hrms.hr.doctype.interview_feedback.interview_feedback_generated import InterviewFeedbackGenerated
from apps.hrms.hr.doctype.interview_type.interview_type_generated import InterviewTypeGenerated
from apps.hrms.hr.doctype.interviewer.interviewer_generated import InterviewerGenerated
from apps.hrms.hr.doctype.job_applicant.job_applicant_generated import JobApplicantGenerated
from apps.hrms.hr.doctype.job_applicant_source.job_applicant_source_generated import JobApplicantSourceGenerated
from apps.hrms.hr.doctype.job_offer.job_offer_generated import JobOfferGenerated
from apps.hrms.hr.doctype.job_offer_term.job_offer_term_generated import JobOfferTermGenerated
from apps.hrms.hr.doctype.job_offer_term_template.job_offer_term_template_generated import JobOfferTermTemplateGenerated
from apps.hrms.hr.doctype.job_opening.job_opening_generated import JobOpeningGenerated
from apps.hrms.hr.doctype.job_opening_template.job_opening_template_generated import JobOpeningTemplateGenerated
from apps.hrms.hr.doctype.job_requisition.job_requisition_generated import JobRequisitionGenerated
from apps.hrms.hr.doctype.kra.kra_generated import KraGenerated
from apps.hrms.hr.doctype.leave_adjustment.leave_adjustment_generated import LeaveAdjustmentGenerated
from apps.hrms.hr.doctype.leave_allocation.leave_allocation_generated import LeaveAllocationGenerated
from apps.hrms.hr.doctype.leave_application.leave_application_generated import LeaveApplicationGenerated
from apps.hrms.hr.doctype.leave_block_list.leave_block_list_generated import LeaveBlockListGenerated
from apps.hrms.hr.doctype.leave_block_list_allow.leave_block_list_allow_generated import LeaveBlockListAllowGenerated
from apps.hrms.hr.doctype.leave_block_list_date.leave_block_list_date_generated import LeaveBlockListDateGenerated
from apps.hrms.hr.doctype.leave_encashment.leave_encashment_generated import LeaveEncashmentGenerated
from apps.hrms.hr.doctype.leave_ledger_entry.leave_ledger_entry_generated import LeaveLedgerEntryGenerated
from apps.hrms.hr.doctype.leave_period.leave_period_generated import LeavePeriodGenerated
from apps.hrms.hr.doctype.leave_policy.leave_policy_generated import LeavePolicyGenerated
from apps.hrms.hr.doctype.leave_policy_assignment.leave_policy_assignment_generated import LeavePolicyAssignmentGenerated
from apps.hrms.hr.doctype.leave_policy_detail.leave_policy_detail_generated import LeavePolicyDetailGenerated
from apps.hrms.hr.doctype.leave_type.leave_type_generated import LeaveTypeGenerated
from apps.hrms.hr.doctype.offer_term.offer_term_generated import OfferTermGenerated
from apps.hrms.hr.doctype.overtime_details.overtime_details_generated import OvertimeDetailsGenerated
from apps.hrms.hr.doctype.overtime_salary_component.overtime_salary_component_generated import OvertimeSalaryComponentGenerated
from apps.hrms.hr.doctype.overtime_slip.overtime_slip_generated import OvertimeSlipGenerated
from apps.hrms.hr.doctype.overtime_type.overtime_type_generated import OvertimeTypeGenerated
from apps.hrms.hr.doctype.purpose_of_travel.purpose_of_travel_generated import PurposeOfTravelGenerated
from apps.hrms.hr.doctype.pwa_notification.pwa_notification_generated import PwaNotificationGenerated
from apps.hrms.hr.doctype.shift_assignment.shift_assignment_generated import ShiftAssignmentGenerated
from apps.hrms.hr.doctype.shift_location.shift_location_generated import ShiftLocationGenerated
from apps.hrms.hr.doctype.shift_request.shift_request_generated import ShiftRequestGenerated
from apps.hrms.hr.doctype.shift_schedule.shift_schedule_generated import ShiftScheduleGenerated
from apps.hrms.hr.doctype.shift_schedule_assignment.shift_schedule_assignment_generated import ShiftScheduleAssignmentGenerated
from apps.hrms.hr.doctype.shift_type.shift_type_generated import ShiftTypeGenerated
from apps.hrms.hr.doctype.skill.skill_generated import SkillGenerated
from apps.hrms.hr.doctype.skill_assessment.skill_assessment_generated import SkillAssessmentGenerated
from apps.hrms.hr.doctype.staffing_plan.staffing_plan_generated import StaffingPlanGenerated
from apps.hrms.hr.doctype.staffing_plan_detail.staffing_plan_detail_generated import StaffingPlanDetailGenerated
from apps.hrms.hr.doctype.training_event.training_event_generated import TrainingEventGenerated
from apps.hrms.hr.doctype.training_event_employee.training_event_employee_generated import TrainingEventEmployeeGenerated
from apps.hrms.hr.doctype.training_feedback.training_feedback_generated import TrainingFeedbackGenerated
from apps.hrms.hr.doctype.training_program.training_program_generated import TrainingProgramGenerated
from apps.hrms.hr.doctype.training_result.training_result_generated import TrainingResultGenerated
from apps.hrms.hr.doctype.training_result_employee.training_result_employee_generated import TrainingResultEmployeeGenerated
from apps.hrms.hr.doctype.travel_itinerary.travel_itinerary_generated import TravelItineraryGenerated
from apps.hrms.hr.doctype.travel_request.travel_request_generated import TravelRequestGenerated
from apps.hrms.hr.doctype.travel_request_costing.travel_request_costing_generated import TravelRequestCostingGenerated
from apps.hrms.hr.doctype.vehicle_log.vehicle_log_generated import VehicleLogGenerated
from apps.hrms.hr.doctype.vehicle_service.vehicle_service_generated import VehicleServiceGenerated
from apps.hrms.hr.doctype.vehicle_service_item.vehicle_service_item_generated import VehicleServiceItemGenerated
from apps.hrms.payroll.doctype.additional_salary.additional_salary_generated import AdditionalSalaryGenerated
from apps.hrms.payroll.doctype.arrear.arrear_generated import ArrearGenerated
from apps.hrms.payroll.doctype.employee_benefit_application.employee_benefit_application_generated import EmployeeBenefitApplicationGenerated
from apps.hrms.payroll.doctype.employee_benefit_application_detail.employee_benefit_application_detail_generated import EmployeeBenefitApplicationDetailGenerated
from apps.hrms.payroll.doctype.employee_benefit_claim.employee_benefit_claim_generated import EmployeeBenefitClaimGenerated
from apps.hrms.payroll.doctype.employee_benefit_detail.employee_benefit_detail_generated import EmployeeBenefitDetailGenerated
from apps.hrms.payroll.doctype.employee_benefit_ledger.employee_benefit_ledger_generated import EmployeeBenefitLedgerGenerated
from apps.hrms.payroll.doctype.employee_cost_center.employee_cost_center_generated import EmployeeCostCenterGenerated
from apps.hrms.payroll.doctype.employee_incentive.employee_incentive_generated import EmployeeIncentiveGenerated
from apps.hrms.payroll.doctype.employee_other_income.employee_other_income_generated import EmployeeOtherIncomeGenerated
from apps.hrms.payroll.doctype.employee_tax_exemption_category.employee_tax_exemption_category_generated import EmployeeTaxExemptionCategoryGenerated
from apps.hrms.payroll.doctype.employee_tax_exemption_declaration.employee_tax_exemption_declaration_generated import EmployeeTaxExemptionDeclarationGenerated
from apps.hrms.payroll.doctype.employee_tax_exemption_declaration_category.employee_tax_exemption_declaration_category_generated import EmployeeTaxExemptionDeclarationCategoryGenerated
from apps.hrms.payroll.doctype.employee_tax_exemption_proof_submission.employee_tax_exemption_proof_submission_generated import EmployeeTaxExemptionProofSubmissionGenerated
from apps.hrms.payroll.doctype.employee_tax_exemption_proof_submission_detail.employee_tax_exemption_proof_submission_detail_generated import EmployeeTaxExemptionProofSubmissionDetailGenerated
from apps.hrms.payroll.doctype.employee_tax_exemption_sub_category.employee_tax_exemption_sub_category_generated import EmployeeTaxExemptionSubCategoryGenerated
from apps.hrms.payroll.doctype.gratuity.gratuity_generated import GratuityGenerated
from apps.hrms.payroll.doctype.gratuity_applicable_component.gratuity_applicable_component_generated import GratuityApplicableComponentGenerated
from apps.hrms.payroll.doctype.gratuity_rule.gratuity_rule_generated import GratuityRuleGenerated
from apps.hrms.payroll.doctype.gratuity_rule_slab.gratuity_rule_slab_generated import GratuityRuleSlabGenerated
from apps.hrms.payroll.doctype.income_tax_slab.income_tax_slab_generated import IncomeTaxSlabGenerated
from apps.hrms.payroll.doctype.income_tax_slab_other_charges.income_tax_slab_other_charges_generated import IncomeTaxSlabOtherChargesGenerated
from apps.hrms.payroll.doctype.payroll_correction.payroll_correction_generated import PayrollCorrectionGenerated
from apps.hrms.payroll.doctype.payroll_correction_child.payroll_correction_child_generated import PayrollCorrectionChildGenerated
from apps.hrms.payroll.doctype.payroll_employee_detail.payroll_employee_detail_generated import PayrollEmployeeDetailGenerated
from apps.hrms.payroll.doctype.payroll_entry.payroll_entry_generated import PayrollEntryGenerated
from apps.hrms.payroll.doctype.payroll_period.payroll_period_generated import PayrollPeriodGenerated
from apps.hrms.payroll.doctype.payroll_period_date.payroll_period_date_generated import PayrollPeriodDateGenerated
from apps.hrms.payroll.doctype.retention_bonus.retention_bonus_generated import RetentionBonusGenerated
from apps.hrms.payroll.doctype.salary_component.salary_component_generated import SalaryComponentGenerated
from apps.hrms.payroll.doctype.salary_component_account.salary_component_account_generated import SalaryComponentAccountGenerated
from apps.hrms.payroll.doctype.salary_detail.salary_detail_generated import SalaryDetailGenerated
from apps.hrms.payroll.doctype.salary_slip.salary_slip_generated import SalarySlipGenerated
from apps.hrms.payroll.doctype.salary_slip_leave.salary_slip_leave_generated import SalarySlipLeaveGenerated
from apps.hrms.payroll.doctype.salary_slip_loan.salary_slip_loan_generated import SalarySlipLoanGenerated
from apps.hrms.payroll.doctype.salary_slip_timesheet.salary_slip_timesheet_generated import SalarySlipTimesheetGenerated
from apps.hrms.payroll.doctype.salary_structure.salary_structure_generated import SalaryStructureGenerated
from apps.hrms.payroll.doctype.salary_structure_assignment.salary_structure_assignment_generated import SalaryStructureAssignmentGenerated
from apps.hrms.payroll.doctype.salary_withholding.salary_withholding_generated import SalaryWithholdingGenerated
from apps.hrms.payroll.doctype.salary_withholding_cycle.salary_withholding_cycle_generated import SalaryWithholdingCycleGenerated
from apps.hrms.payroll.doctype.taxable_salary_slab.taxable_salary_slab_generated import TaxableSalarySlabGenerated

class AppointmentLetter(AppointmentLetterGenerated):
    class Meta:
        db_table = 'tabAppointment Letter'
        verbose_name = 'Appointment Letter'
        ordering = ['-creation']


class AppointmentLetterContent(AppointmentLetterContentGenerated):
    class Meta:
        db_table = 'tabAppointment Letter content'
        verbose_name = 'Appointment Letter content'
        ordering = ['-creation']


class AppointmentLetterTemplate(AppointmentLetterTemplateGenerated):
    class Meta:
        db_table = 'tabAppointment Letter Template'
        verbose_name = 'Appointment Letter Template'
        ordering = ['-creation']


class Appraisal(AppraisalGenerated):
    class Meta:
        db_table = 'tabAppraisal'
        verbose_name = 'Appraisal'
        ordering = ['-creation']


class AppraisalCycle(AppraisalCycleGenerated):
    class Meta:
        db_table = 'tabAppraisal Cycle'
        verbose_name = 'Appraisal Cycle'
        ordering = ['-creation']


class AppraisalGoal(AppraisalGoalGenerated):
    class Meta:
        db_table = 'tabAppraisal Goal'
        verbose_name = 'Appraisal Goal'
        ordering = ['-creation']


class AppraisalKra(AppraisalKraGenerated):
    class Meta:
        db_table = 'tabAppraisal KRA'
        verbose_name = 'Appraisal KRA'
        ordering = ['-creation']


class AppraisalTemplate(AppraisalTemplateGenerated):
    class Meta:
        db_table = 'tabAppraisal Template'
        verbose_name = 'Appraisal Template'
        ordering = ['-creation']


class AppraisalTemplateGoal(AppraisalTemplateGoalGenerated):
    class Meta:
        db_table = 'tabAppraisal Template Goal'
        verbose_name = 'Appraisal Template Goal'
        ordering = ['-creation']


class Appraisee(AppraiseeGenerated):
    class Meta:
        db_table = 'tabAppraisee'
        verbose_name = 'Appraisee'
        ordering = ['-creation']


class Attendance(AttendanceGenerated):
    class Meta:
        db_table = 'tabAttendance'
        verbose_name = 'Attendance'
        ordering = ['-creation']


class AttendanceRequest(AttendanceRequestGenerated):
    class Meta:
        db_table = 'tabAttendance Request'
        verbose_name = 'Attendance Request'
        ordering = ['-creation']


class CompensatoryLeaveRequest(CompensatoryLeaveRequestGenerated):
    class Meta:
        db_table = 'tabCompensatory Leave Request'
        verbose_name = 'Compensatory Leave Request'
        ordering = ['-creation']


class DepartmentApprover(DepartmentApproverGenerated):
    class Meta:
        db_table = 'tabDepartment Approver'
        verbose_name = 'Department Approver'
        ordering = ['-creation']


class DesignationSkill(DesignationSkillGenerated):
    class Meta:
        db_table = 'tabDesignation Skill'
        verbose_name = 'Designation Skill'
        ordering = ['creation']


class EarnedLeaveSchedule(EarnedLeaveScheduleGenerated):
    class Meta:
        db_table = 'tabEarned Leave Schedule'
        verbose_name = 'Earned Leave Schedule'
        ordering = ['-creation']


class EmployeeAdvance(EmployeeAdvanceGenerated):
    class Meta:
        db_table = 'tabEmployee Advance'
        verbose_name = 'Employee Advance'
        ordering = ['-creation']


class EmployeeBoardingActivity(EmployeeBoardingActivityGenerated):
    class Meta:
        db_table = 'tabEmployee Boarding Activity'
        verbose_name = 'Employee Boarding Activity'
        ordering = ['-creation']


class EmployeeCheckin(EmployeeCheckinGenerated):
    class Meta:
        db_table = 'tabEmployee Checkin'
        verbose_name = 'Employee Checkin'
        ordering = ['creation']


class EmployeeFeedbackCriteria(EmployeeFeedbackCriteriaGenerated):
    class Meta:
        db_table = 'tabEmployee Feedback Criteria'
        verbose_name = 'Employee Feedback Criteria'
        ordering = ['-creation']


class EmployeeFeedbackRating(EmployeeFeedbackRatingGenerated):
    class Meta:
        db_table = 'tabEmployee Feedback Rating'
        verbose_name = 'Employee Feedback Rating'
        ordering = ['-creation']


class EmployeeGrade(EmployeeGradeGenerated):
    class Meta:
        db_table = 'tabEmployee Grade'
        verbose_name = 'Employee Grade'
        ordering = ['-creation']


class EmployeeGrievance(EmployeeGrievanceGenerated):
    class Meta:
        db_table = 'tabEmployee Grievance'
        verbose_name = 'Employee Grievance'
        ordering = ['-creation']


class EmployeeHealthInsurance(EmployeeHealthInsuranceGenerated):
    class Meta:
        db_table = 'tabEmployee Health Insurance'
        verbose_name = 'Employee Health Insurance'
        ordering = ['-creation']


class EmployeeOnboarding(EmployeeOnboardingGenerated):
    class Meta:
        db_table = 'tabEmployee Onboarding'
        verbose_name = 'Employee Onboarding'
        ordering = ['-creation']


class EmployeeOnboardingTemplate(EmployeeOnboardingTemplateGenerated):
    class Meta:
        db_table = 'tabEmployee Onboarding Template'
        verbose_name = 'Employee Onboarding Template'
        ordering = ['-creation']


class EmployeePerformanceFeedback(EmployeePerformanceFeedbackGenerated):
    class Meta:
        db_table = 'tabEmployee Performance Feedback'
        verbose_name = 'Employee Performance Feedback'
        ordering = ['-creation']


class EmployeePromotion(EmployeePromotionGenerated):
    class Meta:
        db_table = 'tabEmployee Promotion'
        verbose_name = 'Employee Promotion'
        ordering = ['-creation']


class EmployeePropertyHistory(EmployeePropertyHistoryGenerated):
    class Meta:
        db_table = 'tabEmployee Property History'
        verbose_name = 'Employee Property History'
        ordering = ['-creation']


class EmployeeReferral(EmployeeReferralGenerated):
    class Meta:
        db_table = 'tabEmployee Referral'
        verbose_name = 'Employee Referral'
        ordering = ['-creation']


class EmployeeSeparation(EmployeeSeparationGenerated):
    class Meta:
        db_table = 'tabEmployee Separation'
        verbose_name = 'Employee Separation'
        ordering = ['-creation']


class EmployeeSeparationTemplate(EmployeeSeparationTemplateGenerated):
    class Meta:
        db_table = 'tabEmployee Separation Template'
        verbose_name = 'Employee Separation Template'
        ordering = ['-creation']


class EmployeeSkill(EmployeeSkillGenerated):
    class Meta:
        db_table = 'tabEmployee Skill'
        verbose_name = 'Employee Skill'
        ordering = ['creation']


class EmployeeSkillMap(EmployeeSkillMapGenerated):
    class Meta:
        db_table = 'tabEmployee Skill Map'
        verbose_name = 'Employee Skill Map'
        ordering = ['creation']


class EmployeeTraining(EmployeeTrainingGenerated):
    class Meta:
        db_table = 'tabEmployee Training'
        verbose_name = 'Employee Training'
        ordering = ['creation']


class EmployeeTransfer(EmployeeTransferGenerated):
    class Meta:
        db_table = 'tabEmployee Transfer'
        verbose_name = 'Employee Transfer'
        ordering = ['-creation']


class EmploymentType(EmploymentTypeGenerated):
    class Meta:
        db_table = 'tabEmployment Type'
        verbose_name = 'Employment Type'
        ordering = ['-creation']


class ExitInterview(ExitInterviewGenerated):
    class Meta:
        db_table = 'tabExit Interview'
        verbose_name = 'Exit Interview'
        ordering = ['-creation']


class ExpectedSkillSet(ExpectedSkillSetGenerated):
    class Meta:
        db_table = 'tabExpected Skill Set'
        verbose_name = 'Expected Skill Set'
        ordering = ['-creation']


class ExpenseClaim(ExpenseClaimGenerated):
    class Meta:
        db_table = 'tabExpense Claim'
        verbose_name = 'Expense Claim'
        ordering = ['-creation']


class ExpenseClaimAccount(ExpenseClaimAccountGenerated):
    class Meta:
        db_table = 'tabExpense Claim Account'
        verbose_name = 'Expense Claim Account'
        ordering = ['-creation']


class ExpenseClaimAdvance(ExpenseClaimAdvanceGenerated):
    class Meta:
        db_table = 'tabExpense Claim Advance'
        verbose_name = 'Expense Claim Advance'
        ordering = ['-creation']


class ExpenseClaimDetail(ExpenseClaimDetailGenerated):
    class Meta:
        db_table = 'tabExpense Claim Detail'
        verbose_name = 'Expense Claim Detail'
        ordering = ['-creation']


class ExpenseClaimType(ExpenseClaimTypeGenerated):
    class Meta:
        db_table = 'tabExpense Claim Type'
        verbose_name = 'Expense Claim Type'
        ordering = ['creation']


class ExpenseTaxesAndCharges(ExpenseTaxesAndChargesGenerated):
    class Meta:
        db_table = 'tabExpense Taxes and Charges'
        verbose_name = 'Expense Taxes and Charges'
        ordering = ['creation']


class FullAndFinalAsset(FullAndFinalAssetGenerated):
    class Meta:
        db_table = 'tabFull and Final Asset'
        verbose_name = 'Full and Final Asset'
        ordering = ['-creation']


class FullAndFinalOutstandingStatement(FullAndFinalOutstandingStatementGenerated):
    class Meta:
        db_table = 'tabFull and Final Outstanding Statement'
        verbose_name = 'Full and Final Outstanding Statement'
        ordering = ['-creation']


class FullAndFinalStatement(FullAndFinalStatementGenerated):
    class Meta:
        db_table = 'tabFull and Final Statement'
        verbose_name = 'Full and Final Statement'
        ordering = ['-creation']


class Goal(GoalGenerated):
    class Meta:
        db_table = 'tabGoal'
        verbose_name = 'Goal'
        ordering = ['-creation']


class GrievanceType(GrievanceTypeGenerated):
    class Meta:
        db_table = 'tabGrievance Type'
        verbose_name = 'Grievance Type'
        ordering = ['-creation']


class HolidayListAssignment(HolidayListAssignmentGenerated):
    class Meta:
        db_table = 'tabHoliday List Assignment'
        verbose_name = 'Holiday List Assignment'
        ordering = ['-creation']


class HrTelemetryMilestone(HrTelemetryMilestoneGenerated):
    class Meta:
        db_table = 'tabHR Telemetry Milestone'
        verbose_name = 'HR Telemetry Milestone'
        ordering = ['-creation']


class IdentificationDocumentType(IdentificationDocumentTypeGenerated):
    class Meta:
        db_table = 'tabIdentification Document Type'
        verbose_name = 'Identification Document Type'
        ordering = ['-creation']


class Interest(InterestGenerated):
    class Meta:
        db_table = 'tabInterest'
        verbose_name = 'Interest'
        ordering = ['-creation']


class Interview(InterviewGenerated):
    class Meta:
        db_table = 'tabInterview'
        verbose_name = 'Interview'
        ordering = ['-creation']


class InterviewDetail(InterviewDetailGenerated):
    class Meta:
        db_table = 'tabInterview Detail'
        verbose_name = 'Interview Detail'
        ordering = ['-creation']


class InterviewFeedback(InterviewFeedbackGenerated):
    class Meta:
        db_table = 'tabInterview Feedback'
        verbose_name = 'Interview Feedback'
        ordering = ['-creation']


class InterviewType(InterviewTypeGenerated):
    class Meta:
        db_table = 'tabInterview Type'
        verbose_name = 'Interview Type'
        ordering = ['-creation']


class Interviewer(InterviewerGenerated):
    class Meta:
        db_table = 'tabInterviewer'
        verbose_name = 'Interviewer'
        ordering = ['-creation']


class JobApplicant(JobApplicantGenerated):
    class Meta:
        db_table = 'tabJob Applicant'
        verbose_name = 'Job Applicant'
        ordering = ['creation']


class JobApplicantSource(JobApplicantSourceGenerated):
    class Meta:
        db_table = 'tabJob Applicant Source'
        verbose_name = 'Job Applicant Source'
        ordering = ['-creation']


class JobOffer(JobOfferGenerated):
    class Meta:
        db_table = 'tabJob Offer'
        verbose_name = 'Job Offer'
        ordering = ['-creation']


class JobOfferTerm(JobOfferTermGenerated):
    class Meta:
        db_table = 'tabJob Offer Term'
        verbose_name = 'Job Offer Term'
        ordering = ['-creation']


class JobOfferTermTemplate(JobOfferTermTemplateGenerated):
    class Meta:
        db_table = 'tabJob Offer Term Template'
        verbose_name = 'Job Offer Term Template'
        ordering = ['-creation']


class JobOpening(JobOpeningGenerated):
    class Meta:
        db_table = 'tabJob Opening'
        verbose_name = 'Job Opening'
        ordering = ['creation']


class JobOpeningTemplate(JobOpeningTemplateGenerated):
    class Meta:
        db_table = 'tabJob Opening Template'
        verbose_name = 'Job Opening Template'
        ordering = ['-creation']


class JobRequisition(JobRequisitionGenerated):
    class Meta:
        db_table = 'tabJob Requisition'
        verbose_name = 'Job Requisition'
        ordering = ['-creation']


class Kra(KraGenerated):
    class Meta:
        db_table = 'tabKRA'
        verbose_name = 'KRA'
        ordering = ['-creation']


class LeaveAdjustment(LeaveAdjustmentGenerated):
    class Meta:
        db_table = 'tabLeave Adjustment'
        verbose_name = 'Leave Adjustment'
        ordering = ['-creation']


class LeaveAllocation(LeaveAllocationGenerated):
    class Meta:
        db_table = 'tabLeave Allocation'
        verbose_name = 'Leave Allocation'
        ordering = ['-creation']


class LeaveApplication(LeaveApplicationGenerated):
    class Meta:
        db_table = 'tabLeave Application'
        verbose_name = 'Leave Application'
        ordering = ['-creation']


class LeaveBlockList(LeaveBlockListGenerated):
    class Meta:
        db_table = 'tabLeave Block List'
        verbose_name = 'Leave Block List'
        ordering = ['creation']


class LeaveBlockListAllow(LeaveBlockListAllowGenerated):
    class Meta:
        db_table = 'tabLeave Block List Allow'
        verbose_name = 'Leave Block List Allow'
        ordering = ['-creation']


class LeaveBlockListDate(LeaveBlockListDateGenerated):
    class Meta:
        db_table = 'tabLeave Block List Date'
        verbose_name = 'Leave Block List Date'
        ordering = ['-creation']


class LeaveEncashment(LeaveEncashmentGenerated):
    class Meta:
        db_table = 'tabLeave Encashment'
        verbose_name = 'Leave Encashment'
        ordering = ['-creation']


class LeaveLedgerEntry(LeaveLedgerEntryGenerated):
    class Meta:
        db_table = 'tabLeave Ledger Entry'
        verbose_name = 'Leave Ledger Entry'
        ordering = ['creation']


class LeavePeriod(LeavePeriodGenerated):
    class Meta:
        db_table = 'tabLeave Period'
        verbose_name = 'Leave Period'
        ordering = ['-creation']


class LeavePolicy(LeavePolicyGenerated):
    class Meta:
        db_table = 'tabLeave Policy'
        verbose_name = 'Leave Policy'
        ordering = ['-creation']


class LeavePolicyAssignment(LeavePolicyAssignmentGenerated):
    class Meta:
        db_table = 'tabLeave Policy Assignment'
        verbose_name = 'Leave Policy Assignment'
        ordering = ['-creation']


class LeavePolicyDetail(LeavePolicyDetailGenerated):
    class Meta:
        db_table = 'tabLeave Policy Detail'
        verbose_name = 'Leave Policy Detail'
        ordering = ['-creation']


class LeaveType(LeaveTypeGenerated):
    class Meta:
        db_table = 'tabLeave Type'
        verbose_name = 'Leave Type'
        ordering = ['-creation']


class OfferTerm(OfferTermGenerated):
    class Meta:
        db_table = 'tabOffer Term'
        verbose_name = 'Offer Term'
        ordering = ['-creation']


class OvertimeDetails(OvertimeDetailsGenerated):
    class Meta:
        db_table = 'tabOvertime Details'
        verbose_name = 'Overtime Details'
        ordering = ['-creation']


class OvertimeSalaryComponent(OvertimeSalaryComponentGenerated):
    class Meta:
        db_table = 'tabOvertime Salary Component'
        verbose_name = 'Overtime Salary Component'
        ordering = ['-creation']


class OvertimeSlip(OvertimeSlipGenerated):
    class Meta:
        db_table = 'tabOvertime Slip'
        verbose_name = 'Overtime Slip'
        ordering = ['-creation']


class OvertimeType(OvertimeTypeGenerated):
    class Meta:
        db_table = 'tabOvertime Type'
        verbose_name = 'Overtime Type'
        ordering = ['-creation']


class PurposeOfTravel(PurposeOfTravelGenerated):
    class Meta:
        db_table = 'tabPurpose of Travel'
        verbose_name = 'Purpose of Travel'
        ordering = ['-creation']


class PwaNotification(PwaNotificationGenerated):
    class Meta:
        db_table = 'tabPWA Notification'
        verbose_name = 'PWA Notification'
        ordering = ['-creation']


class ShiftAssignment(ShiftAssignmentGenerated):
    class Meta:
        db_table = 'tabShift Assignment'
        verbose_name = 'Shift Assignment'
        ordering = ['-creation']


class ShiftLocation(ShiftLocationGenerated):
    class Meta:
        db_table = 'tabShift Location'
        verbose_name = 'Shift Location'
        ordering = ['-creation']


class ShiftRequest(ShiftRequestGenerated):
    class Meta:
        db_table = 'tabShift Request'
        verbose_name = 'Shift Request'
        ordering = ['-creation']


class ShiftSchedule(ShiftScheduleGenerated):
    class Meta:
        db_table = 'tabShift Schedule'
        verbose_name = 'Shift Schedule'
        ordering = ['-creation']


class ShiftScheduleAssignment(ShiftScheduleAssignmentGenerated):
    class Meta:
        db_table = 'tabShift Schedule Assignment'
        verbose_name = 'Shift Schedule Assignment'
        ordering = ['-creation']


class ShiftType(ShiftTypeGenerated):
    class Meta:
        db_table = 'tabShift Type'
        verbose_name = 'Shift Type'
        ordering = ['-creation']


class Skill(SkillGenerated):
    class Meta:
        db_table = 'tabSkill'
        verbose_name = 'Skill'
        ordering = ['creation']


class SkillAssessment(SkillAssessmentGenerated):
    class Meta:
        db_table = 'tabSkill Assessment'
        verbose_name = 'Skill Assessment'
        ordering = ['-creation']


class StaffingPlan(StaffingPlanGenerated):
    class Meta:
        db_table = 'tabStaffing Plan'
        verbose_name = 'Staffing Plan'
        ordering = ['-creation']


class StaffingPlanDetail(StaffingPlanDetailGenerated):
    class Meta:
        db_table = 'tabStaffing Plan Detail'
        verbose_name = 'Staffing Plan Detail'
        ordering = ['-creation']


class TrainingEvent(TrainingEventGenerated):
    class Meta:
        db_table = 'tabTraining Event'
        verbose_name = 'Training Event'
        ordering = ['-creation']


class TrainingEventEmployee(TrainingEventEmployeeGenerated):
    class Meta:
        db_table = 'tabTraining Event Employee'
        verbose_name = 'Training Event Employee'
        ordering = ['-creation']


class TrainingFeedback(TrainingFeedbackGenerated):
    class Meta:
        db_table = 'tabTraining Feedback'
        verbose_name = 'Training Feedback'
        ordering = ['-creation']


class TrainingProgram(TrainingProgramGenerated):
    class Meta:
        db_table = 'tabTraining Program'
        verbose_name = 'Training Program'
        ordering = ['-creation']


class TrainingResult(TrainingResultGenerated):
    class Meta:
        db_table = 'tabTraining Result'
        verbose_name = 'Training Result'
        ordering = ['-creation']


class TrainingResultEmployee(TrainingResultEmployeeGenerated):
    class Meta:
        db_table = 'tabTraining Result Employee'
        verbose_name = 'Training Result Employee'
        ordering = ['-creation']


class TravelItinerary(TravelItineraryGenerated):
    class Meta:
        db_table = 'tabTravel Itinerary'
        verbose_name = 'Travel Itinerary'
        ordering = ['-creation']


class TravelRequest(TravelRequestGenerated):
    class Meta:
        db_table = 'tabTravel Request'
        verbose_name = 'Travel Request'
        ordering = ['-creation']


class TravelRequestCosting(TravelRequestCostingGenerated):
    class Meta:
        db_table = 'tabTravel Request Costing'
        verbose_name = 'Travel Request Costing'
        ordering = ['-creation']


class VehicleLog(VehicleLogGenerated):
    class Meta:
        db_table = 'tabVehicle Log'
        verbose_name = 'Vehicle Log'
        ordering = ['-creation']


class VehicleService(VehicleServiceGenerated):
    class Meta:
        db_table = 'tabVehicle Service'
        verbose_name = 'Vehicle Service'
        ordering = ['-creation']


class VehicleServiceItem(VehicleServiceItemGenerated):
    class Meta:
        db_table = 'tabVehicle Service Item'
        verbose_name = 'Vehicle Service Item'
        ordering = ['-creation']


class AdditionalSalary(AdditionalSalaryGenerated):
    class Meta:
        db_table = 'tabAdditional Salary'
        verbose_name = 'Additional Salary'
        ordering = ['-creation']


class Arrear(ArrearGenerated):
    class Meta:
        db_table = 'tabArrear'
        verbose_name = 'Arrear'
        ordering = ['-creation']


class EmployeeBenefitApplication(EmployeeBenefitApplicationGenerated):
    class Meta:
        db_table = 'tabEmployee Benefit Application'
        verbose_name = 'Employee Benefit Application'
        ordering = ['-creation']


class EmployeeBenefitApplicationDetail(EmployeeBenefitApplicationDetailGenerated):
    class Meta:
        db_table = 'tabEmployee Benefit Application Detail'
        verbose_name = 'Employee Benefit Application Detail'
        ordering = ['-creation']


class EmployeeBenefitClaim(EmployeeBenefitClaimGenerated):
    class Meta:
        db_table = 'tabEmployee Benefit Claim'
        verbose_name = 'Employee Benefit Claim'
        ordering = ['-creation']


class EmployeeBenefitDetail(EmployeeBenefitDetailGenerated):
    class Meta:
        db_table = 'tabEmployee Benefit Detail'
        verbose_name = 'Employee Benefit Detail'
        ordering = ['-creation']


class EmployeeBenefitLedger(EmployeeBenefitLedgerGenerated):
    class Meta:
        db_table = 'tabEmployee Benefit Ledger'
        verbose_name = 'Employee Benefit Ledger'
        ordering = ['-creation']


class EmployeeCostCenter(EmployeeCostCenterGenerated):
    class Meta:
        db_table = 'tabEmployee Cost Center'
        verbose_name = 'Employee Cost Center'
        ordering = ['-creation']


class EmployeeIncentive(EmployeeIncentiveGenerated):
    class Meta:
        db_table = 'tabEmployee Incentive'
        verbose_name = 'Employee Incentive'
        ordering = ['-creation']


class EmployeeOtherIncome(EmployeeOtherIncomeGenerated):
    class Meta:
        db_table = 'tabEmployee Other Income'
        verbose_name = 'Employee Other Income'
        ordering = ['-creation']


class EmployeeTaxExemptionCategory(EmployeeTaxExemptionCategoryGenerated):
    class Meta:
        db_table = 'tabEmployee Tax Exemption Category'
        verbose_name = 'Employee Tax Exemption Category'
        ordering = ['-creation']


class EmployeeTaxExemptionDeclaration(EmployeeTaxExemptionDeclarationGenerated):
    class Meta:
        db_table = 'tabEmployee Tax Exemption Declaration'
        verbose_name = 'Employee Tax Exemption Declaration'
        ordering = ['-creation']


class EmployeeTaxExemptionDeclarationCategory(EmployeeTaxExemptionDeclarationCategoryGenerated):
    class Meta:
        db_table = 'tabEmployee Tax Exemption Declaration Category'
        verbose_name = 'Employee Tax Exemption Declaration Category'
        ordering = ['-creation']


class EmployeeTaxExemptionProofSubmission(EmployeeTaxExemptionProofSubmissionGenerated):
    class Meta:
        db_table = 'tabEmployee Tax Exemption Proof Submission'
        verbose_name = 'Employee Tax Exemption Proof Submission'
        ordering = ['-creation']


class EmployeeTaxExemptionProofSubmissionDetail(EmployeeTaxExemptionProofSubmissionDetailGenerated):
    class Meta:
        db_table = 'tabEmployee Tax Exemption Proof Submission Detail'
        verbose_name = 'Employee Tax Exemption Proof Submission Detail'
        ordering = ['-creation']


class EmployeeTaxExemptionSubCategory(EmployeeTaxExemptionSubCategoryGenerated):
    class Meta:
        db_table = 'tabEmployee Tax Exemption Sub Category'
        verbose_name = 'Employee Tax Exemption Sub Category'
        ordering = ['-creation']


class Gratuity(GratuityGenerated):
    class Meta:
        db_table = 'tabGratuity'
        verbose_name = 'Gratuity'
        ordering = ['-creation']


class GratuityApplicableComponent(GratuityApplicableComponentGenerated):
    class Meta:
        db_table = 'tabGratuity Applicable Component'
        verbose_name = 'Gratuity Applicable Component'
        ordering = ['-creation']


class GratuityRule(GratuityRuleGenerated):
    class Meta:
        db_table = 'tabGratuity Rule'
        verbose_name = 'Gratuity Rule'
        ordering = ['-creation']


class GratuityRuleSlab(GratuityRuleSlabGenerated):
    class Meta:
        db_table = 'tabGratuity Rule Slab'
        verbose_name = 'Gratuity Rule Slab'
        ordering = ['-creation']


class IncomeTaxSlab(IncomeTaxSlabGenerated):
    class Meta:
        db_table = 'tabIncome Tax Slab'
        verbose_name = 'Income Tax Slab'
        ordering = ['-creation']


class IncomeTaxSlabOtherCharges(IncomeTaxSlabOtherChargesGenerated):
    class Meta:
        db_table = 'tabIncome Tax Slab Other Charges'
        verbose_name = 'Income Tax Slab Other Charges'
        ordering = ['-creation']


class PayrollCorrection(PayrollCorrectionGenerated):
    class Meta:
        db_table = 'tabPayroll Correction'
        verbose_name = 'Payroll Correction'
        ordering = ['-modified']


class PayrollCorrectionChild(PayrollCorrectionChildGenerated):
    class Meta:
        db_table = 'tabPayroll Correction Child'
        verbose_name = 'Payroll Correction Child'
        ordering = ['-modified']


class PayrollEmployeeDetail(PayrollEmployeeDetailGenerated):
    class Meta:
        db_table = 'tabPayroll Employee Detail'
        verbose_name = 'Payroll Employee Detail'
        ordering = ['-creation']


class PayrollEntry(PayrollEntryGenerated):
    class Meta:
        db_table = 'tabPayroll Entry'
        verbose_name = 'Payroll Entry'
        ordering = ['-creation']


class PayrollPeriod(PayrollPeriodGenerated):
    class Meta:
        db_table = 'tabPayroll Period'
        verbose_name = 'Payroll Period'
        ordering = ['-creation']


class PayrollPeriodDate(PayrollPeriodDateGenerated):
    class Meta:
        db_table = 'tabPayroll Period Date'
        verbose_name = 'Payroll Period Date'
        ordering = ['-creation']


class RetentionBonus(RetentionBonusGenerated):
    class Meta:
        db_table = 'tabRetention Bonus'
        verbose_name = 'Retention Bonus'
        ordering = ['-creation']


class SalaryComponent(SalaryComponentGenerated):
    class Meta:
        db_table = 'tabSalary Component'
        verbose_name = 'Salary Component'
        ordering = ['-creation']


class SalaryComponentAccount(SalaryComponentAccountGenerated):
    class Meta:
        db_table = 'tabSalary Component Account'
        verbose_name = 'Salary Component Account'
        ordering = ['-creation']


class SalaryDetail(SalaryDetailGenerated):
    class Meta:
        db_table = 'tabSalary Detail'
        verbose_name = 'Salary Detail'
        ordering = ['-creation']


class SalarySlip(SalarySlipGenerated):
    class Meta:
        db_table = 'tabSalary Slip'
        verbose_name = 'Salary Slip'
        ordering = ['-creation']


class SalarySlipLeave(SalarySlipLeaveGenerated):
    class Meta:
        db_table = 'tabSalary Slip Leave'
        verbose_name = 'Salary Slip Leave'
        ordering = ['-creation']


class SalarySlipLoan(SalarySlipLoanGenerated):
    class Meta:
        db_table = 'tabSalary Slip Loan'
        verbose_name = 'Salary Slip Loan'
        ordering = ['-modified']


class SalarySlipTimesheet(SalarySlipTimesheetGenerated):
    class Meta:
        db_table = 'tabSalary Slip Timesheet'
        verbose_name = 'Salary Slip Timesheet'
        ordering = ['-creation']


class SalaryStructure(SalaryStructureGenerated):
    class Meta:
        db_table = 'tabSalary Structure'
        verbose_name = 'Salary Structure'
        ordering = ['-creation']


class SalaryStructureAssignment(SalaryStructureAssignmentGenerated):
    class Meta:
        db_table = 'tabSalary Structure Assignment'
        verbose_name = 'Salary Structure Assignment'
        ordering = ['-creation']


class SalaryWithholding(SalaryWithholdingGenerated):
    class Meta:
        db_table = 'tabSalary Withholding'
        verbose_name = 'Salary Withholding'
        ordering = ['-creation']


class SalaryWithholdingCycle(SalaryWithholdingCycleGenerated):
    class Meta:
        db_table = 'tabSalary Withholding Cycle'
        verbose_name = 'Salary Withholding Cycle'
        ordering = ['-creation']


class TaxableSalarySlab(TaxableSalarySlabGenerated):
    class Meta:
        db_table = 'tabTaxable Salary Slab'
        verbose_name = 'Taxable Salary Slab'
        ordering = ['-creation']


