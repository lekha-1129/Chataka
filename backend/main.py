from datetime import datetime
from typing import List
import hashlib

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, inspect, text

from database import Base, engine, get_db
from models import User, Patient, Token
from schemas import (
    SignupRequest,
    LoginRequest,
    PatientCreate,
    PatientResponse,
)
from ml_model import predict_wait, get_model

Base.metadata.create_all(bind=engine)

# Small local-demo migration so an older chataka.db can still run.
inspector = inspect(engine)
patient_columns = {column["name"] for column in inspector.get_columns("patients")}
new_columns = {
    "user_id": "INTEGER",
    "disease": "TEXT",
    "dob": "TEXT",
    "gender": "TEXT",
    "email": "TEXT",
    "address": "TEXT",
    "emergency_contact": "TEXT",
    "blood_group": "TEXT",
}
for col, col_type in new_columns.items():
    if col not in patient_columns:
        with engine.begin() as connection:
            connection.execute(text(f"ALTER TABLE patients ADD COLUMN {col} {col_type}"))

get_model()

app = FastAPI(
    title="CHATaka API",
    description="AI Hospital Queue & Waiting-Time Prediction Prototype",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for connection in dead:
            self.disconnect(connection)


manager = ConnectionManager()


def priority_rank(priority: str) -> int:
    return {"EMERGENCY": 0, "URGENT": 1, "NORMAL": 2}.get(priority, 2)


def get_waiting_tokens(db: Session, department: str):
    tokens = (
        db.query(Token)
        .filter(Token.department == department, Token.status == "WAITING")
        .all()
    )
    return sorted(
        tokens,
        key=lambda t: (priority_rank(t.priority), t.created_at, t.id),
    )


def department_stats(db: Session, department: str):
    waiting = get_waiting_tokens(db, department)
    doctors_available = 3
    avg_consultation = 10
    queue_length = len(waiting)

    for i, token in enumerate(waiting):
        token.estimated_wait = predict_wait(
            patients_ahead=i,
            queue_length=queue_length,
            doctors_available=doctors_available,
            avg_consultation=avg_consultation,
            priority=token.priority,
        )
    db.commit()
    return waiting


def token_payload(db: Session, token: Token) -> dict:
    waiting = get_waiting_tokens(db, token.department)
    position = next(
        (i + 1 for i, t in enumerate(waiting) if t.id == token.id),
        0,
    )

    patient = db.query(Patient).filter(Patient.id == token.patient_id).first()

    if token.status == "WAITING":
        token.estimated_wait = predict_wait(
            patients_ahead=max(0, position - 1),
            queue_length=len(waiting),
            doctors_available=3,
            avg_consultation=10,
            priority=token.priority,
        )
        db.commit()

    return {
        "token_number": token.token_number,
        "priority": token.priority,
        "status": token.status,
        "position": position,
        "estimated_wait": token.estimated_wait or 0,
        "department": token.department,
        "patient_name": patient.name if patient else "Unknown",
    }


async def broadcast_queue(db: Session, department: str):
    department_stats(db, department)
    waiting = get_waiting_tokens(db, department)

    queue = []
    for i, token in enumerate(waiting):
        patient = db.query(Patient).filter(Patient.id == token.patient_id).first()
        queue.append({
            "token_number": token.token_number,
            "patient_name": patient.name if patient else "Unknown",
            "priority": token.priority,
            "status": token.status,
            "position": i + 1,
            "estimated_wait": token.estimated_wait or 0,
        })

    await manager.broadcast({
        "type": "QUEUE_UPDATE",
        "department": department,
        "queue": queue,
    })


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def normalize_role(role: str) -> str:
    role = role.strip().lower()
    if role not in {"patient", "doctor", "admin"}:
        raise HTTPException(status_code=400, detail="Invalid role")
    return role


@app.get("/")
def home():
    return {"message": "CHATaka Hospital Queue API is running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/auth/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    role = normalize_role(data.role)
    email = data.email.lower()

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        name=data.name.strip(),
        email=email,
        phone=data.phone,
        password_hash=hash_password(data.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "Account created successfully",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
    }


@app.post("/auth/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    role = normalize_role(data.role)
    email = data.email.lower()

    user = db.query(User).filter(User.email == email).first()
    if not user or user.password_hash != hash_password(data.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.role != role:
        raise HTTPException(
            status_code=403,
            detail=f"This account is registered as {user.role.title()}, not {role.title()}",
        )

    return {
        "message": "Login successful",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
    }


@app.get("/patients/by-user/{user_id}")
def get_patient_by_user(user_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.user_id == user_id).first()
    if not patient:
        return {"patient": None}
    return {"patient": patient}


@app.post("/patients", response_model=PatientResponse)
def create_patient(data: PatientCreate, db: Session = Depends(get_db)):
    patient = Patient(
        user_id=data.user_id,
        name=data.name,
        age=data.age,
        dob=data.dob,
        gender=data.gender,
        department=data.department,
        phone=data.phone,
        email=data.email,
        address=data.address,
        emergency_contact=data.emergency_contact,
        blood_group=data.blood_group,
        disease=data.disease,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@app.post("/patients/{patient_id}/token")
async def create_token(patient_id: int, priority: str = "NORMAL", db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    priority = priority.upper()
    if priority not in {"NORMAL", "URGENT", "EMERGENCY"}:
        raise HTTPException(status_code=400, detail="Priority must be NORMAL, URGENT or EMERGENCY")

    prefix = {
        "General Medicine": "GM",
        "Cardiology": "CA",
        "Pediatrics": "PD",
        "Emergency": "ER",
    }.get(patient.department, "OPD")

    existing_count = db.query(Token).filter(Token.department == patient.department).count()
    token_number = f"{prefix}{existing_count + 1:03d}"

    token = Token(
        patient_id=patient.id,
        token_number=token_number,
        department=patient.department,
        priority=priority,
        status="WAITING",
    )
    db.add(token)
    db.commit()
    db.refresh(token)

    await broadcast_queue(db, patient.department)
    return token_payload(db, token)


@app.get("/queue/{department}")
def get_queue(department: str, db: Session = Depends(get_db)):
    waiting = department_stats(db, department)
    result = []
    for i, token in enumerate(waiting):
        patient = db.query(Patient).filter(Patient.id == token.patient_id).first()
        result.append({
            "token_number": token.token_number,
            "patient_name": patient.name if patient else "Unknown",
            "priority": token.priority,
            "status": token.status,
            "position": i + 1,
            "estimated_wait": token.estimated_wait or 0,
        })
    return {"department": department, "queue_length": len(result), "queue": result}


@app.get("/tokens/{token_number}")
def get_token(token_number: str, db: Session = Depends(get_db)):
    token = db.query(Token).filter(Token.token_number == token_number).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    return token_payload(db, token)


@app.get("/patient/token/{user_id}")
def get_latest_patient_token(user_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.user_id == user_id).order_by(Patient.id.desc()).first()
    if not patient:
        return {"token": None}

    token = (
        db.query(Token)
        .filter(Token.patient_id == patient.id)
        .order_by(Token.id.desc())
        .first()
    )
    if not token:
        return {"token": None, "patient": patient}

    return {"token": token_payload(db, token), "patient": patient}


@app.post("/doctor/call-next/{department}")
async def call_next(department: str, db: Session = Depends(get_db)):
    waiting = get_waiting_tokens(db, department)
    if not waiting:
        return {"message": "No patients waiting"}

    token = waiting[0]
    token.status = "CALLED"
    token.called_at = datetime.utcnow()
    token.estimated_wait = 0
    db.commit()
    await broadcast_queue(db, department)

    patient = db.query(Patient).filter(Patient.id == token.patient_id).first()
    return {
        "message": "Patient called",
        "token_number": token.token_number,
        "patient_name": patient.name if patient else "Unknown",
    }


@app.post("/doctor/complete/{token_number}")
async def complete_token(token_number: str, db: Session = Depends(get_db)):
    token = db.query(Token).filter(Token.token_number == token_number).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")

    token.status = "COMPLETED"
    token.completed_at = datetime.utcnow()
    db.commit()
    await broadcast_queue(db, token.department)

    return {"message": "Consultation completed", "token_number": token.token_number}


@app.get("/admin/patients")
def admin_list_patients(db: Session = Depends(get_db)):
    patients = db.query(Patient).order_by(Patient.id.desc()).all()
    result = []
    for p in patients:
        token = db.query(Token).filter(Token.patient_id == p.id).order_by(Token.id.desc()).first()
        result.append({
            "id": p.id,
            "name": p.name,
            "age": p.age,
            "department": p.department,
            "phone": p.phone or "",
            "disease": p.disease or "",
            "token_number": token.token_number if token else "—",
            "status": token.status if token else "—",
            "priority": token.priority if token else "—",
        })
    return {"patients": result}


@app.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    total_patients = db.query(Patient).count()
    waiting = db.query(Token).filter(Token.status == "WAITING").count()
    called = db.query(Token).filter(Token.status == "CALLED").count()
    completed = db.query(Token).filter(Token.status == "COMPLETED").count()

    avg_wait = db.query(func.avg(Token.estimated_wait)).filter(Token.status == "WAITING").scalar()

    departments = {}
    for department in [
        "General Medicine", "General Surgery", "ENT", "Cardiology",
        "Neurology", "Orthopedics", "Dermatology", "Ophthalmology",
        "Pediatrics", "Gynecology", "Obstetrics", "Urology",
        "Gastroenterology", "Pulmonology", "Nephrology", "Endocrinology",
        "Psychiatry", "Dentistry", "Oncology", "Emergency",
    ]:
        departments[department] = db.query(Token).filter(
            Token.department == department,
            Token.status == "WAITING",
        ).count()

    return {
        "total_patients": total_patients,
        "waiting": waiting,
        "called": called,
        "completed": completed,
        "average_wait": round(float(avg_wait or 0), 1),
        "departments": departments,
    }


@app.post("/demo/reset")
async def reset_demo(db: Session = Depends(get_db)):
    db.query(Token).delete()
    db.query(Patient).delete()
    db.commit()
    await manager.broadcast({"type": "RESET"})
    return {"message": "Demo data cleared"}


@app.websocket("/ws/queue")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
