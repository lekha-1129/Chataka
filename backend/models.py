from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    phone = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    department = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Token(Base):
    __tablename__ = "tokens"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, nullable=False)
    token_number = Column(String, nullable=False, unique=True)
    department = Column(String, nullable=False)
    priority = Column(String, default="NORMAL")
    status = Column(String, default="WAITING")
    created_at = Column(DateTime, default=datetime.utcnow)
    called_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    estimated_wait = Column(Integer, default=0)
