# ChatakA – Role-Based AI Hospital Queue System

ChatakA is a full-stack hospital queue management prototype that digitises the patient flow process from registration to consultation. It replaces paper tokens and manual queue tracking with a real-time, role-aware system that predicts waiting times using machine learning and pushes live updates to all connected users via WebSockets.

Built as a hackathon-ready demo, it runs entirely on your local machine with no cloud setup required — just Python and Node.js.

---

## What It Does

Hospitals deal with long queues, unclear wait times, and poor visibility across departments. ChatakA addresses this by:

- Giving patients a **digital token** with a real-time queue position and ML-predicted wait time
- Giving doctors a **live queue view** per department with one-click patient calling and completion
- Giving admins a **full operations dashboard** — patient registration, queue monitoring, department load analytics, and system controls

All three roles share the same backend and database, with access controlled by the role assigned at signup.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js (Vite), plain CSS |
| Backend | FastAPI (Python) |
| Database | SQLite via SQLAlchemy (auto-migrating) |
| ML Model | Scikit-learn — Random Forest wait time predictor |
| Real-time | WebSockets (FastAPI native) |
| Auth | SHA-256 password hashing, role-based session |

---

## Roles

### Patient
The patient role is designed for self-service use. After signing up, a patient can:
- Generate a digital queue token by selecting a department and priority level (Normal, Urgent, Emergency)
- View their token number, current queue position, and ML-estimated wait time
- Track the live queue for their department in real time, with automatic updates pushed via WebSocket

### Doctor
The doctor role is built for clinical staff managing a department queue. A doctor can:
- Select their active department from a dropdown
- View the live list of waiting patients sorted by priority and arrival time
- Call the next patient with a single button — this updates the token status to `CALLED` and broadcasts the change to all connected clients
- Mark a consultation as complete, moving the token to `COMPLETED` and refreshing the queue

### Admin
The admin role provides full hospital operations visibility. An admin can:
- View a real-time dashboard with total patients, currently waiting, completed consultations, and average wait time
- Register new patients directly — entering name, age, phone number, disease or complaint, department, and priority — with a queue token auto-generated on submission
- Browse the full patient records table showing every registered patient alongside their token number, priority, and current status
- Monitor the live queue for any department
- View a department load chart showing how many patients are waiting in each department
- Reset all demo data with a single button for clean demonstrations
- Navigate using role-based breadcrumbs (e.g. `ADMIN PORTAL › Add Patient`)

---

## Project Structure

```
Chataka/
├── backend/
│   ├── main.py          # FastAPI app, all endpoints, WebSocket
│   ├── models.py        # SQLAlchemy models (User, Patient, Token)
│   ├── schemas.py       # Pydantic request/response schemas
│   ├── database.py      # SQLite engine and session
│   ├── ml_model.py      # Scikit-learn wait time predictor
│   ├── requirements.txt
│   └── chataka.db       # Auto-created on first run
├── frontend/
│   └── src/
│       ├── App.jsx      # All dashboards and components
│       ├── Auth.jsx     # Login and signup
│       ├── main.jsx
│       └── styles.css
├── run_backend.bat
└── run_frontend.bat
```

---

## Requirements

- Python 3.10+
- Node.js 18+
- npm

---

## Run Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

- API: http://127.0.0.1:8000
- Swagger docs: http://127.0.0.1:8000/docs

The backend auto-migrates the SQLite schema on every startup, so you can pull updates and restart without running any migration commands manually.

---

## Run Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL shown by Vite, normally: http://localhost:5173

---

## Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register a new user |
| POST | `/auth/login` | Login |
| POST | `/patients` | Create a patient record |
| POST | `/patients/{id}/token` | Generate a queue token |
| GET | `/queue/{department}` | Get live queue for a department |
| POST | `/doctor/call-next/{department}` | Call next patient |
| POST | `/doctor/complete/{token}` | Complete a consultation |
| GET | `/admin/patients` | List all patients with token info |
| GET | `/dashboard` | Hospital-wide stats |
| POST | `/demo/reset` | Clear all demo data |
| WS | `/ws/queue` | WebSocket live queue updates |

Full interactive API documentation is available at `/docs` when the backend is running.

---

## Database

All data is stored in `backend/chataka.db` (SQLite). The file is created automatically on first run. The backend checks for missing columns on startup and applies any needed alterations, so the schema stays in sync without manual intervention.

Tables:
- `users` — accounts for all roles (name, email, hashed password, role)
- `patients` — patient records (name, age, phone, disease/complaint, department)
- `tokens` — queue tokens linked to patients, tracking status (`WAITING` → `CALLED` → `COMPLETED`), priority, and timestamps

---

## ML Wait Time Prediction

The wait time predictor (`ml_model.py`) uses a Scikit-learn Random Forest model trained on synthetic queue data. It takes four inputs — patients ahead in queue, total queue length, doctors available, and average consultation time — and outputs an estimated wait in minutes. Priority level applies a multiplier so emergency cases always show a lower predicted wait. The model is trained once on startup and cached for the session.

---

## Priority System

Tokens are assigned one of three priority levels at registration:

| Priority | Description |
|----------|-------------|
| `NORMAL` | Standard queue order by arrival time |
| `URGENT` | Moved ahead of all NORMAL tokens |
| `EMERGENCY` | Moved to the front of the entire queue |

Within the same priority level, patients are ordered by arrival time.

---

## First Login

No fixed demo credentials. Click **Sign Up**, choose a role, create an account, then log in with that email and password. The role selected at signup controls which dashboard is shown.

---

## Important

This is a software prototype/demo, not a clinical decision-making system. Do not use it for real patient care without appropriate validation, security hardening, privacy review, and hospital system integration.
