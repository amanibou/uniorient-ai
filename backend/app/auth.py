from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from PIL import UnidentifiedImageError
import pytesseract
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Role, User
from app.ocr import card_is_informatique
from app.qr import parse_matricule_from_qr
from app.schemas import LoginIn, LoginOut, UserOut
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

MAX_CARD_BYTES = 5 * 1024 * 1024
ALLOWED_CARD_TYPES = ("image/jpeg", "image/png")


@router.post("/signup/etudiant", status_code=201, response_model=UserOut)
def signup_etudiant(
    matricule: str = Form(..., min_length=1, max_length=50),
    password: str = Form(..., min_length=1, max_length=72),
    nom: str = Form(..., min_length=1, max_length=100),
    prenom: str = Form(..., min_length=1, max_length=100),
    qr_text: str = Form(..., min_length=1, max_length=500),
    carte: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    qr_matricule = parse_matricule_from_qr(qr_text)
    if qr_matricule is None:
        raise HTTPException(status_code=400, detail="QR code de la carte non reconnu")

    matricule = matricule.strip()
    if matricule != qr_matricule:
        raise HTTPException(
            status_code=400,
            detail="Le matricule ne correspond pas au QR code de la carte",
        )

    nom = nom.strip()
    prenom = prenom.strip()
    if not nom or not prenom:
        raise HTTPException(status_code=400, detail="Le nom et le prénom sont obligatoires")

    if len(password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Mot de passe trop long")

    existing = db.scalar(select(User).where(User.matricule == matricule))
    if existing is not None:
        raise HTTPException(status_code=409, detail="Un compte existe déjà avec ce matricule")

    # Photo de la carte : lue en mémoire, vérifiée, puis jetée. Elle n'est jamais enregistrée.
    if carte.content_type not in ALLOWED_CARD_TYPES:
        raise HTTPException(status_code=400, detail="La photo de la carte doit être en JPG ou PNG")
    card_bytes = carte.file.read(MAX_CARD_BYTES + 1)
    if len(card_bytes) > MAX_CARD_BYTES:
        raise HTTPException(status_code=400, detail="La photo de la carte est trop lourde (max 5 Mo)")

    try:
        is_branch_ok = card_is_informatique(card_bytes)
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Le fichier envoyé n'est pas une image valide")
    except pytesseract.TesseractNotFoundError:
        raise HTTPException(status_code=500, detail="Tesseract n'est pas trouvé sur le serveur")

    if not is_branch_ok:
        raise HTTPException(
            status_code=400,
            detail="Inscription refusée : la carte n'indique pas le département Informatique (إعلام آلي)",
        )

    user = User(
        matricule=matricule,
        nom=nom,
        prenom=prenom,
        password_hash=hash_password(password),
        role=Role.ETUDIANT,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Un compte existe déjà avec ce matricule")
    db.refresh(user)
    return user


@router.post("/login", response_model=LoginOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    identifier = data.identifier.strip()
    user = db.scalar(
        select(User).where(
            or_(User.matricule == identifier, User.email == identifier.lower())
        )
    )
    password_ok = (
        user is not None
        and len(data.password.encode("utf-8")) <= 72
        and verify_password(data.password, user.password_hash)
    )
    if not password_ok:
        raise HTTPException(status_code=401, detail="Identifiant ou mot de passe incorrect")
    token = create_access_token(user.id)
    return LoginOut(**UserOut.model_validate(user).model_dump(), access_token=token)
