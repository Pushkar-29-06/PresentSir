from datetime import datetime

from pydantic import BaseModel, Field


class RegistrationWindowCreate(BaseModel):
    user_id: int
    duration_minutes: int = Field(default=15, gt=0, le=60)


class RegistrationWindowResponse(BaseModel):
    id: int
    expires_at: datetime


class RegistrationChallengeRequest(BaseModel):
    android_id: str = Field(min_length=1, max_length=255)


class RegistrationChallengeResponse(BaseModel):
    challenge: str
    expires_at: datetime


class DeviceRegistrationRequest(BaseModel):
    android_id: str = Field(min_length=1, max_length=255)
    challenge: str = Field(min_length=1)
    public_key: str = Field(min_length=1)
    signature: str = Field(min_length=1)
    key_algorithm: str = Field(default="Ed25519", min_length=1)
    device_model: str | None = None
    app_version: str | None = None


class DeviceRegistrationResponse(BaseModel):
    device_id: int
    status: str


class DeviceStatusUpdate(BaseModel):
    reason: str = Field(min_length=1)


class DeviceRequestCreate(BaseModel):
    type: str
    reason: str | None = None
    new_android_id: str | None = None


class DeviceRequestResponse(BaseModel):
    id: int
    status: str


class DeviceRequestDecision(BaseModel):
    status: str
    note: str | None = None
