# Scoped equivalent of Frappe's generic Property Setter mechanism, for the one
# thing get_quick_filters()/update_quick_filters() need it for: toggling a
# field's `in_standard_filter` flag per doctype without editing its JSON.
# Not a literal doctype in the original -- Property Setter is a fully generic
# meta-customization system (any field, any property, any doctype); this
# ports just the slice this feature actually uses.
from django.db import models


class QuickFilterOverride(models.Model):
    doctype_label = models.CharField(max_length=140)
    fieldname = models.CharField(max_length=140)
    in_standard_filter = models.BooleanField(default=False)

    class Meta:
        app_label = "crm"
        db_table = "crm_quick_filter_override"
        verbose_name = "Quick Filter Override"
        unique_together = [("doctype_label", "fieldname")]
