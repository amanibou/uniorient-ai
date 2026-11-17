from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Role(str, PyEnum):
    ADMIN = "admin"
    PROFESSEUR = "professeur"
    ETUDIANT = "etudiant"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Un étudiant se connecte avec son matricule ; email optionnel (login : matricule ou email)
    matricule: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    nom: Mapped[str | None] = mapped_column(String(100), nullable=True)
    prenom: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Module enseigné (uniquement pour les professeurs)
    module: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Jamais de mot de passe en clair : seulement le hash
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(
        Enum(Role, values_callable=lambda e: [m.value for m in e], native_enum=False, length=20)
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Interet(Base):
    __tablename__ = "interets"
    __table_args__ = (UniqueConstraint("user_id", "specialite", name="uq_interet_user_specialite"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    # Code de la spécialité : IA, GL ou CYS
    specialite: Mapped[str] = mapped_column(String(10))


class Note(Base):
    __tablename__ = "notes"
    __table_args__ = (UniqueConstraint("etudiant_id", "module", name="uq_note_etudiant_module"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    etudiant_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    # Module de la note (Algorithmique, Programmation, Mathématiques)
    module: Mapped[str] = mapped_column(String(50))
    valeur: Mapped[float] = mapped_column(Float)
