from django.test import TestCase
from apps.frappe.runtime import get_doc, new_doc, local as frappe_local
from apps.frappe import exceptions
from apps.erpnext.registry import get_model

class TestCostCenter(TestCase):
    def setUp(self):
        frappe_local.flags.ignore_chart_of_accounts = True
        Company = get_model("Company")
        if not Company.objects.filter(name="_Test Company").exists():
            company = new_doc("Company")
            company.company_name = "_Test Company"
            company.abbr = "_TC"
            company.insert(ignore_mandatory=True, ignore_links=True)
            
        if not get_model("Cost Center").objects.filter(name="_Test Company - _TC").exists():
            root_cc = new_doc("Cost Center")
            root_cc.cost_center_name = "_Test Company"
            root_cc.company = "_Test Company"
            root_cc.is_group = 1
            root_cc.insert(ignore_mandatory=True)
            
        if not get_model("Cost Center").objects.filter(name="_Test Cost Center 2 - _TC").exists():
            cc2 = new_doc("Cost Center")
            cc2.cost_center_name = "_Test Cost Center 2"
            cc2.parent_cost_center = "_Test Company - _TC"
            cc2.is_group = 0
            cc2.company = "_Test Company"
            cc2.insert(ignore_mandatory=True)

    def test_cost_center_creation_against_child_node(self):
        cost_center = get_doc(
            {
                "doctype": "Cost Center",
                "cost_center_name": "_Test Cost Center 3",
                "parent_cost_center": "_Test Cost Center 2 - _TC",
                "is_group": 0,
                "company": "_Test Company",
            }
        )

        self.assertRaises(exceptions.ValidationError, cost_center.save)

def create_cost_center(**args):
    if args.get("cost_center_name"):
        company = args.get("company") or "_Test Company"
        
        Company = get_model("Company")
        try:
            company_abbr = Company.objects.get(name=company).abbr
        except Exception:
            company_abbr = company
            
        cc_name = args.get("cost_center_name") + " - " + company_abbr
        CostCenter = get_model("Cost Center")
        
        if not CostCenter.objects.filter(name=cc_name).exists():
            cc = new_doc("Cost Center")
            cc.company = company
            cc.cost_center_name = args.get("cost_center_name")
            cc.is_group = args.get("is_group") or 0
            cc.parent_cost_center = args.get("parent_cost_center") or f"{company} - {company_abbr}"
            cc.insert(ignore_mandatory=True)
