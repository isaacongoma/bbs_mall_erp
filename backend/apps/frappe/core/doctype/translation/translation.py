import frappe
from frappe.model.document import Document
from frappe.translate import MERGED_TRANSLATION_KEY, USER_TRANSLATION_KEY, change_translation_version
from frappe.utils import sanitize_html


class Translation(Document):
    doctype = 'Translation'

    _DOCTYPE_NAME = "Translation"


    def validate(self):
        self.translated_text = sanitize_html(self.translated_text)

    def on_update(self):
        clear_user_translation_cache(self.language)
        if self.has_value_changed("language") and (doc_before_save := self.get_doc_before_save()):
            clear_user_translation_cache(doc_before_save.language)

    def on_trash(self):
        clear_user_translation_cache(self.language)


def clear_user_translation_cache(lang):
    frappe.cache.hdel(USER_TRANSLATION_KEY, lang)
    frappe.cache.hdel(MERGED_TRANSLATION_KEY, lang)
    change_translation_version()
