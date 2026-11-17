from __future__ import annotations

import csv
import hashlib
import hmac
import os
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = Path(__file__).resolve().parents[1]
CSV_PATH = PROJECT_ROOT / "data.csv"
DB_PATH = BACKEND_DIR / "campuskart.db"
STALE_AFTER_MINUTES = 30
SECRET = os.getenv("CAMPUSKART_SECRET", "local-development-secret-change-before-deploy")

app = FastAPI(title="CampusKart API", version="0.1.0", description="Campus shop status prototype")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
security = HTTPBearer(auto_error=False)

DEMO_OWNERS = [
    ("foodowner", "demo123", 1),
    ("bakeryowner", "demo123", 2),
    ("storeowner", "demo123", 3),
    ("juiceowner", "demo123", 4),
    ("teaowner", "demo123", 5),
    ("stationeryowner", "demo123", 6),
]


def db() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    salt, expected = stored.split("$", 1)
    actual = hash_password(password, salt).split("$", 1)[1]
    return hmac.compare_digest(actual, expected)


def make_token(username: str) -> str:
    # Compact signed local prototype token. Use a mature identity provider for production.
    expires = int((datetime.now(timezone.utc) + timedelta(hours=12)).timestamp())
    payload = f"{username}:{expires}"
    signature = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}:{signature}"


def decode_token(token: str) -> str:
    try:
        username, expires_text, signature = token.rsplit(":", 2)
        payload = f"{username}:{expires_text}"
        expected = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected) or int(expires_text) < int(datetime.now(timezone.utc).timestamp()):
            raise ValueError("invalid or expired token")
        return username
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired login. Please sign in again.") from exc


def current_owner(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> sqlite3.Row:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Owner login required")
    username = decode_token(credentials.credentials)
    with db() as connection:
        owner = connection.execute(
            "SELECT username, shop_id FROM owners WHERE username = ?", (username,)
        ).fetchone()
    if owner is None:
        raise HTTPException(status_code=401, detail="Owner account not found")
    return owner


def parse_iso(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def initialize() -> None:
    with db() as connection:
        connection.execute("""CREATE TABLE IF NOT EXISTS shops (
            id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
            phone TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('OPEN','CLOSED')),
            updated_at TEXT NOT NULL, notes TEXT DEFAULT ''
        )""")
        connection.execute("""CREATE TABLE IF NOT EXISTS owners (
            username TEXT PRIMARY KEY, password_hash TEXT NOT NULL,
            shop_id INTEGER NOT NULL UNIQUE REFERENCES shops(id)
        )""")
        count = connection.execute("SELECT COUNT(*) FROM shops").fetchone()[0]
        if count == 0 and CSV_PATH.exists():
            # One CSV row represents one observation. Seed each shop from its latest observation.
            latest_by_shop: dict[int, dict[str, str]] = {}
            with CSV_PATH.open(newline="", encoding="utf-8") as file:
                for row in csv.DictReader(file):
                    shop_id = int(row["shop_id"])
                    previous = latest_by_shop.get(shop_id)
                    if previous is None or parse_iso(row["observed_at"]) > parse_iso(previous["observed_at"]):
                        latest_by_shop[shop_id] = row
            for shop_id, row in latest_by_shop.items():
                connection.execute(
                    "INSERT INTO shops(id,name,category,phone,status,updated_at,notes) VALUES(?,?,?,?,?,?,?)",
                    (shop_id, row["shop_name"], row["category"], row["phone"],
                     row["status"], row["observed_at"], row.get("notes", "")),
                )
        for username, password, shop_id in DEMO_OWNERS:
            exists = connection.execute("SELECT 1 FROM owners WHERE username=?", (username,)).fetchone()
            shop_exists = connection.execute("SELECT 1 FROM shops WHERE id=?", (shop_id,)).fetchone()
            if not exists and shop_exists:
                connection.execute(
                    "INSERT INTO owners(username,password_hash,shop_id) VALUES(?,?,?)",
                    (username, hash_password(password), shop_id),
                )


@app.on_event("startup")
def on_startup() -> None:
    initialize()


class LoginInput(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=1, max_length=100)


class StatusInput(BaseModel):
    status: Literal["OPEN", "CLOSED"]


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "app": "CampusKart"}


@app.get("/api/shops")
def list_shops() -> list[dict]:
    now = datetime.now(timezone.utc)
    with db() as connection:
        rows = connection.execute("SELECT * FROM shops ORDER BY name COLLATE NOCASE").fetchall()
    result = []
    for row in rows:
        updated = parse_iso(row["updated_at"])
        age_minutes = max(0, int((now - updated.astimezone(timezone.utc)).total_seconds() // 60))
        is_stale = age_minutes > STALE_AFTER_MINUTES
        result.append({
            "id": row["id"], "name": row["name"], "category": row["category"],
            "phone": row["phone"], "status": "UNKNOWN" if is_stale else row["status"],
            "last_status": row["status"], "updated_at": row["updated_at"],
            "age_minutes": age_minutes, "is_stale": is_stale,
            "notes": row["notes"],
        })
    return result


@app.post("/api/owner/login")
def owner_login(payload: LoginInput) -> dict:
    with db() as connection:
        owner = connection.execute(
            "SELECT username,password_hash,shop_id FROM owners WHERE username=?", (payload.username,)
        ).fetchone()
    if owner is None or not verify_password(payload.password, owner["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect owner username or password")
    return {"access_token": make_token(owner["username"]), "token_type": "bearer", "username": owner["username"]}


@app.get("/api/owner/me")
def owner_me(owner: sqlite3.Row = Depends(current_owner)) -> dict:
    with db() as connection:
        shop = connection.execute("SELECT id,name,category,phone,status,updated_at FROM shops WHERE id=?", (owner["shop_id"],)).fetchone()
    return {"username": owner["username"], "shop": dict(shop)}


@app.put("/api/owner/status")
def update_status(payload: StatusInput, owner: sqlite3.Row = Depends(current_owner)) -> dict:
    updated_at = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    with db() as connection:
        connection.execute("UPDATE shops SET status=?, updated_at=? WHERE id=?", (payload.status, updated_at, owner["shop_id"]))
        shop = connection.execute("SELECT id,name,status,updated_at FROM shops WHERE id=?", (owner["shop_id"],)).fetchone()
    return {"message": "Shop status updated", "shop": dict(shop)}
