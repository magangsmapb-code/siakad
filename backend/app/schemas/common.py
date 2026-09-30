from typing import Any, Generic, TypeVar

from pydantic import BaseModel

ResponseData = TypeVar("ResponseData")


class ApiResponse(BaseModel, Generic[ResponseData]):
    data: ResponseData | None = None
    error: dict[str, Any] | None = None
    meta: dict[str, Any] | None = None


class ApiError(BaseModel):
    code: str
    message: str
    details: Any | None = None