
import os
from urllib.parse import urlencode, urljoin

from oauthlib.oauth2 import BackendApplicationClient
from requests_oauthlib import OAuth2Session

import frappe
from frappe import _
from frappe.integrations.utils import make_get_request
from frappe.model.document import Document
from frappe.utils.synchronization import filelock
from frappe.www.login import sanitize_redirect

if any((os.getenv("CI"), frappe.conf.developer_mode, frappe.conf.allow_tests)):
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"


class ConnectedApp(Document):
    _DOCTYPE_NAME = "Connected App"


    """Connect to a remote oAuth Server. Retrieve and store user's access token
    in a Token Cache.
    """

    @frappe.whitelist()
    def get_openid_configuration(self):
        self.check_permission("write")
        if not self.openid_configuration:
            frappe.throw(_("Please enter OpenID Configuration URL"))
        return make_get_request(self.openid_configuration)

    def validate(self):
        base_url = frappe.utils.get_url()
        callback_path = (
            "/api/method/frappe.integrations.doctype.connected_app.connected_app.callback/" + self.name
        )
        self.redirect_uri = urljoin(base_url, callback_path)

    def get_oauth2_session(self, user=None, init=False):
        """Return an auto-refreshing OAuth2 session which is an extension of a requests.Session()"""
        token = None
        token_updater = None
        auto_refresh_kwargs = None

        if not init:
            user = user or frappe.session.user
            token_cache = self.get_user_token(user)
            token = token_cache.get_json()
            token_updater = token_cache.update_data
            auto_refresh_kwargs = {"client_id": self.client_id}
            client_secret = self.get_password("client_secret")
            if client_secret:
                auto_refresh_kwargs["client_secret"] = client_secret

        return OAuth2Session(
            client_id=self.client_id,
            token=token,
            token_updater=token_updater,
            auto_refresh_url=self.token_uri,
            auto_refresh_kwargs=auto_refresh_kwargs,
            redirect_uri=self.redirect_uri,
            scope=self.get_scopes(),
        )

    @frappe.whitelist()
    def initiate_web_application_flow(self, user: str | None = None, success_uri: str | None = None):
        """Return an authorization URL for the user. Save state in Token Cache."""
        user = user or frappe.session.user
        if user != frappe.session.user:
            self.check_permission("write")
        success_uri = sanitize_redirect(success_uri) if getattr(frappe.local, "request", None) else None

        oauth = self.get_oauth2_session(user, init=True)
        query_params = self.get_query_params()
        authorization_url, state = oauth.authorization_url(self.authorization_uri, **query_params)
        token_cache = self.get_token_cache(user)

        if not token_cache:
            token_cache = frappe.new_doc("Token Cache")
            token_cache.user = user
            token_cache.connected_app = self.name

        token_cache.success_uri = success_uri
        token_cache.state = state
        token_cache.save(ignore_permissions=True)
        frappe.db.commit()

        return authorization_url

    def get_user_token(self, user=None, success_uri=None):
        """Return an existing user token or initiate a Web Application Flow."""
        user = user or frappe.session.user
        token_cache = self.get_token_cache(user)

        if token_cache:
            return token_cache

        redirect = self.initiate_web_application_flow(user, success_uri)
        frappe.local.response["type"] = "redirect"
        frappe.local.response["location"] = redirect
        return redirect

    def get_token_cache(self, user):
        token_cache = None
        token_cache_name = self.name + "-" + user

        if frappe.db.exists("Token Cache", token_cache_name):
            token_cache = frappe.get_doc("Token Cache", token_cache_name)

        return token_cache

    def get_scopes(self):
        return [row.scope for row in self.scopes]

    def get_query_params(self):
        return {param.key: param.value for param in self.query_parameters}

    def get_active_token(self, user=None):
        user = user or frappe.session.user
        token_cache = self.get_token_cache(user)
        if token_cache and token_cache.is_expired():
            try:
                with filelock(f"token_cache_{token_cache.name}"):
                    token_cache.reload()
                    if not token_cache.is_expired():
                        return token_cache

                    oauth_session = self.get_oauth2_session(user)
                    token = oauth_session.refresh_token(
                        body=f"redirect_uri={self.redirect_uri}",
                        token_url=self.token_uri,
                    )
                    token_cache.update_data(token)
            except Exception:
                self.log_error("Token Refresh Error")
                return None

        return token_cache

    def get_backend_app_token(self, include_client_id=None):
        """Get an Access Token for the Cloud-Registered Service Principal"""
        token_cache = self.get_token_cache("")
        if token_cache is None:
            token_cache = frappe.new_doc("Token Cache")
            token_cache.connected_app = self.name
        elif not token_cache.is_expired():
            return token_cache

        client = BackendApplicationClient(client_id=self.client_id, scope=self.get_scopes())
        oauth_session = OAuth2Session(client=client)

        token = oauth_session.fetch_token(
            self.token_uri,
            client_secret=self.get_password("client_secret"),
            include_client_id=include_client_id,
        )

        token_cache.update_data(token)
        token_cache.save(ignore_permissions=True)
        frappe.db.commit()

        return token_cache


@frappe.whitelist(methods=["GET"], allow_guest=True)
def callback(code: str | None = None, state: str | None = None):
    """Handle client's code.

    Called during the oauthorization flow by the remote oAuth2 server to
    transmit a code that can be used by the local server to obtain an access
    token.
    """

    if frappe.session.user == "Guest":
        frappe.local.response["type"] = "redirect"
        frappe.local.response["location"] = "/login?" + urlencode({"redirect-to": frappe.request.url})
        return

    path = frappe.request.path[1:].split("/")
    if len(path) != 4 or not path[3]:
        frappe.throw(_("Invalid Parameters."))

    connected_app = frappe.get_doc("Connected App", path[3])
    token_cache = frappe.get_doc("Token Cache", connected_app.name + "-" + frappe.session.user)

    if state != token_cache.state:
        frappe.throw(_("Invalid token state! Check if the token has been created by the OAuth user."))

    oauth_session = connected_app.get_oauth2_session(init=True)
    query_params = connected_app.get_query_params()
    client_secret = connected_app.get_password("client_secret")
    if frappe.db.db_type == "sqlite":
        frappe.db.rollback()
    token = oauth_session.fetch_token(
        connected_app.token_uri,
        code=code,
        client_secret=client_secret,
        include_client_id=True,
        **query_params,
    )
    token_cache.update_data(token)

    frappe.local.response["type"] = "redirect"
    frappe.local.response["location"] = token_cache.get("success_uri") or connected_app.get_url()


@frappe.whitelist()
def has_token(connected_app: str, connected_user: str | None = None):
    app = frappe.get_doc("Connected App", connected_app)
    token_cache = app.get_token_cache(connected_user or frappe.session.user)
    return bool(token_cache and token_cache.get_password("access_token", False))
