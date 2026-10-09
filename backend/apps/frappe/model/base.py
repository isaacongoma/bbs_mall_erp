import datetime

from django.db import models


class FrappeTimeField(models.TimeField):
    def from_db_value(self, value, expression, connection):
        if isinstance(value, datetime.time):
            return datetime.timedelta(
                hours=value.hour, minutes=value.minute, seconds=value.second, microseconds=value.microsecond
            )
        return value

    def to_python(self, value):
        if isinstance(value, datetime.timedelta):
            total = int(value.total_seconds() * 1_000_000)
            hours, remainder = divmod(total, 3_600_000_000)
            minutes, remainder = divmod(remainder, 60_000_000)
            seconds, microseconds = divmod(remainder, 1_000_000)
            return datetime.time(hours % 24, minutes, seconds, microseconds)
        return super().to_python(value)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        return name, "django.db.models.TimeField", args, kwargs


class FrappeDateTimeField(models.DateTimeField):
    def from_db_value(self, value, expression, connection):
        if isinstance(value, datetime.datetime) and value.tzinfo is not None:
            from django.utils import timezone

            return timezone.make_naive(value, timezone.get_default_timezone())
        return value

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        return name, "django.db.models.DateTimeField", args, kwargs


class FrappeModel(models.Model):
    name = models.CharField(max_length=140, primary_key=True)
    owner = models.CharField(max_length=140, blank=True, default="")
    creation = FrappeDateTimeField(null=True, blank=True)
    modified = FrappeDateTimeField(null=True, blank=True)
    modified_by = models.CharField(max_length=140, blank=True, default="")
    docstatus = models.SmallIntegerField(default=0)
    idx = models.IntegerField(default=0)
    _user_tags = models.TextField(null=True, blank=True)
    _comments = models.TextField(null=True, blank=True)
    _assign = models.TextField(null=True, blank=True)
    _liked_by = models.TextField(null=True, blank=True)

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

