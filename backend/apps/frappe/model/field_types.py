from django.db import models

NO_COLUMN_FIELDTYPES = {
    "Section Break",
    "Column Break",
    "Tab Break",
    "HTML",
    "Button",
    "Heading",
    "Image",
    "Fold",
    "Table",
    "Table MultiSelect",
}

TEXT_FIELDTYPES = {
    "Small Text",
    "Text",
    "Long Text",
    "Text Editor",
    "Code",
    "JSON",
    "HTML Editor",
    "Markdown Editor",
    "Password",
    "Attach",
    "Attach Image",
    "Signature",
    "Geolocation",
}

DECIMAL_FIELDTYPES = {"Currency", "Float", "Percent", "Duration"}


def has_column(df):
    return df.get("fieldtype") not in NO_COLUMN_FIELDTYPES and not df.get("is_virtual")


def django_field(df):
    fieldtype = df.get("fieldtype")
    if fieldtype in TEXT_FIELDTYPES:
        return models.TextField(blank=True, default="")
    if fieldtype in DECIMAL_FIELDTYPES:
        return models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    if fieldtype == "Int":
        return models.IntegerField(null=True, blank=True)
    if fieldtype == "Long Int":
        return models.BigIntegerField(null=True, blank=True)
    if fieldtype == "Check":
        try:
            default = int(df.get("default") or 0)
        except (TypeError, ValueError):
            default = 0
        return models.SmallIntegerField(default=default)
    if fieldtype == "Date":
        return models.DateField(null=True, blank=True)
    if fieldtype == "Datetime":
        return models.DateTimeField(null=True, blank=True)
    if fieldtype == "Time":
        return models.TimeField(null=True, blank=True)
    length = int(df.get("length") or 140)
    if length <= 0:
        length = 140
    default = df.get("default")
    default = "" if default in (None, "Today", "__user") else str(default)
    return models.CharField(max_length=length, blank=True, default=default)
