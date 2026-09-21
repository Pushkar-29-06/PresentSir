from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.auth.me_router import router as me_router
from app.attendance.router import router as attendance_router
from app.analytics.router import router as analytics_router
from app.config import settings
from app.device.router import router as device_router
from app.assessment_router import router as assessment_router
from app.notification_router import router as notification_router
from app.policy_router import router as policy_router

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
app.include_router(me_router)
app.include_router(device_router)
app.include_router(attendance_router)
app.include_router(analytics_router)
app.include_router(assessment_router)
app.include_router(notification_router)
app.include_router(policy_router)