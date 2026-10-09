import frappe

from erpnext.stock.report.bom_search.bom_search import execute
from erpnext.tests.utils import ERPNextTestSuite


class TestBomSearch(ERPNextTestSuite):
    def run_report(self, **extra):
        filters = frappe._dict({"search_sub_assemblies": 0})
        filters.update(extra)
        return execute(filters)[1]

    def test_bom_found_by_contained_item(self):
        raw_material = "_Test Item"
        finished_good = "_Test FG Item"

        bom = frappe.get_doc(doctype="BOM", item=finished_good, company="_Test Company", currency="INR")
        bom.append("items", {"item_code": raw_material, "qty": 1})
        bom.insert()
        bom.submit()

        rows = self.run_report(item1=raw_material)
        bom_names = [row[0] for row in rows]
        self.assertIn(bom.name, bom_names)

    def test_search_sub_assemblies_finds_top_level_bom(self):
        raw_material = "_Test Item"
        sub_assembly = "_Test FG Item"
        finished_good = "_Test FG Item 2"

        top_bom = frappe.get_doc(
            doctype="BOM", item=finished_good, company="_Test Company", currency="USD", conversion_rate=1
        )
        top_bom.append("items", {"item_code": sub_assembly, "qty": 1})
        top_bom.insert()
        top_bom.submit()

        deep = [row[0] for row in self.run_report(search_sub_assemblies=1, item1=raw_material)]
        self.assertIn(top_bom.name, deep)

        direct = [row[0] for row in self.run_report(search_sub_assemblies=0, item1=raw_material)]
        self.assertNotIn(top_bom.name, direct)
