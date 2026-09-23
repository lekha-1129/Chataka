import React, { useState, useEffect } from "react";

const API = "http://127.0.0.1:8000";

const DOCTOR_TIMINGS = {
  "Dr. Arjun Mehta":    ["09:00 – 11:00", "14:00 – 16:00"],
  "Dr. Priya Sharma":   ["10:00 – 12:00", "15:00 – 17:00"],
  "Dr. Ravi Kumar":     ["08:30 – 11:30", "13:00 – 15:00"],
  "Dr. Sneha Nair":     ["09:00 – 12:00", "16:00 – 18:00"],
  "Dr. Vikram Patel":   ["10:00 – 13:00", "14:30 – 16:30"],
  "Dr. Meena Krishnan": ["09:30 – 12:30", "15:00 – 17:00"],
  "Dr. Sunil Bose":     ["00:00 – 08:00", "08:00 – 16:00", "16:00 – 24:00"],
};

function Auth({ onLogin }) {
  const [role, setRole]       = useState("patient");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [filters, setFilters] = useState({ hospital_name: "", doctor_name: "", dept: "", hospital_code: "" });
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", dob: "", phone: "", password: "" });

  useEffect(() => {
    fetch(`${API}/admin/doctors`)
      .then((r) => r.json())
      .catch(() => [])
      .then((data) => setDoctors(Array.isArray(data) ? data : []));
  }, []);

  const anyFilter = Object.values(filters).some(Boolean);

  const filtered = anyFilter
    ? doctors.filter((d) => {
        if (filters.hospital_name && (d.hospital_name || "") !== filters.hospital_name) return false;
        if (filters.doctor_name   && d.name !== filters.doctor_name)                    return false;
        if (filters.dept          && d.department !== filters.dept)                     return false;
        if (filters.hospital_code && (d.hospital_code || "") !== filters.hospital_code) return false;
        return true;
      })
    : [];

  const unique = (key) => [...new Set(doctors.map((d) => d[key]).filter(Boolean))];

  const update = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(""); };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let endpoint, body;
      if (isSignup) {
        endpoint = "/auth/signup";
        body = { name: form.name, email: form.email, phone: form.phone, password: form.password, role };
      } else if (role === "patient") {
        endpoint = "/auth/patient-login";
        body = { email: form.email, dob: form.dob };
      } else {
        endpoint = "/auth/login";
        body = { email: form.email, password: form.password, role };
      }
      const res  = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = "Something went wrong";
        if (typeof data.detail === "string") msg = data.detail;
        else if (Array.isArray(data.detail)) msg = data.detail.map((i) => i.msg || JSON.stringify(i)).join(", ");
        throw new Error(msg);
      }
      if (isSignup) {
        setIsSignup(false);
        setForm({ name: "", email: form.email, phone: "", password: "" });
        setError("Account created. Please login.");
      } else {
        onLogin(data.user);
      }
    } catch (err) {
      setError(err.message || "Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* ── Login Split ── */}
      <div className="auth-split">
        <div className="auth-left">
          <div className="auth-brand">
            <img src="/logo.png" alt="ChatakA" className="auth-logo-img" />
            <div className="auth-brand-text">
              <div className="auth-brand-name">ChatakA</div>
              <div className="auth-brand-sub">Smart Queue Management System</div>
            </div>
          </div>

          <div className="auth-content">
            <h1>Better Care,<br /><span>Less Waiting.</span></h1>
            <p>AI-powered hospital queue management and waiting-time prediction for patients, doctors and administrators.</p>
            <div className="auth-features">
              <div><b>✓</b> AI Waiting-Time Prediction</div>
              <div><b>✓</b> Live Queue Tracking</div>
              <div><b>✓</b> Emergency Priority</div>
              <div><b>✓</b> Real-Time Updates</div>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-card">
            <div className="auth-heading">
              <h2>{isSignup ? "Create Account" : "Welcome Back"}</h2>
              <p>{isSignup ? "Create your secure account" : "Login to your dashboard"}</p>
            </div>

            <div className="role-selector">
              {[["patient","👤","Patient"],["doctor","🩺","Doctor"],["admin","⚙️","Admin"]].map(([v,icon,label]) => (
                <button key={v} type="button"
                  className={role === v ? "role active" : "role"}
                  onClick={() => { setRole(v); setError(""); }}>
                  <span>{icon}</span>{label}
                </button>
              ))}
            </div>

            <form onSubmit={submit}>
              {isSignup && (<>
                <div className="input-group">
                  <label>Full Name</label>
                  <input type="text" name="name" value={form.name} onChange={update} placeholder="Enter your full name" required />
                </div>
                <div className="input-group">
                  <label>Phone Number</label>
                  <input type="tel" name="phone" value={form.phone} onChange={update} placeholder="Enter your phone number" />
                </div>
              </>)}
              <div className="input-group">
                <label>Email</label>
                <input type="email" name="email" value={form.email} onChange={update} placeholder="Enter your email" required />
              </div>
              {(!isSignup && role === "patient") ? (
                <div className="input-group">
                  <label>Date of Birth</label>
                  <input type="date" name="dob" value={form.dob} onChange={update} required />
                </div>
              ) : (
                <div className="input-group">
                  <label>Password</label>
                  <input type="password" name="password" value={form.password} onChange={update} placeholder="Enter your password" required />
                </div>
              )}

              {error && (
                <div className={error.toLowerCase().includes("created") ? "auth-success" : "auth-error"}>
                  {error}
                </div>
              )}

              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? "Please wait..." : isSignup ? "Create Account" : `Login as ${role}`}
              </button>
            </form>

            <div className="auth-switch">
              {isSignup ? "Already have an account?" : "Don't have an account?"}
              <button type="button" onClick={() => { setIsSignup(!isSignup); setError(""); }}>
                {isSignup ? " Login" : " Sign Up"}
              </button>
            </div>
            <div className="security-note">🔒 Secure role-based access · ChatakA</div>
          </div>
        </div>
      </div>

      {/* ── Doctor Availability Panel ── */}
      <div className="avail-panel">
        <div className="avail-panel-top">
          <div>
            <div className="avail-panel-title">Doctor Availability</div>
            <div className="avail-panel-sub">Search by name, department or specialization</div>
          </div>
          <div className="avail-filters">
            {[
              { key: "hospital_name", label: "Hospital Name",  opts: unique("hospital_name") },
              { key: "doctor_name",   label: "Doctor Name",    opts: unique("name") },
              { key: "dept",          label: "Department",     opts: unique("department") },
              { key: "hospital_code", label: "Hospital Code",  opts: unique("hospital_code") },
            ].map(({ key, label, opts }) => (
              <select
                key={key}
                className="avail-filter-select"
                value={filters[key]}
                onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
              >
                <option value="">{label}</option>
                {opts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ))}
            {anyFilter && (
              <button
                className="avail-clear-btn"
                type="button"
                onClick={() => setFilters({ hospital_name: "", doctor_name: "", dept: "", hospital_code: "" })}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="avail-table-wrap">
          <table className="avail-table">
            <thead>
              <tr>
                <th>Doctor Name</th>
                <th>Department</th>
                <th>Fee</th>
                <th>Available Timings</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {!anyFilter ? (
                <tr><td colSpan={5} className="avail-empty-cell">Select a filter above to view doctors.</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="avail-empty-cell">No doctors match the selected filters.</td></tr>
              ) : (
                filtered.map((doc) => {
                  const slots = DOCTOR_TIMINGS[doc.name] || ["09:00 – 13:00"];
                  const initials = doc.name.replace("Dr.", "").trim().split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <tr key={doc.id}>
                      <td>
                        <div className="avail-name-cell">
                          <div className="avail-avatar-sm">{initials}</div>
                          <div>
                            <div className="avail-name">{doc.name}</div>
                            <div className="avail-spec">{doc.specialization}</div>
                          </div>
                        </div>
                      </td>
                      <td className="avail-dept">{doc.department}</td>
                      <td className="avail-fee">₹{doc.consultation_fee || "—"}</td>
                      <td>
                        <div className="avail-slots">
                          {slots.map((s) => <span key={s} className="avail-slot">{s}</span>)}
                        </div>
                      </td>
                      <td>
                        <span className={`avail-status ${doc.status === "ACTIVE" ? "active" : "off"}`}>
                          {doc.status === "ACTIVE" ? "● Available" : "● Off Duty"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default Auth;
