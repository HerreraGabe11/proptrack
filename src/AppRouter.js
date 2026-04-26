// src/AppRouter.js
// Shows login screen or dashboard based on auth state
import React from "react";
import { useAuth } from "./firebase/AuthContext";
import AuthScreen from "./components/AuthScreen";
import App from "./App";

export default function AppRouter() {
  const { user, loading } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#111827", display: "flex",
        alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
        fontFamily: "'Outfit','Segoe UI',sans-serif",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "pulse 1.5s ease infinite",
        }}>
          <svg width="24" height="24" fill="none" stroke="#fff" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M3 12l9-8 9 8M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10"/>
          </svg>
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:.4;transform:scale(.95)}50%{opacity:1;transform:scale(1)}}`}</style>
        <div style={{ color: "#6b7280", fontSize: 14 }}>Loading PropTrack...</div>
      </div>
    );
  }

  // Not logged in — show auth screen
  if (!user) {
    return <AuthScreen />;
  }

  // Logged in — show dashboard
  return <App />;
}
