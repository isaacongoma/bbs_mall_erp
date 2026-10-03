# Ported from Frappe's core "Salutation" doctype (frappe/frappe, MIT) -- a
# fixed lookup list linked from Contact/CRM Lead/CRM Deal's `salutation` field.
from django.db import models


class Salutation(models.Model):
    doctype_label = "Salutation"

    name = models.CharField(max_length=140, primary_key=True)  # salutation (autoname: field:salutation)

    class Meta:
        app_label = "core"
        db_table = "salutation"
        verbose_name = "Salutation"

    def __str__(self):
        return self.name
