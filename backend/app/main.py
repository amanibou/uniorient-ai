from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.auth import router as auth_router
from app.etudiant import router as etudiant_router
from app.professeur import router as professeur_router
from app.admin import router as admin_router
from app.db import check_connection, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="UniOrient-AI API", lifespan=lifespan)

# Autoriser la page front (Vite, port 5173) à appeler l'API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(etudiant_router)
app.include_router(professeur_router)
app.include_router(admin_router)


@app.get("/")
def root():
    return {"message": "UniOrient-AI API fonctionne"}


@app.get("/health/db")
def health_db():
    try:
        check_connection()
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Connexion MySQL impossible (vérifie que MySQL est lancé dans XAMPP)",
        )
    return {"database": "ok"}
