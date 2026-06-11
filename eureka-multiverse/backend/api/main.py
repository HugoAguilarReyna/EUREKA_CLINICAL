from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.db.database import init_db
from backend.api.routers import cases, memory

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Iniciando conexión con MongoDB Atlas / Local...")
    await init_db()
    print("Base de datos conectada exitosamente.")
    yield
    print("Cerrando aplicación.")

app = FastAPI(
    title="EUREKA Multiverse API",
    description="Cognitive Multi-Agent System MVP",
    version="0.1.0",
    lifespan=lifespan
)

# CORS para Vite React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "EUREKA Cognitive Core is running"}

app.include_router(cases.router)
app.include_router(memory.router)

