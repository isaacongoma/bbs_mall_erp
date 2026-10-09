from apps.core.migration_utils import tolerant_extra_columns
from django.db import migrations


@tolerant_extra_columns
def copy_email_records(apps, schema_editor):
    from apps.core.crm_custom_fields import CRM_CUSTOM_FIELDS
    from apps.erpnext.registry import get_model

    CustomField = apps.get_model("erpnext", "CustomField")
    for doctype, fields in CRM_CUSTOM_FIELDS.items():
        for index, field in enumerate(fields, start=1):
            name = f"{doctype}-{field['fieldname']}"
            if CustomField.objects.filter(pk=name).exists():
                continue
            CustomField.objects.create(
                name=name,
                dt=doctype,
                fieldname=field["fieldname"],
                fieldtype=field["fieldtype"],
                label=field["label"],
                default=field.get("default"),
                insert_after=field.get("insert_after"),
                is_system_generated=1,
                owner="Administrator",
                modified_by="Administrator",
            )
    LegacyTemplate = apps.get_model("core", "EmailTemplate")
    LegacyAccount = apps.get_model("core", "EmailAccount")
    User = apps.get_model("core", "User")
    emails = dict(User.objects.values_list("pk", "email"))
    Template = get_model("Email Template")
    Account = get_model("Email Account")
    for row in LegacyTemplate.objects.all():
        if Template.objects.filter(pk=row.name).exists():
            continue
        owner = emails.get(row.owner_id) or ""
        Template.objects.create(
            name=row.name,
            enabled=1 if row.enabled else 0,
            reference_doctype=row.reference_doctype,
            subject=row.subject,
            use_html=1 if row.use_html else 0,
            response=row.response,
            response_html=row.response_html,
            owner=owner,
            modified_by=owner,
            creation=row.creation,
            modified=row.modified,
        )
    for row in LegacyAccount.objects.all():
        if Account.objects.filter(pk=row.email_account_name).exists():
            continue
        Account.objects.create(
            name=row.email_account_name,
            email_account_name=row.email_account_name,
            email_id=row.email_id,
            service=row.service,
            password=row.password,
            api_key=row.api_key,
            api_secret=row.api_secret,
            frappe_mail_site=row.frappe_mail_site,
            enable_incoming=1 if row.enable_incoming else 0,
            enable_outgoing=1 if row.enable_outgoing else 0,
            default_incoming=1 if row.default_incoming else 0,
            default_outgoing=1 if row.default_outgoing else 0,
            create_lead_from_incoming_email=1 if row.create_lead_from_incoming_email else 0,
            signature=row.signature,
            owner="Administrator",
            modified_by="Administrator",
            creation=row.creation,
            modified=row.modified,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0017_unify_file"),
        ("erpnext", "0027_standard_hidden_columns"),
    ]

    operations = [
        migrations.RunPython(copy_email_records, migrations.RunPython.noop),
        migrations.DeleteModel(name="EmailTemplate"),
        migrations.DeleteModel(name="EmailAccount"),
    ]
