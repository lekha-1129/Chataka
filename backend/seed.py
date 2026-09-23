"""
ChatakA — Sample Data Seeder
Run: python seed.py
Creates demo users, patients, doctors, and queue tokens.
"""

import hashlib
from datetime import datetime, timedelta
from sqlalchemy import inspect, text
from database import Base, engine, SessionLocal
from models import User, Patient, Doctor, Token

Base.metadata.create_all(bind=engine)

# Migrate tokens table if doctor_id column is missing
inspector = inspect(engine)
token_columns = {col["name"] for col in inspector.get_columns("tokens")}
if "doctor_id" not in token_columns:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE tokens ADD COLUMN doctor_id INTEGER"))


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def seed():
    db = SessionLocal()

    # ── Clear existing demo data ──────────────────────────────────────────────
    db.query(Token).delete()
    db.query(Patient).delete()
    db.query(Doctor).delete()
    db.query(User).delete()
    db.commit()

    # ── Users ─────────────────────────────────────────────────────────────────
    users_data = [
        # Admins
        {"name": "Admin User",        "email": "admin@chataka.com",   "phone": "9000000001", "role": "admin"},
        # Doctors
        {"name": "Dr. Arjun Mehta",   "email": "arjun@chataka.com",   "phone": "9100000001", "role": "doctor"},
        {"name": "Dr. Priya Sharma",  "email": "priya@chataka.com",   "phone": "9100000002", "role": "doctor"},
        {"name": "Dr. Ravi Kumar",    "email": "ravi@chataka.com",    "phone": "9100000003", "role": "doctor"},
        {"name": "Dr. Sneha Nair",    "email": "sneha@chataka.com",   "phone": "9100000004", "role": "doctor"},
        {"name": "Dr. Vikram Patel",  "email": "vikram@chataka.com",  "phone": "9100000005", "role": "doctor"},
        # Patients
        {"name": "Rahul Verma",       "email": "rahul@example.com",   "phone": "9200000001", "role": "patient"},
        {"name": "Anita Singh",       "email": "anita@example.com",   "phone": "9200000002", "role": "patient"},
        {"name": "Mohan Das",         "email": "mohan@example.com",   "phone": "9200000003", "role": "patient"},
        {"name": "Kavya Reddy",       "email": "kavya@example.com",   "phone": "9200000004", "role": "patient"},
        {"name": "Suresh Pillai",     "email": "suresh@example.com",  "phone": "9200000005", "role": "patient"},
        {"name": "Deepa Menon",       "email": "deepa@example.com",   "phone": "9200000006", "role": "patient"},
        {"name": "Arun Joshi",        "email": "arun@example.com",    "phone": "9200000007", "role": "patient"},
        {"name": "Lakshmi Iyer",      "email": "lakshmi@example.com", "phone": "9200000008", "role": "patient"},
        {"name": "Nikhil Gupta",      "email": "nikhil@example.com",  "phone": "9200000009", "role": "patient"},
        {"name": "Pooja Tiwari",      "email": "pooja@example.com",   "phone": "9200000010", "role": "patient"},
    ]

    users = []
    for u in users_data:
        user = User(
            name=u["name"],
            email=u["email"],
            phone=u["phone"],
            password_hash=hash_password("demo1234"),
            role=u["role"],
        )
        db.add(user)
        users.append(user)

    db.commit()
    for u in users:
        db.refresh(u)

    patient_users = [u for u in users if u.role == "patient"]

    # ── Doctors ───────────────────────────────────────────────────────────────
    doctors_data = [
        {
            "name": "Dr. Arjun Mehta",
            "age": 42, "gender": "Male",
            "phone": "9100000001", "email": "arjun@chataka.com",
            "specialization": "Cardiologist", "department": "Cardiology",
            "qualification": "MBBS, MD, DM Cardiology",
            "experience": 15, "license_number": "MCI-2024-001",
            "consultation_fee": 800, "status": "ACTIVE",
        },
        {
            "name": "Dr. Priya Sharma",
            "age": 36, "gender": "Female",
            "phone": "9100000002", "email": "priya@chataka.com",
            "specialization": "Pediatrician", "department": "Pediatrics",
            "qualification": "MBBS, MD Pediatrics",
            "experience": 10, "license_number": "MCI-2024-002",
            "consultation_fee": 600, "status": "ACTIVE",
        },
        {
            "name": "Dr. Ravi Kumar",
            "age": 50, "gender": "Male",
            "phone": "9100000003", "email": "ravi@chataka.com",
            "specialization": "General Physician", "department": "General Medicine",
            "qualification": "MBBS, MD General Medicine",
            "experience": 22, "license_number": "MCI-2024-003",
            "consultation_fee": 500, "status": "ACTIVE",
        },
        {
            "name": "Dr. Sneha Nair",
            "age": 38, "gender": "Female",
            "phone": "9100000004", "email": "sneha@chataka.com",
            "specialization": "Neurologist", "department": "Neurology",
            "qualification": "MBBS, MD, DM Neurology",
            "experience": 12, "license_number": "MCI-2024-004",
            "consultation_fee": 900, "status": "ACTIVE",
        },
        {
            "name": "Dr. Vikram Patel",
            "age": 45, "gender": "Male",
            "phone": "9100000005", "email": "vikram@chataka.com",
            "specialization": "Orthopedic Surgeon", "department": "Orthopedics",
            "qualification": "MBBS, MS Orthopedics",
            "experience": 18, "license_number": "MCI-2024-005",
            "consultation_fee": 750, "status": "ACTIVE",
        },
        {
            "name": "Dr. Meena Krishnan",
            "age": 40, "gender": "Female",
            "phone": "9100000006", "email": "meena@chataka.com",
            "specialization": "Dermatologist", "department": "Dermatology",
            "qualification": "MBBS, MD Dermatology",
            "experience": 14, "license_number": "MCI-2024-006",
            "consultation_fee": 650, "status": "ACTIVE",
        },
        {
            "name": "Dr. Sunil Bose",
            "age": 55, "gender": "Male",
            "phone": "9100000007", "email": "sunil@chataka.com",
            "specialization": "Emergency Physician", "department": "Emergency",
            "qualification": "MBBS, MD Emergency Medicine",
            "experience": 28, "license_number": "MCI-2024-007",
            "consultation_fee": 1000, "status": "ACTIVE",
        },
    ]

    doctors = []
    for d in doctors_data:
        doctor = Doctor(**d)
        db.add(doctor)
        doctors.append(doctor)

    db.commit()
    for d in doctors:
        db.refresh(d)

    # ── Patients ──────────────────────────────────────────────────────────────
    patients_data = [
        {
            "user_id": patient_users[0].id,
            "name": "Rahul Verma", "age": 34, "gender": "Male",
            "dob": "1990-05-12", "phone": "9200000001",
            "email": "rahul@example.com",
            "address": "12, MG Road, Bangalore",
            "emergency_contact": "9200000099",
            "blood_group": "B+", "department": "Cardiology",
            "disease": "Chest pain and palpitations",
        },
        {
            "user_id": patient_users[1].id,
            "name": "Anita Singh", "age": 28, "gender": "Female",
            "dob": "1996-08-22", "phone": "9200000002",
            "email": "anita@example.com",
            "address": "45, Anna Nagar, Chennai",
            "emergency_contact": "9200000098",
            "blood_group": "O+", "department": "General Medicine",
            "disease": "Fever and body ache",
        },
        {
            "user_id": patient_users[2].id,
            "name": "Mohan Das", "age": 62, "gender": "Male",
            "dob": "1962-01-30", "phone": "9200000003",
            "email": "mohan@example.com",
            "address": "78, Park Street, Kolkata",
            "emergency_contact": "9200000097",
            "blood_group": "A+", "department": "Neurology",
            "disease": "Recurring headaches and dizziness",
        },
        {
            "user_id": patient_users[3].id,
            "name": "Kavya Reddy", "age": 7, "gender": "Female",
            "dob": "2017-03-15", "phone": "9200000004",
            "email": "kavya@example.com",
            "address": "23, Jubilee Hills, Hyderabad",
            "emergency_contact": "9200000096",
            "blood_group": "AB+", "department": "Pediatrics",
            "disease": "Cold, cough and mild fever",
        },
        {
            "user_id": patient_users[4].id,
            "name": "Suresh Pillai", "age": 48, "gender": "Male",
            "dob": "1976-11-05", "phone": "9200000005",
            "email": "suresh@example.com",
            "address": "56, Koramangala, Bangalore",
            "emergency_contact": "9200000095",
            "blood_group": "O-", "department": "Orthopedics",
            "disease": "Knee pain and difficulty walking",
        },
        {
            "user_id": patient_users[5].id,
            "name": "Deepa Menon", "age": 31, "gender": "Female",
            "dob": "1993-07-19", "phone": "9200000006",
            "email": "deepa@example.com",
            "address": "89, Indiranagar, Bangalore",
            "emergency_contact": "9200000094",
            "blood_group": "B-", "department": "Dermatology",
            "disease": "Skin rash and itching",
        },
        {
            "user_id": patient_users[6].id,
            "name": "Arun Joshi", "age": 55, "gender": "Male",
            "dob": "1969-02-28", "phone": "9200000007",
            "email": "arun@example.com",
            "address": "34, Connaught Place, Delhi",
            "emergency_contact": "9200000093",
            "blood_group": "A-", "department": "Emergency",
            "disease": "Severe chest pain — possible MI",
        },
        {
            "user_id": patient_users[7].id,
            "name": "Lakshmi Iyer", "age": 44, "gender": "Female",
            "dob": "1980-09-10", "phone": "9200000008",
            "email": "lakshmi@example.com",
            "address": "67, T Nagar, Chennai",
            "emergency_contact": "9200000092",
            "blood_group": "AB-", "department": "General Medicine",
            "disease": "Diabetes follow-up",
        },
        {
            "user_id": patient_users[8].id,
            "name": "Nikhil Gupta", "age": 22, "gender": "Male",
            "dob": "2002-12-03", "phone": "9200000009",
            "email": "nikhil@example.com",
            "address": "11, Banjara Hills, Hyderabad",
            "emergency_contact": "9200000091",
            "blood_group": "B+", "department": "Orthopedics",
            "disease": "Sports injury — ankle sprain",
        },
        {
            "user_id": patient_users[9].id,
            "name": "Pooja Tiwari", "age": 39, "gender": "Female",
            "dob": "1985-06-25", "phone": "9200000010",
            "email": "pooja@example.com",
            "address": "90, Powai, Mumbai",
            "emergency_contact": "9200000090",
            "blood_group": "O+", "department": "Cardiology",
            "disease": "Hypertension monitoring",
        },
    ]

    patients = []
    for p in patients_data:
        patient = Patient(**p)
        db.add(patient)
        patients.append(patient)

    db.commit()
    for p in patients:
        db.refresh(p)

    # ── Tokens ────────────────────────────────────────────────────────────────
    dept_prefix = {
        "General Medicine": "GM",
        "Cardiology": "CA",
        "Pediatrics": "PD",
        "Emergency": "ER",
        "Neurology": "NR",
        "Orthopedics": "OR",
        "Dermatology": "DR",
    }
    dept_counter = {}

    tokens_data = [
        # patient index, priority, status, minutes_ago
        (0, "URGENT",    "WAITING",   30),
        (1, "NORMAL",    "WAITING",   25),
        (2, "NORMAL",    "WAITING",   20),
        (3, "NORMAL",    "COMPLETED", 60),
        (4, "URGENT",    "WAITING",   15),
        (5, "NORMAL",    "WAITING",   10),
        (6, "EMERGENCY", "CALLED",    45),
        (7, "NORMAL",    "COMPLETED", 90),
        (8, "NORMAL",    "WAITING",    5),
        (9, "URGENT",    "WAITING",   35),
    ]

    for patient_idx, priority, status, minutes_ago in tokens_data:
        patient = patients[patient_idx]
        dept = patient.department
        prefix = dept_prefix.get(dept, "OPD")
        dept_counter[dept] = dept_counter.get(dept, 0) + 1
        token_number = f"{prefix}{dept_counter[dept]:03d}"

        created = datetime.utcnow() - timedelta(minutes=minutes_ago)
        called_at = None
        completed_at = None

        if status == "CALLED":
            called_at = datetime.utcnow() - timedelta(minutes=5)
        elif status == "COMPLETED":
            called_at = created + timedelta(minutes=10)
            completed_at = called_at + timedelta(minutes=8)

        token = Token(
            patient_id=patient.id,
            token_number=token_number,
            department=dept,
            priority=priority,
            status=status,
            created_at=created,
            called_at=called_at,
            completed_at=completed_at,
            estimated_wait=0,
        )
        db.add(token)

    db.commit()
    db.close()

    print("Seed complete!")
    print()
    print("-- Login credentials (all passwords: demo1234) --")
    print("  ADMIN   -> admin@chataka.com")
    print("  DOCTOR  -> arjun@chataka.com  (Cardiology)")
    print("  DOCTOR  -> priya@chataka.com  (Pediatrics)")
    print("  DOCTOR  -> ravi@chataka.com   (General Medicine)")
    print("  DOCTOR  -> sneha@chataka.com  (Neurology)")
    print("  DOCTOR  -> vikram@chataka.com (Orthopedics)")
    print("  PATIENT -> rahul@example.com  (Cardiology - URGENT)")
    print("  PATIENT -> anita@example.com  (General Medicine)")
    print("  PATIENT -> arun@example.com   (Emergency - EMERGENCY)")
    print("-------------------------------------------------")


if __name__ == "__main__":
    seed()
