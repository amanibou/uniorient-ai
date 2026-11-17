import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

# Clé secrète qui signe les tokens. À mettre dans la variable d'environnement UNIORIENT_SECRET.
SECRET_KEY = os.getenv("UNIORIENT_SECRET", "dev-secret-a-changer")
ALGORITHM = "HS256"
TOKEN_HOURS = 8


def hash_password(password: str) -> str:
    # bcrypt : hachage adapté aux mots de passe (sel généré automatiquement)
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "iat": now, "exp": now + timedelta(hours=TOKEN_HOURS)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    # Lève jwt.InvalidTokenError si le token est faux ou expiré
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
