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
      "Patients",
      "Doctors",
      "Queue Management",
      "Analytics",
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

  const [department, setDepartment] = useState("General Medicine");
  const [queue, setQueue] = useState([]);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [patient, setPatient] = useState(null);
  const [message, setMessage] = useState("");
  const [doctor, setDoctor] = useState(null);

  const loadPatientData = async () => {
    try {
      const res = await fetch(`${API}/patient/token/${user.id}`);
      const data = await res.json();
      if (data.patient) setPatient(data.patient);
      if (data.token) {
        setTokenInfo(data.token);
        setDepartment(data.token.department);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadQueue = async (dept = department) => {
    try {
      const res = await fetch(`${API}/queue/${encodeURIComponent(dept)}`);
      const data = await res.json();
      setQueue(data.queue || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadDoctor = async (dept = department) => {
    try {
      const res = await fetch(`${API}/doctors/by-department/${encodeURIComponent(dept)}`);
      if (res.ok) setDoctor(await res.json());
      else setDoctor(null);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadPatientData();
    loadQueue();
    loadDoctor();

    const ws = new WebSocket("ws://127.0.0.1:8000/ws/queue");
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "QUEUE_UPDATE" && data.department === department) {
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

  const activeDept = tokenInfo?.department || department;

  return (
    <div className="patient-shell">

      {/* TOP BAR */}
      <header className="patient-topbar">
        <div className="patient-topbar-brand">
          <img src="/logo.png" alt="ChatakA" className="sidebar-logo" />
          <div>
            <div className="sidebar-brand-name">ChatakA</div>
            <div className="sidebar-brand-sub">SMART QUEUE MANAGEMENT SYSTEM</div>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="patient-content">

        <div className="patient-page-header">
          <h1>Welcome, {user.name.split(" ")[0]}</h1>
          <p>Your token status and live queue for <strong>{activeDept}</strong></p>
        </div>

        {message && (
          <div className="dashboard-message">✓ {message}</div>
        )}

        {/* TOKEN + DOCTOR ROW */}
        <div className="patient-main-grid">

          {/* LEFT: TOKEN CARD */}
          <div className="dash-card token-display">
            <div className="card-label">CURRENT TOKEN</div>
            {tokenInfo ? (
              <>
                <div className="big-token">{tokenInfo.token_number}</div>
                <div className="token-status"><span />{tokenInfo.status}</div>
                <div className="mini-stats">
                  <div>
                    <span>Queue Position</span>
                    <strong>#{tokenInfo.position || "—"}</strong>
                  </div>
                  <div>
                    <span>Estimated Wait</span>
                    <strong>{tokenInfo.estimated_wait} min</strong>
                  </div>
                  <div>
                    <span>Priority</span>
                    <strong>{tokenInfo.priority}</strong>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-dark">
                No active token yet.<br />Contact the admin to register.
              </div>
            )}
          </div>

          {/* RIGHT: DOCTOR CARD */}
          {doctor && (
            <div className="dash-card doctor-info-card">
              <div className="card-label">YOUR DOCTOR</div>
              <div className="doctor-avatar-row">
                <div className="doctor-avatar">🩺</div>
                <div>
                  <h3>{doctor.name}</h3>
                  <span className="doctor-spec">{doctor.specialization}</span>
                </div>
              </div>
              <div className="doctor-details">
                <div>
                  <span>Department</span>
                  <strong>{doctor.department}</strong>
                </div>
                <div>
                  <span>Experience</span>
                  <strong>{doctor.experience}</strong>
                </div>
                <div>
                  <span>Availability</span>
                  <strong>{doctor.availability}</strong>
                </div>
                <div>
                  <span>Phone</span>
                  <strong>{doctor.phone || "—"}</strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong>{doctor.email || "—"}</strong>
                </div>
                <div>
                  <span>Patients Waiting</span>
                  <strong>{queue.length}</strong>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* DEPARTMENT QUEUE */}
        <QueueTableDark
          queue={queue}
          title={`${activeDept} — Live Queue`}
        />

      </div>

      {/* BOTTOM-LEFT USER BOX */}
      <div className="patient-user-box">
        <div className="patient-user-avatar">{user.name?.charAt(0).toUpperCase()}</div>
        <div className="patient-user-info">
          <strong>{user.name}</strong>
          <span>{user.email}</span>
          <button className="patient-logout-btn" onClick={onLogout}>↪ Logout</button>
        </div>
      </div>

    </div>
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

  const [message, setMessage] =
    useState("");


  const [patientList, setPatientList] = useState([]);
  const [addForm, setAddForm] = useState({
    name: "", age: "", dob: "", gender: "",
    phone: "", email: "", address: "",
    emergency_contact: "", blood_group: "",
    disease: "", department: "General Medicine", priority: "NORMAL",
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
        }),
      });
      const patData = await patRes.json();
      if (!patRes.ok) throw new Error(patData.detail || "Failed to add patient");

      const tokRes = await fetch(
        `${API}/patients/${patData.id}/token?priority=${addForm.priority}`,
        { method: "POST" }
      );
      const tokData = await tokRes.json();
      if (!tokRes.ok) throw new Error(tokData.detail || "Failed to generate token");

      setAddMsg(`Patient added. Token: ${tokData.token_number}`);
      setAddForm({ name: "", age: "", dob: "", gender: "", phone: "", email: "", address: "", emergency_contact: "", blood_group: "", disease: "", department: "General Medicine", priority: "NORMAL" });
      await loadPatients();
      await load();
    } catch (err) {
      setAddError(err.message);
    }
  };

  const load = async () => {

    try {

      const [dashRes, queueRes] =
        await Promise.all([

          fetch(`${API}/dashboard`),

          fetch(
            `${API}/queue/${encodeURIComponent(
              department
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
        <div className="dashboard-grid two-columns">

          <div className="dash-card">
            <div className="card-label">PATIENT REGISTRATION</div>
            <h3>New Patient</h3>

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
                  <label>Date of Birth</label>
                  <input
                    type="date"
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
                  <label>Email Address</label>
                  <input
                    type="email"
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
        subtitle="Manage hospital doctor accounts."
      >

        <div className="dash-card">

          <div className="card-label">
            DOCTOR MANAGEMENT
          </div>

          <h3>
            Doctor accounts
          </h3>

          <p className="card-muted">
            Doctor account management requires
            a backend users endpoint.
          </p>

          <div className="empty-dark">
            Doctors can currently log in
            using the role-based authentication
            system.
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

          <div>

            <div className="card-label">
              DEPARTMENT
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

        </div>


        <QueueTableDark
          queue={queue}
          title={`${department} Queue`}
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
            SYSTEM SETTINGS
          </div>

          <h3>
            Demo Controls
          </h3>

          <p className="card-muted">
            Use this button to clear the
            current demo queue data.
          </p>

          <button
            className="outline-button"
            onClick={reset}
          >
            Reset Demo Queue
          </button>

        </div>

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


      <div className="dash-card feature-card">

        <div className="card-label">
          ChatakA
        </div>

        <h3>
          System capabilities
        </h3>

        <div className="feature-grid">

          <FeatureDark text="AI waiting-time prediction" />

          <FeatureDark text="Real-time WebSocket queue" />

          <FeatureDark text="Emergency priority handling" />

          <FeatureDark text="Role-based dashboards" />

          <FeatureDark text="Digital token management" />

          <FeatureDark text="Hospital operations analytics" />

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
          <div>
            <span>Department</span>
            <strong>
              {patient.department}
            </strong>
          </div>
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