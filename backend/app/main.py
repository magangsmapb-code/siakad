from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.api.routes.foundation import limiter, router
from app.api.routes.academic import router as academic_router
from app.api.routes.materials import router as materials_router
from app.api.routes.questions import router as questions_router
from app.api.routes.question_images import router as question_images_router
from app.core.config import get_settings
from app.middleware.security_headers import SecurityHeadersMiddleware

settings = get_settings()
app = FastAPI(title="SIAKAD SMA Pemberdayaan Bangsa API", version="1.0.0")
app.state.limiter = limiter
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "apikey"],
)
app.add_middleware(SecurityHeadersMiddleware)


@app.exception_handler(HTTPException)
async def http_error_handler(_: Request, error: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content={"data": None, "error": {"code": "http_error", "message": str(error.detail)}},
        headers=error.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, error: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=jsonable_encoder({"data": None, "error": {"code": "validation_error", "message": "Input tidak valid.", "details": error.errors()}}),
    )


@app.exception_handler(RateLimitExceeded)
async def rate_limit_error_handler(_: Request, error: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"data": None, "error": {"code": "rate_limit_exceeded", "message": str(error.detail)}},
        headers={"Retry-After": "60"},
    )


@app.exception_handler(Exception)
async def unexpected_error_handler(_: Request, error: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"data": None, "error": {"code": "internal_error", "message": "Terjadi kesalahan internal."}},
    )


@app.get("/health", response_model=dict[str, Any])
async def health() -> dict[str, Any]:
    return {"status": "ok", "service": "siakad-api"}


app.include_router(router)
app.include_router(academic_router)
app.include_router(materials_router)
app.include_router(questions_router)
app.include_router(question_images_router)