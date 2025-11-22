import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCAf6bnW6qXu3qA2sBpj-kFrnJZdtIiYj8",
  authDomain: "finanzas-personales-6c999.firebaseapp.com",
  projectId: "finanzas-personales-6c999",
  storageBucket: "finanzas-personales-6c999.firebasestorage.app",
  messagingSenderId: "200219616174",
  appId: "1:200219616174:web:2eab37d015f18de235de3f",
  measurementId: "G-CKWDKHJPRE"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Initialize Analytics only on client side
let analytics;
if (typeof window !== 'undefined') {
  isSupported().then((yes) => {
    if (yes) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, db, auth, googleProvider, analytics };
