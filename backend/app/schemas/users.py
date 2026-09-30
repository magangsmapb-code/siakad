from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    role: UserRole = UserRole.MURID


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=30)
    role: UserRole | None = None
    status: str | None = Field(default=None, pattern="^(active|pending|disabled)$")


class ProfileRead(BaseModel):
    id: UUID
    email: EmailStr | None = None
    full_name: str | None = None
    role: UserRole
    avatar_url: str | None = None

    model_config = ConfigDict(extra="ignore")