import frappe
from dateutil.relativedelta import relativedelta

from apps.frappe.model.document import Document
from apps.frappe.utils import add_days, add_years, cstr, getdate
from apps.erpnext.registry import get_model


class FiscalYear(Document):
    doctype = "Fiscal Year"

    def validate(self):
        self.validate_dates()
        self.validate_overlap()

    def on_update(self):
        pass

    def on_trash(self):
        pass

    def validate_dates(self):
        self.validate_from_to_dates("year_start_date", "year_end_date")
        if self.get("is_short_year"):
            return

        date = getdate(self.year_start_date) + relativedelta(years=1) - relativedelta(days=1)

        if getdate(self.year_end_date) != date:
            frappe.throw(
                "Fiscal Year End Date should be one year after Fiscal Year Start Date",
                frappe.exceptions.InvalidDates,
            )

    def validate_overlap(self):
        name = self.name or self.year

        FiscalYearModel = get_model("Fiscal Year")
        existing_fiscal_years = FiscalYearModel.objects.filter(
            year_start_date__lte=self.year_end_date,
            year_end_date__gte=self.year_start_date
        ).exclude(name=name).values("name")

        if existing_fiscal_years:
            FiscalYearCompanyModel = get_model("Fiscal Year Company")
            for existing in existing_fiscal_years:
                company_for_existing = FiscalYearCompanyModel.objects.filter(
                    parent=existing["name"]
                ).values_list("company", flat=True)

                overlap = False
                if not self.get("companies") and not company_for_existing:
                    overlap = True

                for d in self.get("companies", []):
                    if getattr(d, "company", None) in company_for_existing:
                        overlap = True

                if overlap:
                    frappe.throw(
                        f"Year start date or end date is overlapping with {existing['name']}. To avoid please set company",
                        frappe.NameError,
                    )


def auto_create_fiscal_year():
    follow_up_date = add_days(getdate(), days=3)
    FiscalYearModel = get_model("Fiscal Year")

    fiscal_years = FiscalYearModel.objects.filter(
        year_end_date=follow_up_date,
        is_short_year=0,
    ).values_list("name", flat=True)

    for fy_name in fiscal_years:
        frappe.db.savepoint("auto_create_fiscal_year")
        try:
            current_fy = frappe.get_doc("Fiscal Year", fy_name)

            new_fy = frappe.new_doc("Fiscal Year")
            new_fy.disabled = int(current_fy.disabled or 0)

            new_fy.year_start_date = add_days(current_fy.year_end_date, 1)
            new_fy.year_end_date = add_years(current_fy.year_end_date, 1)

            start_year = cstr(new_fy.year_start_date.year)
            end_year = cstr(new_fy.year_end_date.year)
            new_fy.year = start_year if start_year == end_year else (start_year + "-" + end_year)

            for row in current_fy.get("companies", []):
                new_fy.append("companies", {"company": getattr(row, "company", None)})

            new_fy.auto_created = 1

            new_fy.insert(ignore_permissions=True)
        except frappe.NameError:
            frappe.db.rollback(save_point="auto_create_fiscal_year")


def get_from_and_to_date(fiscal_year):
    FiscalYearModel = get_model("Fiscal Year")
    try:
        fy = FiscalYearModel.objects.get(name=fiscal_year)
        return dict(from_date=fy.year_start_date, to_date=fy.year_end_date)
    except LookupError:
        return None
    except FiscalYearModel.DoesNotExist:
        return None
