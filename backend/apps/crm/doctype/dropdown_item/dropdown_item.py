# Ported from crm/fcrm/doctype/crm_dropdown_item/crm_dropdown_item.json (frappe/crm, AGPL-3.0)
# Child table (istable: 1) -- FCRM Settings' dropdown_items, editable via
# Settings > Home Actions (HomeActions.vue's Grid control).
from django.db import models

TYPE_CHOICES = [("Route", "Route"), ("Separator", "Separator")]


class CRMDropdownItem(models.Model):
    parent_settings = models.ForeignKey(
        "crm.FCRMSettings", on_delete=models.CASCADE, related_name="dropdown_items_rows"
    )
    idx = models.PositiveIntegerField(default=0)

    label = models.CharField(max_length=140, blank=True)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default="Route")
    route = models.CharField(max_length=140, blank=True)
    hidden = models.BooleanField(default=False)
    is_standard = models.BooleanField(default=False)
    icon = models.TextField(blank=True)
    open_in_new_window = models.BooleanField(default=False)
    name1 = models.CharField(max_length=140, blank=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_dropdown_item"
        verbose_name = "CRM Dropdown Item"
        ordering = ["idx"]
