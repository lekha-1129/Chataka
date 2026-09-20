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
    age: int = Field(ge=0, le=120)
    department: str
    phone: str | None = None
    priority: str = "NORMAL"
    user_id: int | None = None


class PatientResponse(BaseModel):
    id: int
    user_id: int | None = None
    name: str
    age: int
    department: str
    phone: str | None = None

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
