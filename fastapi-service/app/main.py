from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers.challenge import router as challenge_router

settings = get_settings()

app = FastAPI(title="nope-ai contrarian agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(challenge_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
