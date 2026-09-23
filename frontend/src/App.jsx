import React, { useEffect, useState } from "react";
import Auth from "./Auth";

const API = "http://127.0.0.1:8000";

const departments = [
  "General Medicine",
  "General Surgery",
  "ENT",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Dermatology",
  "Ophthalmology",
  "Pediatrics",
  "Gynecology",
  "Obstetrics",
  "Urology",
  "Gastroenterology",
  "Pulmonology",
  "Nephrology",
  "Endocrinology",
  "Psychiatry",
  "Dentistry",
  "Oncology",
  "Emergency",
];

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("chataka_user")) || null;
    } catch {
      return null;
    }
  });

  const login = (loggedUser) => {
    localStorage.setItem("chataka_user", JSON.stringify(loggedUser));
    setUser(loggedUser);
  };

  const logout = () => {
    localStorage.removeItem("chataka_user");
    setUser(null);
  };

  if (!user) {
    return <Auth onLogin={login} />;
  }

  if (user.role === "patient") {
    return <PatientDashboard user={user} onLogout={logout} />;
  }

  if (user.role === "doctor") {
    return <DoctorDashboard user={user} onLogout={logout} />;
  }

  return <AdminDashboard user={user} onLogout={logout} />;
}


/* =========================================================
   COMMON LAYOUT
========================================================= */

function Layout({
  user,
  onLogout,
  title,
  subtitle,
  children,
  active,
  onNavigate,
}) {
  const navItems = {
    patient: [
      "Dashboard",
      "My Token",
      "Live Queue",
      "Profile",
    ],

    doctor: [
      "Dashboard",
    ],

    admin: [
      "Dashboard",
      "Add Patient",
      "Doctors",
      "Queue Management",
      "Settings",
    ],
  };

  return (
    <div className="dashboard-shell">

      <aside className="sidebar">

        <div className="sidebar-brand">
          <img src="/logo.png" alt="ChatakA" className="sidebar-logo" />

          <div>
            <div className="sidebar-brand-name">
              ChatakA
            </div>

            <div className="sidebar-brand-sub">
              SMART QUEUE MANAGEMENT SYSTEM
            </div>
          </div>
        </div>

        <div className="sidebar-role">
          <span className="role-dot" />
          {user.role.toUpperCase()} PORTAL
        </div>

        <nav className="sidebar-nav">

          {navItems[user.role].map((item) => (

            <button
              key={item}
              type="button"
              className={`sidebar-item ${
                active === item ? "active" : ""
              }`}
              onClick={() => onNavigate(item)}
            >
              <span className="sidebar-icon">
                {iconFor(item)}
              </span>

              {item}
            </button>

          ))}

        </nav>

        <button
          className="sidebar-logout"
          onClick={onLogout}
        >
          <span>↪</span>
          Logout
        </button>

      </aside>

      <main className="dashboard-main">

        <header className="dashboard-topbar">

          <div>

            <div className="topbar-breadcrumb">
              <span className="breadcrumb-role">{user.role.toUpperCase()} PORTAL</span>
              <span className="breadcrumb-sep">›</span>
              <span className="breadcrumb-page">{active}</span>
            </div>

            <h1>{title}</h1>

            <p>{subtitle}</p>

          </div>

          <div className="user-chip">

            <div className="user-avatar">
              {user.name?.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>

          </div>

        </header>

        <div className="dashboard-content">
          {children}
        </div>

      </main>

    </div>
  );
}


/* =========================================================
   PATIENT DASHBOARD
========================================================= */

function PatientDashboard({ user, onLogout }) {

  const [active, setActive] = useState("Dashboard");

  const [department, setDepartment] =
    useState("General Medicine");

  const [queue, setQueue] = useState([]);

  const [tokenInfo, setTokenInfo] =
    useState(null);

  const [patient, setPatient] =
    useState(null);

  const [message, setMessage] =
    useState("");

  const [form, setForm] = useState({
    age: 25,
    priority: "NORMAL",
  });


  const loadPatientData = async () => {

    try {

      const url = user.patient_id
        ? `${API}/patient/by-patient-id/${user.patient_id}`
        : `${API}/patient/token/${user.id}`;

      const res = await fetch(url);

      const data = await res.json();

      if (data.patient) {
        setPatient(data.patient);
      }

      if (data.token) {
        setTokenInfo(data.token);
        setDepartment(data.token.department);
      }

    } catch (error) {
      console.error(error);
    }
  };


  const loadQueue = async (
    dept = department
  ) => {

    try {

      const res = await fetch(
        `${API}/queue/${encodeURIComponent(dept)}`
      );

      const data = await res.json();

      setQueue(data.queue || []);

    } catch (error) {
      console.error(error);
    }
  };


  useEffect(() => {

    loadPatientData();
    loadQueue();

    const ws = new WebSocket(
      "ws://127.0.0.1:8000/ws/queue"
    );

    ws.onmessage = (event) => {

      const data = JSON.parse(event.data);

      if (
        data.type === "QUEUE_UPDATE" &&
        data.department === department
      ) {

        setQueue(data.queue || []);

        loadPatientData();
      }

      if (data.type === "RESET") {

        setQueue([]);
        setTokenInfo(null);
      }

    };

    return () => ws.close();

  }, [department]);


  const generateToken = async (e) => {

    e.preventDefault();

    try {

      let patientId = patient?.id || user.patient_id;

      if (!patientId) {

        const userRes = await fetch(
          `${API}/patients`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              user_id: user.id,
              name: user.name,
              age: Number(form.age),
              phone: user.phone || "",
              department,
            }),
          }
        );

        const patientData =
          await userRes.json();

        if (!userRes.ok) {
          throw new Error(
            patientData.detail ||
            "Unable to create patient"
          );
        }

        patientId = patientData.id;

        setPatient(patientData);
      }

      const tokenRes = await fetch(
        `${API}/patients/${patientId}/token?priority=${form.priority}`,
        {
          method: "POST",
        }
      );

      const token =
        await tokenRes.json();

      if (!tokenRes.ok) {
        throw new Error(
          token.detail ||
          "Unable to generate token"
        );
      }

      setTokenInfo(token);

      setMessage(
        "Your digital token has been generated."
      );

      await loadQueue(department);

    } catch (error) {

      setMessage(
        error.message ||
        "Unable to generate token."
      );

    }
  };


  /* PATIENT - MY TOKEN */

  if (active === "My Token") {

    return (
      <Layout
        user={user}
        onLogout={onLogout}
        active={active}
        onNavigate={setActive}
        title="My Token"
        subtitle="Your live consultation status."
      >

        <div className="dash-card token-display">

          {tokenInfo ? (

            <>
              <div className="card-label">
                CURRENT TOKEN
              </div>

              <div className="big-token">
                {tokenInfo.token_number}
              </div>

              <div className="token-status">
                <span />
                {tokenInfo.status}
              </div>

              <div className="mini-stats">

                <div>
                  <span>Queue Position</span>
                  <strong>
                    #{tokenInfo.position || "—"}
                  </strong>
                </div>

                <div>
                  <span>Estimated Wait</span>
                  <strong>
                    {tokenInfo.estimated_wait} min
                  </strong>
                </div>

                <div>
                  <span>Priority</span>
                  <strong>
                    {tokenInfo.priority}
                  </strong>
                </div>

              </div>
            </>

          ) : (

            <div className="empty-dark">
              No active token.
              <br />
              Generate a token from the Dashboard.
            </div>

          )}

        </div>

      </Layout>
    );
  }


  /* PATIENT - LIVE QUEUE */

  if (active === "Live Queue") {

    return (
      <Layout
        user={user}
        onLogout={onLogout}
        active={active}
        onNavigate={setActive}
        title="Live Queue"
        subtitle="Monitor your department queue in real time."
      >

        <QueueTableDark
          queue={queue}
          title={`${department} — Live Queue`}
        />

      </Layout>
    );
  }


  /* PATIENT - PROFILE */

  if (active === "Profile") {

    return (
      <Layout
        user={user}
        onLogout={onLogout}
        active={active}
        onNavigate={setActive}
        title="My Profile"
        subtitle="View your ChatakA account information."
      >

        <ProfileCard
          user={user}
          patient={patient}
        />

      </Layout>
    );
  }


  /* PATIENT - DASHBOARD */

  return (
    <Layout
      user={user}
      onLogout={onLogout}
      active="Dashboard"
      onNavigate={setActive}
      title={`Welcome, ${user.name.split(" ")[0]}`}
      subtitle="Track your token and monitor the live queue."
    >

      {message && (
        <div className="dashboard-message">
          ✓ {message}
        </div>
      )}

      <div className="dashboard-grid">


        <div className="dash-card token-display">

          <div className="card-label">
            CURRENT TOKEN
          </div>

          {tokenInfo ? (

            <>
              <div className="big-token">
                {tokenInfo.token_number}
              </div>

              <div className="token-status">
                <span />
                {tokenInfo.status}
              </div>

              <div className="mini-stats">

                <div>
                  <span>Queue Position</span>
                  <strong>
                    #{tokenInfo.position || "—"}
                  </strong>
                </div>

                <div>
                  <span>Estimated Wait</span>
                  <strong>
                    {tokenInfo.estimated_wait} min
                  </strong>
                </div>

                <div>
                  <span>Priority</span>
                  <strong>
                    {tokenInfo.priority}
                  </strong>
                </div>

              </div>
            </>

          ) : (

            <div className="empty-dark">
              No active token yet.
              <br />
              Generate one to start tracking.
            </div>

          )}

        </div>

      </div>


      <QueueTableDark
        queue={queue}
        title={`${department} — Live Queue`}
      />

    </Layout>
  );
}


/* =========================================================
   DOCTOR DASHBOARD
========================================================= */

function DoctorDashboard({ user, onLogout }) {

  const [active, setActive] =
    useState("Dashboard");

  const [department, setDepartment] =
    useState(user?.department || "");

  const [queue, setQueue] =
    useState([]);

  const [completedPatients, setCompletedPatients] =
    useState([]);

  const [consultationView, setConsultationView] =
    useState("waiting");

  const [message, setMessage] =
    useState("");


  const loadQueue = async () => {

    try {

      const res = await fetch(
        `${API}/queue/${encodeURIComponent(
          department
        )}`
      );

      const data = await res.json();

      setQueue(data.queue || []);
      setCompletedPatients(data.completed || []);

    } catch (error) {
      console.error(error);
    }
  };


  useEffect(() => {

    loadQueue();

    const ws = new WebSocket(
      "ws://127.0.0.1:8000/ws/queue"
    );

    ws.onmessage = (event) => {

      const data = JSON.parse(event.data);

      if (
        data.type === "QUEUE_UPDATE" &&
        data.department === department
      ) {
        setQueue(data.queue || []);
        setCompletedPatients(data.completed || []);
      }

      if (data.type === "RESET") {
        setQueue([]);
        setCompletedPatients([]);
      }

    };

    return () => ws.close();

  }, [department]);


  const callNext = async () => {

    try {

      const res = await fetch(
        `${API}/doctor/call-next/${encodeURIComponent(
          department
        )}`,
        {
          method: "POST",
        }
      );

      const data = await res.json();

      setMessage(
        data.token_number
          ? `Now calling ${data.token_number} — ${data.patient_name}`
          : data.message
      );

      await loadQueue();

    } catch {
      setMessage(
        "Unable to call next patient."
      );
    }

  };


  const complete = async (token) => {

    try {

      await fetch(
        `${API}/doctor/complete/${token}`,
        {
          method: "POST",
        }
      );

      setMessage(
        `${token} consultation completed.`
      );

      await loadQueue();

    } catch {
      setMessage(
        "Unable to complete consultation."
      );
    }

  };


  return (
    <Layout
      user={user}
      onLogout={onLogout}
      active="Dashboard"
      onNavigate={setActive}
      title="Doctor Dashboard"
      subtitle=""
    >

      {message && (
        <div className="dashboard-message">
          ✓ {message}
        </div>
      )}

      <div className="doctor-toolbar">

        <div>

          <div className="card-label">
            DEPARTMENT
          </div>

          <div
            style={{
              minWidth: 220,
              padding: "12px 14px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#f3f6fb",
              fontWeight: 700,
            }}
          >
            {department || " "}
          </div>

        </div>

        <button
          className="purple-button large"
          onClick={callNext}
        >
          Call Next Patient →
        </button>

      </div>

      <div className="stats-grid">

        <StatDark
          label="Waiting Patients"
          value={queue.length}
          icon="◷"
        />

        <StatDark
          label="Priority Cases"
          value={
            queue.filter(
              (x) => x.priority !== "NORMAL"
            ).length
          }
          icon="!"
        />

        <StatDark
          label="Avg Consultation"
          value="10 min"
          icon="◒"
        />

        <StatDark
          label="Completed Consultation"
          value={completedPatients.length}
          icon="✓"
        />

      </div>

      <div className="doctor-toolbar" style={{ marginTop: 16 }}>

        <div>

          <div className="card-label">
            FILTER
          </div>

          <select
            value={consultationView}
            onChange={(e) =>
              setConsultationView(e.target.value)
            }
          >
            <option value="waiting">
              Waiting Patients
            </option>
            <option value="completed">
              Completed Consultation
            </option>
          </select>

        </div>

      </div>

      {consultationView === "completed" ? (
        <QueueTableDark
          queue={completedPatients}
          title="Completed Consultation"
          emptyMessage="No completed consultations for this department yet."
          showCompletedTime
        />
      ) : (
        <QueueTableDark
          queue={queue}
          title="Patients Waiting"
          action={complete}
          emptyMessage="No patients currently waiting."
        />
      )}

    </Layout>
  );
}


/* =========================================================
   ADMIN DASHBOARD
========================================================= */

function AdminDashboard({ user, onLogout }) {

  const [active, setActive] =
    useState("Dashboard");

  const [dashboard, setDashboard] =
    useState(null);

  const [department, setDepartment] =
    useState("General Medicine");

  const [queue, setQueue] =
    useState([]);

  const [selectedDoctor, setSelectedDoctor] =
  useState("");

const [selectedPriority, setSelectedPriority] =
  useState("");

  const [message, setMessage] =
    useState("");


  const [patientList, setPatientList] = useState([]);
  const [doctorList, setDoctorList] = useState([]);

const [doctorForm, setDoctorForm] = useState({
    name: "",
    age: "",
    gender: "",
    phone: "",
    email: "",
    specialization: "",
    department: "General Medicine",
    qualification: "",
    experience: "",
    license_number: "",
    consultation_fee: "",
    status: "ACTIVE",
});

const [doctorMsg, setDoctorMsg] = useState("");
const [doctorError, setDoctorError] = useState("");
  const [addForm, setAddForm] = useState({
    name: "", age: "", dob: "", gender: "",
    phone: "", email: "", address: "",
    emergency_contact: "", blood_group: "",
    disease: "", department: "General Medicine", doctor_id: "", priority: "NORMAL",
  });
  const [addMsg, setAddMsg] = useState("");
  const [addError, setAddError] = useState("");

  const loadPatients = async () => {
    try {
      const res = await fetch(`${API}/admin/patients`);
      const data = await res.json();
      setPatientList(data.patients || []);
    } catch (e) {
      console.error(e);
    }
  };

  const submitAddPatient = async (e) => {
    e.preventDefault();
    setAddMsg("");
    setAddError("");
    try {
      const patRes = await fetch(`${API}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name.trim(),
          age: addForm.age ? Number(addForm.age) : null,
          dob: addForm.dob.trim() || null,
          gender: addForm.gender || null,
          phone: addForm.phone.trim() || null,
          email: addForm.email.trim() || null,
          address: addForm.address.trim() || null,
          emergency_contact: addForm.emergency_contact.trim() || null,
          blood_group: addForm.blood_group || null,
          disease: addForm.disease.trim() || null,
department: addForm.department,
doctor_id: addForm.doctor_id
  ? Number(addForm.doctor_id)
  : null,
        }),
      
      });
      const patData = await patRes.json();
      if (!patRes.ok) throw new Error(patData.detail || "Failed to add patient");

     const tokRes = await fetch(
  `${API}/patients/${patData.id}/token?priority=${addForm.priority}&doctor_id=${addForm.doctor_id}`,
  { method: "POST" }
);
      const tokData = await tokRes.json();
      if (!tokRes.ok) throw new Error(tokData.detail || "Failed to generate token");

      setAddMsg(`Patient added. Token: ${tokData.token_number}`);
      setAddForm({
  name: "",
  age: "",
  dob: "",
  gender: "",
  phone: "",
  email: "",
  address: "",
  emergency_contact: "",
  blood_group: "",
  disease: "",
  department: "General Medicine",
  doctor_id: "",
  priority: "NORMAL",
});
      await loadPatients();
      await load();
    } catch (err) {
      setAddError(err.message);
    }
  };
    const loadDoctors = async () => {
    try {
      const res = await fetch(`${API}/admin/doctors`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to load doctors");
      }

      setDoctorList(data);
    } catch (err) {
      console.error(err);
    }
  };


  const submitAddDoctor = async (e) => {
    e.preventDefault();

    setDoctorMsg("");
    setDoctorError("");

    try {
      const res = await fetch(`${API}/doctors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: doctorForm.name.trim(),
          age: doctorForm.age ? Number(doctorForm.age) : null,
          gender: doctorForm.gender || null,
          phone: doctorForm.phone.trim() || null,
          email: doctorForm.email.trim() || null,
          specialization: doctorForm.specialization.trim(),
          department: doctorForm.department,
          qualification: doctorForm.qualification.trim() || null,
          experience: doctorForm.experience
            ? Number(doctorForm.experience)
            : null,
          license_number: doctorForm.license_number.trim() || null,
          consultation_fee: doctorForm.consultation_fee
            ? Number(doctorForm.consultation_fee)
            : null,
          status: doctorForm.status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to add doctor");
      }

      setDoctorMsg(
        `Doctor ${data.name} added successfully.`
      );

      setDoctorForm({
        name: "",
        age: "",
        gender: "",
        phone: "",
        email: "",
        specialization: "",
        department: "General Medicine",
        qualification: "",
        experience: "",
        license_number: "",
        consultation_fee: "",
        status: "ACTIVE",
      });

      await loadDoctors();

    } catch (err) {
      setDoctorError(err.message);
    }
  };


 

  const load = async () => {

    try {

      const [dashRes, queueRes] =
        await Promise.all([

          fetch(`${API}/dashboard`),

         fetch(
  `${API}/queue/${encodeURIComponent(
    department === "ALL" ? "All" : department
  )}`
),

        ]);

      setDashboard(
        await dashRes.json()
      );

      setQueue(
        (await queueRes.json()).queue || []
      );

    } catch (error) {
      console.error(error);
    }

  };


  useEffect(() => {

    load();
    loadPatients();
    loadDoctors();

    const ws = new WebSocket(
      "ws://127.0.0.1:8000/ws/queue"
    );

    ws.onmessage = () => load();

    return () => ws.close();

  }, [department]);


  const reset = async () => {

    await fetch(
      `${API}/demo/reset`,
      {
        method: "POST",
      }
    );

    setMessage(
      "Demo queue data cleared."
    );

    await load();

  };


  /* ADMIN - ADD PATIENT */

  if (active === "Add Patient") {
    return (
      <Layout
        user={user}
        onLogout={onLogout}
        active={active}
        onNavigate={(item) => { setActive(item); if (item === "Patients") loadPatients(); }}
        title="Add Patient"
        subtitle="Register a new patient and generate a queue token."
      >
        <div className="dashboard-grid">

          <div className="dash-card">
            <div className="card-label">PATIENT REGISTRATION</div>
            <h3>New Patient</h3>
            <p className="form-login-hint">⚠ Email and Date of Birth are required — patients use these to log in.</p>

            {addMsg && <div className="dashboard-message">✓ {addMsg}</div>}
            {addError && <div className="auth-error">{addError}</div>}

            <form onSubmit={submitAddPatient}>
              <div className="add-form-grid">

                <div className="input-group">
                  <label>Full Name *</label>
                  <input
                    required
                    placeholder="e.g. John Smith"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Gender *</label>
                  <select
                    required
                    value={addForm.gender}
                    onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Age</label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    placeholder="e.g. 35"
                    value={addForm.age}
                    onChange={(e) => setAddForm({ ...addForm, age: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={addForm.dob}
                    onChange={(e) => setAddForm({ ...addForm, dob: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Phone Number *</label>
                  <input
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. patient@email.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  />
                </div>

                <div className="input-group add-form-full">
                  <label>Address</label>
                  <input
                    placeholder="e.g. 12 Main Street, Chennai"
                    value={addForm.address}
                    onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Emergency Contact</label>
                  <input
                    placeholder="Name & phone number"
                    value={addForm.emergency_contact}
                    onChange={(e) => setAddForm({ ...addForm, emergency_contact: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Blood Group</label>
                  <select
                    value={addForm.blood_group}
                    onChange={(e) => setAddForm({ ...addForm, blood_group: e.target.value })}
                  >
                    <option value="">Unknown / Not sure</option>
                    <option>A+</option>
                    <option>A-</option>
                    <option>B+</option>
                    <option>B-</option>
                    <option>AB+</option>
                    <option>AB-</option>
                    <option>O+</option>
                    <option>O-</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Disease / Complaint *</label>
                  <input
                    required
                    placeholder="e.g. Fever, Chest pain"
                    value={addForm.disease}
                    onChange={(e) => setAddForm({ ...addForm, disease: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Department *</label>
                  <select
                    value={addForm.department}
                    onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                  >
                    {departments.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>

                <div className="input-group">
  <label>Doctor *</label>
  <select
    required
    value={addForm.doctor_id}
    onChange={(e) =>
      setAddForm({
        ...addForm,
        doctor_id: e.target.value,
      })
    }
  >
    <option value="">Select doctor</option>

    {doctorList
      .filter((doctor) => doctor.department === addForm.department)
      .map((doctor) => (
        <option key={doctor.id} value={doctor.id}>
          {doctor.name} — {doctor.specialization}
        </option>
      ))}
  </select>
</div>

                <div className="input-group">
                  <label>Priority *</label>
                  <select
                    value={addForm.priority}
                    onChange={(e) => setAddForm({ ...addForm, priority: e.target.value })}
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent</option>
                    <option value="EMERGENCY">Emergency</option>
                  </select>
                </div>

              </div>

              <button type="submit" className="purple-button" style={{ marginTop: 18 }}>
                Register Patient &amp; Generate Token →
              </button>
            </form>
          </div>

          <div className="dash-card">
            <div className="card-label">RECENT REGISTRATIONS</div>
            <h3>Last added patients</h3>
            {patientList.length === 0 ? (
              <div className="empty-dark">No patients registered yet.</div>
            ) : (
              <div className="dark-table-wrap">
                <table className="dark-table">
                  <thead>
                    <tr>
                      <th>NAME</th>
                      <th>AGE</th>
                      <th>DISEASE</th>
                      <th>DEPT</th>
                      <th>TOKEN</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientList.slice(0, 8).map((p) => (
                      <tr key={p.id}>
                        <td><strong>{p.name}</strong></td>
                        <td>{p.age}</td>
                        <td>{p.disease || "—"}</td>
                        <td>{p.department}</td>
                        <td><strong>{p.token_number}</strong></td>
                        <td>
                          <span className={`dark-badge ${(p.status || "").toLowerCase()}`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </Layout>
    );
  }


  /* ADMIN - PATIENTS */

  if (active === "Patients") {
    return (
      <Layout
        user={user}
        onLogout={onLogout}
        active={active}
        onNavigate={setActive}
        title="Patients"
        subtitle="All registered patients."
      >
        <div className="stats-grid">
          <StatDark label="Total Patients" value={dashboard?.total_patients ?? 0} icon="♙" />
          <StatDark label="Waiting" value={dashboard?.waiting ?? 0} icon="◷" />
          <StatDark label="Completed" value={dashboard?.completed ?? 0} icon="✓" />
        </div>

        <div className="dash-card">
          <div className="card-heading">
            <div>
              <div className="card-label">ALL PATIENTS</div>
              <h3>Patient Records</h3>
            </div>
            <button className="purple-button large" onClick={() => setActive("Add Patient")}>
              + Add Patient
            </button>
          </div>

          {patientList.length === 0 ? (
            <div className="empty-dark">No patients registered yet.</div>
          ) : (
            <div className="dark-table-wrap">
              <table className="dark-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>NAME</th>
                    <th>AGE</th>
                    <th>DISEASE</th>
                    <th>DEPARTMENT</th>
                    <th>PHONE</th>
                    <th>TOKEN</th>
                    <th>PRIORITY</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {patientList.map((p, i) => (
                    <tr key={p.id}>
                      <td>{i + 1}</td>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.age}</td>
                      <td>{p.disease || "—"}</td>
                      <td>{p.department}</td>
                      <td>{p.phone || "—"}</td>
                      <td><strong>{p.token_number}</strong></td>
                      <td>
                        <span className={`dark-badge ${(p.priority || "").toLowerCase()}`}>
                          {p.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`dark-badge ${(p.status || "").toLowerCase()}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Layout>
    );
  }


  /* ADMIN - DOCTORS */

  if (active === "Doctors") {

  return (
    <Layout
      user={user}
      onLogout={onLogout}
      active={active}
      onNavigate={setActive}
      title="Doctors"
      subtitle="Register and manage hospital doctors."
    >

      <div className="dashboard-grid">

        {/* DOCTOR REGISTRATION */}

        <div className="dash-card">

          <div className="card-label">
            DOCTOR REGISTRATION
          </div>


          {doctorMsg && (
            <div className="dashboard-message">
              ✓ {doctorMsg}
            </div>
          )}

          {doctorError && (
            <div className="auth-error">
              {doctorError}
            </div>
          )}

          <form onSubmit={submitAddDoctor}>

            <div className="add-form-grid">

              <div className="input-group">
                <label>Full Name *</label>
                <input
                  required
                  placeholder="e.g. Dr. Arun Kumar"
                  value={doctorForm.name}
                  onChange={(e) =>
                    setDoctorForm({
                      ...doctorForm,
                      name: e.target.value
                    })
                  }
                />
              </div>


              <div className="input-group">
                <label>Gender</label>
                <select
                  value={doctorForm.gender}
                  onChange={(e) =>
                    setDoctorForm({
                      ...doctorForm,
                      gender: e.target.value
                    })
                  }
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>


              <div className="input-group">
                <label>Age</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  placeholder="e.g. 38"
                  value={doctorForm.age}
                  onChange={(e) =>
                    setDoctorForm({
                      ...doctorForm,
                      age: e.target.value
                    })
                  }
                />
              </div>


              <div className="input-group">
                <label>Phone Number</label>
                <input
                  placeholder="e.g. +91 98765 43210"
                  value={doctorForm.phone}
                  onChange={(e) =>
                    setDoctorForm({
                      ...doctorForm,
                      phone: e.target.value
                    })
                  }
                />
              </div>


              <div className="input-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. doctor@email.com"
                  value={doctorForm.email}
                  onChange={(e) =>
                    setDoctorForm({
                      ...doctorForm,
                      email: e.target.value
                    })
                  }
                />
              </div>


              <div className="input-group">
                <label>Specialization *</label>
                <input
                  required
                  placeholder="e.g. Cardiology"
                  value={doctorForm.specialization}
                  onChange={(e) =>
                    setDoctorForm({
                      ...doctorForm,
                      specialization: e.target.value
                    })
                  }
                />
              </div>


              <div className="input-group">
                <label>Department *</label>
                <select
                  required
                  value={doctorForm.department}
                  onChange={(e) =>
                    setDoctorForm({
                      ...doctorForm,
                      department: e.target.value
                    })
                  }
                >
                  <option value="General Medicine">
                    General Medicine
                  </option>
                  <option value="Cardiology">
                    Cardiology
                  </option>
                  <option value="Neurology">
                    Neurology
                  </option>
                  <option value="Orthopedics">
                    Orthopedics
                  </option>
                  <option value="Pediatrics">
                    Pediatrics
                  </option>
                  <option value="Dermatology">
                    Dermatology
                  </option>
                  <option value="ENT">
                    ENT
                  </option>
                  <option value="Ophthalmology">
                    Ophthalmology
                  </option>
                  <option value="Gynecology">
                    Gynecology
                  </option>
                  <option value="Emergency">
                    Emergency
                  </option>
                </select>
              </div>


              <div className="input-group">
                <label>Qualification</label>
                <input
                  placeholder="e.g. MBBS, MD"
                  value={doctorForm.qualification}
                  onChange={(e) =>
                    setDoctorForm({
                      ...doctorForm,
                      qualification: e.target.value
                    })
                  }
                />
              </div>


              <div className="input-group">
                <label>Experience</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Years of experience"
                  value={doctorForm.experience}
                  onChange={(e) =>
                    setDoctorForm({
                      ...doctorForm,
                      experience: e.target.value
                    })
                  }
                />
              </div>


              <div className="input-group">
                <label>License Number</label>
                <input
                  placeholder="e.g. TN-MED-1001"
                  value={doctorForm.license_number}
                  onChange={(e) =>
                    setDoctorForm({
                      ...doctorForm,
                      license_number: e.target.value
                    })
                  }
                />
              </div>


              <div className="input-group">
                <label>Consultation Fee</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 800"
                  value={doctorForm.consultation_fee}
                  onChange={(e) =>
                    setDoctorForm({
                      ...doctorForm,
                      consultation_fee: e.target.value
                    })
                  }
                />
              </div>


              <div className="input-group">
                <label>Status</label>
                <select
                  value={doctorForm.status}
                  onChange={(e) =>
                    setDoctorForm({
                      ...doctorForm,
                      status: e.target.value
                    })
                  }
                >
                  <option value="ACTIVE">
                    Active
                  </option>

                  <option value="INACTIVE">
                    Inactive
                  </option>
                </select>
              </div>

            </div>


            <button
              type="submit"
              className="purple-button"
              style={{ marginTop: 18 }}
            >
              Register Doctor →
            </button>

          </form>

        </div>


        {/* REGISTERED DOCTORS */}

        <div className="dash-card">

          <div className="card-label">
            REGISTERED DOCTORS
          </div>

          <h3>
            Doctor Directory
          </h3>

          {doctorList.length === 0 ? (

            <div className="empty-dark">
              No doctors registered yet.
            </div>

          ) : (

            <div className="dark-table-wrap">

              <table className="dark-table">

                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>SPECIALIZATION</th>
                    <th>DEPT</th>
                    <th>QUALIFICATION</th>
                    <th>EXPERIENCE</th>
                    <th>PHONE</th>
                    <th>FEE</th>
                    <th>STATUS</th>
                  </tr>
                </thead>

                <tbody>

                  {doctorList.map((doctor) => (

                    <tr key={doctor.id}>

                      <td>
                        <strong>
                          {doctor.name}
                        </strong>
                      </td>

                      <td>
                        {doctor.specialization}
                      </td>

                      <td>
                        {doctor.department}
                      </td>

                      <td>
                        {doctor.qualification || "—"}
                      </td>

                      <td>
                        {doctor.experience
                          ? `${doctor.experience} yrs`
                          : "—"}
                      </td>

                      <td>
                        {doctor.phone || "—"}
                      </td>

                      <td>
                        {doctor.consultation_fee
                          ? `₹${doctor.consultation_fee}`
                          : "—"}
                      </td>

                      <td>
                        <span
                          className={`dark-badge ${
                            (doctor.status || "").toLowerCase()
                          }`}
                        >
                          {doctor.status}
                        </span>
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>

    </Layout>
  );
}

  /* ADMIN - QUEUE MANAGEMENT */

  if (active === "Queue Management") {

    return (
      <Layout
        user={user}
        onLogout={onLogout}
        active={active}
        onNavigate={setActive}
        title="Queue Management"
        subtitle="Monitor hospital queues by department."
      >

        <div className="doctor-toolbar">

  {/* DEPARTMENT */}
  <div>
    <div className="card-label">
      DEPARTMENT
    </div>

    <select
  value={department}
  onChange={(e) => {
    setDepartment(e.target.value);
    setSelectedDoctor("");
  }}
>
  <option value="ALL">
    All Departments
  </option>

  {departments.map((d) => (
    <option key={d} value={d}>
      {d}
    </option>
  ))}
</select>
  </div>


  {/* DOCTOR */}
  <div>
    <div className="card-label">
      DOCTOR
    </div>

    <select
      value={selectedDoctor}
      onChange={(e) =>
        setSelectedDoctor(e.target.value)
      }
    >
      <option value="">
        All Doctors
      </option>

      {doctorList
  .filter(
    (doctor) =>
      department === "ALL" ||
      doctor.department === department
  )
        .map((doctor) => (
          <option
            key={doctor.id}
            value={doctor.id}
          >
            {doctor.name}
          </option>
        ))}
    </select>
  </div>


  {/* PRIORITY */}
  <div>
    <div className="card-label">
      PRIORITY
    </div>

    <select
      value={selectedPriority}
      onChange={(e) =>
        setSelectedPriority(e.target.value)
      }
    >
      <option value="">
        All Priorities
      </option>

      <option value="NORMAL">
        Normal
      </option>

      <option value="URGENT">
        Urgent
      </option>

      <option value="EMERGENCY">
        Emergency
      </option>
    </select>
  </div>

</div>

        <QueueTableDark
  queue={queue.filter((item) => {
    const doctorMatch =
      !selectedDoctor ||
      String(item.doctor_id) === String(selectedDoctor);

    const priorityMatch =
      !selectedPriority ||
      item.priority === selectedPriority;

    return doctorMatch && priorityMatch;
  })}
  title={`${department === "ALL" ? "All Departments" : department} Queue`}
/>

      </Layout>
    );
  }


  /* ADMIN - ANALYTICS */

  if (active === "Analytics") {

    return (
      <Layout
        user={user}
        onLogout={onLogout}
        active={active}
        onNavigate={setActive}
        title="Analytics"
        subtitle="Hospital queue performance analytics."
      >

        <div className="stats-grid four-stats">

          <StatDark
            label="Total Patients"
            value={
              dashboard?.total_patients ?? 0
            }
            icon="♙"
          />

          <StatDark
            label="Waiting"
            value={
              dashboard?.waiting ?? 0
            }
            icon="◷"
          />

          <StatDark
            label="Completed"
            value={
              dashboard?.completed ?? 0
            }
            icon="✓"
          />

          <StatDark
            label="Average Wait"
            value={`${dashboard?.average_wait ?? 0} min`}
            icon="⌁"
          />

        </div>


        <div className="dash-card">

          <div className="card-label">
            DEPARTMENT LOAD
          </div>

          <h3>
            Current waiting patients
          </h3>

          <div className="dept-load-scroll">
          {dashboard &&
            Object.entries(dashboard.departments)
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => (

              <div
                className="dark-bar-row"
                key={name}
              >

                <div>
                  <span>{name}</span>
                  <strong>{count}</strong>
                </div>

                <div className="dark-bar">
                  <i
                    style={{
                      width: `${Math.min(100, count * 12)}%`,
                    }}
                  />
                </div>

              </div>

            ))}
          </div>

        </div>

      </Layout>
    );
  }


  /* ADMIN - SETTINGS */

  if (active === "Settings") {

    return (
      <Layout
        user={user}
        onLogout={onLogout}
        active={active}
        onNavigate={setActive}
        title="Settings"
        subtitle="Manage your ChatakA admin session."
      >

        
        <div className="dash-card">

          <div className="card-label">
            ADMIN PROFILE
          </div>

          <ProfileCard user={user} />

        </div>

      </Layout>
    );
  }


  /* ADMIN - DASHBOARD */

  return (
    <Layout
      user={user}
      onLogout={onLogout}
      active="Dashboard"
      onNavigate={setActive}
      title="Hospital Operations"
      subtitle="Real-time overview of queue performance and hospital activity."
    >

      {message && (
        <div className="dashboard-message">
          ✓ {message}
        </div>
      )}

      <div className="stats-grid four-stats">

        <StatDark
          label="Total Patients"
          value={
            dashboard?.total_patients ?? 0
          }
          icon="♙"
        />

        <StatDark
          label="Currently Waiting"
          value={
            dashboard?.waiting ?? 0
          }
          icon="◷"
        />

        <StatDark
          label="Completed"
          value={
            dashboard?.completed ?? 0
          }
          icon="✓"
        />

        <StatDark
          label="Average Wait"
          value={`${dashboard?.average_wait ?? 0} min`}
          icon="⌁"
        />

      </div>


      <div className="dashboard-grid two-columns">

        <div className="dash-card">

          <div className="section-heading-inline">

            <div>

              <div className="card-label">
                LIVE QUEUE
              </div>

              <h3>{department}</h3>

            </div>

            <select
              value={department}
              onChange={(e) =>
                setDepartment(e.target.value)
              }
            >

              {departments.map((d) => (
                <option key={d}>
                  {d}
                </option>
              ))}

            </select>

          </div>

          <QueueTableDark
            queue={queue}
            compact
          />

        </div>


        <div className="dash-card">

          <div className="card-label">
            DEPARTMENT LOAD
          </div>

          <h3>
            Current waiting patients
          </h3>

          <div className="dept-load-scroll">
          {dashboard &&
            Object.entries(dashboard.departments)
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => (

              <div
                className="dark-bar-row"
                key={name}
              >

                <div>
                  <span>{name}</span>
                  <strong>{count}</strong>
                </div>

                <div className="dark-bar">
                  <i
                    style={{
                      width: `${Math.min(100, count * 12)}%`,
                    }}
                  />
                </div>

              </div>

            ))}
          </div>

          <button
            className="outline-button"
            onClick={reset}
          >
            Reset Demo Queue
          </button>

        </div>

      </div>


    </Layout>
  );
}


/* =========================================================
   PROFILE
========================================================= */

function ProfileCard({ user, patient }) {

  return (
    <div className="dash-card">

      <div className="card-label">
        ACCOUNT INFORMATION
      </div>

      <h3>
        {user.name}
      </h3>

      <div className="mini-stats">

        <div>
          <span>Name</span>
          <strong>{user.name}</strong>
        </div>

        <div>
          <span>Email</span>
          <strong>{user.email}</strong>
        </div>

        <div>
          <span>Role</span>
          <strong>
            {user.role.toUpperCase()}
          </strong>
        </div>

        {user.phone && (
          <div>
            <span>Phone</span>
            <strong>{user.phone}</strong>
          </div>
        )}

        {patient && (
          <>
            {patient.department && (
              <div>
                <span>Department</span>
                <strong>{patient.department}</strong>
              </div>
            )}
            {patient.dob && (
              <div>
                <span>Date of Birth</span>
                <strong>{patient.dob}</strong>
              </div>
            )}
            {patient.blood_group && (
              <div>
                <span>Blood Group</span>
                <strong>{patient.blood_group}</strong>
              </div>
            )}
          </>
        )}

      </div>

    </div>
  );
}


/* =========================================================
   QUEUE TABLE
========================================================= */

function formatCompletedTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function QueueTableDark({
  queue,
  title,
  action,
  compact = false,
  emptyMessage = "No patients currently waiting.",
  showCompletedTime = false,
}) {

  return (
    <div
      className={`dash-card queue-card ${
        compact ? "compact" : ""
      }`}
    >

      {title && (

        <div className="card-heading">

          <div>

            <div className="card-label">
              REAL-TIME
            </div>

            <h3>{title}</h3>

          </div>

          <div className="live-pill">
            <span />
            LIVE
          </div>

        </div>

      )}


      {queue.length === 0 ? (

        <div className="empty-dark">
          {emptyMessage}
        </div>

      ) : (

        <div className="dark-table-wrap">

          <table className="dark-table">

            <thead>

              <tr>

                <th>POS</th>
                <th>TOKEN</th>
                <th>PATIENT</th>
                <th>PRIORITY</th>
                <th>{showCompletedTime ? "COMPLETED" : "WAIT"}</th>

                {action && (
                  <th>ACTION</th>
                )}

              </tr>

            </thead>

            <tbody>

              {queue.map((item) => (

                <tr key={item.token_number}>

                  <td>
                    #{item.position || 1}
                  </td>

                  <td>
                    <strong>
                      {item.token_number}
                    </strong>
                  </td>

                  <td>
                    {item.patient_name}
                  </td>

                  <td>

                    <span
                      className={`dark-badge ${item.priority.toLowerCase()}`}
                    >
                      {item.priority}
                    </span>

                  </td>

                  <td>
                    {showCompletedTime
                      ? formatCompletedTime(item.completed_at)
                      : `${item.estimated_wait} min`}
                  </td>

                  {action && (

                    <td>

                      <button
                        className="table-action"
                        onClick={() =>
                          action(
                            item.token_number
                          )
                        }
                      >
                        Complete
                      </button>

                    </td>

                  )}

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </div>
  );
}


/* =========================================================
   SMALL COMPONENTS
========================================================= */

function StatDark({
  label,
  value,
  icon,
}) {

  return (
    <div className="dash-card stat-dark">

      <div className="stat-icon">
        {icon}
      </div>

      <div>

        <span>{label}</span>

        <strong>{value}</strong>

      </div>

    </div>
  );
}


function FeatureDark({ text }) {

  return (
    <div className="feature-dark">

      <span>✓</span>

      {text}

    </div>
  );
}


/* =========================================================
   SIDEBAR ICONS
========================================================= */

function iconFor(item) {

  const icons = {

    "Add Patient": "+",

    Dashboard: "⌂",

    "My Token": "#",

    "Live Queue": "◷",

    Profile: "○",

    "Patient Queue": "☷",

    Completed: "✓",

    Patients: "♙",

    Doctors: "♙",

    "Queue Management": "☷",

    Analytics: "⌁",

    Settings: "⚙",

  };

  return icons[item] || "•";
}


export default App;