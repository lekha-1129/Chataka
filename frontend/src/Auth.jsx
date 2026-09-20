import React, { useState } from "react";

const API = "http://127.0.0.1:8000";

function Auth({ onLogin }) {
  const [role, setRole] = useState("patient");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const update = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const submit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const endpoint = isSignup
        ? "/auth/signup"
        : "/auth/login";

      const body = isSignup
        ? {
            name: form.name,
            email: form.email,
            phone: form.phone,
            password: form.password,
            role: role,
          }
        : {
            email: form.email,
            password: form.password,
            role: role,
          };

      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        let message = "Something went wrong";

        if (typeof data.detail === "string") {
          message = data.detail;
        } else if (Array.isArray(data.detail)) {
          message = data.detail
            .map((item) => item.msg || JSON.stringify(item))
            .join(", ");
        } else if (data.detail) {
          message = JSON.stringify(data.detail);
        }

        throw new Error(message);
      }

      if (isSignup) {
        setIsSignup(false);

        setForm({
          name: "",
          email: form.email,
          phone: "",
          password: "",
        });

        setError("Account created. Please login.");
      } else {
        onLogin(data.user);
      }
    } catch (err) {
      console.error("Authentication error:", err);

      setError(
        err.message || "Unable to connect to the server"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-logo">+</div>
          <span>ChatakA Health</span>
        </div>

        <div className="auth-content">
          <div className="eyebrow">
            SMART HOSPITAL PLATFORM
          </div>

          <h1>
            Better Care,
            <br />
            <span>Less Waiting.</span>
          </h1>

          <p>
            AI-powered hospital queue management and
            waiting-time prediction for patients, doctors
            and hospital administrators.
          </p>

          <div className="auth-features">
            <div>
              <b>✓</b> AI Waiting-Time Prediction
            </div>

            <div>
              <b>✓</b> Live Queue Tracking
            </div>

            <div>
              <b>✓</b> Emergency Priority
            </div>

            <div>
              <b>✓</b> Real-Time Hospital Updates
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-heading">
            <div className="auth-mini">
              ChatakA HEALTH PORTAL
            </div>

            <h2>
              {isSignup
                ? "Create Account"
                : "Welcome Back"}
            </h2>

            <p>
              {isSignup
                ? "Create your secure account"
                : "Login to your dashboard"}
            </p>
          </div>

          <div className="role-selector">
            {[
              ["patient", "👤", "Patient"],
              ["doctor", "🩺", "Doctor"],
              ["admin", "⚙️", "Admin"],
            ].map(([value, icon, label]) => (
              <button
                key={value}
                type="button"
                className={
                  role === value
                    ? "role active"
                    : "role"
                }
                onClick={() => {
                  setRole(value);
                  setError("");
                }}
              >
                <span>{icon}</span>
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            {isSignup && (
              <>
                <div className="input-group">
                  <label>Full Name</label>

                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={update}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Phone Number</label>

                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={update}
                    placeholder="Enter your phone number"
                  />
                </div>
              </>
            )}

            <div className="input-group">
              <label>Email</label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={update}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="input-group">
              <label>Password</label>

              <input
                type="password"
                name="password"
                value={form.password}
                onChange={update}
                placeholder="Enter your password"
                required
              />
            </div>

            {error && (
              <div
                className={
                  error
                    .toLowerCase()
                    .includes("created")
                    ? "auth-success"
                    : "auth-error"
                }
              >
                {error}
              </div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isSignup
                ? "Create Account"
                : `Login as ${role}`}
            </button>
          </form>

          <div className="auth-switch">
            {isSignup
              ? "Already have an account?"
              : "Don't have an account?"}

            <button
              type="button"
              onClick={() => {
                setIsSignup(!isSignup);
                setError("");
              }}
            >
              {isSignup ? " Login" : " Sign Up"}
            </button>
          </div>

          <div className="security-note">
            🔒 Secure role-based access • ChatakA prototype
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;