import React, { useEffect, useState } from "react";
import Auth from "./Auth";

const API = "http://127.0.0.1:8000";

const departments = [
  "General Medicine",
  "Cardiology",
  "Pediatrics",
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
      "Patient Queue",
      "Completed",
      "Profile",
    ],

    admin: [
      "Dashboard",
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
          <div className="auth-logo">+</div>

          <div>
            <div className="sidebar-brand-name">
              ChatakA Health
            </div>

            <div className="sidebar-brand-sub">
              HOSPITAL MANAGEMENT
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

            <div className="dashboard-eyebrow">
              ChatakA / {user.role}
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

      const res = await fetch(
        `${API}/patient/token/${user.id}`
      );

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

      let patientId = patient?.id;

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
        subtitle="Track your current hospital token."
      >

        <div className="section-title-row">

          <div>
            <h2>My Current Token</h2>

            <p>
              Your live consultation status.
            </p>
          </div>

        </div>

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
        subtitle="View your CHATaka account information."
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
      title={`Good to see you, ${
        user.name.split(" ")[0]
      }`}
      subtitle="Manage your hospital visit and track your consultation in real time."
    >

      {message && (
        <div className="dashboard-message">
          ✓ {message}
        </div>
      )}

      <div className="hero-banner">

        <div>

          <div className="banner-label">
            PATIENT PORTAL
          </div>

          <h2>
            Your healthcare journey,
            without the long wait.
          </h2>

          <p>
            Get a digital token, see your queue
            position and know your estimated
            waiting time.
          </p>

        </div>

        <div className="banner-symbol">
          ⌁
        </div>

      </div>


      <div className="section-title-row">

        <div>
          <h2>My Visit</h2>

          <p>
            Generate or monitor your hospital token.
          </p>
        </div>

        <div className="online-pill">
          <span />
          Live System
        </div>

      </div>


      <div className="dashboard-grid two-columns">

        <div className="dash-card">

          <div className="card-label">
            GET DIGITAL TOKEN
          </div>

          <h3>Join the queue</h3>

          <p className="card-muted">
            Choose your department and priority.
          </p>

          <form onSubmit={generateToken}>

            <label>
              Department

              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setTokenInfo(null);
                }}
              >

                {departments.map((d) => (
                  <option key={d}>
                    {d}
                  </option>
                ))}

              </select>

            </label>


            {!patient && (

              <label>
                Age

                <input
                  type="number"
                  min="0"
                  max="120"
                  value={form.age}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      age: e.target.value,
                    })
                  }
                />

              </label>

            )}


            <label>
              Priority

              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority: e.target.value,
                  })
                }
              >

                <option>NORMAL</option>
                <option>URGENT</option>
                <option>EMERGENCY</option>

              </select>

            </label>


            <button
              className="purple-button"
              type="submit"
            >
              Generate Token
            </button>

          </form>

        </div>


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
    useState("General Medicine");

  const [queue, setQueue] =
    useState([]);

  const [completedPatients, setCompletedPatients] =
    useState([]);

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

    } catch (error) {
      console.error(error);
    }
  };


  const loadCompleted = async () => {

    try {

      const res = await fetch(
        `${API}/queue/${encodeURIComponent(
          department
        )}`
      );

      const data = await res.json();

      /*
        The current backend queue endpoint returns
        WAITING patients only.

        Completed patients will be connected
        after we add the completed endpoint.
      */

      setCompletedPatients(
        data.completed || []
      );

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


  /* DOCTOR - PATIENT QUEUE */

  if (active === "Patient Queue") {

    return (
      <Layout
        user={user}
        onLogout={onLogout}
        active={active}
        onNavigate={setActive}
        title="Patient Queue"
        subtitle="View and manage patients waiting for consultation."
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

          <button
            className="purple-button large"
            onClick={callNext}
          >
            Call Next Patient →
          </button>

        </div>


        {message && (
          <div className="dashboard-message">
            ✓ {message}
          </div>
        )}


        <QueueTableDark
          queue={queue}
          title="Patients Waiting"
          action={complete}
        />

      </Layout>
    );
  }


  /* DOCTOR - COMPLETED */

  if (active === "Completed") {

    return (
      <Layout
        user={user}
        onLogout={onLogout}
        active={active}
        onNavigate={setActive}
        title="Completed Consultations"
        subtitle="View patients whose consultations have been completed."
      >

        <div className="dash-card">

          <div className="card-label">
            COMPLETED PATIENTS
          </div>

          {completedPatients.length === 0 ? (

            <div className="empty-dark">
              Completed consultations will
              appear here after the backend
              completed endpoint is added.
            </div>

          ) : (

            <QueueTableDark
              queue={completedPatients}
              title="Completed"
            />

          )}

        </div>

      </Layout>
    );
  }


  /* DOCTOR - PROFILE */

  if (active === "Profile") {

    return (
      <Layout
        user={user}
        onLogout={onLogout}
        active={active}
        onNavigate={setActive}
        title="Doctor Profile"
        subtitle="View your doctor account information."
      >

        <ProfileCard user={user} />

      </Layout>
    );
  }


  /* DOCTOR - DASHBOARD */

  return (
    <Layout
      user={user}
      onLogout={onLogout}
      active="Dashboard"
      onNavigate={setActive}
      title="Doctor Dashboard"
      subtitle="Monitor the live patient queue and manage consultations."
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

      </div>


      <QueueTableDark
        queue={queue}
        title="Patients Waiting"
        action={complete}
      />

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


  /* ADMIN - PATIENTS */

  if (active === "Patients") {

    return (
      <Layout
        user={user}
        onLogout={onLogout}
        active={active}
        onNavigate={setActive}
        title="Patients"
        subtitle="View hospital patient information."
      >

        <div className="stats-grid">

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

        </div>

        <div className="dash-card">

          <div className="card-label">
            PATIENT MANAGEMENT
          </div>

          <h3>
            Patient records are available
            through the queue system.
          </h3>

          <p className="card-muted">
            Total registered patients:
            {" "}
            {dashboard?.total_patients ?? 0}
          </p>

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

          {dashboard &&
            Object.entries(
              dashboard.departments
            ).map(([name, count]) => (

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
                      width: `${Math.min(
                        100,
                        count * 12 + 4
                      )}%`,
                    }}
                  />

                </div>

              </div>

            ))}

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
        subtitle="Manage your CHATaka admin session."
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

          {dashboard &&
            Object.entries(
              dashboard.departments
            ).map(([name, count]) => (

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
                      width: `${Math.min(
                        100,
                        count * 12 + 4
                      )}%`,
                    }}
                  />

                </div>

              </div>

            ))}

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
          ChatakA PLATFORM
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

function QueueTableDark({
  queue,
  title,
  action,
  compact = false,
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
          No patients currently waiting.
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
                <th>WAIT</th>

                {action && (
                  <th>ACTION</th>
                )}

              </tr>

            </thead>

            <tbody>

              {queue.map((item) => (

                <tr key={item.token_number}>

                  <td>
                    #{item.position}
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
                    {item.estimated_wait} min
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