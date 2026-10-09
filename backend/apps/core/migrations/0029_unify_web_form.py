from django.db import migrations

ADD_CRM_COLUMNS = """
ALTER TABLE "tabWeb Form"
    ADD COLUMN IF NOT EXISTS "crm_published" smallint NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "crm_hidden_defaults" text
"""

COPY_FORMS = """
INSERT INTO "tabWeb Form" (
    name, owner, creation, modified, modified_by, docstatus, idx, title, route, doc_type, module, is_standard,
    published, login_required, allow_multiple, introduction_text, button_label, success_message, success_url,
    allowed_embedding_domains, crm_published, crm_hidden_defaults
)
SELECT
    f.name, coalesce(u.email, 'Administrator'), f.creation, f.modified, coalesce(u.email, 'Administrator'), 0, 0,
    f.title, f.route, f.doc_type, f.module, f.is_standard::int, f.published::int, f.login_required::int,
    f.allow_multiple::int, f.introduction_text, f.button_label, f.success_message, f.success_url,
    f.allowed_embedding_domains, f.crm_published::int, f.crm_hidden_defaults
FROM web_form f LEFT JOIN "tabUser" u ON u.id = f.owner_id
ON CONFLICT (name) DO NOTHING
"""

COPY_FIELDS = """
INSERT INTO "tabWeb Form Field" (
    name, owner, creation, modified, modified_by, docstatus, idx, parent, parentfield, parenttype, fieldname, label,
    fieldtype, options, reqd, placeholder, description, depends_on, mandatory_depends_on, read_only_depends_on
)
SELECT
    f.parent_id || '-' || f.idx, 'Administrator', now(), now(), 'Administrator', 0, f.idx, f.parent_id,
    'web_form_fields', 'Web Form', f.fieldname, f.label, f.fieldtype, f.options, f.reqd::int, f.placeholder,
    f.description, f.depends_on, f.mandatory_depends_on, f.read_only_depends_on
FROM web_form_field f
ON CONFLICT (name) DO NOTHING
"""

COPY_GUEST_ACCESS = """
INSERT INTO "tabCustom DocPerm" (
    name, owner, creation, modified, modified_by, docstatus, idx, parent, role, permlevel,
    "select"
)
SELECT
    'guest-select-' || g.doctype_label, 'Administrator', now(), now(), 'Administrator', 0, 0, g.doctype_label,
    'Guest', 0, 1
FROM guest_link_access g WHERE g.allowed
ON CONFLICT (name) DO NOTHING
"""


def copy_web_forms(apps, schema_editor):
    cursor = schema_editor.connection.cursor()
    cursor.execute("select to_regclass('web_form') is not null")
    if not cursor.fetchone()[0]:
        return
    cursor.execute(ADD_CRM_COLUMNS)
    cursor.execute(COPY_FORMS)
    cursor.execute(COPY_FIELDS)
    cursor.execute("select to_regclass('guest_link_access') is not null")
    if cursor.fetchone()[0]:
        cursor.execute(COPY_GUEST_ACCESS)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0028_unify_automation'),
        ('erpnext', '0036_web_form_tag'),
    ]

    operations = [
        migrations.RunPython(copy_web_forms, migrations.RunPython.noop),
        migrations.DeleteModel(
            name='GuestLinkAccess',
        ),
        migrations.RemoveField(
            model_name='webformfield',
            name='parent',
        ),
        migrations.DeleteModel(
            name='WebForm',
        ),
        migrations.DeleteModel(
            name='WebFormField',
        ),
    ]
