PLATFORM_PREFIX = "platform."
BUSINESS_WILDCARD = "business.*"
PLATFORM_WILDCARD = "platform.*"


def is_platform_permission(code: str) -> bool:
    return code.startswith(PLATFORM_PREFIX)


def sanitize_explicit_grants(codes) -> list[str]:
    return sorted(c for c in codes if "*" not in c and not is_platform_permission(c))


def grants_for_role(role: str, explicit_codes=()) -> list[str]:
    if role == "business_admin":
        return [BUSINESS_WILDCARD]
    if role == "platform":
        return [PLATFORM_WILDCARD]
    if role == "business_staff":
        return sanitize_explicit_grants(explicit_codes)
    return []


def permission_granted(grants, required: str) -> bool:
    if "*" in required:
        return False
    if required in grants:
        return True
    wildcard = PLATFORM_WILDCARD if is_platform_permission(required) else BUSINESS_WILDCARD
    return wildcard in grants
