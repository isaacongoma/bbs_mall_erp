# Ported from crm/fcrm/doctype/crm_territory/crm_territory.json (frappe/crm, AGPL-3.0)
# and frappe.utils.nestedset's update_add_node/update_move_node (frappe/frappe, MIT) --
# CRMTerritory extends Frappe's generic NestedSet controller, whose lft/rgt
# maintenance is ported directly here since there's no separate base class to inherit.
from django.conf import settings
from django.db import models, transaction
from django.db.models import F, Max


class CRMTerritory(models.Model):
    name = models.CharField(max_length=140, primary_key=True)  # territory_name (autoname: field:territory_name)
    territory_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    parent_crm_territory = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="children"
    )
    old_parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="+", editable=False
    )
    is_group = models.BooleanField(default=False)
    lft = models.IntegerField(default=0, editable=False)
    rgt = models.IntegerField(default=0, editable=False)

    class Meta:
        app_label = "crm"
        db_table = "crm_territory"
        verbose_name = "CRM Territory"
        verbose_name_plural = "CRM Territories"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.update_nsm()

    # -- nested set maintenance -------------------------------------------------

    def update_nsm(self):
        parent = self.parent_crm_territory_id
        old_parent = self.old_parent_id

        with transaction.atomic():
            self.refresh_from_db(fields=["lft", "rgt"])
            if not self.lft and not self.rgt:
                self._update_add_node(parent)
            elif old_parent != parent:
                self._update_move_node()

        type(self).objects.filter(pk=self.pk).update(old_parent_id=parent)
        self.old_parent_id = parent

    def _update_add_node(self, parent):
        Model = type(self)
        if parent:
            parent_row = Model.objects.select_for_update().get(pk=parent)
            assert parent_row.lft < parent_row.rgt
            right = parent_row.rgt
        else:
            right = (Model.objects.filter(parent_crm_territory__isnull=True).aggregate(m=Max("rgt"))["m"] or 0) + 1

        right = right or 1

        Model.objects.filter(rgt__gte=right).update(rgt=F("rgt") + 2)
        Model.objects.filter(lft__gte=right).update(lft=F("lft") + 2)

        Model.objects.filter(pk=self.pk).update(lft=right, rgt=right + 1)
        self.lft, self.rgt = right, right + 1

    def _update_move_node(self):
        Model = type(self)
        parent = self.parent_crm_territory_id

        if parent:
            new_parent = Model.objects.select_for_update().get(pk=parent)
            assert new_parent.lft < new_parent.rgt

        # move to dark side
        Model.objects.filter(lft__gte=self.lft, rgt__lte=self.rgt).update(lft=-F("lft"), rgt=-F("rgt"))

        assert self.lft < self.rgt
        diff = self.rgt - self.lft + 1
        Model.objects.filter(lft__gt=self.rgt).update(lft=F("lft") - diff, rgt=F("rgt") - diff)
        Model.objects.filter(lft__lt=self.lft, rgt__gt=self.rgt).update(rgt=F("rgt") - diff)

        if parent:
            new_parent = Model.objects.select_for_update().get(pk=parent)
            Model.objects.filter(pk=parent).update(rgt=F("rgt") + diff)
            Model.objects.filter(lft__gt=new_parent.rgt).update(lft=F("lft") + diff, rgt=F("rgt") + diff)
            Model.objects.filter(lft__lt=new_parent.lft, rgt__gt=new_parent.rgt).update(rgt=F("rgt") + diff)
            new_diff = new_parent.rgt - self.lft
        else:
            max_rgt = Model.objects.aggregate(m=Max("rgt"))["m"] or 0
            new_diff = max_rgt + 1 - self.lft

        Model.objects.filter(lft__lt=0).update(lft=-F("lft") + new_diff, rgt=-F("rgt") + new_diff)
        self.refresh_from_db(fields=["lft", "rgt"])
