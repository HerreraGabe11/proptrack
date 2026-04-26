// src/components/AuthScreen.js
import React, { useState } from "react";
import { useAuth } from "../firebase/AuthContext";

export default function AuthScreen() {
  const { login, signup, loginWithGoogle, resetPassword } = useAuth();
  const [mode, setMode] = useState("login"); // login, signup, reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) { setError("Please enter your name"); setLoading(false); return; }
        await signup(email, password, name);
      } else if (mode === "reset") {
        await resetPassword(email);
        setResetSent(true);
        setLoading(false);
        return;
      } else {
        await login(email, password);
      }
    } catch (err) {
      const msg = err.code === "auth/email-already-in-use" ? "An account with this email already exists"
        : err.code === "auth/invalid-email" ? "Please enter a valid email address"
        : err.code === "auth/weak-password" ? "Password must be at least 6 characters"
        : err.code === "auth/user-not-found" ? "No account found with this email"
        : err.code === "auth/wrong-password" ? "Incorrect password"
        : err.code === "auth/invalid-credential" ? "Invalid email or password"
        : err.code === "auth/too-many-requests" ? "Too many attempts. Please try again later"
        : err.message || "Something went wrong";
      setError(msg);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Google sign-in failed. Please try again.");
      }
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", background: "#111827",
    border: "1px solid #374151", borderRadius: 10, color: "#e5e7eb",
    fontSize: 14, outline: "none", boxSizing: "border-box",
    transition: "border-color .2s",
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#111827", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 20,
      fontFamily: "'Outfit','Segoe UI',sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        @keyframes fu{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
        .auth-input:focus{border-color:#3b82f6 !important}
        .auth-btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(59,130,246,.3)}
        .auth-link:hover{color:#e5e7eb !important}
        .google-btn:hover{background:#2d3748 !important;border-color:#4b5563 !important}
      `}</style>
      <div style={{
        width: "100%", maxWidth: 420, animation: "fu .4s ease",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: 14, boxShadow: "0 8px 32px rgba(59,130,246,.25)",
          }}>
            <svg width="28" height="28" fill="none" stroke="#fff" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M3 12l9-8 9 8M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10"/>
            </svg>
          </div>
          <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, color: "#e5e7eb", letterSpacing: "-.03em" }}>
            PropTrack
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
            {mode === "login" ? "Sign in to your dashboard" : mode === "signup" ? "Create your account" : "Reset your password"}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "#1f2937", border: "1px solid #2d3748", borderRadius: 16,
          padding: 28, boxShadow: "0 12px 48px rgba(0,0,0,.4)",
        }}>
          {/* Error message */}
          {error && (
            <div style={{
              background: "#ef444418", border: "1px solid #ef444440", borderRadius: 10,
              padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#f87171",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <svg width="16" height="16" fill="none" stroke="#f87171" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
              {error}
            </div>
          )}

          {/* Reset success */}
          {resetSent && mode === "reset" && (
            <div style={{
              background: "#10b98118", border: "1px solid #10b98140", borderRadius: 10,
              padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#34d399",
            }}>
              Password reset email sent! Check your inbox.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Name field (signup only) */}
            {mode === "signup" && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, color: "#9ca3af", marginBottom: 5, fontWeight: 500 }}>Full Name</label>
                <input
                  className="auth-input"
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe" style={inputStyle}
                />
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "#9ca3af", marginBottom: 5, fontWeight: 500 }}>Email</label>
              <input
                className="auth-input"
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required style={inputStyle}
              />
            </div>

            {/* Password (not shown in reset mode) */}
            {mode !== "reset" && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <label style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>Password</label>
                  {mode === "login" && (
                    <button type="button" className="auth-link" onClick={() => { setMode("reset"); setError(""); }}
                      style={{ background: "none", border: "none", fontSize: 12, color: "#6b7280", cursor: "pointer", padding: 0, transition: "color .2s" }}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  className="auth-input"
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "At least 6 characters" : "Enter your password"}
                  required minLength={6} style={inputStyle}
                />
              </div>
            )}

            {/* Submit button */}
            <button className="auth-btn" type="submit" disabled={loading} style={{
              width: "100%", padding: "12px 16px",
              background: loading ? "#374151" : "linear-gradient(135deg,#3b82f6,#2563eb)",
              color: "#fff", border: "none", borderRadius: 10, fontSize: 14,
              fontWeight: 600, cursor: loading ? "wait" : "pointer",
              transition: "all .2s", marginBottom: 14,
            }}>
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
            </button>
          </form>

          {/* Google Sign In (not shown in reset mode) */}
          {mode !== "reset" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1, height: 1, background: "#374151" }} />
                <span style={{ fontSize: 11, color: "#6b7280" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "#374151" }} />
              </div>
              <button className="google-btn" onClick={handleGoogle} disabled={loading} style={{
                width: "100%", padding: "12px 16px", background: "#1f2937",
                border: "1px solid #374151", borderRadius: 10, fontSize: 14,
                color: "#e5e7eb", cursor: loading ? "wait" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                transition: "all .2s", fontWeight: 500,
              }}>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continue with Google
              </button>
            </>
          )}
        </div>

        {/* Toggle login/signup */}
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#6b7280" }}>
          {mode === "login" ? (
            <>Don't have an account?{" "}
              <button className="auth-link" onClick={() => { setMode("signup"); setError(""); setResetSent(false); }}
                style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0, transition: "color .2s" }}>
                Sign up
              </button>
            </>
          ) : (
            <>Already have an account?{" "}
              <button className="auth-link" onClick={() => { setMode("login"); setError(""); setResetSent(false); }}
                style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0, transition: "color .2s" }}>
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
