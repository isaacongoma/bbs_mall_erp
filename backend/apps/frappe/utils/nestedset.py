from __future__ import annotations
from typing import Iterator

from django.db import transaction
from django.db.models import F, Max

from apps.erpnext.registry import get_meta, get_model
from apps.frappe import exceptions


class NestedSetRecursionError(exceptions.ValidationError):
    pass


class NestedSetMultipleRootsError(exceptions.ValidationError):
    pass


class NestedSetChildExistsError(exceptions.ValidationError):
    pass


class NestedSetInvalidMergeError(exceptions.ValidationError):
    pass


def update_nsm(doc):
    old_parent_field = "old_parent"
    parent_field = "parent_" + doc.doctype.replace(" ", "_").lower()

    if getattr(doc, "nsm_parent_field", None):
        parent_field = doc.nsm_parent_field
    if getattr(doc, "nsm_oldparent_field", None):
        old_parent_field = doc.nsm_oldparent_field

    parent = getattr(doc, parent_field, None)
    old_parent = getattr(doc, old_parent_field, None)

    if not getattr(doc, "lft", None) and not getattr(doc, "rgt", None):
        update_add_node(doc, parent or "", parent_field)
    elif old_parent != parent:
        update_move_node(doc, parent_field)

    setattr(doc, old_parent_field, parent)
    
    model = get_model(doc.doctype)
    model.objects.filter(pk=doc.name).update(**{old_parent_field: parent or ""})
    
    doc.reload()


def update_add_node(doc, parent, parent_field):
    model = get_model(doc.doctype)
    name = doc.name

    with transaction.atomic():
        if parent:
            parent_node = model.objects.select_for_update().get(pk=parent)
            left, right = parent_node.lft, parent_node.rgt
            assert left < right, "parent node's lft must be less than its rgt in a nested set"
            validate_loop(doc.doctype, doc.name, left, right)
        else:
            max_rgt = model.objects.filter(**{f"{parent_field}__in": ["", None]}).aggregate(Max('rgt'))['rgt__max'] or 0
            right = max_rgt + 1

        right = right or 1

        model.objects.filter(rgt__gte=right).update(rgt=F('rgt') + 2)
        model.objects.filter(lft__gte=right).update(lft=F('lft') + 2)

        if model.objects.filter(lft=right).exists() or model.objects.filter(rgt=right + 1).exists():
            raise exceptions.ValidationError("Nested set error. Please contact the Administrator.")

        model.objects.filter(pk=name).update(lft=right, rgt=right + 1)
        return right


def update_move_node(doc, parent_field: str):
    parent = getattr(doc, parent_field, None)
    model = get_model(doc.doctype)

    with transaction.atomic():
        if parent:
            new_parent = model.objects.select_for_update().get(pk=parent)
            assert new_parent.lft < new_parent.rgt, "parent node's lft must be less than its rgt in a nested set"
            validate_loop(doc.doctype, doc.name, new_parent.lft, new_parent.rgt)

        model.objects.filter(lft__gte=doc.lft, rgt__lte=doc.rgt).update(lft=-F('lft'), rgt=-F('rgt'))

        assert doc.lft < doc.rgt, "moving node's lft must be less than its rgt in a nested set"
        diff = doc.rgt - doc.lft + 1
        model.objects.filter(lft__gt=doc.rgt).update(lft=F('lft') - diff, rgt=F('rgt') - diff)

        model.objects.filter(lft__lt=doc.lft, rgt__gt=doc.rgt).update(rgt=F('rgt') - diff)

        if parent:
            new_parent = model.objects.select_for_update().get(pk=parent)
            model.objects.filter(pk=parent).update(rgt=F('rgt') + diff)

            model.objects.filter(lft__gt=new_parent.rgt).update(lft=F('lft') + diff, rgt=F('rgt') + diff)

            model.objects.filter(lft__lt=new_parent.lft, rgt__gt=new_parent.rgt).update(rgt=F('rgt') + diff)

            new_diff = new_parent.rgt - doc.lft
        else:
            max_rgt = model.objects.aggregate(Max('rgt'))['rgt__max'] or 0
            new_diff = max_rgt + 1 - doc.lft

        model.objects.filter(lft__lt=0).update(lft=-F('lft') + new_diff, rgt=-F('rgt') + new_diff)


def validate_loop(doctype, name, lft, rgt):
    model = get_model(doctype)
    if model.objects.filter(name=name, lft__lte=lft, rgt__gte=rgt).exists():
        raise NestedSetRecursionError("Item cannot be added to its own descendants")


def rebuild_tree_for_doctype(doctype: str) -> None:
    rebuild_tree(doctype)


def rebuild_tree(doctype: str) -> None:
    meta = get_meta(doctype)
    if not next((f for f in meta.get("fields", []) if f.get("fieldname") == "lft"), None) or \
       not next((f for f in meta.get("fields", []) if f.get("fieldname") == "rgt"), None):
        raise exceptions.ValidationError(f"Rebuilding of tree is not supported for {doctype}")

    parent_field = getattr(meta, "nsm_parent_field", None) or f"parent_{doctype.replace(' ', '_').lower()}"

    model = get_model(doctype)
    right = 1
    roots = model.objects.filter(**{f"{parent_field}__in": ["", None]}).order_by("name").values_list("name", flat=True)

    with transaction.atomic():
        for root in roots:
            right = rebuild_node(doctype, root, right, parent_field)


def rebuild_node(doctype, parent, left, parent_field):
    right = left + 1
    model = get_model(doctype)
    
    children = model.objects.filter(**{parent_field: parent}).order_by("name").values_list("name", flat=True)
    
    for child in children:
        right = rebuild_node(doctype, child, right, parent_field)
        
    assert right > left, "computed rgt must exceed lft after processing children"
    model.objects.filter(pk=parent).update(lft=left, rgt=right)
    
    return right + 1


def remove_subtree(doctype: str, name: str, throw=True):
    model = get_model(doctype)
    with transaction.atomic():
        node = model.objects.select_for_update().get(pk=name)
        lft, rgt = node.lft, node.rgt
        assert lft < rgt, "subtree root's lft must be less than its rgt in a nested set"
        
        model.objects.filter(lft__gte=lft, rgt__lte=rgt).delete()
        
        width = rgt - lft + 1
        model.objects.filter(lft__gt=rgt).update(lft=F('lft') - width)
        model.objects.filter(rgt__gt=rgt).update(rgt=F('rgt') - width)


from apps.frappe.model.document import Document


class NestedSet(Document):
    @property
    def get_parent_field(self):
        if getattr(self, "nsm_parent_field", None):
            return self.nsm_parent_field
        return "parent_" + self.doctype.replace(" ", "_").lower()

    def on_update(self):
        update_nsm(self)
        self.validate_ledger()

    def on_trash(self, allow_root_deletion=False):
        parent = getattr(self, self.get_parent_field, None)
        if not parent and not getattr(self, "allow_root_deletion", True):
            raise exceptions.ValidationError(f"Root {self.doctype} cannot be deleted")

        self.validate_if_child_exists()
        setattr(self, self.get_parent_field, "")
        
        update_nsm(self)

    def validate_if_child_exists(self):
        model = get_model(self.doctype)
        if model.objects.filter(**{self.get_parent_field: self.name}).exists():
            raise NestedSetChildExistsError(f"Cannot delete {self.name} as it has child nodes")

    def before_rename(self, olddn, newdn, merge=False, group_fname="is_group"):
        import apps.frappe as frappe

        if merge and hasattr(self, group_fname):
            is_group = frappe.db.get_value(self.doctype, newdn, group_fname)
            if self.get(group_fname) != is_group:
                frappe.throw(
                    frappe._("Merging is only possible between Group-to-Group or Leaf Node-to-Leaf Node"),
                    NestedSetInvalidMergeError,
                )

    def after_rename(self, olddn, newdn, merge=False):
        import apps.frappe as frappe

        parent_field = self.get_parent_field
        frappe.db.set_value(
            self.doctype,
            {parent_field: newdn},
            {"old_parent": newdn},
            update_modified=False,
        )
        if merge:
            rebuild_tree(self.doctype)

    def validate_one_root(self):
        if not getattr(self, self.get_parent_field, None):
            if self.get_root_node_count() > 1:
                raise NestedSetMultipleRootsError("Multiple root nodes not allowed.")

    def get_root_node_count(self):
        model = get_model(self.doctype)
        return model.objects.filter(**{self.get_parent_field: ""}).count()

    def validate_ledger(self, group_identifier="is_group"):
        if hasattr(self, group_identifier) and not bool(getattr(self, group_identifier, 0)):
            model = get_model(self.doctype)
            if model.objects.filter(**{self.get_parent_field: self.name}).exclude(docstatus=2).exists():
                raise exceptions.ValidationError(f"{self.doctype} {self.name} cannot be a leaf node as it has children")

    def get_ancestors(self):
        return get_ancestors_of(self.doctype, self.name)


def get_ancestors_of(doctype, name, order_by="lft desc", limit=None):
    from apps.frappe.runtime import db, get_all

    lft, rgt = db.get_value(doctype, name, ["lft", "rgt"])
    result = get_all(
        doctype,
        filters={"lft": ["<", lft], "rgt": [">", rgt]},
        fields=["name"],
        order_by=order_by,
        limit_page_length=limit,
        pluck="name",
    )
    return result or []


def get_descendants_of(doctype, name, order_by="lft desc", limit=None, ignore_permissions=False):
    from apps.frappe.runtime import db, get_list

    lft, rgt = db.get_value(doctype, name, ["lft", "rgt"])

    if rgt - lft <= 1:
        return []

    return get_list(
        doctype,
        filters={"lft": [">", lft], "rgt": ["<", rgt]},
        fields=["name"],
        order_by=order_by,
        limit_page_length=limit,
        ignore_permissions=ignore_permissions,
        pluck="name",
    )


def get_root_of(doctype: str):
    from apps.erpnext.registry import get_meta, get_model
    meta = get_meta(doctype)
    parent_field = getattr(meta, "nsm_parent_field", None) or f"parent_{doctype.replace(' ', '_').lower()}"
    model = get_model(doctype)
    root = model.objects.filter(**{f"{parent_field}__in": ["", None]}).first()
    return root.name if root else None
