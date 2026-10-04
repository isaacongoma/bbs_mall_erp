from django.db import models

from apps.frappe.model.base import FrappeModel


class Series(models.Model):
    name = models.CharField(max_length=140, primary_key=True)
    current = models.IntegerField(default=0)

    class Meta:
        db_table = "tabSeries"
        verbose_name = "Series"


class Singles(models.Model):
    doctype = models.CharField(max_length=140)
    field = models.CharField(max_length=140)
    value = models.TextField(blank=True, default="")

    class Meta:
        db_table = "tabSingles"
        constraints = [models.UniqueConstraint(fields=["doctype", "field"], name="uniq_tab_singles_doctype_field")]


class Role(FrappeModel):
    doctype = "Role"
    role_name = models.CharField(max_length=140, unique=True)
    home_page = models.CharField(max_length=140, blank=True, default="")
    restrict_to_domain = models.CharField(max_length=140, blank=True, default="")
    desk_access = models.SmallIntegerField(default=1)
    disabled = models.SmallIntegerField(default=0)
    is_custom = models.SmallIntegerField(default=0)
    two_factor_auth = models.SmallIntegerField(default=0)

    class Meta:
        db_table = "tabRole"
        verbose_name = "Role"


class HasRole(models.Model):
    name = models.CharField(max_length=140, primary_key=True)
    parent = models.CharField(max_length=140)
    parentfield = models.CharField(max_length=140, default="roles")
    parenttype = models.CharField(max_length=140, default="User")
    role = models.CharField(max_length=140)
    idx = models.IntegerField(default=0)

    class Meta:
        db_table = "tabHas Role"
        indexes = [models.Index(fields=["parent"]), models.Index(fields=["role"])]


class DocPerm(models.Model):
    name = models.CharField(max_length=140, primary_key=True)
    parent = models.CharField(max_length=140)
    parentfield = models.CharField(max_length=140, default="permissions")
    parenttype = models.CharField(max_length=140, default="DocType")
    role = models.CharField(max_length=140)
    permlevel = models.IntegerField(default=0)
    read = models.SmallIntegerField(default=0)
    write = models.SmallIntegerField(default=0)
    create = models.SmallIntegerField(default=0)
    delete = models.SmallIntegerField(default=0)
    submit = models.SmallIntegerField(default=0)
    cancel = models.SmallIntegerField(default=0)
    amend = models.SmallIntegerField(default=0)
    report = models.SmallIntegerField(default=0)
    export = models.SmallIntegerField(default=0)
    import_data = models.SmallIntegerField(default=0, db_column="import")
    share = models.SmallIntegerField(default=0)
    print = models.SmallIntegerField(default=0)
    email = models.SmallIntegerField(default=0)
    select = models.SmallIntegerField(default=0)
    if_owner = models.SmallIntegerField(default=0)
    idx = models.IntegerField(default=0)

    class Meta:
        db_table = "tabDocPerm"
        indexes = [models.Index(fields=["parent"]), models.Index(fields=["role"])]


class UserPermission(models.Model):
    name = models.CharField(max_length=140, primary_key=True)
    user = models.CharField(max_length=140)
    allow = models.CharField(max_length=140)
    for_value = models.CharField(max_length=140)
    applicable_for = models.CharField(max_length=140, blank=True, default="")
    apply_to_all_doctypes = models.SmallIntegerField(default=0)
    is_default = models.SmallIntegerField(default=0)
    hide_descendants = models.SmallIntegerField(default=0)

    class Meta:
        db_table = "tabUser Permission"
        indexes = [models.Index(fields=["user"]), models.Index(fields=["allow", "for_value"])]


class DocTypeTable(models.Model):
    name = models.CharField(max_length=140, primary_key=True)
    module = models.CharField(max_length=140, blank=True, default="")
    issingle = models.SmallIntegerField(default=0)
    istable = models.SmallIntegerField(default=0)
    is_submittable = models.SmallIntegerField(default=0)
    is_tree = models.SmallIntegerField(default=0)
    custom = models.SmallIntegerField(default=0)
    is_virtual = models.SmallIntegerField(default=0)
    track_changes = models.SmallIntegerField(default=0)
    allow_rename = models.SmallIntegerField(default=0)
    allow_import = models.SmallIntegerField(default=0)
    editable_grid = models.SmallIntegerField(default=0)
    quick_entry = models.SmallIntegerField(default=0)
    autoname = models.TextField(blank=True, default="")
    naming_rule = models.CharField(max_length=140, blank=True, default="")
    title_field = models.CharField(max_length=140, blank=True, default="")
    sort_field = models.CharField(max_length=140, blank=True, default="")
    sort_order = models.CharField(max_length=140, blank=True, default="")
    nsm_parent_field = models.CharField(max_length=140, blank=True, default="")
    document_type = models.CharField(max_length=140, blank=True, default="")
    engine = models.CharField(max_length=140, blank=True, default="")
    description = models.TextField(blank=True, default="")
    owner = models.CharField(max_length=140, blank=True, default="Administrator")
    creation = models.DateTimeField(null=True, blank=True)
    modified = models.DateTimeField(null=True, blank=True)
    modified_by = models.CharField(max_length=140, blank=True, default="Administrator")
    docstatus = models.SmallIntegerField(default=0)
    idx = models.IntegerField(default=0)

    class Meta:
        db_table = "tabDocType"


class DocFieldTable(models.Model):
    name = models.CharField(max_length=240, primary_key=True)
    parent = models.CharField(max_length=140, db_index=True)
    parenttype = models.CharField(max_length=140, default="DocType")
    parentfield = models.CharField(max_length=140, default="fields")
    idx = models.IntegerField(default=0)
    fieldname = models.CharField(max_length=240, blank=True, default="")
    fieldtype = models.CharField(max_length=140, blank=True, default="")
    label = models.TextField(blank=True, default="")
    options = models.TextField(blank=True, default="")
    default = models.TextField(blank=True, default="")
    description = models.TextField(blank=True, default="")
    depends_on = models.TextField(blank=True, default="")
    mandatory_depends_on = models.TextField(blank=True, default="")
    read_only_depends_on = models.TextField(blank=True, default="")
    collapsible_depends_on = models.TextField(blank=True, default="")
    fetch_from = models.TextField(blank=True, default="")
    link_filters = models.TextField(blank=True, default="")
    width = models.CharField(max_length=140, blank=True, default="")
    print_width = models.CharField(max_length=140, blank=True, default="")
    precision = models.CharField(max_length=140, blank=True, default="")
    length = models.IntegerField(default=0)
    columns = models.IntegerField(default=0)
    permlevel = models.IntegerField(default=0)
    reqd = models.SmallIntegerField(default=0)
    hidden = models.SmallIntegerField(default=0)
    read_only = models.SmallIntegerField(default=0)
    unique = models.SmallIntegerField(default=0)
    no_copy = models.SmallIntegerField(default=0)
    print_hide = models.SmallIntegerField(default=0)
    in_list_view = models.SmallIntegerField(default=0)
    in_standard_filter = models.SmallIntegerField(default=0)
    in_global_search = models.SmallIntegerField(default=0)
    in_preview = models.SmallIntegerField(default=0)
    search_index = models.SmallIntegerField(default=0)
    allow_on_submit = models.SmallIntegerField(default=0)
    ignore_user_permissions = models.SmallIntegerField(default=0)
    set_only_once = models.SmallIntegerField(default=0)
    non_negative = models.SmallIntegerField(default=0)
    fetch_if_empty = models.SmallIntegerField(default=0)
    is_virtual = models.SmallIntegerField(default=0)
    collapsible = models.SmallIntegerField(default=0)
    bold = models.SmallIntegerField(default=0)
    report_hide = models.SmallIntegerField(default=0)
    translatable = models.SmallIntegerField(default=0)
    owner = models.CharField(max_length=140, blank=True, default="Administrator")
    creation = models.DateTimeField(null=True, blank=True)
    modified = models.DateTimeField(null=True, blank=True)
    modified_by = models.CharField(max_length=140, blank=True, default="Administrator")
    docstatus = models.SmallIntegerField(default=0)

    class Meta:
        db_table = "tabDocField"
