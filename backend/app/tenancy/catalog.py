from dataclasses import dataclass

GRANTABLE_PERMISSIONS: tuple[str, ...] = (
    "products.view", "products.create", "products.update",
    "plans.view", "plans.create", "plans.update",
    "customers.view", "customers.create", "customers.update",
    "quotations.view", "quotations.create", "quotations.update", "quotations.manage",
    "subscriptions.view", "subscriptions.create", "subscriptions.update", "subscriptions.manage",
    "invoices.view", "invoices.manage",
    "payments.view", "payments.create", "payments.manage",
    "reports.view",
    "billing_runs.view",
    "discounts.view",
    "taxes.view",
)

DEFAULT_STAFF_PERMISSIONS: tuple[str, ...] = ("products.view", "plans.view", "subscriptions.view")

ADMIN_ONLY_CAPABILITIES: tuple[str, ...] = (
    "tax rule and discount rule changes",
    "team and staff permissions",
    "business settings",
    "billing run trigger",
    "audit log",
)


@dataclass(frozen=True)
class PermissionInfo:
    code: str
    module: str
    action: str


def catalog() -> list[PermissionInfo]:
    return [PermissionInfo(code, *code.split(".", 1)) for code in GRANTABLE_PERMISSIONS]


def is_grantable(code: str) -> bool:
    return code in GRANTABLE_PERMISSIONS
