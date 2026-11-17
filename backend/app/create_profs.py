import getpass

from sqlalchemy import select

from app.db import SessionLocal, init_db
from app.models import Role, User
from app.security import hash_password

# Comptes des professeurs (emails de test). Le module est affiché seulement ici :
# il n'est pas encore enregistré en base, en attendant qu'on le décide avec l'étudiante.
PROFESSEURS = [
    ("prof.algorithmique@uniorient.local", "Algorithmique"),
    ("prof.programmation@uniorient.local", "Programmation"),
    ("prof.mathematiques@uniorient.local", "Mathématiques"),
]
MIN_PASSWORD_LENGTH = 8


def ask_password(module: str) -> str:
    """Demande un mot de passe (caché) deux fois, jusqu'à ce qu'il soit valide."""
    while True:
        password = getpass.getpass(f"Mot de passe du professeur {module} (ne s'affiche pas) : ")
        if len(password) < MIN_PASSWORD_LENGTH:
            print(f"Trop court ({MIN_PASSWORD_LENGTH} caractères minimum). Réessaie.")
            continue
        if len(password.encode("utf-8")) > 72:
            print("Trop long (72 octets maximum). Réessaie.")
            continue
        if password != getpass.getpass("Retape le mot de passe : "):
            print("Les deux mots de passe ne correspondent pas. Réessaie.")
            continue
        return password


def main() -> None:
    """Crée les comptes professeurs. Les mots de passe sont tapés dans le terminal (cachés), jamais dans un fichier."""
    init_db()
    db = SessionLocal()
    try:
        for email, module in PROFESSEURS:
            if db.scalar(select(User).where(User.email == email)) is not None:
                print(f"{email} existe déjà, ignoré.")
                continue
            password = ask_password(module)
            db.add(User(email=email, password_hash=hash_password(password), role=Role.PROFESSEUR))
            db.commit()
            print(f"Compte créé : {module} | {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
