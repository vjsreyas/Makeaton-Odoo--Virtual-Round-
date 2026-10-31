from fastapi import FastAPI
from app.auth.router import public_router, router as auth_router
from app.catalog.router import router as catalog_router
from app.sales.router import router as sales_router
from app.billing.router import router as billing_router
from app.invoicing.router import router as invoicing_router
from app.payments.router import router as payments_router
from app.misc.router import router as misc_router
from app.portal.router import router as portal_router
from app.reporting.router import router as reporting_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware
from app.health import router as health_router
from app.platform_admin.router import router as platform_router
from app.team.router import router as team_router


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(title="Brightloop API", version="0.1.0")
    app.add_middleware(RequestContextMiddleware)
    register_exception_handlers(app)
    app.include_router(health_router, prefix="/api/v1")
    app.include_router(public_router, prefix="/api/v1")
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(team_router, prefix="/api/v1")
    app.include_router(platform_router, prefix="/api/v1")
    app.include_router(catalog_router, prefix="/api/v1")
    app.include_router(sales_router, prefix="/api/v1")
    app.include_router(billing_router, prefix="/api/v1")
    app.include_router(invoicing_router, prefix="/api/v1")
    app.include_router(payments_router, prefix="/api/v1")
    app.include_router(reporting_router, prefix="/api/v1")
    app.include_router(portal_router, prefix="/api/v1")
    app.include_router(misc_router, prefix="/api/v1")
    return app


app = create_app()
