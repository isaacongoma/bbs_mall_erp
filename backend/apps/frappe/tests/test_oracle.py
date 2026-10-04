import os
import json
from django.test import TestCase
from apps.frappe.runtime import get_doc
from apps.frappe.utils.data import flt, rounded
from apps.frappe.model.naming import make_autoname

def load_oracle_fixture(name):
    path = os.path.join(os.path.dirname(__file__), "oracle", name)
    with open(path, "r") as f:
        return json.load(f)

class OracleFixtureTests(TestCase):
    def test_oracle_rounding(self):
        data = load_oracle_fixture("rounding.json")
        for row in data:
            val = row["value"]
            self.assertEqual(rounded(val), row["rounded"])
            self.assertEqual(flt(val, 2), row["flt_2"])
            
    def test_oracle_naming(self):
        data = load_oracle_fixture("naming.json")
        for row in data:
            self.assertEqual(make_autoname(row["series"]), row["output"])
            
    def test_oracle_nestedset(self):
        data = load_oracle_fixture("nestedset.json")
        def make_territory(name, parent, is_group=1):
            doc = get_doc({"doctype": "Territory", "territory_name": name, "parent_territory": parent, "is_group": is_group})
            doc.insert()
            return doc

        from apps.erpnext.registry import get_model as _get_model

        _get_model("Territory").objects.all().delete()
        make_territory("Root Node", "", 1)
        make_territory("Parent 1", "Root Node", 1)
        make_territory("Parent 2", "Root Node", 1)
        make_territory("Child 1", "Parent 1", 0)
        make_territory("Child 2", "Parent 1", 0)
        make_territory("Child 3", "Parent 2", 0)
        
        from apps.erpnext.registry import get_model
        model = get_model("Territory")
        our_data = list(model.objects.values("name", "lft", "rgt").order_by("lft"))
        
        for expected, actual in zip(data, our_data):
            self.assertEqual(expected["name"], actual["name"])
            self.assertEqual(expected["lft"], actual["lft"])
            self.assertEqual(expected["rgt"], actual["rgt"])
            
    def test_oracle_lifecycle(self):
        data = load_oracle_fixture("lifecycle.json")
        
        from apps.erpnext.registry import get_meta
        meta = get_meta("Terms and Conditions")
        original_submittable = meta.get("is_submittable")
        meta["is_submittable"] = 1

        doc = get_doc({"doctype": "Terms and Conditions", "title": "Draft"})
        doc.insert()
        self.assertEqual(doc.docstatus, data[0]["docstatus"])
        
        doc.title = "Draft Saved"
        doc.save()
        self.assertEqual(doc.docstatus, data[1]["docstatus"])
        
        doc.submit()
        self.assertEqual(doc.docstatus, data[2]["docstatus"])
        
        doc.cancel()
        self.assertEqual(doc.docstatus, data[3]["docstatus"])

        if original_submittable is None:
            del meta["is_submittable"]
        else:
            meta["is_submittable"] = original_submittable
