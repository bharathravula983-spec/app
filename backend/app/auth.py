"""
Auth helpers — in-memory user store + welcome email via SMTP.

Configure via environment variables (or a .env file loaded by python-dotenv):
  SMTP_HOST     e.g. smtp.gmail.com
  SMTP_PORT     e.g. 587
  SMTP_USER     your sender email address
  SMTP_PASS     your email password / app-password
  SMTP_FROM     display name + address, e.g. "VOLT Energy <you@gmail.com>"

If SMTP_HOST is not set, email sending is skipped (dev mode).
"""
from __future__ import annotations

import hashlib
import os
import random
import secrets
import smtplib
import ssl
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Optional, Tuple

# ── In-memory user store (stage-2: replace with PostgreSQL) ─────────────────

_USERS: Dict[str, dict] = {}   # keyed by email or phone number
_TOKENS: Dict[str, str] = {}   # token → user identifier


def _hash(password: str) -> str:
    """PBKDF2-SHA256 with a per-password salt, encoded as salt:hash."""
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260_000).hex()
    return f"{salt}:{hashed}"


def _verify_hash(password: str, stored: str) -> bool:
    """Verify password against a stored salt:hash or legacy plain SHA256 hash."""
    if ":" in stored:
        salt, hashed = stored.split(":", 1)
        return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260_000).hex() == hashed
    # legacy plain SHA256 fallback
    return hashlib.sha256(password.encode()).hexdigest() == stored


def user_exists(email: str) -> bool:
    return email.lower() in _USERS


def create_user(name: str, email: str, password: str) -> str:
    """Create user, return a session token."""
    email = email.lower()
    _USERS[email] = {"name": name, "email": email, "pw_hash": _hash(password)}
    return issue_token(email)


def authenticate(email: str, password: str) -> Optional[str]:
    """Verify credentials; return token or None."""
    email = email.lower()
    user = _USERS.get(email)
    if user and _verify_hash(password, user["pw_hash"]):
        return issue_token(email)
    return None


def issue_token(key: str) -> str:
    """Generate and register a new session token for an existing user key."""
    token = secrets.token_hex(32)
    _TOKENS[token] = key
    return token


def get_user_by_token(token: str) -> Optional[dict]:
    key = _TOKENS.get(token)
    return _USERS.get(key) if key else None


def phone_login(phone: str) -> str:
    """Create or sign in a phone-based session without OTP verification."""
    phone = phone.strip()
    user = _USERS.get(phone)
    if not user:
        user = {"name": f"User {phone[-4:]}", "email": phone, "pw_hash": ""}
        _USERS[phone] = user
    token = secrets.token_hex(32)
    _TOKENS[token] = phone
    return token


# ── OTP store ────────────────────────────────────────────────────────────────
# key: target (email address or phone number)  value: (otp_code, expiry_unix_ts)
_OTP_STORE: Dict[str, Tuple[str, float]] = {}
OTP_TTL = 600  # 10 minutes


def _make_otp() -> str:
    return f"{random.randint(0, 999999):06d}"


def create_otp(target: str) -> str:
    """Generate and store a 6-digit OTP for *target*. Returns the OTP."""
    target = target.lower().strip()
    code = _make_otp()
    _OTP_STORE[target] = (code, time.time() + OTP_TTL)
    return code


def verify_otp(target: str, code: str) -> bool:
    """Return True and consume the OTP if it matches and has not expired."""
    target = target.lower().strip()
    entry = _OTP_STORE.get(target)
    if not entry:
        return False
    stored_code, expiry = entry
    if time.time() > expiry:
        _OTP_STORE.pop(target, None)
        return False
    if stored_code != code.strip():
        return False
    _OTP_STORE.pop(target, None)   # one-time use
    return True


def _smtp_send(to_email: str, subject: str, html_body: str) -> None:
    """Low-level SMTP send. Raises on failure."""
    host      = os.getenv("SMTP_HOST", "")
    port      = int(os.getenv("SMTP_PORT", "587"))
    user      = os.getenv("SMTP_USER", "")
    password  = os.getenv("SMTP_PASS", "")
    from_addr = os.getenv("SMTP_FROM", user)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = from_addr
    msg["To"]      = to_email
    msg.attach(MIMEText(html_body, "html"))

    context = ssl.create_default_context()
    with smtplib.SMTP(host, port) as server:
        server.ehlo()
        server.starttls(context=context)
        server.login(user, password)
        server.sendmail(from_addr, to_email, msg.as_string())


def send_otp_email(to_email: str, otp: str) -> None:
    """Send OTP via email. Prints OTP to console if SMTP not configured (dev mode)."""
    host = os.getenv("SMTP_HOST", "")
    print(f"[auth] OTP for {to_email}: {otp}")   # always log for dev
    if not host:
        print("[auth] SMTP not configured — OTP printed above, email skipped.")
        return

    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body{{margin:0;padding:0;background:#06080d;font-family:'IBM Plex Sans',sans-serif;color:#e7edf3}}
  .wrap{{max-width:480px;margin:40px auto;background:#0d1219;border:1px solid #1c2733;border-radius:12px;overflow:hidden}}
  .hdr{{padding:28px 32px 18px;border-bottom:1px solid #1c2733}}
  .logo{{display:flex;align-items:center;gap:10px}}
  .li{{width:32px;height:32px;background:rgba(186,255,41,.1);border:1px solid rgba(186,255,41,.4);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px}}
  .ln{{font-size:18px;font-weight:700;letter-spacing:3px;color:#fff}}
  .ls{{font-size:9px;color:#7c8a9a;letter-spacing:4px;text-transform:uppercase}}
  .body{{padding:28px 32px}}
  h2{{margin:0 0 8px;font-size:20px;color:#baff29}}
  p{{margin:0 0 14px;font-size:13px;line-height:1.7;color:#b0bec5}}
  .otp{{font-size:42px;font-weight:700;letter-spacing:12px;color:#baff29;font-family:monospace;background:#111823;border:1px solid #1c2733;border-radius:10px;padding:16px 24px;text-align:center;margin:18px 0}}
  .note{{font-size:11px;color:#4a5568;margin-top:4px}}
</style></head>
<body><div class="wrap">
  <div class="hdr"><div class="logo">
    <div class="li">⚡</div>
    <div><div class="ln">VOLT</div><div class="ls">Smart Energy AI</div></div>
  </div></div>
  <div class="body">
    <h2>Your Sign-In OTP</h2>
    <p>Use this one-time password to sign in to your VOLT account.</p>
    <div class="otp">{otp}</div>
    <p class="note">⏱ This OTP expires in <strong style="color:#e7edf3">10 minutes</strong>.</p>
    <p class="note">🔒 Never share this code with anyone.</p>
    <p class="note">If you didn't request this, you can safely ignore this email.</p>
  </div>
</div></body></html>"""

    try:
        _smtp_send(to_email, "🔐 VOLT — Your Sign-In OTP", html_body)
        print(f"[auth] OTP email sent to {to_email}")
    except Exception as exc:
        print(f"[auth] Failed to send OTP email: {exc}")


def send_otp_sms(to_phone: str, otp: str) -> None:
    """
    Send OTP via Twilio SMS.
    Requires env vars:
        TWILIO_ACCOUNT_SID   — from console.twilio.com
        TWILIO_AUTH_TOKEN    — from console.twilio.com
        TWILIO_FROM_NUMBER   — your Twilio phone number, e.g. +12015551234

    Raises RuntimeError if Twilio is not configured or delivery fails.
    """
    sid   = os.getenv("TWILIO_ACCOUNT_SID", "")
    token = os.getenv("TWILIO_AUTH_TOKEN", "")
    from_ = os.getenv("TWILIO_FROM_NUMBER", "")

    if not all([sid, token, from_]):
        raise RuntimeError(
            "Twilio is not configured. Add TWILIO_ACCOUNT_SID, "
            "TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER to your .env file."
        )

    try:
        from twilio.rest import Client           # type: ignore[import]
    except ImportError:
        raise RuntimeError(
            "Twilio package not installed. Run: pip install twilio"
        )

    body = f"Your VOLT OTP: {otp}"
    client = Client(sid, token)
    msg = client.messages.create(body=body, from_=from_, to=to_phone)
    print(f"[auth] SMS OTP sent to {to_phone} — SID {msg.sid}")


# ── Email ────────────────────────────────────────────────────────────────────

def send_welcome_email(to_name: str, to_email: str) -> None:
    """Send a registration-confirmation email. Silently skips if SMTP not configured."""
    host = os.getenv("SMTP_HOST", "")
    if not host:
        print(f"[auth] SMTP not configured — skipping welcome email to {to_email}")
        return

    port     = int(os.getenv("SMTP_PORT", "587"))
    user     = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASS", "")
    from_addr = os.getenv("SMTP_FROM", user)

    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ margin:0; padding:0; background:#06080d; font-family:'IBM Plex Sans',sans-serif; color:#e7edf3; }}
    .wrap {{ max-width:560px; margin:40px auto; background:#0d1219; border:1px solid #1c2733; border-radius:12px; overflow:hidden; }}
    .header {{ background:#0d1219; padding:32px 36px 20px; border-bottom:1px solid #1c2733; }}
    .logo {{ display:flex; align-items:center; gap:12px; }}
    .logo-icon {{ width:36px; height:36px; background:rgba(186,255,41,0.1); border:1px solid rgba(186,255,41,0.4); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:18px; }}
    .logo-name {{ font-size:20px; font-weight:700; letter-spacing:3px; color:#fff; }}
    .logo-sub {{ font-size:10px; color:#7c8a9a; letter-spacing:4px; text-transform:uppercase; }}
    .body {{ padding:32px 36px; }}
    h2 {{ margin:0 0 12px; font-size:22px; color:#baff29; }}
    p {{ margin:0 0 16px; font-size:14px; line-height:1.7; color:#b0bec5; }}
    .cta {{ display:inline-block; margin-top:8px; padding:12px 28px; background:#baff29; color:#06080d; font-weight:700; font-size:13px; letter-spacing:1px; text-decoration:none; border-radius:8px; }}
    .divider {{ border:none; border-top:1px solid #1c2733; margin:28px 0; }}
    .footer {{ padding:0 36px 28px; font-size:11px; color:#4a5568; }}
    ul {{ padding-left:18px; color:#b0bec5; font-size:13px; line-height:2; }}
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="logo">
      <div class="logo-icon">⚡</div>
      <div>
        <div class="logo-name">VOLT</div>
        <div class="logo-sub">Smart Energy Forecasting</div>
      </div>
    </div>
  </div>
  <div class="body">
    <h2>Welcome, {to_name}! 🎉</h2>
    <p>Your VOLT account has been created successfully. You can now log in and start monitoring your energy consumption with AI-powered forecasts.</p>
    <p><strong style="color:#e7edf3;">What you can do:</strong></p>
    <ul>
      <li>📊 &nbsp;View real-time energy consumption charts</li>
      <li>🤖 &nbsp;Train ML models for accurate forecasting</li>
      <li>⚠️ &nbsp;Detect anomalies &amp; get AI insights</li>
      <li>💰 &nbsp;Estimate your electricity bill</li>
      <li>🗣️ &nbsp;Ask the AI Energy Assistant anything</li>
    </ul>
    <hr class="divider">
    <p style="color:#7c8a9a; font-size:13px;">Account registered with: <strong style="color:#31e6d4;">{to_email}</strong></p>
    <p style="margin-bottom:4px; font-size:13px;">Ready to go?</p>
    <a class="cta" href="http://localhost:5173">OPEN VOLT DASHBOARD →</a>
  </div>
  <div class="footer">
    <p style="margin:0;">You received this email because you registered at VOLT Smart Energy AI.<br>If this wasn't you, you can safely ignore this message.</p>
  </div>
</div>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "✅ Welcome to VOLT — Registration Confirmed"
    msg["From"]    = from_addr
    msg["To"]      = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(host, port) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(user, password)
            server.sendmail(from_addr, to_email, msg.as_string())
        print(f"[auth] Welcome email sent to {to_email}")
    except Exception as exc:
        print(f"[auth] Failed to send email: {exc}")
