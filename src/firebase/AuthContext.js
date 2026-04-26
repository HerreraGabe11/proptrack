// src/firebase/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "./config";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { saveUserProfile } from "./firestore";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up with email/password
  async function signup(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Set display name
    await updateProfile(cred.user, { displayName });
    // Save profile to Firestore
    await saveUserProfile(cred.user.uid, {
      displayName,
      email,
      createdAt: new Date().toISOString(),
    });
    return cred.user;
  }

  // Sign in with email/password
  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  // Sign in with Google
  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    // Save profile on first Google login
    await saveUserProfile(cred.user.uid, {
      displayName: cred.user.displayName,
      email: cred.user.email,
      createdAt: new Date().toISOString(),
    });
    return cred.user;
  }

  // Sign out
  async function logout() {
    await signOut(auth);
  }

  // Reset password
  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  }

  // Listen for auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = {
    user,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
