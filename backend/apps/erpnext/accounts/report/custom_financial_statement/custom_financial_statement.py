
from erpnext.accounts.doctype.financial_report_template.financial_report_engine import (
    FinancialReportEngine,
    get_xlsx_styles,
)


def execute(filters: dict | None = None):
    if filters and filters.report_template:
        return FinancialReportEngine().execute(filters)
