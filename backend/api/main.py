from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.db.database import init_db
from backend.api.routers import cases, memory
from backend.api.graph_routes import router as graph_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Iniciando conexión con MongoDB Atlas / Local...")
    await init_db()
    print("Base de datos conectada exitosamente.")
    
    # Start graph synchronization background threads
    try:
        from backend.graph.sync.graph_sync_service import GraphSyncService
        sync_service = GraphSyncService()
        sync_service.start_change_stream()
        print("Graph Sync Service started change streams successfully.")
    except Exception as e:
        print(f"Failed to start Graph Sync Service: {e}")
        
    yield
    print("Cerrando aplicación.")

app = FastAPI(
    title="EUREKA Multiverse API",
    description="Cognitive Multi-Agent System MVP",
    version="0.1.0",
    lifespan=lifespan
)

frontend_url = os.getenv("FRONTEND_URL", "https://eureka-frontend-210a.onrender.com")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:5180", frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "EUREKA Cognitive Core is running"}

from backend.api.knowledge_routes import router as knowledge_router
from backend.api.pdf_routes import router as pdf_router
from backend.api.explainability_routes import router as explainability_router
from backend.api.intelligence_routes import router as intelligence_router
app.include_router(cases.router)
app.include_router(memory.router)
app.include_router(graph_router)
app.include_router(knowledge_router)
app.include_router(pdf_router)
app.include_router(explainability_router)
app.include_router(intelligence_router)
