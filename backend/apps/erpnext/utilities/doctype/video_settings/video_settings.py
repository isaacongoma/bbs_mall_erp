import frappe
from frappe import _
from frappe.model.document import Document
from pyyoutube import Api, PyYouTubeException


class VideoSettings(Document):


    doctype = 'Video Settings'

    def validate(self):
        self.validate_youtube_api_key()

    def validate_youtube_api_key(self):
        if self.enable_youtube_tracking and self.api_key:
            try:
                Api(api_key=self.api_key).get_i18n_languages(parts="snippet")
            except Exception:
                self.log_error("Failed to authenticate API key")
                frappe.throw(
                    _("Failed to authenticate the API key. Please check the error logs."),
                    title=_("Invalid Credentials"),
                )
