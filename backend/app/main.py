from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from backend.app.config import settings
from backend.app.core.responses import error_response, success_response
from backend.app.routers import (
    calculator,
    reverse_price,
    platforms,
    products,
    promo_templates,
    bundles,
    audits,
    reports,
    marketplace,
    config,
    events,
)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Backend Python berpresisi tinggi untuk 10 Fitur USP Sistem Manajemen Margin & Promo RAFITACAKE.",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration for React/Vite development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handlers ensuring consistent JSON response envelope
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " -> ".join([str(x) for x in err.get("loc", []) if x != "body"])
        msg = err.get("msg", "Input tidak valid")
        errors.append(f"{loc}: {msg}" if loc else msg)
    return error_response(
        message="Validasi data input gagal.",
        errors=errors,
        status_code=422,
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return error_response(
        message=str(exc.detail),
        errors=[str(exc.detail)],
        status_code=exc.status_code,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return error_response(
        message="Terjadi kesalahan internal server.",
        errors=[str(exc)],
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


# Health check endpoints
@app.get("/", tags=["Health"])
@app.get("/health", tags=["Health"])
def health_check():
    return success_response(
        data={
            "app": settings.app_name,
            "version": settings.app_version,
            "status": "online",
        },
        message="RAFITACAKE SmartMargin API is running smoothly.",
    )


# Include API Routers under /api/v1
api_v1 = settings.api_v1_prefix

app.include_router(config.router, prefix=api_v1)
app.include_router(platforms.router, prefix=api_v1)
app.include_router(products.router, prefix=api_v1)
app.include_router(calculator.router, prefix=api_v1)
app.include_router(reverse_price.router, prefix=api_v1)
app.include_router(promo_templates.router, prefix=api_v1)
app.include_router(bundles.router, prefix=api_v1)
app.include_router(audits.router, prefix=api_v1)
app.include_router(reports.router, prefix=api_v1)
app.include_router(marketplace.router, prefix=api_v1)
app.include_router(events.router, prefix=api_v1)
