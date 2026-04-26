// src/firebase/firestore.js
// Handles all Firestore read/write operations, scoped to the logged-in user

import { db } from "./config";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";

// ═══════════════ SAVE ALL USER DATA ═══════════════
export async function saveUserData(userId, data) {
  try {
    const ref = doc(db, "users", userId);
    await setDoc(ref, {
      properties: data.properties || [],
      prospects: data.prospects || [],
      stocks: data.stocks || [],
      retirement: data.retirement || [],
      otherAssets: data.otherAssets || [],
      liabilities: data.liabilities || [],
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.error("Error saving user data:", err);
    return false;
  }
}

// ═══════════════ LOAD ALL USER DATA ═══════════════
export async function loadUserData(userId) {
  try {
    const ref = doc(db, "users", userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data();
    }
    return null; // No data yet — will use defaults
  } catch (err) {
    console.error("Error loading user data:", err);
    return null;
  }
}

// ═══════════════ SAVE USER PROFILE ═══════════════
export async function saveUserProfile(userId, profile) {
  try {
    const ref = doc(db, "users", userId);
    await setDoc(ref, {
      profile: {
        displayName: profile.displayName || "",
        email: profile.email || "",
        createdAt: profile.createdAt || new Date().toISOString(),
      },
    }, { merge: true });
    return true;
  } catch (err) {
    console.error("Error saving profile:", err);
    return false;
  }
}

// ═══════════════ INDIVIDUAL COLLECTION UPDATES ═══════════════
// These save just one section at a time (more efficient for frequent updates)

export async function saveProperties(userId, properties) {
  const ref = doc(db, "users", userId);
  await setDoc(ref, { properties, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function saveProspects(userId, prospects) {
  const ref = doc(db, "users", userId);
  await setDoc(ref, { prospects, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function saveStocks(userId, stocks) {
  const ref = doc(db, "users", userId);
  await setDoc(ref, { stocks, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function saveRetirement(userId, retirement) {
  const ref = doc(db, "users", userId);
  await setDoc(ref, { retirement, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function saveOtherAssets(userId, otherAssets) {
  const ref = doc(db, "users", userId);
  await setDoc(ref, { otherAssets, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function saveLiabilities(userId, liabilities) {
  const ref = doc(db, "users", userId);
  await setDoc(ref, { liabilities, updatedAt: new Date().toISOString() }, { merge: true });
}

// ═══════════════ DELETE USER DATA ═══════════════
export async function deleteUserData(userId) {
  try {
    await deleteDoc(doc(db, "users", userId));
    return true;
  } catch (err) {
    console.error("Error deleting user data:", err);
    return false;
  }
}
