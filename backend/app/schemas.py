from pydantic import BaseModel, Field, EmailStr
from typing import Optional


# ── Auth ────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class PhoneLoginRequest(BaseModel):
    phone: str = Field(min_length=7, max_length=20)

class AuthResponse(BaseModel):
    token: str
    name: str
    email: str

class OtpSendRequest(BaseModel):
    target: str          # email address OR phone number
    kind: str = "email"  # "email" | "phone"

class OtpVerifyRequest(BaseModel):
    target: str
    code: str
    kind: str = "email"

# ── Energy ──────────────────────────────────────────────────────────────────

class TrainResponse(BaseModel):
    rows_used: int
    best_model: str
    metrics: dict


class ForecastRequest(BaseModel):
    horizon: str = Field(default="day", description="day | week | month")


class CostConfig(BaseModel):
    rate_per_kwh: float = Field(gt=0)
    fixed_charge: float = 0.0


class AssistantQuestion(BaseModel):
    question: str
    rate_per_kwh: Optional[float] = 8.0
