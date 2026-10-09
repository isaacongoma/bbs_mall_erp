import frappe
from frappe.website.doctype.help_article.help_article import clear_knowledge_base_cache
from frappe.website.website_generator import WebsiteGenerator


class HelpCategory(WebsiteGenerator):
    _DOCTYPE_NAME = "Help Category"


    website = frappe._dict(condition_field="published", page_title_field="category_name")

    def before_insert(self):
        self.published = 1

    def autoname(self):
        self.name = self.category_name

    def validate(self):
        self.set_route()

        if not self.published:
            for d in frappe.get_all("Help Article", dict(category=self.name)):
                frappe.db.set_value("Help Article", d.name, "published", 0)

    def set_route(self):
        if not self.route:
            self.route = "kb/" + self.scrub(self.category_name)

    def clear_cache(self):
        clear_knowledge_base_cache()
        return super().clear_cache()
