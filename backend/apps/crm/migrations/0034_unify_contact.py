import uuid

import django.db.models.deletion
from apps.core.migration_utils import tolerant_extra_columns
from django.db import migrations, models


@tolerant_extra_columns
def copy_contacts(apps, schema_editor):
    Legacy = apps.get_model("core", "Contact")
    LegacyEmail = apps.get_model("core", "ContactEmail")
    LegacyPhone = apps.get_model("core", "ContactPhone")
    Canonical = apps.get_model("erpnext", "Contact")
    CanonicalEmail = apps.get_model("erpnext", "ContactEmail")
    CanonicalPhone = apps.get_model("erpnext", "ContactPhone")
    User = apps.get_model("core", "User")
    emails = dict(User.objects.values_list("pk", "email"))
    existing = set(Canonical.objects.values_list("name", flat=True))
    for row in Legacy.objects.all().iterator():
        if row.name in existing:
            continue
        owner = emails.get(row.owner_id) or "Administrator"
        Canonical.objects.create(
            name=row.name,
            first_name=row.first_name,
            middle_name=row.middle_name,
            last_name=row.last_name,
            full_name=row.full_name,
            email_id=row.email_id,
            user=emails.get(row.user_id) or "",
            status=row.status,
            salutation=row.salutation_id or "",
            gender=row.gender_id or "",
            phone=row.phone,
            mobile_no=row.mobile_no,
            image=row.image,
            is_primary_contact=1 if row.is_primary_contact else 0,
            department=row.department,
            designation=row.designation,
            unsubscribed=1 if row.unsubscribed else 0,
            company_name=row.company_name,
            address=row.address_id or "",
            owner=owner,
            modified_by=emails.get(row.modified_by_id) or owner,
            creation=row.creation,
            modified=row.modified,
        )
        for child in LegacyEmail.objects.filter(parent_id=row.name):
            CanonicalEmail.objects.create(
                name=uuid.uuid4().hex[:10],
                parent=row.name,
                parentfield="email_ids",
                parenttype="Contact",
                idx=child.idx,
                email_id=child.email_id,
                is_primary=1 if child.is_primary else 0,
                owner=owner,
                modified_by=owner,
            )
        for child in LegacyPhone.objects.filter(parent_id=row.name):
            CanonicalPhone.objects.create(
                name=uuid.uuid4().hex[:10],
                parent=row.name,
                parentfield="phone_nos",
                parenttype="Contact",
                idx=child.idx,
                phone=child.phone,
                is_primary_phone=1 if child.is_primary_phone else 0,
                is_primary_mobile_no=1 if child.is_primary_mobile_no else 0,
                owner=owner,
                modified_by=owner,
            )


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0033_unify_address"),
        ("core", "0020_delete_legacy_address"),
        ("erpnext", "0023_custom_docperm_address_emailaccount"),
    ]

    operations = [
        migrations.RunPython(copy_contacts, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="crmdeal",
            name="contact",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="erpnext.contact"),
        ),
        migrations.AlterField(
            model_name="crmdealcontact",
            name="contact",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="+", to="erpnext.contact"),
        ),
    ]
