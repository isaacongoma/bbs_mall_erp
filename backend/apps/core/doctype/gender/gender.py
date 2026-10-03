# Ported from Frappe's core "Gender" doctype (frappe/frappe, MIT) -- a fixed
# lookup list linked from Contact/CRM Lead/CRM Deal's `gender` field.
from django.db import models


class Gender(models.Model):
    doctype_label = "Gender"

    name = models.CharField(max_length=140, primary_key=True)  # gender (autoname: field:gender)

    class Meta:
        app_label = "core"
        db_table = "gender"
        verbose_name = "Gender"

    def __str__(self):
        return self.name
