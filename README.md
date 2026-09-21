# ChatakA – Role-Based AI Hospital Queue System

A ready-to-run prototype with:
- React.js frontend (Vite)
- FastAPI + Python backend
- SQLite local database (auto-migrating)
- Scikit-learn ML waiting-time prediction
- WebSocket live queue updates
- Separate Patient, Doctor and Admin dashboards
- Role-based login and signup
- Digital token generation with priority queuing

---

## Roles

### Patient
- Sign up / login as Patient
- Generate a digital token with department and priority
- View token number, queue position and predicted wait time
- Track the live queue in real time

### Doctor
- Sign up / login as Doctor
- Select department
- View live patient queue
- Call next patient
- Mark consultation as complete

### Admin
- Sign up / login as Admin
- View hospital-wide statistics (total, waiting, completed, avg wait)
- Add patients directly — name, age, phone, disease/complaint, department, priority
- Auto-generates a queue token on patient registration
- View full patient records table with token, priority and status
- Monitor live queues per department
- View department load with visual bar chart
- Reset demo queue
- Role-based breadcrumb navigation (e.g. ADMIN PORTAL › Dashboard)

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

---

## Database

All data is stored in `backend/chataka.db` (SQLite). The backend auto-migrates the schema on startup — no manual migration needed when pulling updates.

Tables:
- `users` — accounts for all roles
- `patients` — patient records (name, age, phone, disease, department)
- `tokens` — queue tokens with status (`WAITING` → `CALLED` → `COMPLETED`)

---

## First Login

No fixed demo credentials. Click **Sign Up**, choose a role, create an account, then log in with that email and password. The role selected at signup controls which dashboard is shown.

---

## Important

This is a software prototype/demo, not a clinical decision-making system. Do not use it for real patient care without appropriate validation, security, privacy review, and hospital integration.
