import frappe
from frappe.utils import add_days, random_string, today

from erpnext.crm.doctype.opportunity.test_opportunity import make_opportunity
from erpnext.selling.doctype.quotation.test_quotation import make_quotation
from erpnext.selling.page.sales_funnel.sales_funnel import get_funnel_data
from erpnext.tests.utils import ERPNextTestSuite


class TestSalesFunnel(ERPNextTestSuite):
    def get_stage_value(self, data, title):
        for stage in data:
            if stage["title"] == title:
                return stage["value"]
        self.fail(f"Stage {title!r} not found in funnel data: {data}")

    def make_lead(self, company):
        return frappe.get_doc(
            {
                "doctype": "Lead",
                "first_name": "_Test Funnel",
                "last_name": random_string(6),
                "email_id": f"funnel_{random_string(8)}@example.com",
                "company": company,
                "status": "Lead",
            }
        ).insert(ignore_permissions=True)

    def test_funnel_lead_and_opportunity_counts(self):
        company = "_Test Company"
        from_date, to_date = today(), add_days(today(), 1)

        baseline = get_funnel_data(from_date, to_date, company)
        baseline_leads = self.get_stage_value(baseline, "Active Leads")
        baseline_opportunities = self.get_stage_value(baseline, "Opportunities")

        lead_1 = self.make_lead(company)
        self.make_lead(company)

        opportunity = make_opportunity(
            company=company,
            opportunity_from="Lead",
            lead=lead_1.name,
        )
        self.assertEqual(opportunity.opportunity_from, "Lead")
        self.assertEqual(opportunity.party_name, lead_1.name)

        after = get_funnel_data(from_date, to_date, company)
        after_leads = self.get_stage_value(after, "Active Leads")
        after_opportunities = self.get_stage_value(after, "Opportunities")

        self.assertEqual(after_leads - baseline_leads, 2)
        self.assertEqual(after_opportunities - baseline_opportunities, 1)

        self.assertGreaterEqual(after_leads, 2)
        self.assertGreaterEqual(after_opportunities, 1)

    def test_funnel_filters_by_company(self):
        company = "_Test Company"
        other_company = "_Test Company 1"
        from_date, to_date = today(), add_days(today(), 1)

        baseline_leads = self.get_stage_value(get_funnel_data(from_date, to_date, company), "Active Leads")

        self.make_lead(other_company)

        after_leads = self.get_stage_value(get_funnel_data(from_date, to_date, company), "Active Leads")
        self.assertEqual(after_leads, baseline_leads)

    def test_funnel_quotations_count(self):
        company = "_Test Company"
        from_date, to_date = today(), add_days(today(), 1)

        baseline_quotations = self.get_stage_value(get_funnel_data(from_date, to_date, company), "Quotations")

        opportunity = make_opportunity(company=company, opportunity_from="Customer")

        quotation = make_quotation(party_name="_Test Customer", company=company, do_not_submit=True)
        quotation.opportunity = opportunity.name
        quotation.submit()
        self.assertEqual(quotation.docstatus, 1)

        after_quotations = self.get_stage_value(get_funnel_data(from_date, to_date, company), "Quotations")
        self.assertEqual(after_quotations - baseline_quotations, 1)
        self.assertGreaterEqual(after_quotations, 1)

    def test_funnel_converted_count(self):
        company = "_Test Company"
        from_date, to_date = today(), add_days(today(), 1)

        baseline_converted = self.get_stage_value(get_funnel_data(from_date, to_date, company), "Converted")

        lead = self.make_lead(company)
        frappe.get_doc(
            {
                "doctype": "Customer",
                "customer_name": f"_Test Funnel Customer {random_string(6)}",
                "customer_type": "Company",
                "customer_group": "_Test Customer Group",
                "territory": "_Test Territory",
                "lead_name": lead.name,
            }
        ).insert(ignore_permissions=True)

        after_converted = self.get_stage_value(get_funnel_data(from_date, to_date, company), "Converted")
        self.assertEqual(after_converted - baseline_converted, 1)
        self.assertGreaterEqual(after_converted, 1)
