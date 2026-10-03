# Port of crm's CRM Sales Hierarchy doctype (frappe/crm, AGPL-3.0): a reporting tree of CRM users
# stored as a nested set (lft/rgt) so subtrees are cheap to query.
from django.conf import settings
from django.db import models, transaction


class SalesHierarchy(models.Model):
    name = models.CharField(max_length=140, primary_key=True, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    reports_to = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="children")
    is_group = models.BooleanField(default=False)
    lft = models.IntegerField(default=0, editable=False)
    rgt = models.IntegerField(default=0, editable=False)

    class Meta:
        app_label = "crm"
        db_table = "crm_sales_hierarchy"
        verbose_name = "CRM Sales Hierarchy"
        ordering = ["lft"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.name = self.user.email
        with transaction.atomic():
            super().save(*args, **kwargs)
            rebuild_tree()

    def delete(self, *args, **kwargs):
        with transaction.atomic():
            super().delete(*args, **kwargs)
            rebuild_tree()

    def descendants(self) -> list["SalesHierarchy"]:
        return list(SalesHierarchy.objects.filter(lft__gt=self.lft, rgt__lt=self.rgt))


def rebuild_tree() -> None:
    rows = list(SalesHierarchy.objects.all().order_by("name"))
    children: dict = {}
    for row in rows:
        children.setdefault(row.reports_to_id, []).append(row)
    counter = 0
    updates = []

    def visit(node: SalesHierarchy) -> None:
        nonlocal counter
        counter += 1
        node.lft = counter
        kids = children.get(node.name, [])
        node.is_group = bool(kids)
        for kid in kids:
            visit(kid)
        counter += 1
        node.rgt = counter
        updates.append(node)

    for root in children.get(None, []):
        visit(root)
    SalesHierarchy.objects.bulk_update(updates, ["lft", "rgt", "is_group"])
