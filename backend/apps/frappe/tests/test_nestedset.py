from django.test import TestCase
from django.db.models import Max

from apps.erpnext.registry import get_model
from apps.frappe import exceptions, new_doc
from apps.frappe.utils.nestedset import (
    NestedSetRecursionError,
    NestedSetChildExistsError,
    NestedSetInvalidMergeError,
    NestedSetMultipleRootsError,
    rebuild_tree,
    remove_subtree,
    get_ancestors_of
)


class NestedSetTests(TestCase):
    def setUp(self):
        self.records = [
            {"territory_name": "Root Node", "parent_territory": "", "is_group": 1},
            {"territory_name": "Parent 1", "parent_territory": "Root Node", "is_group": 1},
            {"territory_name": "Parent 2", "parent_territory": "Root Node", "is_group": 1},
            {"territory_name": "Child 1", "parent_territory": "Parent 1", "is_group": 0},
            {"territory_name": "Child 2", "parent_territory": "Parent 1", "is_group": 0},
            {"territory_name": "Child 3", "parent_territory": "Parent 2", "is_group": 0},
        ]
        
        get_model("Territory").objects.all().delete()
        
        for record in self.records:
            d = new_doc("Territory")
            for k, v in record.items():
                setattr(d, k, v)
            d.insert()
            
    def get_no_of_children(self, record_name: str) -> int:
        if not record_name:
            return get_model("Territory").objects.count()
        node = get_model("Territory").objects.get(pk=record_name)
        return get_model("Territory").objects.filter(lft__gt=node.lft, rgt__lt=node.rgt).count()

    def test_basic_tree(self):
        min_lft = 1
        max_rgt = get_model("Territory").objects.aggregate(Max("rgt"))["rgt__max"]
        
        for record in self.records:
            node = get_model("Territory").objects.get(pk=record["territory_name"])
            lft, rgt, parent_territory = node.lft, node.rgt, node.parent_territory
            
            if parent_territory:
                parent_node = get_model("Territory").objects.get(pk=parent_territory)
                parent_lft, parent_rgt = parent_node.lft, parent_node.rgt
            else:
                parent_lft = min_lft - 1
                parent_rgt = max_rgt + 1
                
            self.assertTrue(lft)
            self.assertTrue(rgt)
            self.assertTrue(lft < rgt)
            self.assertTrue(parent_lft < parent_rgt)
            self.assertTrue(lft > parent_lft)
            self.assertTrue(rgt < parent_rgt)
            self.assertTrue(lft >= min_lft)
            self.assertTrue(rgt <= max_rgt)
            
            no_of_children = self.get_no_of_children(record["territory_name"])
            self.assertEqual(rgt, lft + 1 + (2 * no_of_children))
            
            if parent_territory:
                no_of_children_parent = self.get_no_of_children(parent_territory)
                self.assertEqual(parent_rgt, parent_lft + 1 + (2 * no_of_children_parent))

    def test_recursion(self):
        from apps.frappe import get_doc
        leaf_node = get_doc("Territory", "Parent 2")
        leaf_node.parent_territory = "Child 3"
        with self.assertRaises(NestedSetRecursionError):
            leaf_node.save()

    def test_rebuild_tree(self):
        rebuild_tree("Territory")
        self.test_basic_tree()

    def test_move_group_into_another(self):
        from apps.frappe import get_doc
        old_node = get_model("Territory").objects.get(pk="Parent 2")
        old_lft, old_rgt = old_node.lft, old_node.rgt
        
        parent_1 = get_doc("Territory", "Parent 1")
        lft, rgt = parent_1.lft, parent_1.rgt
        
        parent_1.parent_territory = "Parent 2"
        parent_1.save()
        self.test_basic_tree()
        
        new_node = get_model("Territory").objects.get(pk="Parent 2")
        new_lft, new_rgt = new_node.lft, new_node.rgt
        
        self.assertEqual(old_lft - new_lft, rgt - lft + 1)
        self.assertEqual(new_rgt - old_rgt, 0)
        
        parent_1 = get_doc("Territory", "Parent 1")
        parent_1.parent_territory = "Root Node"
        parent_1.save()
        self.test_basic_tree()

    def test_move_leaf_into_another_group(self):
        from apps.frappe import get_doc
        child_2 = get_doc("Territory", "Child 2")
        
        parent_node = get_model("Territory").objects.get(pk="Parent 2")
        parent_lft_old, parent_rgt_old = parent_node.lft, parent_node.rgt
        self.assertTrue((parent_lft_old > child_2.lft) or (parent_rgt_old < child_2.rgt))
        
        child_2.parent_territory = "Parent 2"
        child_2.save()
        self.test_basic_tree()
        
        parent_node = get_model("Territory").objects.get(pk="Parent 2")
        parent_lft_new, parent_rgt_new = parent_node.lft, parent_node.rgt
        self.assertTrue((parent_lft_new < child_2.lft) and (parent_rgt_new > child_2.rgt))

    def test_delete_leaf(self):
        from apps.frappe import get_doc
        el = {"territory_name": "Child 1", "parent_territory": "Parent 1", "is_group": 0}
        
        child_1 = get_doc("Territory", "Child 1")
        child_1.delete()
        self.records = [r for r in self.records if r["territory_name"] != "Child 1"]
        self.test_basic_tree()

    def test_delete_group(self):
        from apps.frappe import get_doc
        with self.assertRaises(NestedSetChildExistsError):
            get_doc("Territory", "Parent 1").delete()

    def test_remove_subtree(self):
        remove_subtree("Territory", "Parent 2")
        self.records = [r for r in self.records if r["territory_name"] not in ["Parent 2", "Child 3"]]
        self.test_basic_tree()

    def test_200_random_operations(self):
        import random
        from apps.frappe.runtime import get_doc
        
        nodes = {"Root Node": True}
        for r in self.records:
            nodes[r["territory_name"]] = bool(r.get("is_group"))
            
        ops = 0
        node_counter = 100
        
        random.seed(42)
        
        while ops < 200:
            ops += 1
            op = random.choice(["insert", "move", "delete"])
            groups = [k for k, v in nodes.items() if v]
            leaves = [k for k, v in nodes.items() if not v]
            
            if op == "insert":
                name = f"RandNode {node_counter}"
                node_counter += 1
                is_group = random.choice([0, 1])
                parent = random.choice(groups)
                doc = get_doc({
                    "doctype": "Territory",
                    "territory_name": name,
                    "parent_territory": parent,
                    "is_group": is_group
                })
                doc.insert()
                nodes[name] = bool(is_group)
                
            elif op == "move" and leaves:
                node_to_move = random.choice(leaves)
                possible_parents = [g for g in groups if g != node_to_move]
                if possible_parents:
                    new_parent = random.choice(possible_parents)
                    doc = get_doc("Territory", node_to_move)
                    if doc.parent_territory != new_parent:
                        doc.parent_territory = new_parent
                        doc.save()
                        
            elif op == "delete" and leaves:
                node_to_delete = random.choice(leaves)
                doc = get_doc("Territory", node_to_delete)
                doc.delete()
                del nodes[node_to_delete]
                
        def check_invariants():
            model = get_model("Territory")
            all_nodes = list(model.objects.all().order_by("lft"))
            lft_rgt_set = set()
            
            for n in all_nodes:
                self.assertGreater(n.rgt, n.lft)
                if not n.is_group:
                    self.assertEqual(n.rgt, n.lft + 1)
                self.assertNotIn(n.lft, lft_rgt_set)
                lft_rgt_set.add(n.lft)
                self.assertNotIn(n.rgt, lft_rgt_set)
                lft_rgt_set.add(n.rgt)
                
                children = model.objects.filter(parent_territory=n.pk)
                for child in children:
                    self.assertGreater(child.lft, n.lft)
                    self.assertLess(child.rgt, n.rgt)
                    
            self.assertEqual(min(lft_rgt_set), 1)
            self.assertEqual(max(lft_rgt_set), len(all_nodes) * 2)
            self.assertEqual(len(lft_rgt_set), len(all_nodes) * 2)

        check_invariants()

        from apps.frappe.utils.nestedset import rebuild_tree
        rebuild_tree("Territory")
        check_invariants()
