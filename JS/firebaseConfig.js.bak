const firebaseConfig = {
  apiKey: "AIzaSyDmp3tZOFz-R2cMTNONuxupb5wM33Y7hXI",
  authDomain: "kaperazzo-54c6d.firebaseapp.com",
  projectId: "kaperazzo-54c6d",
  storageBucket: "kaperazzo-54c6d.firebasestorage.app",
  messagingSenderId: "619246818411",
  appId: "1:619246818411:web:32dfa0d2c43406160ccd2e",
  measurementId: "G-JB4C7N0E0E"
};

import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export { app, auth, storage, googleProvider, firebaseConfig };
