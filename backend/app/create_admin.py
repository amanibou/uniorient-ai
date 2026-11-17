import getpass
import re

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db import SessionLocal, init_db
from app.models import Role, User
from app.security import hash_password

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LENGTH = 8


def main() -> None:
    """Crée le compte Admin une seule fois. Le mot de passe est tapé dans le terminal (caché), jamais dans un fichier."""
    init_db()
    db = SessionLocal()
    try:
        if db.scalar(select(User).where(User.role == Role.ADMIN)) is not None:
            print("Un compte admin existe déjà. Rien n'a été modifié.")
            return

        email = input("Email de l'admin : ").strip().lower()
        if not EMAIL_RE.match(email):
            print("Email invalide.")
            return

        password = getpass.getpass("Mot de passe de l'admin (ne s'affiche pas) : ")
        if password != getpass.getpass("Retape le mot de passe : "):
            print("Les deux mots de passe ne correspondent pas.")
            return
        if len(password) < MIN_PASSWORD_LENGTH:
            print(f"Mot de passe trop court ({MIN_PASSWORD_LENGTH} caractères minimum).")
            return
        if len(password.encode("utf-8")) > 72:
            print("Mot de passe trop long (72 octets maximum).")
            return

        db.add(User(email=email, password_hash=hash_password(password), role=Role.ADMIN))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            print("Cet email est déjà utilisé par un autre compte.")
            return
        print(f"Compte admin créé : {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
