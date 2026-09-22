from pydantic import BaseModel, Field, EmailStr


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str | None = None
    password: str = Field(min_length=4, max_length=100)
    role: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str


class PatientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    age: int | None = None
    dob: str | None = None
    gender: str | None = None
    department: str
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    emergency_contact: str | None = None
    blood_group: str | None = None
    disease: str | None = None
    priority: str = "NORMAL"
    user_id: int | None = None


class PatientResponse(BaseModel):
    id: int
    user_id: int | None = None
    name: str
    age: int | None = None
    dob: str | None = None
    gender: str | None = None
    department: str
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    emergency_contact: str | None = None
    blood_group: str | None = None
    disease: str | None = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    token_number: str
    priority: str
    status: str
    position: int
    estimated_wait: int
    department: str
    patient_name: str
