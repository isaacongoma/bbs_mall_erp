from frappe.model.document import Document


class WebsiteRouteMeta(Document):
    doctype = 'Website Route Meta'

    _DOCTYPE_NAME = "Website Route Meta"


    def autoname(self):
        if self.name and self.name.startswith("/"):
            self.name = self.name[1:]

    def clear_cache(self):
        from frappe.website.website_components.metatags import has_meta_tags

        has_meta_tags.clear_cache()
        return super().clear_cache()
