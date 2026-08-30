from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load env variables
load_dotenv()

# Import all models so SQLAlchemy knows about them
from database import Base, engine, SessionLocal
from models import User, Student, Class, Exam, Attendance, Result, FeePayment, Teacher, Subject, TimetableEntry  # noqa: F401
from auth.password import hash_password

# Import routers
from routes.auth       import router as auth_router
from routes.students   import router as students_router
from routes.classes    import router as classes_router
from routes.attendance import router as attendance_router
from routes.exams      import router as exams_router
from routes.results    import router as results_router
from routes.fees       import router as fees_router
from routes.teachers   import router as teachers_router
from routes.subjects    import router as subjects_router
from routes.timetables  import router as timetables_router

# ── App Init ──────────────────────────────────────────────────
app = FastAPI(
    title="College Student Management System API",
    description="REST API for managing students, classes, attendance, exams, and results.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ── CORS ──────────────────────────────────────────────────────
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auto create tables & seed admin ───────────────────────────
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print("Warning: Could not create tables:", e)

@app.on_event("startup")
def seed_admin_user():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin@college.com").first()
        if not admin:
            hashed_pwd = hash_password("admin123")
            admin_user = User(
                email="admin@college.com",
                password=hashed_pwd,
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print("Default admin created: admin@college.com / admin123")
    except Exception as e:
        print("Startup seed warning:", e)
    finally:
        db.close()

# ── Register Routers ──────────────────────────────────────────
app.include_router(auth_router)
app.include_router(students_router)
app.include_router(classes_router)
app.include_router(attendance_router)
app.include_router(exams_router)
app.include_router(results_router)
app.include_router(fees_router)
app.include_router(teachers_router)
app.include_router(subjects_router)
app.include_router(timetables_router)


# ── Health Check ──────────────────────────────────────────────
@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "app": "College Student Management System",
        "version": "1.0.0"
    }

