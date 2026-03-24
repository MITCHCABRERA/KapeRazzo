import { auth } from "./firebaseConfig.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    try {
      await signOut(auth).catch(() => {});
    } catch (err) {
      console.warn("Firebase sign out skipped:", err);
    }

    sessionStorage.clear();
    alert("You have been logged out successfully!");
    window.location.href = new URL("login.html", window.location.href).href;
  });
});
