from typing import get_args

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.etudiant import MODULES, Specialite
from app.models import Interet, Note, Role, User

router = APIRouter(prefix="/admin", tags=["admin"])


class StatsOut(BaseModel):
    etudiants: int
    professeurs: int


class NoteItemOut(BaseModel):
    module: str
    valeur: float | None


class EtudiantAdminOut(BaseModel):
    id: int
    matricule: str | None
    nom: str | None
    prenom: str | None
    specialites: list[str]
    notes: list[NoteItemOut]


def _require_admin(user: User) -> None:
    if user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Réservé à l'administrateur")


@router.get("/stats", response_model=StatsOut)
def stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_admin(user)
    etudiants = db.scalar(
        select(func.count()).select_from(User).where(User.role == Role.ETUDIANT)
    )
    professeurs = db.scalar(
        select(func.count()).select_from(User).where(User.role == Role.PROFESSEUR)
    )
    return StatsOut(etudiants=etudiants or 0, professeurs=professeurs or 0)


@router.get("/etudiants", response_model=list[EtudiantAdminOut])
def list_etudiants(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_admin(user)
    students = db.scalars(
        select(User).where(User.role == Role.ETUDIANT).order_by(User.nom, User.prenom)
    ).all()
    interets = db.scalars(select(Interet)).all()
    notes = db.scalars(select(Note)).all()

    # On regroupe les lignes par étudiant (évite une requête par étudiant)
    specs_by_user: dict[int, list[str]] = {}
    for it in interets:
        specs_by_user.setdefault(it.user_id, []).append(it.specialite)
    notes_by_user: dict[int, dict[str, float]] = {}
    for n in notes:
        notes_by_user.setdefault(n.etudiant_id, {})[n.module] = n.valeur

    result = []
    for s in students:
        valeurs = notes_by_user.get(s.id, {})
        result.append(
            EtudiantAdminOut(
                id=s.id,
                matricule=s.matricule,
                nom=s.nom,
                prenom=s.prenom,
                specialites=sorted(specs_by_user.get(s.id, [])),
                notes=[NoteItemOut(module=m, valeur=valeurs.get(m)) for m in MODULES],
            )
        )
    return result


# Libellés des spécialités (les codes viennent de Specialite dans etudiant.py)
SPECIALITE_LABELS = {
    "IA": "Intelligence Artificielle",
    "GL": "Génie Logiciel",
    "CYS": "Cybersécurité",
}


class SpecialiteStatOut(BaseModel):
    code: str
    label: str
    etudiants: int


class ModuleStatOut(BaseModel):
    module: str
    moyenne: float | None
    saisies: int
    manquantes: int


class StatistiquesOut(BaseModel):
    total_etudiants: int
    specialites: list[SpecialiteStatOut]
    modules: list[ModuleStatOut]


@router.get("/statistiques", response_model=StatistiquesOut)
def statistiques(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_admin(user)

    total = db.scalar(
        select(func.count()).select_from(User).where(User.role == Role.ETUDIANT)
    ) or 0

    # Nombre d'étudiants distincts ayant choisi chaque spécialité
    rows = db.execute(
        select(Interet.specialite, func.count(func.distinct(Interet.user_id)))
        .group_by(Interet.specialite)
    ).all()
    par_code = {code: count for code, count in rows}
    specialites = [
        SpecialiteStatOut(
            code=code,
            label=SPECIALITE_LABELS.get(code, code),
            etudiants=par_code.get(code, 0),
        )
        for code in get_args(Specialite)
    ]

    # Moyenne et nombre de notes saisies par module
    rows = db.execute(
        select(Note.module, func.avg(Note.valeur), func.count(Note.id))
        .group_by(Note.module)
    ).all()
    par_module = {module: (moy, nb) for module, moy, nb in rows}
    modules = []
    for module in MODULES:
        moy, nb = par_module.get(module, (None, 0))
        modules.append(
            ModuleStatOut(
                module=module,
                moyenne=round(float(moy), 2) if moy is not None else None,
                saisies=nb,
                manquantes=max(total - nb, 0),
            )
        )

    return StatistiquesOut(total_etudiants=total, specialites=specialites, modules=modules)
