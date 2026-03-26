import { auth } from "./firebaseConfig.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

function clearClientSession() {
  sessionStorage.clear();
  localStorage.removeItem("KAPERAZZO_API_BASE");
  sessionStorage.removeItem("KAPERAZZO_API_BASE_ACTIVE");
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    try {
      await signOut(auth).catch(() => {});
    } catch (err) {
      console.warn("Firebase sign out skipped:", err);
    }

    clearClientSession();
    window.location.replace("/login.html");
  });
});
