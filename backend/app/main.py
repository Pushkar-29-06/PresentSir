from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.config import settings
from app.device.router import router as device_router

app = FastAPI(
    title="Smart Attendance API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok"
    }


app.include_router(auth_router)
app.include_router(device_router)