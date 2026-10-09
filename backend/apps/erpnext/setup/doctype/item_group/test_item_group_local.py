import json
import os
from unittest.mock import patch
from django.test import TestCase

from apps.frappe.runtime import get_doc, new_doc, db
from apps.erpnext.registry import get_model
from apps.frappe.utils.nestedset import (
    NestedSetChildExistsError,
    NestedSetInvalidMergeError,
    NestedSetMultipleRootsError,
    NestedSetRecursionError,
    get_ancestors_of,
    rebuild_tree,
)
from django.db.models import Max

TRANSLATED_ROOT = "Todos os Grupos de Itens"

class TestItemGroup(TestCase):
    def setUp(self):
        with open("D:/Clients/BBS-ERP/vendor/erpnext/erpnext/setup/doctype/item_group/test_records.json", "r", encoding="utf-8") as f:
            self.records = json.load(f)
            
        get_model("Item Group").objects.all().delete()

        root = new_doc("Item Group")
        root.item_group_name = "All Item Groups"
        root.is_group = 1
        root.parent_item_group = ""
        root.insert()
        
        for record in self.records:
            record.pop("item_group_defaults", None)
            record.pop("taxes", None)
            d = get_doc(record)
            d.insert()

    def _get_no_of_children(self, item_group):
        def get_no_of_children_recursive(item_groups, no_of_children):
            children = []
            for ig in item_groups:
                children += list(get_model("Item Group").objects.filter(parent_item_group=ig).values_list("name", flat=True))
            if len(children):
                return get_no_of_children_recursive(children, no_of_children + len(children))
            else:
                return no_of_children

        return get_no_of_children_recursive([item_group], 0)

    def test_basic_tree(self, records=None):
        min_lft = 1
        max_rgt = get_model("Item Group").objects.aggregate(Max("rgt"))["rgt__max"]

        if not records:
            records = self.records[2:]

        for record in records:
            item_group = get_model("Item Group").objects.get(pk=record["item_group_name"])
            lft, rgt, parent_item_group = item_group.lft, item_group.rgt, item_group.parent_item_group

            if parent_item_group:
                parent_node = get_model("Item Group").objects.get(pk=parent_item_group)
                parent_lft, parent_rgt = parent_node.lft, parent_node.rgt
            else:
                parent_lft = min_lft - 1
                parent_rgt = max_rgt + 1

            self.assertTrue(lft, "has no lft")
            self.assertTrue(rgt, "has no rgt")
            self.assertTrue(lft < rgt, "lft >= rgt")
            self.assertTrue(parent_lft < parent_rgt, "parent_lft >= parent_rgt")
            self.assertTrue(lft > parent_lft, "lft <= parent_lft")
            self.assertTrue(rgt < parent_rgt, "rgt >= parent_rgt")
            self.assertTrue(lft >= min_lft, "lft < min_lft")
            self.assertTrue(rgt <= max_rgt, "rgs > max_rgt")

            no_of_children = self._get_no_of_children(record["item_group_name"])
            self.assertTrue(rgt == (lft + 1 + (2 * no_of_children)), "rgt is not lft + 1 + (2 * #children)")

            no_of_children = self._get_no_of_children(parent_item_group)
            self.assertTrue(
                parent_rgt == (parent_lft + 1 + (2 * no_of_children)), "parent_rgs is not 1 + (2 * #children)"
            )

    def test_recursion(self):
        group_b = get_doc("Item Group", "_Test Item Group B")
        group_b.parent_item_group = "_Test Item Group B - 3"
        self.assertRaises(NestedSetRecursionError, group_b.save)

        group_b.parent_item_group = "All Item Groups"
        group_b.save()

    def test_rebuild_tree(self):
        rebuild_tree("Item Group")
        self.test_basic_tree()

    def test_move_group_into_another(self):
        old_lft = get_model("Item Group").objects.get(pk="_Test Item Group C").lft
        old_rgt = get_model("Item Group").objects.get(pk="_Test Item Group C").rgt

        group_b = get_doc("Item Group", "_Test Item Group B")
        lft, rgt = group_b.lft, group_b.rgt

        group_b.parent_item_group = "_Test Item Group C"
        group_b.save()
        self.test_basic_tree()

        new_lft = get_model("Item Group").objects.get(pk="_Test Item Group C").lft
        new_rgt = get_model("Item Group").objects.get(pk="_Test Item Group C").rgt

        self.assertEqual(old_lft - new_lft, rgt - lft + 1)
        self.assertEqual(new_rgt - old_rgt, 0)

        self._move_it_back()

    def test_move_group_into_root(self):
        group_b = get_doc("Item Group", "_Test Item Group B")
        group_b.parent_item_group = ""
        group_b.flags["in_test"] = True
        self.assertRaises(NestedSetMultipleRootsError, group_b.save)

        self.test_basic_tree()
        self._move_it_back()

    def test_move_leaf_into_another_group(self):
        old_lft = get_model("Item Group").objects.get(pk="_Test Item Group C").lft
        old_rgt = get_model("Item Group").objects.get(pk="_Test Item Group C").rgt

        group_b_3 = get_doc("Item Group", "_Test Item Group B - 3")
        group_b_3.parent_item_group = "_Test Item Group C"
        group_b_3.save()
        self.test_basic_tree()

        new_lft = get_model("Item Group").objects.get(pk="_Test Item Group C").lft
        new_rgt = get_model("Item Group").objects.get(pk="_Test Item Group C").rgt

        self.assertEqual(old_lft - new_lft, 2)
        self.assertEqual(new_rgt - old_rgt, 0)

        group_b_3 = get_doc("Item Group", "_Test Item Group B - 3")
        group_b_3.parent_item_group = "_Test Item Group B"
        group_b_3.save()
        self.test_basic_tree()

    def test_delete_leaf(self):
        parent_item_group = get_model("Item Group").objects.get(pk="_Test Item Group B - 3").parent_item_group
        ancestors = get_ancestors_of("Item Group", "_Test Item Group B - 3")
        ancestor_rgts = {doc.name: doc.rgt for doc in get_model("Item Group").objects.filter(name__in=ancestors)}

        doc = get_doc("Item Group", "_Test Item Group B - 3")
        doc.delete()

        records_to_test = self.records[2:]
        del records_to_test[4]
        self.test_basic_tree(records=records_to_test)

        for name, old_rgt in ancestor_rgts.items():
            new_rgt = get_model("Item Group").objects.get(pk=name).rgt
            self.assertEqual(new_rgt, old_rgt - 2)

        record6 = dict(self.records[6])
        record6.pop("item_group_defaults", None)
        record6.pop("taxes", None)
        doc = get_doc(record6)
        doc.insert()
        self.test_basic_tree()

    def test_delete_group(self):
        doc = get_doc("Item Group", "_Test Item Group B")
        self.assertRaises(NestedSetChildExistsError, doc.delete)

    def _move_it_back(self):
        group_b = get_doc("Item Group", "_Test Item Group B")
        group_b.parent_item_group = "All Item Groups"
        group_b.save()
        self.test_basic_tree()
