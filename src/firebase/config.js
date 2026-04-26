// src/firebase/config.js
// ⚠️ IMPORTANT: Replace these values with your own Firebase project config
// See SETUP-GUIDE.md for step-by-step instructions

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDDFkIbNNIYT5IsbywOtsEA-GNpltZouZM",
  authDomain: "proptrack-762bc.firebaseapp.com",
  projectId: "proptrack-762bc",
  storageBucket: "proptrack-762bc.firebasestorage.app",
  messagingSenderId: "673732114679",
  appId: "1:673732114679:web:8ff96a2ec4fbeb55467bf2",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
