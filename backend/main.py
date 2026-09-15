"""
Smart Home Energy Forecasting & Optimization - Backend (Stage 1)

Stage 1 scope: CSV upload/sample data -> ML pipeline (train + compare models)
-> forecasting -> anomaly detection -> cost estimation -> insights -> assistant.

NOT yet included (planned for stage 2, see README): JWT auth, PostgreSQL
persistence, Docker/Nginx deployment, LSTM model. Data currently lives in
server memory for the demo session - see README "Next steps" for the
production data-layer plan.
"""
from __future__ import annotations
import io
import os
import re
from contextlib import asynccontextmanager
from typing import Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

from app.ml.data_gen import generate_synthetic_dataset
from app.ml.preprocessing import load_and_clean, engineer_features, DatasetValidationError
from app.ml.pipeline import train_and_compare, forecast_next, TrainedModelStore
from app.ml.anomaly import detect_anomalies
from app.ml.insights import generate_insights, peak_hours, cost_summary
from app.ml.assistant import answer as assistant_answer
from app.schemas import TrainResponse, CostConfig, AssistantQuestion, RegisterRequest, LoginRequest, PhoneLoginRequest, AuthResponse, OtpSendRequest, OtpVerifyRequest
from app import auth as auth_store

# --- per-user in-memory session state (keyed by session token) --------------
_USER_STATES: dict[str, dict] = {}

HORIZON_HOURS = {"day": 24, "week": 24 * 7, "month": 24 * 30}


def _empty_state() -> dict:
    return {"raw_df": None, "feature_df": None, "model_store": None, "forecast": None}


def _get_state(request: Request) -> dict:
    """Return the per-user STATE dict. New users start with an empty state."""
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.removeprefix("Bearer ").strip() if auth_header.startswith("Bearer ") else ""
    if not token:
        token = "__anon__"
    if token not in _USER_STATES:
        _USER_STATES[token] = _empty_state()
    return _USER_STATES[token]


def _seed_sample(state: dict) -> None:
    df = generate_synthetic_dataset(days=180)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    state["raw_df"] = df
    state["feature_df"] = None
    state["model_store"] = None
    state["forecast"] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="Smart Energy AI API", version="0.1.0", lifespan=lifespan)

# Allow local dev + any Vercel deployment URL
_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    os.getenv("FRONTEND_URL", ""),          # set this on Render to your Vercel URL
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in _ALLOWED_ORIGINS if o],
    allow_origin_regex=r"https://.*\.vercel\.app",   # all Vercel preview URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Auth routes ─────────────────────────────────────────────────────────────

@app.post("/auth/register", response_model=AuthResponse)
def register(payload: RegisterRequest):
    if auth_store.user_exists(payload.email):
        raise HTTPException(409, "An account with this email already exists.")
    token = auth_store.create_user(payload.name, payload.email, payload.password)
    # fire-and-forget welcome email (errors are printed, not raised)
    try:
        auth_store.send_welcome_email(payload.name, payload.email)
    except Exception:
        pass
    return AuthResponse(token=token, name=payload.name, email=payload.email.lower())


@app.post("/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    token = auth_store.authenticate(payload.email, payload.password)
    if not token:
        raise HTTPException(401, "Invalid email or password.")
    user = auth_store.get_user_by_token(token)
    return AuthResponse(token=token, name=user["name"], email=user["email"])


@app.post("/auth/phone-login", response_model=AuthResponse)
def phone_login(payload: PhoneLoginRequest):
    phone = re.sub(r"[\s()-]", "", payload.phone)
    if not re.fullmatch(r"\+?[0-9]{7,15}", phone):
        raise HTTPException(400, "Enter a valid phone number (7–15 digits).")
    token = auth_store.phone_login(phone)
    user = auth_store.get_user_by_token(token)
    return AuthResponse(token=token, name=user["name"], email=user["email"])


@app.post("/auth/otp/send")
def otp_send(payload: OtpSendRequest):
    """
    Generate a 6-digit OTP and deliver it.
    - kind=email  → sends OTP to the email address in `target` via SMTP
    - kind=phone  → sends OTP via Twilio SMS to `target` (requires TWILIO_* env vars)
    """
    target = payload.target.strip()
    if not target:
        raise HTTPException(400, "target is required.")
    otp = auth_store.create_otp(target)

    if payload.kind == "email":
        auth_store.send_otp_email(target, otp)
        return {"message": f"OTP sent to {target}"}
    else:
        try:
            auth_store.send_otp_sms(target, otp)
            return {"message": f"OTP sent via SMS to {target}"}
        except RuntimeError as e:
            # Twilio not configured — expose the config error clearly
            raise HTTPException(503, str(e))


@app.post("/auth/otp/verify", response_model=AuthResponse)
def otp_verify(payload: OtpVerifyRequest):
    """
    Verify the OTP. On success, signs in (or creates) the user.
    - kind=email  → target must be a registered email address
    - kind=phone  → creates/retrieves phone-based account via auth_store
    """
    target = payload.target.strip().lower()
    if not auth_store.verify_otp(target, payload.code):
        raise HTTPException(401, "Invalid or expired OTP. Please request a new one.")

    if payload.kind == "email":
        if not auth_store.user_exists(target):
            raise HTTPException(404, "No account found for this email. Please register first.")
        token = auth_store.issue_token(target)
        user  = auth_store.get_user_by_token(token)
        return AuthResponse(token=token, name=user["name"], email=target)
    else:
        # Phone OTP verified — create or retrieve the phone account
        token = auth_store.phone_login(target)
        user  = auth_store.get_user_by_token(token)
        return AuthResponse(token=token, name=user["name"], email=user["email"])


# ── Health ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "service": "smart-energy-ai-backend"}


@app.post("/data/sample")
def load_sample_data(request: Request):
    """Reset to the built-in synthetic sample dataset."""
    state = _get_state(request)
    _seed_sample(state)
    return {"message": "Sample dataset loaded", "rows": len(state["raw_df"])}


@app.post("/upload")
async def upload_csv(request: Request, file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Only .csv files are supported.")
    contents = await file.read()
    if len(contents) > 25 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 25MB).")
    try:
        raw = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(400, f"Could not parse CSV: {e}")

    try:
        cleaned = load_and_clean(raw)
    except DatasetValidationError as e:
        raise HTTPException(422, str(e))

    state = _get_state(request)

    # Merge with any existing data (sample or previously uploaded) so history is preserved
    existing = state["raw_df"]
    if existing is not None and not existing.empty:
        merged = pd.concat([existing, cleaned], ignore_index=True)
        merged["timestamp"] = pd.to_datetime(merged["timestamp"])
        merged = merged.drop_duplicates(subset=["timestamp"]).sort_values("timestamp").reset_index(drop=True)
    else:
        merged = cleaned

    state["raw_df"] = merged
    state["feature_df"] = None
    state["model_store"] = None
    state["forecast"] = None

    return {
        "message": "Dataset uploaded and merged successfully",
        "rows": len(merged),
        "date_range": [str(merged["timestamp"].min()), str(merged["timestamp"].max())],
        "rows_dropped_bad_timestamp": cleaned.attrs.get("rows_dropped_bad_timestamp", 0),
    }


@app.get("/data/overview")
def data_overview(request: Request):
    state = _get_state(request)
    df = state["raw_df"]
    if df is None or df.empty:
        return {"today_usage_kwh": 0.0, "monthly_usage_kwh": 0.0, "rows": 0, "date_range": [None, None]}

    df_daily = df.copy()
    df_daily["date"] = df_daily["timestamp"].dt.date
    daily = df_daily.groupby("date")["energy_consumption"].sum()

    today_usage = float(daily.iloc[-1]) if len(daily) else 0.0
    monthly_usage = float(daily.iloc[-30:].sum()) if len(daily) else 0.0

    return {
        "today_usage_kwh": round(today_usage, 2),
        "monthly_usage_kwh": round(monthly_usage, 2),
        "rows": len(df),
        "date_range": [str(df["timestamp"].min()), str(df["timestamp"].max())],
    }


@app.get("/data/timeseries")
def data_timeseries(request: Request, granularity: str = Query("daily", pattern="^(hourly|daily|weekly|monthly)$"), limit: int = 90):
    state = _get_state(request)
    if state["raw_df"] is None or state["raw_df"].empty:
        return []
    df = state["raw_df"].copy()
    if granularity == "hourly":
        out = df[["timestamp", "energy_consumption"]].tail(limit * 24 if limit else 168)
        out["label"] = out["timestamp"].dt.strftime("%Y-%m-%d %H:%M")
    else:
        freq = {"daily": "D", "weekly": "W", "monthly": "ME"}[granularity]
        grouped = df.set_index("timestamp").resample(freq)["energy_consumption"].sum().reset_index()
        out = grouped.tail(limit)
        out["label"] = out["timestamp"].dt.strftime("%Y-%m-%d")
    return [{"label": r.label, "value": round(float(r.energy_consumption), 3)} for r in out.itertuples()]


@app.post("/train", response_model=TrainResponse)
def train_models(request: Request):
    state = _get_state(request)
    feature_df = engineer_features(state["raw_df"])
    if len(feature_df) < 200:
        raise HTTPException(422, "Not enough data to train reliably (need at least ~200 hourly rows).")
    store = train_and_compare(feature_df, state["raw_df"])
    state["feature_df"] = feature_df
    state["model_store"] = store
    state["forecast"] = None

    return TrainResponse(rows_used=len(feature_df), best_model=store.best_model_name, metrics=store.metrics)


def _get_store(state: dict) -> TrainedModelStore:
    if state["raw_df"] is None or state["raw_df"].empty:
        raise HTTPException(422, "No data loaded. Please upload a CSV file first.")
    if state["model_store"] is None:
        feature_df = engineer_features(state["raw_df"])
        store = train_and_compare(feature_df, state["raw_df"])
        state["feature_df"] = feature_df
        state["model_store"] = store
        state["forecast"] = None
    return state["model_store"]


@app.get("/predict")
def predict(request: Request, horizon: str = Query("day", pattern="^(day|week|month)$")):
    state = _get_state(request)
    store = _get_store(state)
    hours = HORIZON_HOURS[horizon]
    forecast = forecast_next(store, hours)
    state["forecast"] = forecast
    return {"horizon": horizon, "hours": hours, "forecast": forecast}


@app.get("/predict/actual-vs-predicted")
def actual_vs_predicted(request: Request):
    """Backtest the best model on the held-out test slice for a visual comparison."""
    state = _get_state(request)
    store = _get_store(state)
    feature_df = store.feature_df
    from app.ml.preprocessing import FEATURE_COLUMNS, TARGET_COLUMN
    split_idx = int(len(feature_df) * 0.8)
    test = feature_df.iloc[split_idx:]
    model = store.best_model()
    preds = model.predict(test[FEATURE_COLUMNS].values)
    out = []
    for ts, actual, pred in zip(test["timestamp"], test[TARGET_COLUMN], preds):
        out.append({"timestamp": ts.strftime("%Y-%m-%d %H:%M"), "actual": round(float(actual), 3), "predicted": round(float(pred), 3)})
    return out[-200:]


@app.get("/anomalies")
def anomalies(request: Request):
    state = _get_state(request)
    if state["raw_df"] is None or state["raw_df"].empty:
        return []
    return detect_anomalies(state["raw_df"])


@app.get("/insights")
def insights(request: Request):
    state = _get_state(request)
    if state["raw_df"] is None or state["raw_df"].empty:
        return []
    store = _get_store(state)
    forecast = state["forecast"] or forecast_next(store, 24)
    return generate_insights(state["raw_df"], forecast)


@app.get("/insights/peak-hours")
def peak_hours_endpoint(request: Request):
    state = _get_state(request)
    if state["raw_df"] is None or state["raw_df"].empty:
        return []
    return peak_hours(state["raw_df"], top_n=5)


@app.post("/cost")
def cost(request: Request, config: CostConfig):
    state = _get_state(request)
    store = _get_store(state)
    forecast = state["forecast"] or forecast_next(store, 24 * 30)
    return cost_summary(state["raw_df"], forecast, config.rate_per_kwh, config.fixed_charge)


@app.get("/models/comparison")
def models_comparison(request: Request):
    state = _get_state(request)
    store = _get_store(state)
    return {"best_model": store.best_model_name, "metrics": store.metrics}


@app.post("/assistant")
def ask_assistant(request: Request, payload: AssistantQuestion):
    state = _get_state(request)
    store = _get_store(state)
    forecast = state["forecast"] or forecast_next(store, 24)
    ins = generate_insights(state["raw_df"], forecast)
    reply = assistant_answer(payload.question, state["raw_df"], forecast, ins, payload.rate_per_kwh or 8.0)
    return {"question": payload.question, "answer": reply}
