# ChatakA – Role-Based AI Hospital Queue Prototype

A ready-to-run prototype for CHATaka with:
- React.js frontend
- FastAPI + Python backend
- SQLite local database
- Scikit-learn waiting-time prediction
- WebSocket live queue updates
- Separate Patient, Doctor and Admin dashboards
- Login and signup with role-based access
- Shared dark-purple CHATaka theme across the whole UI

## Roles

### Patient
- Sign up / login as Patient
- Generate a digital token
- Choose department and priority
- See token number, queue position and predicted waiting time
- Track the live queue

### Doctor
- Sign up / login as Doctor
- Select department
- See live patient queue
- Call next patient
- Complete consultation

### Admin
- Sign up / login as Admin
- View hospital-wide statistics
- View department load
- Monitor live queues
- Reset demo queue

## Requirements
- Python 3.10+
- Node.js 18+
- npm

## Run Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend: http://127.0.0.1:8000
API docs: http://127.0.0.1:8000/docs

## Run Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL shown by Vite, normally:
http://localhost:5173

## First Login

There are no fixed demo passwords. Click **Sign Up**, choose a role, create an account, then log in with that email and password.

The selected role controls which dashboard is displayed.

## Important

This is a software prototype/demo, not a clinical decision-making system. Do not use it for real patient care without appropriate validation, security, privacy, clinical review and hospital integration.
