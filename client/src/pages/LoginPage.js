import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import "./LoginPage.css";
import logo from "../assets/logo.png";

export default function LoginPage() {
  const { loginWithSupabase } = useUser();
  const navigate = useNavigate();

  const [mode, setMode] = useState("Admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleModeChange = (m) => {
    setMode(m);
    setErrorMsg("");
    if (m === "Admin") {
      setEmail("");
      setPassword("");
    } else {
      setEmail("");
      setPassword("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const user = await loginWithSupabase(email.toLowerCase(), password);

      if (mode === "Admin" && user.role !== "Admin") {
        setErrorMsg("This account is not an Admin account.");
        setLoading(false);
        return;
      }
      if (mode === "User" && user.role !== "User") {
        setErrorMsg("This account is not a User account.");
        setLoading(false);
        return;
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("Login Error:", err);
      setErrorMsg(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-modern">
      <div className="auth-left">
        <div className="brand">
          <img src={logo} alt="AGS" className="logo" />
        </div>

        <div className="auth-left-content">
          <div className="welcome">
            <h1>Welcome back</h1>
            <p>Sign in to manage tasks, teams and schedules — simple, fast & secure.</p>
          </div>

          <div className="feature-cards">
            <div className="card">
              <strong>For managers</strong>
              <span>Create tasks, manage teams & view reports</span>
            </div>
            <div className="card">
              <strong>For users</strong>
              <span>View assigned work, update status</span>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="login-card" role="region" aria-label="Login form">
          <div className="login-header">
            <h2>Sign in</h2>
            <p className="muted">Access the AGS Task Planner</p>
          </div>

          <div className="mode-toggle" role="tablist" aria-label="Role selector">
            <button
              type="button"
              className={mode === "Admin" ? "mode-btn active" : "mode-btn"}
              onClick={() => handleModeChange("Admin")}
            >
              Admin
            </button>
            <button
              type="button"
              className={mode === "User" ? "mode-btn active" : "mode-btn"}
              onClick={() => handleModeChange("User")}
            >
              User
            </button>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="label">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </label>

            <label className="field">
              <span className="label">Password</span>
              <div className="password-row">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="show-btn"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            {errorMsg && <div className="error">{errorMsg}</div>}

            <button className="submit-btn" type="submit" disabled={loading}>
              {loading ? "Signing in…" : `Sign in as ${mode}`}
            </button>


          </form>
        </div>

        <footer className="login-footer">
          <span>© {new Date().getFullYear()} AGS — Internal Use</span>
        </footer>
      </div>
    </div>
  );
}
