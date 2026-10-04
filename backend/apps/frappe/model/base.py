from django.db import models


class FrappeModel(models.Model):
    name = models.CharField(max_length=140, primary_key=True)
    owner = models.CharField(max_length=140, blank=True, default="")
    creation = models.DateTimeField(null=True, blank=True)
    modified = models.DateTimeField(null=True, blank=True)
    modified_by = models.CharField(max_length=140, blank=True, default="")
    docstatus = models.SmallIntegerField(default=0)
    idx = models.IntegerField(default=0)

    class Meta:
        abstract = True


class FrappeChildModel(FrappeModel):
    parent = models.CharField(max_length=140, blank=True, default="")
    parentfield = models.CharField(max_length=140, blank=True, default="")
    parenttype = models.CharField(max_length=140, blank=True, default="")

    class Meta:
        abstract = True


class FrappeTreeModel(FrappeModel):
    lft = models.IntegerField(default=0)
    rgt = models.IntegerField(default=0)
    old_parent = models.CharField(max_length=140, blank=True, default="")

    class Meta:
        abstract = True

