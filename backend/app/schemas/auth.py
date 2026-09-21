from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    login_id: str = Field(min_length=1)
    password: str = Field(min_length=1)
    android_id: str | None = Field(default=None, min_length=1, max_length=255)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class MeUser(BaseModel):
    id: int
    login_id: str
    name: str
    email: str
    phone: str
    department_id: int | None
    status: str


class MeResponse(BaseModel):
    user: MeUser
    role: str
