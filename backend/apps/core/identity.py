from django.contrib.auth import get_user_model


def user_email(user):
    if user is None or user == "":
        return None
    if isinstance(user, str):
        return user
    email = getattr(user, "email", None)
    if email:
        return email
    return get_user_model().objects.filter(pk=getattr(user, "pk", user)).values_list("email", flat=True).first()


def user_pk(email):
    if email is None or email == "":
        return None
    return get_user_model().objects.filter(email=email).values_list("pk", flat=True).first()


def user_pks_by_email(emails):
    emails = {email for email in emails if email}
    if not emails:
        return {}
    return dict(get_user_model().objects.filter(email__in=emails).values_list("email", "pk"))


def user_emails_by_pk(pks):
    pks = {pk for pk in pks if pk is not None}
    if not pks:
        return {}
    return dict(get_user_model().objects.filter(pk__in=pks).values_list("pk", "email"))
