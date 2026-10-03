# Ported from crm/integrations/twilio/twilio_handler.py (frappe/crm, AGPL-3.0)
from django.contrib.sessions.models import Session
from django.utils import timezone
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VoiceGrant
from twilio.rest import Client as TwilioClient
from twilio.twiml.voice_response import Dial, VoiceResponse


class Twilio:
    """Twilio connector over TwilioClient."""

    def __init__(self, settings):
        self.settings = settings
        self.account_sid = settings.account_sid
        self.application_sid = settings.twiml_sid
        self.api_key = settings.api_key
        self.api_secret = settings.api_secret
        self.twilio_client = self.get_twilio_client()

    @classmethod
    def connect(cls):
        from apps.crm.doctype.twilio_settings.twilio_settings import CRMTwilioSettings

        settings = CRMTwilioSettings.get_solo()
        if not settings.enabled:
            return None
        return Twilio(settings=settings)

    def get_phone_numbers(self):
        numbers = self.twilio_client.incoming_phone_numbers.list()
        return [n.phone_number for n in numbers]

    def generate_voice_access_token(self, identity: str, ttl=60 * 60):
        identity = self.safe_identity(identity)
        token = AccessToken(self.account_sid, self.api_key, self.api_secret, identity=identity, ttl=ttl)
        voice_grant = VoiceGrant(outgoing_application_sid=self.application_sid, incoming_allow=True)
        token.add_grant(voice_grant)
        return token.to_jwt()

    @classmethod
    def safe_identity(cls, identity: str):
        return identity.replace("@", "(at)")

    @classmethod
    def emailid_from_identity(cls, identity: str):
        return identity.replace("(at)", "@")

    def get_recording_status_callback_url(self):
        from django.conf import settings as django_settings

        return f"{django_settings.PUBLIC_URL}/api/crm/integrations/twilio/recording-status/"

    def get_update_call_status_callback_url(self):
        from django.conf import settings as django_settings

        return f"{django_settings.PUBLIC_URL}/api/crm/integrations/twilio/call-status/"

    def generate_twilio_dial_response(self, from_number: str, to_number: str):
        resp = VoiceResponse()
        dial = Dial(
            caller_id=from_number, record=self.settings.record_calls,
            recording_status_callback=self.get_recording_status_callback_url(),
            recording_status_callback_event="completed",
        )
        dial.number(
            to_number, status_callback_event="initiated ringing answered completed",
            status_callback=self.get_update_call_status_callback_url(), status_callback_method="POST",
        )
        resp.append(dial)
        return resp

    def get_call_info(self, call_sid):
        return self.twilio_client.calls(call_sid).fetch()

    def generate_twilio_client_response(self, client, ring_tone="at"):
        resp = VoiceResponse()
        dial = Dial(
            ring_tone=ring_tone, record=self.settings.record_calls,
            recording_status_callback=self.get_recording_status_callback_url(),
            recording_status_callback_event="completed",
        )
        dial.client(
            client, status_callback_event="initiated ringing answered completed",
            status_callback=self.get_update_call_status_callback_url(), status_callback_method="POST",
        )
        resp.append(dial)
        return resp

    @classmethod
    def get_twilio_client(cls):
        from apps.crm.doctype.twilio_settings.twilio_settings import CRMTwilioSettings

        twilio_settings = CRMTwilioSettings.get_solo()
        if not twilio_settings.enabled:
            raise ValueError("Please enable Twilio settings before making a call.")
        return TwilioClient(twilio_settings.account_sid, twilio_settings.auth_token)


class IncomingCall:
    def __init__(self, from_number, to_number, meta=None):
        self.from_number = from_number
        self.to_number = to_number
        self.meta = meta

    def process(self):
        twilio = Twilio.connect()
        owners = get_twilio_number_owners(self.to_number)
        attender = get_the_call_attender(owners, self.from_number)

        if not attender:
            resp = VoiceResponse()
            resp.say("Agent is unavailable to take the call, please call after some time.")
            return resp

        if attender["call_receiving_device"] == "Phone":
            return twilio.generate_twilio_dial_response(self.from_number, attender["mobile_no"])
        return twilio.generate_twilio_client_response(twilio.safe_identity(attender["name"]))


def get_twilio_number_owners(phone_number):
    """{'user1@x.com': {'name': .., 'mobile_no': .., 'call_receiving_device': ..}, ...}"""
    from apps.crm.doctype.telephony_agent.telephony_agent import CRMTelephonyAgent

    # The original merges User.mobile_no in separately; CRM Telephony Agent carries
    # its own mobile_no here, so no extra User lookup is needed.
    phone_number = "".join(c for c in phone_number if c.isdigit() or c == "+")
    agents = CRMTelephonyAgent.objects.filter(twilio_number=phone_number)
    return {
        agent.user_id: {
            "name": agent.user_id,
            "mobile_no": agent.mobile_no,
            "call_receiving_device": agent.call_receiving_device,
        }
        for agent in agents
    }


def get_active_loggedin_users(users):
    """Subset of `users` (their original pk type) that has a live Django session."""
    by_str = {str(u): u for u in users}
    active = []
    for session in Session.objects.filter(expire_date__gt=timezone.now()):
        uid = session.get_decoded().get("_auth_user_id")
        if uid and str(uid) in by_str:
            active.append(by_str[str(uid)])
    return active


def get_the_call_attender(owners, caller=None):
    if not owners:
        return None
    current_loggedin_users = get_active_loggedin_users(list(owners.keys()))

    if len(current_loggedin_users) > 1 and caller:
        from apps.crm.doctype.deal.deal import CRMDeal
        from apps.crm.doctype.lead.lead import CRMLead

        deal_owner = CRMDeal.objects.filter(mobile_no=caller).values_list("deal_owner_id", flat=True).first()
        if not deal_owner:
            deal_owner = (
                CRMLead.objects.filter(mobile_no=caller, converted=False)
                .values_list("lead_owner_id", flat=True)
                .first()
            )
        for user in current_loggedin_users:
            if user == deal_owner:
                current_loggedin_users = [user]

    for name, details in owners.items():
        if (details["call_receiving_device"] == "Phone" and details["mobile_no"]) or (
            details["call_receiving_device"] == "Computer" and name in current_loggedin_users
        ):
            return details
    return None


class TwilioCallDetails:
    def __init__(self, call_info, call_from=None, call_to=None):
        self.call_info = call_info
        self.account_sid = call_info.get("AccountSid")
        self.application_sid = call_info.get("ApplicationSid")
        self.call_sid = call_info.get("CallSid")
        self.call_status = self.get_call_status(call_info.get("CallStatus"))
        self._call_from = call_from or call_info.get("From")
        self._call_to = call_to or call_info.get("To")

    def get_direction(self):
        if (self.call_info.get("Caller") or "").lower().startswith("client"):
            return "Outgoing"
        return "Incoming"

    def get_from_number(self):
        return self._call_from or self.call_info.get("From")

    def get_to_number(self):
        return self._call_to or self.call_info.get("To")

    @classmethod
    def get_call_status(cls, twilio_status):
        twilio_status = twilio_status or ""
        return " ".join(twilio_status.split("-")).title()

    def to_dict(self):
        direction = self.get_direction()
        from_number = self.get_from_number()
        to_number = self.get_to_number()
        caller = ""
        receiver = ""

        if direction == "Outgoing":
            caller_raw = self.call_info.get("Caller") or ""
            identity = caller_raw.replace("client:", "").strip()
            caller = Twilio.emailid_from_identity(identity) if identity else ""
        else:
            owners = get_twilio_number_owners(to_number)
            attender = get_the_call_attender(owners, from_number)
            receiver = attender["name"] if attender else ""

        return {
            "type": direction, "status": self.call_status, "id": self.call_sid,
            "from_number": from_number, "to_number": to_number, "receiver": receiver, "caller": caller,
        }
