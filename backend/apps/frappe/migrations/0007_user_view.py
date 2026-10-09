from django.db import migrations

CREATE = """
CREATE OR REPLACE VIEW "tabUser" AS
SELECT
    email AS name,
    email,
    username,
    first_name,
    '' AS middle_name,
    last_name,
    trim(concat(first_name, ' ', last_name)) AS full_name,
    CASE WHEN is_active THEN 1 ELSE 0 END AS enabled,
    'System User' AS user_type,
    language,
    time_zone,
    user_image,
    email_signature,
    date_joined AS creation,
    date_joined AS modified,
    'Administrator' AS owner,
    'Administrator' AS modified_by,
    0 AS docstatus,
    0 AS idx
FROM core_user
"""


class Migration(migrations.Migration):

    dependencies = [
        ("frappe", "0006_standard_hidden_columns"),
        ("core", "0023_unify_assignment_rule"),
    ]

    operations = [
        migrations.RunSQL(CREATE, 'DROP VIEW IF EXISTS "tabUser"'),
    ]
