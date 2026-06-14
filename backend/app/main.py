from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import realtime, sessions, speech, vision


app = FastAPI(title="SightMate API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(vision.router)
app.include_router(speech.router)
app.include_router(sessions.router)
app.include_router(realtime.router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
