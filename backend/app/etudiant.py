from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Interet, Note, Role, User

router = APIRouter(prefix="/etudiant", tags=["etudiant"])

# Codes des 3 spécialités de départ du projet
Specialite = Literal["IA", "GL", "CYS"]

# Modules notés (les notes sont saisies par les professeurs)
MODULES = ["Algorithmique", "Programmation", "Mathématiques"]


class InteretsIn(BaseModel):
    specialites: list[Specialite] = Field(default_factory=list, max_length=3)


class InteretsOut(BaseModel):
    specialites: list[Specialite]


def _require_etudiant(user: User) -> None:
    if user.role != Role.ETUDIANT:
        raise HTTPException(status_code=403, detail="Réservé aux étudiants")


@router.get("/interets", response_model=InteretsOut)
def get_interets(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_etudiant(user)
    rows = db.scalars(select(Interet.specialite).where(Interet.user_id == user.id)).all()
    return {"specialites": sorted(rows)}


@router.put("/interets", response_model=InteretsOut)
def save_interets(
    data: InteretsIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_etudiant(user)
    # Supprime les doublons en gardant l'ordre
    chosen = list(dict.fromkeys(data.specialites))
    db.execute(delete(Interet).where(Interet.user_id == user.id))
    for code in chosen:
        db.add(Interet(user_id=user.id, specialite=code))
    db.commit()
    return {"specialites": chosen}


class NoteItemOut(BaseModel):
    module: str
    valeur: float | None


@router.get("/notes", response_model=list[NoteItemOut])
def get_notes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_etudiant(user)
    rows = db.scalars(select(Note).where(Note.etudiant_id == user.id)).all()
    valeurs = {n.module: n.valeur for n in rows}
    # Un élément par module, même si la note n'est pas encore saisie
    return [NoteItemOut(module=m, valeur=valeurs.get(m)) for m in MODULES]
