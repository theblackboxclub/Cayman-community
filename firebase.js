import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; 

const firebaseConfig = {
  apiKey: "AIzaSyAcEwrrQhdrANiJPkDzikqC-3t0wXXE9S0",
  authDomain: "cayman-community.firebaseapp.com",
  projectId: "cayman-community",
  storageBucket: "cayman-community.firebasestorage.app",
  messagingSenderId: "367138686968", // Standard inference based on project
  appId: "1:367138686968:web:7f6d3283282a0888913959" // Placeholder (Safe to leave as is for Storage)
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app); 

export { db, auth, storage };
