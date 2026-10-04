import threading

_state = threading.local()


def get_current_user():
    return getattr(_state, "user", None)


class CurrentUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _state.user = getattr(request, "user", None)
        from apps.frappe import session

        previous_frappe_user = getattr(session, "user", None)
        request_user = getattr(request, "user", None)
        if request_user and getattr(request_user, "is_authenticated", False):
            session.user = request_user.email
        else:
            session.user = None
        try:
            return self.get_response(request)
        finally:
            _state.user = None
            session.user = previous_frappe_user
