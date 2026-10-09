import uuid

from apps.core.migration_utils import tolerant_extra_columns
from django.db import migrations


@tolerant_extra_columns
def copy_rules(apps, schema_editor):
    from apps.core.crm_custom_fields import CRM_CUSTOM_FIELDS
    from apps.erpnext.registry import get_model

    CustomField = apps.get_model("erpnext", "CustomField")
    for field in CRM_CUSTOM_FIELDS["Assignment Rule"]:
        name = f"Assignment Rule-{field['fieldname']}"
        if CustomField.objects.filter(pk=name).exists():
            continue
        CustomField.objects.create(
            name=name,
            dt="Assignment Rule",
            fieldname=field["fieldname"],
            fieldtype=field["fieldtype"],
            label=field["label"],
            insert_after=field.get("insert_after"),
            is_system_generated=1,
            owner="Administrator",
            modified_by="Administrator",
        )

    LegacyRule = apps.get_model("core", "AssignmentRule")
    LegacyUser = apps.get_model("core", "AssignmentRuleUser")
    LegacyDay = apps.get_model("core", "AssignmentRuleDay")
    User = apps.get_model("core", "User")
    emails = dict(User.objects.values_list("pk", "email"))
    Rule = get_model("Assignment Rule")
    UserRow = get_model("Assignment Rule User")
    DayRow = get_model("Assignment Rule Day")
    existing = set(Rule.objects.values_list("name", flat=True))
    for row in LegacyRule.objects.all():
        if row.name in existing:
            continue
        Rule.objects.create(
            name=row.name,
            document_type=row.document_type,
            due_date_based_on=row.due_date_based_on,
            priority=row.priority,
            disabled=1 if row.disabled else 0,
            description=row.description,
            rule=row.rule,
            assign_condition=row.assign_condition,
            unassign_condition=row.unassign_condition,
            close_condition=row.close_condition,
            assign_condition_json=row.assign_condition_json,
            unassign_condition_json=row.unassign_condition_json,
            field=row.field,
            last_user=emails.get(row.last_user_id) or "",
            current_index=row.current_index,
            owner="Administrator",
            modified_by="Administrator",
            creation=row.creation,
            modified=row.modified,
        )
        for child in LegacyUser.objects.filter(parent_rule_id=row.name):
            UserRow.objects.create(
                name=uuid.uuid4().hex[:10],
                parent=row.name,
                parentfield=child.table_field,
                parenttype="Assignment Rule",
                idx=child.idx,
                user=emails.get(child.user_id) or "",
                weight=child.weight,
                owner="Administrator",
                modified_by="Administrator",
            )
        for child in LegacyDay.objects.filter(parent_rule_id=row.name):
            DayRow.objects.create(
                name=uuid.uuid4().hex[:10],
                parent=row.name,
                parentfield="assignment_days",
                parenttype="Assignment Rule",
                idx=child.idx,
                day=child.day,
                owner="Administrator",
                modified_by="Administrator",
            )


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0022_unify_data_import"),
        ("erpnext", "0027_standard_hidden_columns"),
    ]

    operations = [
        migrations.RunPython(copy_rules, migrations.RunPython.noop),
        migrations.DeleteModel(name="AssignmentRuleDay"),
        migrations.DeleteModel(name="AssignmentRuleUser"),
        migrations.DeleteModel(name="AssignmentRule"),
    ]
