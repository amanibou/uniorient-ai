from pydantic import BaseModel, ConfigDict, Field

from app.models import Role


class SignupEtudiantIn(BaseModel):
    matricule: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=72)
    nom: str = Field(min_length=1, max_length=100)
    prenom: str = Field(min_length=1, max_length=100)
    qr_text: str = Field(min_length=1, max_length=500)


class UserOut(BaseModel):
    # Le mot de passe (hash) n'est jamais renvoyé
    model_config = ConfigDict(from_attributes=True)

    id: int
    matricule: str | None
    email: str | None
    nom: str | None
    prenom: str | None
    role: Role


class LoginIn(BaseModel):
    # Matricule (étudiant) ou email (admin / professeur)
    identifier: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=72)


class LoginOut(UserOut):
    access_token: str
    token_type: str = "bearer"
