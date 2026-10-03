# Seeds CRM Form Script with the two standard scripts frappe/crm installs by
# default (crm/install.py's add_default_scripts(), calling into
# crm_products.create_product_details_script() and
# fcrm_settings.create_forecasting_script() -- AGPL-3.0). Verbatim script
# text, including the this.doc.products references our port has no
# "products" child-table field for: those methods are only ever invoked by a
# products-table row actually changing, which cannot happen here (no such
# field/UI exists), so they're simply unreachable dead code, not a runtime
# risk. Seeding them is not about that logic -- it's the mechanism by which
# the frontend's Lead.vue/Deal.vue status dropdown (document.statuses) and
# actions menu (document.actions) get initialized at all: both are set only
# when data/script.js's setupFormController() runs, which only happens when
# at least one CRM Form Script/file-based controller exists for the doctype
# (see data/script.js:184 and setupFormController's document.actions/
# document.statuses assignment). Without ANY script seeded, that gate never
# fires and the status dropdown never renders, matching a bug report where
# it was silently missing.
from django.db import migrations

PRODUCT_DETAILS_TEMPLATE = """class {class_name} {{
  update_total() {{
    let total = 0
    let total_qty = 0
    let net_total = 0
    let discount_applied = false

    this.doc.products.forEach((d) => {{
      total += d.amount
      net_total += d.net_amount
      if (d.discount_percentage > 0) {{
        discount_applied = true
      }}
    }})

    this.doc.total = total
    this.doc.net_total = net_total || total

    if (!net_total && discount_applied) {{
      this.doc.net_total = net_total
    }}
  }}
}}

class CRMProducts {{
  products_add() {{
    let row = this.doc.getRow('products')
    row.trigger('qty')
    this.doc.trigger('update_total')
  }}

  products_remove() {{
    this.doc.trigger('update_total')
  }}

  async product_code(idx) {{
    let row = this.doc.getRow('products', idx)
    let productCode = row.product_code

    let a = await call("crm.fcrm.doctype.crm_products.crm_products.get_product_rate_details", {{
        product_code: productCode,
        deal: this.doc.name,
    }})
    if (!a || row.product_code !== productCode) return

    row.product_name = a.product_name
    row.rate = a.rate ?? 0
    row.trigger("rate")
  }}

  qty(idx) {{
    let row = this.doc.getRow('products', idx)
    row.amount = row.qty * row.rate
    row.trigger('discount_percentage', idx)
  }}

  rate() {{
    let row = this.doc.getRow('products')
    row.amount = row.qty * row.rate
    row.trigger('discount_percentage')
  }}

  discount_percentage(idx) {{
    let row = this.doc.getRow('products', idx)
    if (!row.discount_percentage) {{
      row.net_amount = row.amount
      row.discount_amount = 0
    }}
    if (row.discount_percentage && row.amount) {{
      row.discount_amount = (row.discount_percentage / 100) * row.amount
      row.net_amount = row.amount - row.discount_amount
    }}
    this.doc.trigger('update_total')
  }}
}}"""

FORECASTING_SCRIPT = """class CRMDeal {
    async status() {
        await this.doc.trigger('updateProbability')
    }
    async updateProbability() {
        let status = await call("frappe.client.get_value", {
            doctype: "CRM Deal Status",
            fieldname: "probability",
            filters: { name: this.doc.status },
        })

        this.doc.probability = status.probability
    }
}"""

FORM_SCRIPTS = {
    "Product Details Script for CRM Lead": {
        "dt": "CRM Lead", "script": PRODUCT_DETAILS_TEMPLATE.format(class_name="CRMLead"),
    },
    "Product Details Script for CRM Deal": {
        "dt": "CRM Deal", "script": PRODUCT_DETAILS_TEMPLATE.format(class_name="CRMDeal"),
    },
    "Forecasting Script": {
        "dt": "CRM Deal", "script": FORECASTING_SCRIPT,
    },
}


def seed(apps, schema_editor):
    CRMFormScript = apps.get_model("crm", "CRMFormScript")
    for name, entry in FORM_SCRIPTS.items():
        CRMFormScript.objects.get_or_create(
            name=name,
            defaults={"dt": entry["dt"], "view": "Form", "script": entry["script"], "enabled": True, "is_standard": True},
        )


def unseed(apps, schema_editor):
    CRMFormScript = apps.get_model("crm", "CRMFormScript")
    CRMFormScript.objects.filter(name__in=FORM_SCRIPTS.keys()).delete()


class Migration(migrations.Migration):
    dependencies = [("crm", "0012_seed_data_fields_layouts")]
    operations = [migrations.RunPython(seed, unseed)]
