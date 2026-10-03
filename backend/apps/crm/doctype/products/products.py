# Ported from crm/fcrm/doctype/crm_products/crm_products.json (frappe/crm, AGPL-3.0)
# Child table (istable: 1) -- rows live under a parent Lead/Deal via `parent`.
from django.db import models


class CRMProductRow(models.Model):
    parent_lead = models.ForeignKey(
        "crm.CRMLead", on_delete=models.CASCADE, related_name="products", null=True, blank=True
    )
    parent_deal = models.ForeignKey(
        "crm.CRMDeal", on_delete=models.CASCADE, related_name="products", null=True, blank=True
    )
    idx = models.PositiveIntegerField(default=0)

    product_code = models.CharField(max_length=140, blank=True)  # Link -> CRM Product
    product_name = models.CharField(max_length=140)
    qty = models.FloatField(default=1)
    rate = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, editable=False)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, editable=False)
    net_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, editable=False)

    class Meta:
        app_label = "crm"
        db_table = "crm_products"
        verbose_name = "CRM Product Row"
        ordering = ["idx"]

    def save(self, *args, **kwargs):
        self.amount = (self.rate or 0) * (self.qty or 0)
        self.discount_amount = self.amount * (self.discount_percentage or 0) / 100
        self.net_amount = self.amount - self.discount_amount
        super().save(*args, **kwargs)
