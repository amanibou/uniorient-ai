from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Note, Role, User

router = APIRouter(prefix="/professeur", tags=["professeur"])


class MoiOut(BaseModel):
    id: int
    nom: str | None
    prenom: str | None
    email: str | None
    module: str | None


class EtudiantOut(BaseModel):
    id: int
    matricule: str | None
    nom: str | None
    prenom: str | None
    # Note du module du professeur connecté (None si pas encore saisie)
    note: float | None


class NoteIn(BaseModel):
    valeur: float = Field(ge=0, le=20)


class NoteOut(BaseModel):
    etudiant_id: int
    module: str
    valeur: float


def get_prof(user: User = Depends(get_current_user)) -> User:
    if user.role != Role.PROFESSEUR or not user.module:
        raise HTTPException(status_code=403, detail="Réservé aux professeurs")
    return user


@router.get("/moi", response_model=MoiOut)
def moi(prof: User = Depends(get_prof)):
    return MoiOut(id=prof.id, nom=prof.nom, prenom=prof.prenom, email=prof.email, module=prof.module)


@router.get("/etudiants", response_model=list[EtudiantOut])
def list_etudiants(
    q: str = Query("", max_length=100),
    prof: User = Depends(get_prof),
    db: Session = Depends(get_db),
):
    query = select(User).where(User.role == Role.ETUDIANT)
    search = q.strip()
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(User.matricule.like(pattern), User.nom.like(pattern), User.prenom.like(pattern))
        )
    students = db.scalars(query.order_by(User.nom, User.prenom).limit(100)).all()

    notes = {
        n.etudiant_id: n.valeur
        for n in db.scalars(select(Note).where(Note.module == prof.module)).all()
    }
    return [
        EtudiantOut(
            id=s.id,
            matricule=s.matricule,
            nom=s.nom,
            prenom=s.prenom,
            note=notes.get(s.id),
        )
        for s in students
    ]


@router.put("/notes/{etudiant_id}", response_model=NoteOut)
def save_note(
    etudiant_id: int,
    data: NoteIn,
    prof: User = Depends(get_prof),
    db: Session = Depends(get_db),
):
    student = db.get(User, etudiant_id)
    if student is None or student.role != Role.ETUDIANT:
        raise HTTPException(status_code=404, detail="Étudiant introuvable")

    # Le module vient du compte du professeur, jamais du message envoyé
    note = db.scalar(
        select(Note).where(Note.etudiant_id == etudiant_id, Note.module == prof.module)
    )
    if note is None:
        db.add(Note(etudiant_id=etudiant_id, module=prof.module, valeur=data.valeur))
    else:
        note.valeur = data.valeur
    db.commit()
    return NoteOut(etudiant_id=etudiant_id, module=prof.module, valeur=data.valeur)
